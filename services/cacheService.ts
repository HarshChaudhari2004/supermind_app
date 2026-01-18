import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'cards_cache';
const MAX_CACHE_SIZE = 100; // Increase to 100 items to support pagination
const CHUNK_SIZE = 10; // Items per chunk for large datasets

interface CacheData {
  data: any[];
  timestamp: number;
  version: number; // For cache versioning
}

interface CacheItem {
  id: string;
  title?: string;
  thumbnail_url?: string;
  original_url?: string;
  date_added?: string;
  updated_at?: string;
  user_notes?: string;
  tags?: string;
  video_type?: string;
  summary?: string;
  is_carousel?: boolean;
  media_count?: number;
  // Only store essential fields to reduce size
}

// Export cache utils for debugging
export { cacheUtils } from './cacheUtils';

export const cacheService = {
  // Sanitize data to store only essential fields and reduce size
  sanitizeDataForCache(data: any[]): CacheItem[] {
    return data.slice(0, MAX_CACHE_SIZE).map(item => ({
      id: item.id || item.ID,
      title: item.title,
      thumbnail_url: item.thumbnail_url,
      original_url: item.original_url,
      date_added: item.date_added,
      updated_at: item.updated_at,
      user_notes: item.user_notes,
      tags: item.tags,
      video_type: item.video_type,
      summary: item.summary,
      is_carousel: item.is_carousel,
      media_count: item.media_count
    }));
  },

  async setCache(data: any[]) {
    try {
      // Sanitize and limit data size
      const sanitizedData = this.sanitizeDataForCache(data);
      
      const cacheData: CacheData = {
        data: sanitizedData,
        timestamp: Date.now(),
        version: 1
      };

      // Check if the data is too large before storing
      const dataString = JSON.stringify(cacheData);
      const sizeInBytes = new Blob([dataString]).size;
      
      console.log(`Cache size: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`);
      
      // If data is too large (>500KB), store only most recent items
      if (sizeInBytes > 500000) { // 500KB limit
        const reducedData = sanitizedData.slice(0, 20); // Keep only 20 most recent
        const reducedCacheData: CacheData = {
          data: reducedData,
          timestamp: Date.now(),
          version: 1
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(reducedCacheData));
        console.log('Stored reduced cache due to size limit');
      } else {
        await AsyncStorage.setItem(CACHE_KEY, dataString);
        console.log(`Cached ${sanitizedData.length} items`);
      }
    } catch (error) {
      console.error('Error setting cache:', error);
      // If storage fails, try to clear and store minimal data
      try {
        await this.clearCache();
        const minimalData = data.slice(0, 10).map(item => ({
          id: item.id || item.ID,
          title: item.title,
          thumbnail_url: item.thumbnail_url
        }));
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: minimalData,
          timestamp: Date.now(),
          version: 1
        }));
        console.log('Stored minimal cache after error');
      } catch (fallbackError) {
        console.error('Failed to store even minimal cache:', fallbackError);
      }
    }
  },

  async getCache(): Promise<any[] | null> {
    try {
      const cache = await AsyncStorage.getItem(CACHE_KEY);
      if (!cache) return null;

      const cacheData: CacheData = JSON.parse(cache);
      const isExpired = Date.now() - cacheData.timestamp > CACHE_EXPIRY;

      if (isExpired) {
        await AsyncStorage.removeItem(CACHE_KEY);
        return null;
      }

      console.log(`Retrieved ${cacheData.data.length} items from cache`);
      return cacheData.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      // Clear corrupted cache
      await this.clearCache();
      return null;
    }
  },

  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },

  async getCacheInfo() {
    try {
      const cache = await AsyncStorage.getItem(CACHE_KEY);
      if (!cache) {
        return { exists: false, size: 0, itemCount: 0 };
      }

      const sizeInBytes = new Blob([cache]).size;
      const cacheData: CacheData = JSON.parse(cache);
      
      return {
        exists: true,
        size: sizeInBytes,
        sizeFormatted: `${(sizeInBytes / 1024).toFixed(2)}KB`,
        itemCount: cacheData.data.length,
        timestamp: new Date(cacheData.timestamp).toLocaleString()
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { exists: false, size: 0, itemCount: 0, error: (error as Error).message };
    }
  }
};
