/**
 * Safe Storage Wrapper for Zustand
 * Provides a safe interface for Zustand persistence without blocking renders
 */

import { asyncStorageManager } from './AsyncStorageManager';

class SafeStorageWrapper {
  private isInitialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await asyncStorageManager.initialize();
      this.isInitialized = true;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      await this.ensureInitialized();
      return await asyncStorageManager.getItem(key);
    } catch (error) {
      console.warn(`SafeStorageWrapper getItem failed for ${key}:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await asyncStorageManager.setItem(key, value);
    } catch (error) {
      console.warn(`SafeStorageWrapper setItem failed for ${key}:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await asyncStorageManager.removeItem(key);
    } catch (error) {
      console.warn(`SafeStorageWrapper removeItem failed for ${key}:`, error);
    }
  }
}

export const safeStorageWrapper = new SafeStorageWrapper();
export default safeStorageWrapper;




