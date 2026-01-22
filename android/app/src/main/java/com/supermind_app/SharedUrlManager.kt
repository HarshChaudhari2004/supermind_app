package com.supermind_app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Manages persistent storage of shared URLs using SharedPreferences
 * This ensures URLs are not lost when the app is not running
 */
object SharedUrlManager {
    private const val PREFS_NAME = "shared_urls_prefs"
    private const val KEY_PENDING_URLS = "pending_urls"
    private const val KEY_LAST_SHARED_URL = "last_shared_url"
    private const val KEY_LAST_SHARED_TIME = "last_shared_time"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Stores a shared URL for later processing
     * @param context Application context
     * @param url The URL that was shared
     * @return true if successfully stored, false otherwise
     */
    fun storeSharedUrl(context: Context, url: String): Boolean {
        try {
            val prefs = getPrefs(context)
            val currentTime = System.currentTimeMillis()
            
            // Get existing URLs
            val existingUrls = getPendingUrls(context).toMutableList()
            
            // Create a new URL entry with timestamp
            val urlEntry = JSONObject().apply {
                put("url", url)
                put("timestamp", currentTime)
                put("processed", false)
            }
            
            // Add to list
            existingUrls.add(urlEntry.toString())
            
            // Save back to SharedPreferences
            val jsonArray = JSONArray(existingUrls)
            prefs.edit()
                .putString(KEY_PENDING_URLS, jsonArray.toString())
                .putString(KEY_LAST_SHARED_URL, url)
                .putLong(KEY_LAST_SHARED_TIME, currentTime)
                .apply()
            
            return true
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }

    /**
     * Gets all pending URLs that haven't been processed yet
     * @param context Application context
     * @return List of pending URL entries as JSON strings
     */
    fun getPendingUrls(context: Context): List<String> {
        return try {
            val prefs = getPrefs(context)
            val urlsJson = prefs.getString(KEY_PENDING_URLS, "[]") ?: "[]"
            val jsonArray = JSONArray(urlsJson)
            
            val urls = mutableListOf<String>()
            for (i in 0 until jsonArray.length()) {
                urls.add(jsonArray.getString(i))
            }
            urls
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }

    /**
     * Gets the most recently shared URL
     * @param context Application context
     * @return The last shared URL, or null if none exists
     */
    fun getLastSharedUrl(context: Context): String? {
        return try {
            val prefs = getPrefs(context)
            prefs.getString(KEY_LAST_SHARED_URL, null)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Gets the timestamp of the most recently shared URL
     * @param context Application context
     * @return The timestamp in milliseconds, or 0 if none exists
     */
    fun getLastSharedTime(context: Context): Long {
        return try {
            val prefs = getPrefs(context)
            prefs.getLong(KEY_LAST_SHARED_TIME, 0)
        } catch (e: Exception) {
            e.printStackTrace()
            0
        }
    }

    /**
     * Marks a URL as processed and removes it from the pending list
     * @param context Application context
     * @param url The URL to mark as processed
     */
    fun markUrlAsProcessed(context: Context, url: String) {
        try {
            val prefs = getPrefs(context)
            val pendingUrls = getPendingUrls(context).toMutableList()
            
            // Remove the processed URL
            val updatedUrls = pendingUrls.filter { urlEntry ->
                try {
                    val json = JSONObject(urlEntry)
                    json.getString("url") != url
                } catch (e: Exception) {
                    true // Keep if we can't parse
                }
            }
            
            // Save back
            val jsonArray = JSONArray(updatedUrls)
            prefs.edit()
                .putString(KEY_PENDING_URLS, jsonArray.toString())
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Clears all pending URLs
     * @param context Application context
     */
    fun clearAllPendingUrls(context: Context) {
        try {
            val prefs = getPrefs(context)
            prefs.edit()
                .putString(KEY_PENDING_URLS, "[]")
                .apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Checks if there are any pending URLs
     * @param context Application context
     * @return true if there are pending URLs, false otherwise
     */
    fun hasPendingUrls(context: Context): Boolean {
        return getPendingUrls(context).isNotEmpty()
    }
}
