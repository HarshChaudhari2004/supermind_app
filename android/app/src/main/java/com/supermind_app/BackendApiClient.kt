package com.supermind_app

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import org.json.JSONObject
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Backend API Client that replicates the exact logic from api.ts
 * Handles URL processing for YouTube, Instagram, Reddit, and generic websites
 */
class BackendApiClient(private val context: Context) {
    
    companion object {
        private const val TAG = "BackendApiClient"
        
        // Base URLs - matches api.ts configuration
        private val DEV_BASE_URLS = listOf(
            "http://192.168.0.104:8000",    // WiFi IP (primary for physical device)
            "http://10.0.2.2:8000",         // Android emulator
            "http://localhost:8000"          // ADB reverse
        )
        private const val PROD_BASE_URL = "https://crazymind.up.railway.app"
        
        // Use production URL by default (change to false for dev)
        private const val IS_PRODUCTION = true  // Set to true for testing with production backend
    }

    private val authManager = SupabaseAuthManager(context)
    
    private val okHttpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor { message ->
            Log.d(TAG, message)
        }.apply {
            level = if (IS_PRODUCTION) {
                HttpLoggingInterceptor.Level.BASIC
            } else {
                HttpLoggingInterceptor.Level.BODY
            }
        }

        OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    private var baseUrl: String = if (IS_PRODUCTION) PROD_BASE_URL else DEV_BASE_URLS[0]
    
    /**
     * Helper functions to detect URL types - matches api.ts logic
     */
    private fun isYouTubeUrl(url: String): Boolean {
        return url.contains("youtube.com") || 
               url.contains("youtu.be") || 
               url.contains("youtube.com/shorts")
    }

    private fun isInstagramUrl(url: String): Boolean {
        return Regex("instagram\\.com/(?:p|reels|reel)/[A-Za-z0-9_-]+").containsMatchIn(url)
    }

    private fun isRedditUrl(url: String): Boolean {
        return url.contains("reddit.com/r/") || url.contains("redd.it/")
    }

