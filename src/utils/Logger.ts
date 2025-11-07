import { asyncStorageManager } from './AsyncStorageManager';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;
  private maxLogs = 1000;
  private sessionId: string;
  private userId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeLogging();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeLogging(): Promise<void> {
    try {
      // Clear old logs periodically
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('Logger initialization failed:', error);
    }
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private async log(level: LogLevel, message: string, context?: string, data?: any): Promise<void> {
    if (level < this.logLevel) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      userId: this.userId,
      sessionId: this.sessionId
    };

    // Console logging for development
    if (__DEV__) {
      const levelName = LogLevel[level];
      const prefix = `[${levelName}] ${logEntry.timestamp}`;
    }

    // Store logs for production
    if (!__DEV__) {
      await this.storeLog(logEntry);
    }

    // Send critical errors to monitoring service
    if (level >= LogLevel.ERROR) {
      await this.sendToMonitoring(logEntry);
    }
  }

  private async storeLog(logEntry: LogEntry): Promise<void> {
    try {
      const logs = await this.getStoredLogs();
      logs.push(logEntry);
      
      // Keep only recent logs
      if (logs.length > this.maxLogs) {
        logs.splice(0, logs.length - this.maxLogs);
      }
      
      await asyncStorageManager.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  private async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const logs = await asyncStorageManager.getItem('app_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      return [];
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const logs = await this.getStoredLogs();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const recentLogs = logs.filter(log => 
        new Date(log.timestamp) > oneWeekAgo
      );
      
      await asyncStorageManager.setItem('app_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
    }
  }

  private async sendToMonitoring(logEntry: LogEntry): Promise<void> {
    try {
      // In production, send to monitoring service (e.g., Sentry, Crashlytics)
      // For now, just store in AsyncStorage
      const criticalLogs = await asyncStorageManager.getItem('critical_logs');
      const logs = criticalLogs ? JSON.parse(criticalLogs) : [];
      logs.push(logEntry);
      
      // Keep only last 100 critical logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await asyncStorageManager.setItem('critical_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to send to monitoring:', error);
    }
  }

  public async getLogs(level?: LogLevel, limit?: number): Promise<LogEntry[]> {
    try {
      const logs = await this.getStoredLogs();
      let filteredLogs = logs;
      
      if (level !== undefined) {
        filteredLogs = logs.filter(log => log.level >= level);
      }
      
      if (limit) {
        filteredLogs = filteredLogs.slice(-limit);
      }
      
      return filteredLogs.reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  public async exportLogs(): Promise<string> {
    try {
      const logs = await this.getLogs();
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '';
    }
  }

  // Public logging methods
  public debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  public info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  public warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  public error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  public critical(message: string, context?: string, data?: any): void {
    this.log(LogLevel.CRITICAL, message, context, data);
  }
}

export const logger = Logger.getInstance();


