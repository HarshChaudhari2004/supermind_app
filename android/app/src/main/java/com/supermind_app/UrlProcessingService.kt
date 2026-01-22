package com.supermind_app

import android.app.ActivityManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient

class UrlProcessingService : Service() {
    private val client = OkHttpClient()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            if (Intent.ACTION_SEND == it.action && "text/plain" == it.type) {
                val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                if (sharedText != null) {
                    // Show toast on main thread
                    showToast("Processing URL in background")
                    
                    // Process URL in background
                    CoroutineScope(Dispatchers.IO).launch {
                        processUrl(sharedText)
                    }
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun showToast(message: String) {
        // Only show toast if app is NOT in foreground
        // If app is in foreground, React Native overlay will handle it
        val activityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val appProcesses = activityManager.runningAppProcesses
        
        val isAppInForeground = appProcesses?.any { 
            it.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND &&
            it.processName == packageName
        } ?: false
        
        // Only show toast for background processing
        if (!isAppInForeground) {
            mainHandler.post {
                Toast.makeText(
                    applicationContext, 
                    message,
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private suspend fun processUrl(sharedText: String) {
        try {
            withContext(Dispatchers.Main) {
                // Get React context on main thread
                val reactContext = (application as ReactApplication)
                    .reactNativeHost
                    .reactInstanceManager
                    .currentReactContext

                val params = Arguments.createMap().apply {
                    putString("url", sharedText)
                    putString("type", "url_shared")
                }

                reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("UrlShared", params)

                showToast("Content being processed")
            }

        } catch (e: Exception) {
            e.printStackTrace()
            showToast("Failed to process content")
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}