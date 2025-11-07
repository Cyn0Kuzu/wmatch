import { logger } from './Logger';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

export interface AppMetrics {
  screenLoadTimes: { [screen: string]: number };
  apiResponseTimes: { [endpoint: string]: number[] };
  userInteractions: { [action: string]: number };
  memoryUsage: number;
  crashCount: number;
  sessionDuration: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics = new Map<string, PerformanceMetric>();
  private appMetrics: AppMetrics;
  private sessionStartTime: number;
  private memoryCheckInterval?: NodeJS.Timeout;

  private constructor() {
    this.sessionStartTime = Date.now();
    this.appMetrics = {
      screenLoadTimes: {},
      apiResponseTimes: {},
      userInteractions: {},
      memoryUsage: 0,
      crashCount: 0,
      sessionDuration: 0
    };
    
    this.initializeMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMonitoring(): void {
    this.startMemoryMonitoring();
    this.trackSessionDuration();
    logger.info('Performance monitor initialized', 'PerformanceMonitor');
  }

  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  private checkMemoryUsage(): void {
    try {
      // In React Native, we can't directly access memory usage
      // But we can track cache size and other metrics
      const cacheSize = this.getCacheSize();
      this.appMetrics.memoryUsage = cacheSize;
      
      if (cacheSize > 50 * 1024 * 1024) { // 50MB threshold
        logger.warn('High memory usage detected', 'PerformanceMonitor', { cacheSize });
      }
    } catch (error) {
      logger.error('Failed to check memory usage', 'PerformanceMonitor', error);
    }
  }

  private getCacheSize(): number {
    // Estimate cache size based on stored items
    return this.metrics.size * 1024; // Rough estimate
  }

  private trackSessionDuration(): void {
    setInterval(() => {
      this.appMetrics.sessionDuration = Date.now() - this.sessionStartTime;
    }, 60000); // Update every minute
  }

  public startMetric(name: string, metadata?: any): void {
    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata
    };
    
    this.metrics.set(name, metric);
    logger.debug(`Performance metric started: ${name}`, 'PerformanceMonitor');
  }

  public endMetric(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Performance metric not found: ${name}`, 'PerformanceMonitor');
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    
    logger.info(`Performance metric completed: ${name} (${duration}ms)`, 'PerformanceMonitor');
    
    // Store in app metrics
    this.storeMetric(name, duration, metric.metadata);
    
    this.metrics.delete(name);
    return duration;
  }

  private storeMetric(name: string, duration: number, metadata?: any): void {
    if (name.startsWith('screen_')) {
      const screenName = name.replace('screen_', '');
      this.appMetrics.screenLoadTimes[screenName] = duration;
    } else if (name.startsWith('api_')) {
      const endpoint = name.replace('api_', '');
      if (!this.appMetrics.apiResponseTimes[endpoint]) {
        this.appMetrics.apiResponseTimes[endpoint] = [];
      }
      this.appMetrics.apiResponseTimes[endpoint].push(duration);
      
      // Keep only last 100 measurements
      if (this.appMetrics.apiResponseTimes[endpoint].length > 100) {
        this.appMetrics.apiResponseTimes[endpoint].shift();
      }
    } else if (name.startsWith('interaction_')) {
      const action = name.replace('interaction_', '');
      this.appMetrics.userInteractions[action] = (this.appMetrics.userInteractions[action] || 0) + 1;
    }
  }

  public trackScreenLoad(screenName: string): void {
    this.startMetric(`screen_${screenName}`);
  }

  public endScreenLoad(screenName: string): number | null {
    return this.endMetric(`screen_${screenName}`);
  }

  public trackApiCall(endpoint: string): void {
    this.startMetric(`api_${endpoint}`);
  }

  public endApiCall(endpoint: string): number | null {
    return this.endMetric(`api_${endpoint}`);
  }

  public trackUserInteraction(action: string): void {
    this.startMetric(`interaction_${action}`);
    setTimeout(() => {
      this.endMetric(`interaction_${action}`);
    }, 100); // End after 100ms
  }

  public getMetrics(): AppMetrics {
    return { ...this.appMetrics };
  }

  public getAverageApiResponseTime(endpoint: string): number {
    const times = this.appMetrics.apiResponseTimes[endpoint];
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  public getSlowestScreens(limit: number = 5): Array<{ screen: string; time: number }> {
    return Object.entries(this.appMetrics.screenLoadTimes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([screen, time]) => ({ screen, time }));
  }

  public getMostUsedFeatures(limit: number = 5): Array<{ feature: string; count: number }> {
    return Object.entries(this.appMetrics.userInteractions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([feature, count]) => ({ feature, count }));
  }

  public async exportMetrics(): Promise<string> {
    try {
      const metrics = {
        ...this.appMetrics,
        timestamp: new Date().toISOString(),
        sessionDuration: Date.now() - this.sessionStartTime
      };
      
      return JSON.stringify(metrics, null, 2);
    } catch (error) {
      logger.error('Failed to export metrics', 'PerformanceMonitor', error);
      return '';
    }
  }

  public resetMetrics(): void {
    this.appMetrics = {
      screenLoadTimes: {},
      apiResponseTimes: {},
      userInteractions: {},
      memoryUsage: 0,
      crashCount: 0,
      sessionDuration: 0
    };
    
    this.sessionStartTime = Date.now();
    logger.info('Performance metrics reset', 'PerformanceMonitor');
  }

  public destroy(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();


