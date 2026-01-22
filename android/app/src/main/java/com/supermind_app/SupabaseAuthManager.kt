package com.supermind_app

import android.content.Context
import android.util.Log
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.Postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * Manages Supabase authentication and token refresh operations
 * Integrates with SecureTokenStorage for persistent token storage
 */
class SupabaseAuthManager(private val context: Context) {
    
    companion object {
        private const val TAG = "SupabaseAuthManager"
        
        // Supabase configuration - MUST match your React Native configuration
        private const val SUPABASE_URL = "https://fwdvbffemldsiustobyd.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZHZiZmZlbWxkc2l1c3RvYnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgzMzUzNDksImV4cCI6MjA1MzkxMTM0OX0.Nud4_Aqz9xsTRs6ZXzbkHSZK9IzcSElH4j6AacS9Z1Q"
    }

    private val supabaseClient: SupabaseClient by lazy {
        createSupabaseClient(
            supabaseUrl = SUPABASE_URL,
            supabaseKey = SUPABASE_ANON_KEY
        ) {
            install(Auth)
            install(Postgrest)
        }
    }

    /**
     * Get a valid access token, refreshing if necessary
     * @return Valid access token or null if refresh fails
     */
    suspend fun getValidAccessToken(): String? = withContext(Dispatchers.IO) {
        try {
            // Check if we have tokens stored
            if (!SecureTokenStorage.hasTokens(context)) {
                Log.w(TAG, "No tokens found in secure storage")
                return@withContext null
            }

            // Check if token is expired or about to expire
            if (SecureTokenStorage.isTokenExpired(context)) {
                Log.d(TAG, "Token expired or expiring soon, refreshing...")
                return@withContext refreshAccessToken()
            }

            // Return existing valid token
            val accessToken = SecureTokenStorage.getAccessToken(context)
            Log.d(TAG, "Using cached access token")
            return@withContext accessToken
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting valid access token", e)
            null
        }
    }

    /**
     * Refresh the access token using the stored refresh token
     * @return New access token or null if refresh fails
     */
    private suspend fun refreshAccessToken(): String? = withContext(Dispatchers.IO) {
        try {
            val refreshToken = SecureTokenStorage.getRefreshToken(context)
            if (refreshToken.isNullOrEmpty()) {
                Log.w(TAG, "No refresh token available")
                return@withContext null
            }

            Log.d(TAG, "Attempting to refresh access token...")

            // Use Supabase Kotlin SDK to refresh the session
            val session = supabaseClient.auth.refreshSession(refreshToken)
            
            if (session.accessToken.isNotEmpty()) {
                // Save the new tokens
                SecureTokenStorage.saveTokens(
                    context = context,
                    accessToken = session.accessToken,
                    refreshToken = session.refreshToken ?: refreshToken,
                    userId = session.user?.id ?: SecureTokenStorage.getUserId(context) ?: "",
                    expiresIn = session.expiresIn ?: 3600
                )
                
                Log.d(TAG, "Token refreshed successfully")
                return@withContext session.accessToken
            } else {
                Log.w(TAG, "Refresh returned empty access token")
                return@withContext null
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error refreshing access token", e)
            // On refresh failure, clear tokens to force re-auth
            SecureTokenStorage.clearTokens(context)
            null
        }
    }

    /**
     * Get the current user ID
     * @return User ID or null if not available
     */
    fun getUserId(): String? {
        return SecureTokenStorage.getUserId(context)
    }

    /**
     * Check if user is authenticated (has valid tokens)
     * @return true if user has stored tokens
     */
    fun isAuthenticated(): Boolean {
        return SecureTokenStorage.hasTokens(context)
    }

    /**
     * Clear all authentication data (logout)
     */
    fun clearAuth() {
        SecureTokenStorage.clearTokens(context)
        Log.d(TAG, "Authentication data cleared")
    }

    /**
     * Get authentication headers for API requests
     * @return Map of headers including Authorization bearer token
     */
    suspend fun getAuthHeaders(): Map<String, String> {
        val accessToken = getValidAccessToken()
        return if (accessToken != null) {
            mapOf(
                "Authorization" to "Bearer $accessToken",
                "Accept" to "application/json",
                "Content-Type" to "application/json"
            )
        } else {
            Log.w(TAG, "No valid access token available for auth headers")
            emptyMap()
        }
    }

    /**
     * Get the authenticated Supabase client for direct database operations
     * The client will use stored auth tokens automatically when they are available
     * @return The SupabaseClient instance with Auth and Postgrest modules installed
     */
    fun getClient(): SupabaseClient {
        return supabaseClient
    }
}
