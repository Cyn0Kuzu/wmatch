import { asyncStorageManager } from './AsyncStorageManager';
import { logger } from './Logger';

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items
  cleanupInterval: number; // Cleanup interval in milliseconds
}

class CacheManager {
  private static instance: CacheManager;
  private config: CacheConfig;
  private cache = new Map<string, CacheItem>();
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 10 * 60 * 1000 // 10 minutes
    };
    
    this.initializeCache();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private async initializeCache(): Promise<void> {
    try {
      await this.loadFromStorage();
      this.startCleanupTimer();
      logger.info('Cache manager initialized', 'CacheManager');
    } catch (error) {
      logger.error('Failed to initialize cache', 'CacheManager', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await asyncStorageManager.getItem('app_cache');
      if (stored) {
        // Check data size before parsing
        if (stored.length > 2 * 1024 * 1024) { // 2MB limit
          logger.warn('Cache data too large, clearing cache', 'CacheManager');
          await asyncStorageManager.removeItem('app_cache');
          return;
        }
        
        try {
          const items: CacheItem[] = JSON.parse(stored);
          items.forEach(item => {
            if (this.isValid(item)) {
              this.cache.set(item.key, item);
            }
          });
        } catch (parseError) {
          logger.warn('Failed to parse cache data, clearing cache', 'CacheManager');
          await asyncStorageManager.removeItem('app_cache');
        }
      }
    } catch (error) {
      logger.error('Failed to load cache from storage', 'CacheManager', error);
      // Clear corrupted cache
      try {
        await asyncStorageManager.removeItem('app_cache');
      } catch (clearError) {
        logger.warn('Failed to clear corrupted cache', 'CacheManager');
      }
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const items = Array.from(this.cache.values());
      const jsonString = JSON.stringify(items);
      
      // Check if data is too large before saving
      if (jsonString.length > 2 * 1024 * 1024) { // 2MB limit
        logger.warn('Cache data too large to save, clearing old cache', 'CacheManager');
        // Keep only the most recent items
        const sortedItems = items.sort((a, b) => b.timestamp - a.timestamp);
        const limitedItems = sortedItems.slice(0, Math.floor(this.config.maxSize / 2));
        await asyncStorageManager.setItem('app_cache', JSON.stringify(limitedItems));
      } else {
        await asyncStorageManager.setItem('app_cache', jsonString);
      }
    } catch (error) {
      logger.error('Failed to save cache to storage', 'CacheManager', error);
    }
  }

  private isValid(item: CacheItem): boolean {
    return Date.now() < item.expiry;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now >= item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // If cache is still too large, remove oldest items
    if (this.cache.size > this.config.maxSize) {
      const items = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = items.slice(0, this.cache.size - this.config.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
      cleaned += toRemove.length;
    }

    if (cleaned > 0) {
      logger.info(`Cache cleanup: removed ${cleaned} items`, 'CacheManager');
      
      // Defer storage save to avoid blocking render
      setTimeout(() => {
        this.saveToStorage().catch(error => {
          logger.error('Failed to save cache to storage after cleanup', 'CacheManager', error);
        });
      }, 0);
    }
  }

  public async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const expiry = Date.now() + (ttl || this.config.defaultTTL);
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry,
        key
      };

      this.cache.set(key, item);
      
      // Defer storage save to avoid blocking render
      setTimeout(() => {
        this.saveToStorage().catch(error => {
          logger.error(`Failed to save cache to storage: ${key}`, 'CacheManager', error);
        });
      }, 0);
      
      logger.debug(`Cache set: ${key}`, 'CacheManager');
    } catch (error) {
      logger.error(`Failed to set cache item: ${key}`, 'CacheManager', error);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key) as CacheItem<T>;
      
      if (!item) {
        return null;
      }

      if (!this.isValid(item)) {
        this.cache.delete(key);
        
        // Defer storage save to avoid blocking render
        setTimeout(() => {
          this.saveToStorage().catch(error => {
            logger.error(`Failed to save cache to storage after cleanup: ${key}`, 'CacheManager', error);
          });
        }, 0);
        
        return null;
      }

      logger.debug(`Cache hit: ${key}`, 'CacheManager');
      return item.data;
    } catch (error) {
      logger.error(`Failed to get cache item: ${key}`, 'CacheManager', error);
      return null;
    }
  }

  public async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (!this.isValid(item)) {
      this.cache.delete(key);
      
      // Defer storage save to avoid blocking render
      setTimeout(() => {
        this.saveToStorage().catch(error => {
          logger.error(`Failed to save cache to storage after has check: ${key}`, 'CacheManager', error);
        });
      }, 0);
      
      return false;
    }
    
    return true;
  }

  public async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      
      // Defer storage save to avoid blocking render
      setTimeout(() => {
        this.saveToStorage().catch(error => {
          logger.error(`Failed to save cache to storage after delete: ${key}`, 'CacheManager', error);
        });
      }, 0);
      
      logger.debug(`Cache delete: ${key}`, 'CacheManager');
    } catch (error) {
      logger.error(`Failed to delete cache item: ${key}`, 'CacheManager', error);
    }
  }

  public async deleteByPattern(pattern: string): Promise<number> {
    try {
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
        // Defer storage save to avoid blocking render
        setTimeout(() => {
          this.saveToStorage().catch(error => {
            logger.error(`Failed to save cache to storage after pattern delete: ${pattern}`, 'CacheManager', error);
          });
        }, 0);
      }
      
      logger.debug(`Cache pattern delete: ${pattern} - deleted ${keysToDelete.length} entries`, 'CacheManager');
      return keysToDelete.length;
    } catch (error) {
      logger.error(`Failed to delete cache by pattern: ${pattern}`, 'CacheManager', error);
      return 0;
    }
  }

  public async clear(): Promise<void> {
    try {
      this.cache.clear();
      await asyncStorageManager.removeItem('app_cache');
      logger.info('Cache cleared', 'CacheManager');
    } catch (error) {
      logger.error('Failed to clear cache', 'CacheManager', error);
    }
  }

  public async getStats(): Promise<{
    size: number;
    maxSize: number;
    hitRate: number;
    items: Array<{ key: string; age: number; ttl: number }>;
  }> {
    const items = Array.from(this.cache.values()).map(item => ({
      key: item.key,
      age: Date.now() - item.timestamp,
      ttl: item.expiry - Date.now()
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      items
    };
  }

  public setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

export const cacheManager = CacheManager.getInstance();


