/**
 * Professional AsyncStorage Manager
 * Handles all AsyncStorage operations with comprehensive error handling
 * and fallback mechanisms for React Native applications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageItem {
  key: string;
  value: string;
  timestamp: number;
}

class AsyncStorageManager {
  private static instance: AsyncStorageManager;
  private isInitialized = false;
  private memoryCache = new Map<string, string>();
  private isAsyncStorageAvailable = false;

  private constructor() {}

  public static getInstance(): AsyncStorageManager {
    if (!AsyncStorageManager.instance) {
      AsyncStorageManager.instance = new AsyncStorageManager();
    }
    return AsyncStorageManager.instance;
  }

  /**
   * Initialize AsyncStorage Manager
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.isAsyncStorageAvailable;
    }

    try {
      // Check if AsyncStorage is available
      if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
        console.warn('AsyncStorage not available, using memory-only mode');
        this.isAsyncStorageAvailable = false;
        this.isInitialized = true;
        return false;
      }

      // Test AsyncStorage with a simple operation
      await AsyncStorage.getItem('__test_key__');
      this.isAsyncStorageAvailable = true;
      this.isInitialized = true;
      
      console.log('AsyncStorage Manager initialized successfully');
      return true;
    } catch (error) {
      console.warn('AsyncStorage initialization failed, using memory-only mode:', error);
      this.isAsyncStorageAvailable = false;
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Get item from storage
   */
  public async getItem(key: string): Promise<string | null> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(key)) {
        return this.memoryCache.get(key) || null;
      }

      // If AsyncStorage is available, try to get from there
      if (this.isAsyncStorageAvailable) {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          // Cache in memory for faster access
          this.memoryCache.set(key, value);
        }
        return value;
      }

      return null;
    } catch (error) {
      console.warn(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Set item in storage
   */
  public async setItem(key: string, value: string): Promise<boolean> {
    try {
      // Always cache in memory first
      this.memoryCache.set(key, value);

      // If AsyncStorage is available, try to save there
      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.setItem(key, value);
      }

      return true;
    } catch (error) {
      console.warn(`Failed to set item ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  public async removeItem(key: string): Promise<boolean> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);

      // If AsyncStorage is available, try to remove from there
      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.removeItem(key);
      }

      return true;
    } catch (error) {
      console.warn(`Failed to remove item ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  public async clear(): Promise<boolean> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // If AsyncStorage is available, try to clear there
      if (this.isAsyncStorageAvailable) {
        await AsyncStorage.clear();
      }

      return true;
    } catch (error) {
      console.warn('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get all keys
   */
  public async getAllKeys(): Promise<string[]> {
    try {
      if (this.isAsyncStorageAvailable) {
        return await AsyncStorage.getAllKeys() as string[];
      }
      return Array.from(this.memoryCache.keys());
    } catch (error) {
      console.warn('Failed to get all keys:', error);
      return Array.from(this.memoryCache.keys());
    }
  }

  /**
   * Check if AsyncStorage is available
   */
  public isAvailable(): boolean {
    return this.isAsyncStorageAvailable;
  }

  /**
   * Get storage statistics
   */
  public getStats(): { memoryItems: number; isAsyncStorageAvailable: boolean } {
    return {
      memoryItems: this.memoryCache.size,
      isAsyncStorageAvailable: this.isAsyncStorageAvailable
    };
  }
}

// Export singleton instance
export const asyncStorageManager = AsyncStorageManager.getInstance();
export default asyncStorageManager;




