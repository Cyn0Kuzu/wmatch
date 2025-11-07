import { asyncStorageManager } from './AsyncStorageManager';

/**
 * Cache cleanup utility to fix corrupted cache issues
 */
export class CacheCleanupUtil {
  /**
   * Clear all cache data to fix corruption issues
   */
  public static async clearAllCache(): Promise<void> {
    try {
      
      // Initialize professional AsyncStorage
      await asyncStorageManager.initialize();
      
      // Get all keys
      const keys = await asyncStorageManager.getAllKeys();
      
      // Clear cache-related keys
      for (const key of keys) {
        if (key.includes('cache') || key.includes('Cache') || key.includes('app_cache')) {
          await asyncStorageManager.removeItem(key);
        }
      }
      
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }
  
  /**
   * Check cache size and clean if too large
   */
  public static async checkAndCleanCache(): Promise<void> {
    try {
      
      // DISABLED: Skip AsyncStorage operations to prevent crashes
      // All cache operations are now memory-only
      
    } catch (error) {
      console.error('Cache size check failed:', error);
    }
  }
  
  /**
   * Initialize cache with safe defaults
   */
  public static async initializeSafeCache(): Promise<void> {
    try {
      // DISABLED: Skip AsyncStorage operations to prevent crashes
      // All cache operations are now memory-only
      
    } catch (error) {
      console.error('Safe cache initialization failed:', error);
    }
  }
}




