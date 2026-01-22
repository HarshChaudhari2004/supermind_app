package com.supermind_app

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShareExtensionModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ShareExtensionModule"
    }

    @ReactMethod
    fun closeShareActivity() {
        currentActivity?.finish()
    }

    @ReactMethod
    fun processSharedContent(content: String) {
        try {
            val ctx = reactApplicationContext
            val intent = Intent(ctx, UrlProcessingService::class.java).apply {
                action = Intent.ACTION_SEND
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, content)
            }
            // On Android O+ starting a background service from background may require startForegroundService,
            // but since ShareActivity is in foreground when calling this, startService should be fine.
            ctx.startService(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
