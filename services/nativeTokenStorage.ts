import { NativeModules } from 'react-native';
import { supabase } from '../lib/supabase';

const { TokenStorage } = NativeModules;

/**
 * Native Token Storage Utility
 * Provides a bridge between React Native Supabase auth and native Android token storage
 */
class NativeTokenStorageService {
  
  /**
   * Save the current Supabase session tokens to native secure storage
   * Call this after successful login or session refresh
   */
  async saveCurrentSession(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('[TokenStorage] No active session to save');
        return false;
      }

      const { access_token, refresh_token, user, expires_in } = session;
      
      if (!access_token || !refresh_token || !user?.id) {
        console.error('[TokenStorage] Missing required session data');
        return false;
      }

      console.log('[TokenStorage] Saving session to native storage for user:', user.id);
      
      await TokenStorage.saveTokens(
        access_token,
        refresh_token,
        user.id,
        expires_in || 3600
      );

      console.log('[TokenStorage] ✅ Session saved to native storage');
      return true;
      
    } catch (error) {
      console.error('[TokenStorage] Failed to save session:', error);
      return false;
    }
  }

  /**
   * Clear all tokens from native storage
   * Call this on logout
   */
  async clearTokens(): Promise<boolean> {
    try {
      console.log('[TokenStorage] Clearing tokens from native storage');
      await TokenStorage.clearTokens();
      console.log('[TokenStorage] ✅ Tokens cleared');
      return true;
    } catch (error) {
      console.error('[TokenStorage] Failed to clear tokens:', error);
      return false;
    }
  }

  /**
   * Check if tokens exist in native storage
   */
  async hasTokens(): Promise<boolean> {
    try {
      return await TokenStorage.hasTokens();
    } catch (error) {
      console.error('[TokenStorage] Failed to check tokens:', error);
      return false;
    }
  }

  /**
   * Get token info (for debugging - doesn't expose actual tokens)
   */
  async getTokenInfo(): Promise<any> {
    try {
      return await TokenStorage.getTokenInfo();
    } catch (error) {
      console.error('[TokenStorage] Failed to get token info:', error);
      return null;
    }
  }

  /**
   * Setup auth state change listener to automatically sync tokens
   * Call this in your App.tsx during initialization
   */
  setupAuthListener() {
    console.log('[TokenStorage] Setting up auth state listener');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[TokenStorage] Auth state changed:', event);
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          // Save tokens to native storage
          await this.saveCurrentSession();
          break;
          
        case 'SIGNED_OUT':
          // Clear tokens from native storage
          await this.clearTokens();
          break;
          
        case 'USER_UPDATED':
          // Re-save in case tokens changed
          await this.saveCurrentSession();
          break;
          
        default:
          break;
      }
    });

    return subscription;
  }
}

// Export singleton instance
export const nativeTokenStorage = new NativeTokenStorageService();
