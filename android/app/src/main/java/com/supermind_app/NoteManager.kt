package com.supermind_app

import android.content.Context
import android.util.Log
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.util.UUID

/**
 * Manages note creation and storage directly to Supabase
 * Replicates the exact logic from thoughtfield.tsx
 */
class NoteManager(private val context: Context) {
    
    companion object {
        private const val TAG = "NoteManager"
    }

    private val authManager = SupabaseAuthManager(context)

    /**
     * Check if text contains a URL - matches api.ts containsUrl function
     */
    fun isUrl(text: String): Boolean {
        val urlRegex = Regex("(https?://[^\\s]+)")
        return urlRegex.containsMatchIn(text)
    }

    /**
     * Generate smart title from text - matches api.ts and thoughtfield.tsx logic
     * Replicates: generateSmartTitle(text: string): string
     */
    fun generateSmartTitle(text: String): String {
        // First try to get the first sentence
        val firstSentence = text.split(Regex("[.!?]\\s+")).firstOrNull() ?: text
        
        // If first sentence is too long, get first line
        if (firstSentence.length > 100) {
            val firstLine = text.split("\n").firstOrNull() ?: text
            // If first line is still too long, truncate with ellipsis
            return if (firstLine.length > 100) {
                firstLine.substring(0, 97) + "..."
            } else {
                firstLine
            }
        }
        
        return firstSentence
    }

    /**
     * Save note directly to Supabase
     * Replicates the exact insert structure from thoughtfield.tsx
     * 
     * @param noteText The text content of the note
     * @return Success message or throws exception
     */
    suspend fun saveNoteToSupabase(noteText: String): String = withContext(Dispatchers.IO) {
        try {
            Log.d(TAG, "Saving note to Supabase...")
            
            // Check authentication
            if (!authManager.isAuthenticated()) {
                throw Exception("Not authenticated. Please sign in to save notes.")
            }
            
            // Get user ID
            val userId = authManager.getUserId()
                ?: throw Exception("User ID not available")
            
            // Generate unique ID (matches api.ts: Math.random().toString(36).substr(2, 9))
            val noteId = UUID.randomUUID().toString().replace("-", "").substring(0, 9)
            
            // Generate smart title (matches thoughtfield.tsx generateSmartTitle)
            val title = generateSmartTitle(noteText)
            
            // Get current timestamp
            val dateAdded = Instant.now().toString()
            
            // Create note object - EXACT structure from thoughtfield.tsx saveThought()
            val noteData = mapOf(
                "id" to noteId,
                "user_id" to userId,
                "title" to title,
                "video_type" to "note",
                "tags" to "quick_note",
                "user_notes" to noteText,
                "date_added" to dateAdded,
                "thumbnail_url" to null,
                "original_url" to null,
                "channel_name" to "Quick Notes"
            )
            
            Log.d(TAG, "Inserting note with ID: $noteId for user: $userId")
            
            // Get the Supabase client (it will use stored tokens for authentication)
            val client = authManager.getClient()
            
            // Insert into Supabase - simple insert like thoughtfield.tsx
            client.from("content").insert(noteData)
            
            Log.d(TAG, "✅ Note saved successfully")
            "Note saved successfully"
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error saving note to Supabase", e)
            throw Exception("Failed to save note: ${e.message}")
        }
    }

    /**
     * Validate note text before saving
     */
    fun isValidNote(text: String): Boolean {
        return text.trim().isNotEmpty()
    }
}
