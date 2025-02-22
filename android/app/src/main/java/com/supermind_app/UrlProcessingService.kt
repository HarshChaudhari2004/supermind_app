package com.supermind_app

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.widget.Toast
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

class UrlProcessingService : Service() {
    private val client = OkHttpClient()

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            if (Intent.ACTION_SEND == it.action && "text/plain" == it.type) {
                val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                if (sharedText != null) {
                    // Show toast
                    Toast.makeText(
                        this, 
                        "Processing URL in background", 
                        Toast.LENGTH_SHORT
                    ).show()
                    
                    // Process URL in background
                    CoroutineScope(Dispatchers.IO).launch {
                        processUrl(sharedText)
                    }
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun processUrl(url: String) {
        try {
            // Send event to React Native
            val reactContext = (application as ReactApplication)
                .reactNativeHost
                .reactInstanceManager
                .currentReactContext

            val params = Arguments.createMap().apply {
                putString("url", url)
                putString("type", "url_shared")
            }

            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("UrlShared", params)

        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(
                this,
                "Failed to process URL",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}