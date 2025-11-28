/**
 * Complete Mock AsyncStorage Implementation
 * This replaces AsyncStorage entirely to prevent any errors
 */

class MockAsyncStorage {
  private storage: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      return this.storage.get(key) || null;
    } catch (error) {
      console.warn('MockAsyncStorage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      this.storage.set(key, value);
    } catch (error) {
      console.warn('MockAsyncStorage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      this.storage.delete(key);
    } catch (error) {
      console.warn('MockAsyncStorage removeItem error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.storage.clear();
    } catch (error) {
      console.warn('MockAsyncStorage clear error:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return Array.from(this.storage.keys());
    } catch (error) {
      console.warn('MockAsyncStorage getAllKeys error:', error);
      return [];
    }
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return keys.map(key => [key, this.storage.get(key) || null]);
    } catch (error) {
      console.warn('MockAsyncStorage multiGet error:', error);
      return [];
    }
  }

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      keyValuePairs.forEach(([key, value]) => {
        this.storage.set(key, value);
      });
    } catch (error) {
      console.warn('MockAsyncStorage multiSet error:', error);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    try {
      keys.forEach(key => {
        this.storage.delete(key);
      });
    } catch (error) {
      console.warn('MockAsyncStorage multiRemove error:', error);
    }
  }

  async mergeItem(key: string, value: string): Promise<void> {
    try {
      const existing = this.storage.get(key);
      if (existing) {
        const existingObj = JSON.parse(existing);
        const newObj = JSON.parse(value);
        const merged = { ...existingObj, ...newObj };
        this.storage.set(key, JSON.stringify(merged));
      } else {
        this.storage.set(key, value);
      }
    } catch (error) {
      console.warn('MockAsyncStorage mergeItem error:', error);
    }
  }

  async multiMerge(keyValuePairs: [string, string][]): Promise<void> {
    try {
      for (const [key, value] of keyValuePairs) {
        await this.mergeItem(key, value);
      }
    } catch (error) {
      console.warn('MockAsyncStorage multiMerge error:', error);
    }
  }
}

export const mockAsyncStorage = new MockAsyncStorage();
export default mockAsyncStorage;





