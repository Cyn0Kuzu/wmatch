import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isSmallScreen = width < 360 || height < 700;
export const isMediumScreen = (width >= 360 && width < 400) || (height >= 700 && height < 800);
export const isLargeScreen = width >= 400 && height >= 800;

export const getResponsiveSize = (small: number, medium: number, large: number): number => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

export const getResponsiveFontSize = (baseSize: number): number => {
  return getResponsiveSize(baseSize, baseSize + 2, baseSize + 4);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

export const optimizeImageUrl = (url: string, width: number, quality: number = 80): string => {
  if (!url) return '';
  
  // TMDB image optimization
  if (url.includes('image.tmdb.org')) {
    const size = width <= 185 ? 'w185' : width <= 342 ? 'w342' : 'w500';
    return url.replace(/\/w\d+\//, `/${size}/`);
  }
  
  return url;
};

export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(
    urls.map(url => 
      new Promise<void>((resolve) => {
        // Image preloading not needed in React Native
        // Images are loaded automatically
        resolve();
      })
    )
  );
};
