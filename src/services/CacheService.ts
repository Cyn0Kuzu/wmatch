import { asyncStorageManager } from '../utils/AsyncStorageManager';

interface CacheItem {
  data: any;
  timestamp: number;
  ttl?: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheItem> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize professional AsyncStorage
      await asyncStorageManager.initialize();
      
      // Load cache from storage with size limit
      const storedCache = await asyncStorageManager.getItem('app_cache');
      if (storedCache) {
        // Check if the stored data is too large
        if (storedCache.length > 1024 * 1024) { // 1MB limit
          console.warn('Cache data too large, clearing cache');
          await asyncStorageManager.removeItem('app_cache');
        } else {
          try {
            const parsedCache = JSON.parse(storedCache);
            Object.entries(parsedCache).forEach(([key, value]: [string, any]) => {
              this.cache.set(key, value);
            });
          } catch (parseError) {
            console.warn('Failed to parse cache data, clearing cache');
            await asyncStorageManager.removeItem('app_cache');
          }
        }
      }

      // Clean expired items
      this.cleanExpiredItems();

      this.isInitialized = true;
      console.log('Cache Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Cache Service:', error);
      // Clear corrupted cache and continue
      try {
        await asyncStorageManager.removeItem('app_cache');
      } catch (clearError) {
        console.warn('Failed to clear corrupted cache');
      }
      this.isInitialized = true; // Allow app to continue
    }
  }

  public async set(key: string, data: any, ttl?: number): Promise<void> {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, item);
    await this.persistCache();
  }

  public async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item has expired
    if (item.ttl && Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      await this.persistCache();
      return null;
    }

    return item.data;
  }

  public async delete(key: string): Promise<void> {
    this.cache.delete(key);
    await this.persistCache();
  }

  public async clear(): Promise<void> {
    this.cache.clear();
    await asyncStorageManager.removeItem('app_cache');
  }

  private async persistCache(): Promise<void> {
    const cacheObject: Record<string, CacheItem> = {};
    this.cache.forEach((value, key) => {
      cacheObject[key] = value;
    });
    
    await asyncStorageManager.setItem('app_cache', JSON.stringify(cacheObject));
  }

  private cleanExpiredItems(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((item, key) => {
      if (item.ttl && now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.persistCache();
    }
  }

  public async deleteByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
    
    if (keysToDelete.length > 0) {
      await this.persistCache();
    }
    
    return keysToDelete.length;
  }

  public async cleanup(): Promise<void> {
    this.cleanExpiredItems();
  }
}

export const cacheService = CacheService.getInstance();