    /**
     * Extract YouTube video ID from URL - matches api.ts logic
     */
    private fun extractYouTubeVideoId(url: String): String? {
        return try {
            when {
                url.contains("youtube.com/shorts/") -> {
                    url.substringAfter("youtube.com/shorts/").substringBefore("?").substringBefore("&")
                }
                url.contains("youtu.be/") -> {
                    url.substringAfter("youtu.be/").substringBefore("?").substringBefore("&")
                }
                url.contains("youtube.com/watch?v=") -> {
                    url.substringAfter("v=").substringBefore("&")
                }
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting video ID", e)
            null
        }
    }

    /**
     * Get CSRF token - matches api.ts logic
     */
    private suspend fun getCsrfToken(): String {
        return ""  // Empty for now, implement if backend requires it
    }

    /**
     * Test connection to a base URL
     */
    private suspend fun testConnection(url: String): Boolean = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Testing connection to: $url")
            val request = Request.Builder()
                .url("$url/api/test/")
                .get()
                .build()
            
            val response = okHttpClient.newCall(request).execute()
            val isOk = response.isSuccessful
            response.close()
            
            Log.d(TAG, if (isOk) "✅ $url is reachable" else "❌ $url returned ${response.code}")
            isOk
        } catch (e: Exception) {
            Log.d(TAG, "❌ $url failed: ${e.message}")
            false
        }
    }

    /**
     * Find a working base URL from the list
     */
    private suspend fun ensureBaseUrl(): String {
        if (IS_PRODUCTION) {
            return PROD_BASE_URL
        }

        // Try to find a working dev URL
        for (url in DEV_BASE_URLS) {
            if (testConnection(url)) {
                baseUrl = url
                Log.d(TAG, "✅ Using base URL: $baseUrl")
                return baseUrl
            }
        }

        // If no dev URL works, fallback to production
        Log.w(TAG, "⚠️ No local server found, falling back to PRODUCTION: $PROD_BASE_URL")
        baseUrl = PROD_BASE_URL
        return baseUrl
    }

    /**
     * Send URL to backend - EXACT replication of sendUrlToBackend from api.ts
     * @param url The URL to process
     * @return JSON response from backend
     */
    suspend fun sendUrlToBackend(url: String): JSONObject = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Processing URL: $url")

            // Ensure we have a working base URL
            val workingBaseUrl = ensureBaseUrl()

            // Get authentication headers
            val authHeaders = authManager.getAuthHeaders()
            if (authHeaders.isEmpty()) {
                throw Exception("No valid authentication token available. Please sign in.")
            }

            // Get user ID
            val userId = authManager.getUserId()
                ?: throw Exception("User ID not available")

            // Get CSRF token
            val csrfToken = getCsrfToken()

            // Determine endpoint and request data based on URL type
            val endpoint: String
            val requestData = JSONObject().apply {
                put("url", url)
                put("user_id", userId)
            }
            var method = "GET"

            when {
                isYouTubeUrl(url) -> {
                    endpoint = "/api/generate-summary/"
                    val videoId = extractYouTubeVideoId(url)
                    
                    if (videoId == null) {
                        throw Exception("Invalid YouTube URL")
                    }

                    Log.d(TAG, "YouTube URL detected, video ID: $videoId")
                }
                
                isInstagramUrl(url) -> {
                    endpoint = "/instagram/api/analyze-instagram/"
                    val type = if (url.contains("/p/")) "post" else "reel"
                    requestData.put("type", type)
                    Log.d(TAG, "Instagram URL detected, type: $type")
                }
                
                isRedditUrl(url) -> {
                    endpoint = "/web/api/analyze-reddit/"
                    Log.d(TAG, "Reddit URL detected")
                }
                
                else -> {
                    endpoint = "/web/api/analyze-website/"
                    Log.d(TAG, "Generic website URL detected")
                }
            }

            // Build the request URL
            val requestUrl = StringBuilder("$workingBaseUrl$endpoint")

            // Build headers
            val headers = authHeaders.toMutableMap().apply {
                put("X-CSRFToken", csrfToken)
            }

            Log.d(TAG, "Making $method request to $endpoint")
            Log.d(TAG, "Request data: $requestData")

            // Make the HTTP request
            val request = if (method == "POST") {
                val mediaType = "application/json; charset=utf-8".toMediaType()
                val body = requestData.toString().toRequestBody(mediaType)
                
                Request.Builder()
                    .url(requestUrl.toString())
                    .post(body)
                    .apply {
                        headers.forEach { (key, value) ->
                            addHeader(key, value)
                        }
                    }
                    .build()
            } else {
                // GET request - add params to URL
                val fullUrl = StringBuilder(requestUrl.toString())
                
                if (!requestUrl.contains("?")) {
                    fullUrl.append("?")
                } else {
                    fullUrl.append("&")
                }
                
                fullUrl.append("url=").append(java.net.URLEncoder.encode(url, "UTF-8"))
                fullUrl.append("&user_id=").append(java.net.URLEncoder.encode(userId, "UTF-8"))
                
                Log.d(TAG, "GET request URL: $fullUrl")
                
                Request.Builder()
                    .url(fullUrl.toString())
                    .get()
                    .apply {
                        headers.forEach { (key, value) ->
                            addHeader(key, value)
                        }
                    }
                    .build()
            }

            // Execute request
            val response = okHttpClient.newCall(request).execute()
            val responseBody = response.body?.string()

            if (!response.isSuccessful) {
                val errorMessage = try {
                    val errorJson = JSONObject(responseBody ?: "{}")
                    errorJson.optString("error", "Server error: ${response.code}")
                } catch (e: Exception) {
                    "Server error: ${response.code}"
                }
                throw Exception(errorMessage)
            }

            // Parse and return response
            val result = JSONObject(responseBody ?: "{}")
            Log.d(TAG, "Request successful")
            
            result

        } catch (e: Exception) {
            Log.e(TAG, "Error sending URL to backend", e)
            throw e
        }
    }

    /**
     * Result class for API responses
     */
    data class ApiResponse(
        val success: Boolean,
        val data: String? = null,
        val error: String? = null
    )
}
