import { cacheService } from './cacheService';

export const preloadAppData = async (userId: string) => {
  try {
    // Load from cache, don't fetch from Supabase at startup
    const cachedData = await cacheService.getCache();
    return cachedData; // Return the actual cached data
  } catch (error) {
    console.error('Error preloading app data:', error);
    return null;
  }
};
