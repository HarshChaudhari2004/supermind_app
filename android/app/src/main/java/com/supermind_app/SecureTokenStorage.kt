package com.supermind_app

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure storage for Supabase authentication tokens using EncryptedSharedPreferences
 * backed by Android Keystore for hardware-backed encryption.
 */
object SecureTokenStorage {
    private const val PREFS_FILE_NAME = "supermind_secure_prefs"
    private const val KEY_ACCESS_TOKEN = "supabase_access_token"
    private const val KEY_REFRESH_TOKEN = "supabase_refresh_token"
    private const val KEY_USER_ID = "supabase_user_id"
    private const val KEY_TOKEN_EXPIRY = "token_expiry_time"

    private var encryptedPrefs: SharedPreferences? = null

    /**
     * Initialize encrypted shared preferences
     */
    private fun getEncryptedPrefs(context: Context): SharedPreferences {
        if (encryptedPrefs == null) {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            encryptedPrefs = EncryptedSharedPreferences.create(
                context,
                PREFS_FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        }
        return encryptedPrefs!!
    }

    /**
     * Save authentication tokens securely
     * @param context Application context
     * @param accessToken Supabase access token
     * @param refreshToken Supabase refresh token
     * @param userId User ID
     * @param expiresIn Token expiry duration in seconds
     */
    fun saveTokens(
        context: Context,
        accessToken: String,
        refreshToken: String,
        userId: String,
        expiresIn: Long = 3600
    ) {
        val prefs = getEncryptedPrefs(context)
        val expiryTime = System.currentTimeMillis() + (expiresIn * 1000)
        
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putString(KEY_USER_ID, userId)
            .putLong(KEY_TOKEN_EXPIRY, expiryTime)
            .apply()
    }

    /**
     * Get the stored access token
     * @param context Application context
     * @return Access token or null if not found
     */
    fun getAccessToken(context: Context): String? {
        return getEncryptedPrefs(context).getString(KEY_ACCESS_TOKEN, null)
    }

    /**
     * Get the stored refresh token
     * @param context Application context
     * @return Refresh token or null if not found
     */
    fun getRefreshToken(context: Context): String? {
        return getEncryptedPrefs(context).getString(KEY_REFRESH_TOKEN, null)
    }

    /**
     * Get the stored user ID
     * @param context Application context
     * @return User ID or null if not found
     */
    fun getUserId(context: Context): String? {
        return getEncryptedPrefs(context).getString(KEY_USER_ID, null)
    }

    /**
     * Check if the access token is expired
     * @param context Application context
     * @return true if token is expired or will expire in the next 5 minutes
     */
    fun isTokenExpired(context: Context): Boolean {
        val expiryTime = getEncryptedPrefs(context).getLong(KEY_TOKEN_EXPIRY, 0)
        val bufferTime = 5 * 60 * 1000 // 5 minutes buffer
        return System.currentTimeMillis() + bufferTime >= expiryTime
    }

    /**
     * Check if tokens exist
     * @param context Application context
     * @return true if both access and refresh tokens are stored
     */
    fun hasTokens(context: Context): Boolean {
        val prefs = getEncryptedPrefs(context)
        return !prefs.getString(KEY_ACCESS_TOKEN, null).isNullOrEmpty() &&
               !prefs.getString(KEY_REFRESH_TOKEN, null).isNullOrEmpty()
    }

    /**
     * Clear all stored tokens (e.g., on logout)
     * @param context Application context
     */
    fun clearTokens(context: Context) {
        getEncryptedPrefs(context).edit()
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_REFRESH_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_TOKEN_EXPIRY)
            .apply()
    }

    /**
     * Get all token data as a map (for debugging/logging - be careful with sensitive data)
     * @param context Application context
     * @return Map of token data (values are masked for security)
     */
    fun getTokenInfo(context: Context): Map<String, String> {
        val prefs = getEncryptedPrefs(context)
        return mapOf(
            "hasAccessToken" to (!prefs.getString(KEY_ACCESS_TOKEN, null).isNullOrEmpty()).toString(),
            "hasRefreshToken" to (!prefs.getString(KEY_REFRESH_TOKEN, null).isNullOrEmpty()).toString(),
            "userId" to (prefs.getString(KEY_USER_ID, null) ?: "null"),
            "isExpired" to isTokenExpired(context).toString()
        )
    }
}
