//can be used to debug cache issues, check sizes, and clear cache entries
//  This utility provides methods to inspect and manage the cache in a React Native app

import AsyncStorage from '@react-native-async-storage/async-storage';

export const cacheUtils = {
  async getAllKeys() {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  },

  async getTotalCacheSize() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      const cacheInfo: { [key: string]: { size: number; sizeFormatted: string } } = {};

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          cacheInfo[key] = {
            size,
            sizeFormatted: `${(size / 1024).toFixed(2)}KB`
          };
        }
      }

      return {
        totalSize,
        totalSizeFormatted: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        breakdown: cacheInfo,
        keyCount: keys.length
      };
    } catch (error) {
      console.error('Error calculating total cache size:', error);
      return null;
    }
  },

  async clearAllCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
      console.log(`Cleared ${keys.length} cache entries`);
      return true;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return false;
    }
  },

  async debugCacheIssues() {
    try {
      const cacheInfo = await this.getTotalCacheSize();
      console.log('=== CACHE DEBUG INFO ===');
      console.log('Total cache size:', cacheInfo?.totalSizeFormatted);
      console.log('Number of keys:', cacheInfo?.keyCount);
      console.log('Cache breakdown:', cacheInfo?.breakdown);
      
      // Check for oversized individual entries
      if (cacheInfo?.breakdown) {
        Object.entries(cacheInfo.breakdown).forEach(([key, info]: [string, any]) => {
          if (info.size > 100000) { // > 100KB
            console.warn(`Large cache entry detected: ${key} (${info.sizeFormatted})`);
          }
        });
      }
      
      return cacheInfo;
    } catch (error) {
      console.error('Error debugging cache:', error);
      return null;
    }
  }
};
