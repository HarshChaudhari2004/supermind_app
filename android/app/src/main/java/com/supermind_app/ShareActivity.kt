package com.supermind_app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ShareActivity - Transparent activity that displays the share confirmation overlay
 * AND immediately processes the URL natively without waiting for React Native
 */
class ShareActivity : ReactActivity() {

    companion object {
        private const val TAG = "ShareActivity"
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    override fun getMainComponentName(): String = "ShareExtension"

    /**
     * Called when the activity is starting
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.d(TAG, "ShareActivity started")
        
        // Extract shared content from the intent
        if (Intent.ACTION_SEND == intent.action && intent.type != null) {
            if ("text/plain" == intent.type) {
                handleSharedText(intent)
            }
        }
    }

    /**
     * Handle shared text content
     * Routes to URL processing OR note creation based on content type
     */
    private fun handleSharedText(intent: Intent) {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
        if (sharedText != null) {
            Log.d(TAG, "Received shared text: $sharedText")
            
            // Check if content is a URL or plain text
            val noteManager = NoteManager(this)
            
            if (noteManager.isUrl(sharedText)) {
                Log.d(TAG, "Detected URL - processing via BackendApiClient")
                processUrlInBackground(sharedText)
            } else {
                Log.d(TAG, "Detected plain text - saving as note")
                processNoteInBackground(sharedText)
            }
            
            // The React Native overlay will show the animation
            // and will finish the activity when animation completes
        }
    }

    /**
     * Process the URL in the background using native API client
     */
    private fun processUrlInBackground(url: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d(TAG, "Starting background URL processing")
                
                val apiClient = BackendApiClient(applicationContext)
                val result = apiClient.sendUrlToBackend(url)
                
                withContext(Dispatchers.Main) {
                    if (result.getString("success") == "true" || result.has("id")) {
                        Log.d(TAG, "✅ URL processed successfully")
                        showToast("Content saved successfully!")
                    } else {
                        Log.e(TAG, "❌ Failed to process URL")
                        showToast("Failed to process content")
                    }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error processing URL in background", e)
                
                withContext(Dispatchers.Main) {
                    val errorMessage = when {
                        e.message?.contains("authentication", ignoreCase = true) == true -> 
                            "Please open the app and sign in first"
                        e.message?.contains("network", ignoreCase = true) == true -> 
                            "Network error. Please check your connection"
                        else -> "Failed to process content: ${e.message}"
                    }
                    showToast(errorMessage)
                }
            }
        }
    }

    /**
     * Process plain text as a note in the background
     */
    private fun processNoteInBackground(noteText: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d(TAG, "Starting background note processing")
                
                val noteManager = NoteManager(applicationContext)
                
                // Validate note text
                if (!noteManager.isValidNote(noteText)) {
                    withContext(Dispatchers.Main) {
                        showToast("Note is empty")
                    }
                    return@launch
                }
                
                // Save note to Supabase
                val result = noteManager.saveNoteToSupabase(noteText)
                
                withContext(Dispatchers.Main) {
                    Log.d(TAG, "✅ Note saved successfully")
                    showToast("Note saved successfully!")
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error processing note in background", e)
                
                withContext(Dispatchers.Main) {
                    val errorMessage = when {
                        e.message?.contains("authentication", ignoreCase = true) == true -> 
                            "Please open the app and sign in first"
                        e.message?.contains("network", ignoreCase = true) == true -> 
                            "Network error. Please check your connection"
                        else -> "Failed to save note: ${e.message}"
                    }
                    showToast(errorMessage)
                }
            }
        }
    }

    /**
     * Show toast message on main thread
     */
    private fun showToast(message: String) {
        mainHandler.post {
            Toast.makeText(applicationContext, message, Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Returns the instance of the [ReactActivityDelegate]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        object : DefaultReactActivityDelegate(
            this,
            mainComponentName,
            fabricEnabled
        ) {
            override fun getLaunchOptions(): Bundle {
                // Pass the shared content to React Native for animation display
                val bundle = Bundle()
                
                if (Intent.ACTION_SEND == intent.action && intent.type != null) {
                    if ("text/plain" == intent.type) {
                        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                        bundle.putString("sharedContent", sharedText ?: "")
                    }
                }
                
                return bundle
            }
        }
}
