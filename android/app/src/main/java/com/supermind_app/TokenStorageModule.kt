package com.supermind_app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.util.Log

/**
 * Native module to expose SecureTokenStorage to React Native
 * Allows RN to save and manage authentication tokens securely
 */
class TokenStorageModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "TokenStorageModule"
    }

    override fun getName(): String {
        return "TokenStorage"
    }

    /**
     * Save authentication tokens from React Native
     * Called when user logs in via Supabase in RN
     * 
     * @param accessToken Supabase access token
     * @param refreshToken Supabase refresh token
     * @param userId User ID
     * @param expiresIn Token expiry duration in seconds
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun saveTokens(
        accessToken: String,
        refreshToken: String,
        userId: String,
        expiresIn: Double,
        promise: Promise
    ) {
        try {
            Log.d(TAG, "Saving tokens for user: $userId")
            
            SecureTokenStorage.saveTokens(
                context = reactApplicationContext,
                accessToken = accessToken,
                refreshToken = refreshToken,
                userId = userId,
                expiresIn = expiresIn.toLong()
            )
            
            Log.d(TAG, "✅ Tokens saved successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to save tokens", e)
            promise.reject("SAVE_ERROR", "Failed to save tokens: ${e.message}", e)
        }
    }

    /**
     * Clear all stored tokens
     * Called when user logs out
     * 
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun clearTokens(promise: Promise) {
        try {
            Log.d(TAG, "Clearing all tokens")
            SecureTokenStorage.clearTokens(reactApplicationContext)
            Log.d(TAG, "✅ Tokens cleared successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to clear tokens", e)
            promise.reject("CLEAR_ERROR", "Failed to clear tokens: ${e.message}", e)
        }
    }

    /**
     * Check if tokens exist
     * 
     * @param promise Promise that resolves to boolean
     */
    @ReactMethod
    fun hasTokens(promise: Promise) {
        try {
            val hasTokens = SecureTokenStorage.hasTokens(reactApplicationContext)
            promise.resolve(hasTokens)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to check tokens", e)
            promise.reject("CHECK_ERROR", "Failed to check tokens: ${e.message}", e)
        }
    }

    /**
     * Get token info (for debugging - doesn't expose actual tokens)
     * 
     * @param promise Promise that resolves to token info map
     */
    @ReactMethod
    fun getTokenInfo(promise: Promise) {
        try {
            val info = SecureTokenStorage.getTokenInfo(reactApplicationContext)
            val infoMap = com.facebook.react.bridge.Arguments.createMap().apply {
                info.forEach { (key, value) ->
                    putString(key, value)
                }
            }
            promise.resolve(infoMap)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to get token info", e)
            promise.reject("INFO_ERROR", "Failed to get token info: ${e.message}", e)
        }
    }
}
