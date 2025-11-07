import { Platform } from 'react-native';
import * as Font from 'expo-font';
import { asyncStorageManager } from '../utils/AsyncStorageManager';

// Icon cache configuration
const CACHE_CONFIG = {
  maxSize: 100, // Maximum number of cached icons
  ttl: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  storageKey: 'mwatch_icon_cache',
} as const;

interface CachedIcon {
  name: string;
  set: string;
  timestamp: number;
  size: number;
}

interface IconCache {
  icons: CachedIcon[];
  fonts: {
    [key: string]: {
      loaded: boolean;
      timestamp: number;
    };
  };
}

export class IconCacheService {
  private static instance: IconCacheService;
  private cache: IconCache = {
    icons: [],
    fonts: {},
  };
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): IconCacheService {
    if (!IconCacheService.instance) {
      IconCacheService.instance = new IconCacheService();
    }
    return IconCacheService.instance;
  }

  // Initialize cache from storage
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize professional AsyncStorage
      await asyncStorageManager.initialize();
      
      // Load cache from storage
      const cached = await asyncStorageManager.getItem(CACHE_CONFIG.storageKey);
      if (cached) {
        this.cache = JSON.parse(cached);
      }
      
      this.isInitialized = true;
      console.log('Icon cache initialized successfully');
    } catch (error) {
      console.warn('Failed to load icon cache:', error);
      this.isInitialized = true;
    }
  }

  // Preload essential fonts
  async preloadFonts(): Promise<void> {
    const essentialFonts = [
      'MaterialIcons',
      'Ionicons',
      'Feather',
    ];

    const fontPromises = essentialFonts.map(async (fontName) => {
      if (this.isFontLoaded(fontName)) {
        return;
      }

      try {
        // Dynamic import for bundle optimization
        const fontModule = await import('@expo/vector-icons');
        const font = (fontModule as any)[fontName];
        
        if (font && font.font) {
          await Font.loadAsync(font.font);
          this.markFontLoaded(fontName);
        }
      } catch (error) {
        console.warn(`Failed to load font ${fontName}:`, error);
      }
    });

    await Promise.all(fontPromises);
  }

  // Check if font is loaded
  isFontLoaded(fontName: string): boolean {
    const font = this.cache.fonts[fontName];
    if (!font) return false;

    // Check if font is still valid (not expired)
    const isExpired = Date.now() - font.timestamp > CACHE_CONFIG.ttl;
    if (isExpired) {
      delete this.cache.fonts[fontName];
      return false;
    }

    return font.loaded;
  }

  // Mark font as loaded
  markFontLoaded(fontName: string): void {
    this.cache.fonts[fontName] = {
      loaded: true,
      timestamp: Date.now(),
    };
    this.persistCache();
  }

  // Cache icon usage
  cacheIcon(name: string, set: string, size: number): void {
    // Remove expired icons
    this.cleanExpiredIcons();

    // Check if icon already exists
    const existingIndex = this.cache.icons.findIndex(
      icon => icon.name === name && icon.set === set
    );

    if (existingIndex >= 0) {
      // Update existing icon
      this.cache.icons[existingIndex] = {
        name,
        set,
        timestamp: Date.now(),
        size,
      };
    } else {
      // Add new icon
      this.cache.icons.push({
        name,
        set,
        timestamp: Date.now(),
        size,
      });

      // Limit cache size
      if (this.cache.icons.length > CACHE_CONFIG.maxSize) {
        this.cache.icons = this.cache.icons
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, CACHE_CONFIG.maxSize);
      }
    }

    this.persistCache();
  }

  // Get cached icon
  getCachedIcon(name: string, set: string): CachedIcon | null {
    const icon = this.cache.icons.find(
      cached => cached.name === name && cached.set === set
    );

    if (!icon) return null;

    // Check if icon is expired
    const isExpired = Date.now() - icon.timestamp > CACHE_CONFIG.ttl;
    if (isExpired) {
      this.removeCachedIcon(name, set);
      return null;
    }

    return icon;
  }

  // Remove cached icon
  removeCachedIcon(name: string, set: string): void {
    this.cache.icons = this.cache.icons.filter(
      icon => !(icon.name === name && icon.set === set)
    );
    this.persistCache();
  }

  // Clean expired icons
  private cleanExpiredIcons(): void {
    const now = Date.now();
    this.cache.icons = this.cache.icons.filter(
      icon => now - icon.timestamp <= CACHE_CONFIG.ttl
    );
  }

  // Get cache statistics
  getCacheStats(): {
    iconCount: number;
    fontCount: number;
    cacheSize: number;
    hitRate: number;
  } {
    return {
      iconCount: this.cache.icons.length,
      fontCount: Object.keys(this.cache.fonts).length,
      cacheSize: this.cache.icons.reduce((total, icon) => total + icon.size, 0),
      hitRate: this.calculateHitRate(),
    };
  }

  // Calculate cache hit rate (simplified)
  private calculateHitRate(): number {
    // This is a simplified calculation
    // In a real app, you'd track actual hits/misses
    const totalIcons = this.cache.icons.length;
    if (totalIcons === 0) return 0;
    
    // Assume 80% hit rate for cached icons
    return 0.8;
  }

  // Clear all cache
  async clearCache(): Promise<void> {
    this.cache = {
      icons: [],
      fonts: {},
    };
    await this.persistCache();
  }

  // Persist cache to storage
  private async persistCache(): Promise<void> {
    try {
      await asyncStorageManager.setItem(CACHE_CONFIG.storageKey, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to persist icon cache:', error);
    }
  }

  // Get most used icons (for preloading)
  getMostUsedIcons(limit: number = 10): CachedIcon[] {
    return this.cache.icons
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Preload most used icons
  async preloadMostUsedIcons(): Promise<void> {
    const mostUsed = this.getMostUsedIcons(20);
    const fontSets = new Set(mostUsed.map(icon => icon.set));

    const preloadPromises = Array.from(fontSets).map(async (setName) => {
      if (this.isFontLoaded(setName)) return;

      try {
        const fontModule = await import('@expo/vector-icons');
        const font = (fontModule as any)[setName];
        
        if (font && font.font) {
          await Font.loadAsync(font.font);
          this.markFontLoaded(setName);
        }
      } catch (error) {
        console.warn(`Failed to preload font ${setName}:`, error);
      }
    });

    await Promise.all(preloadPromises);
  }

  // Optimize cache based on platform
  optimizeForPlatform(): void {
    if (Platform.OS === 'ios') {
      // iOS-specific optimizations
      // CACHE_CONFIG.maxSize = 150; // iOS can handle more cache (readonly)
    } else if (Platform.OS === 'android') {
      // Android-specific optimizations
      // CACHE_CONFIG.maxSize = 100; // Standard cache size (readonly)
    }
  }

  // Get cache configuration
  getCacheConfig() {
    return CACHE_CONFIG;
  }

  // Update cache configuration
  updateCacheConfig(newConfig: Partial<typeof CACHE_CONFIG>): void {
    Object.assign(CACHE_CONFIG, newConfig);
  }
}

// Export singleton instance
export const iconCacheService = IconCacheService.getInstance();
export default iconCacheService;


