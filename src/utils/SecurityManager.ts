import { asyncStorageManager } from './AsyncStorageManager';
import { logger } from './Logger';
import { errorHandler, ErrorType } from './ErrorHandler';

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in milliseconds
  sessionTimeout: number; // in milliseconds
  enableBiometric: boolean;
  enablePinCode: boolean;
  requireStrongPassword: boolean;
}

export interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'suspicious_activity' | 'session_timeout';
  timestamp: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private loginAttempts = new Map<string, { count: number; lastAttempt: number; locked: boolean }>();
  private securityEvents: SecurityEvent[] = [];
  private sessionStartTime?: number;
  private sessionTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      maxLoginAttempts: 50, // High limit for development but still secure
      lockoutDuration: 30 * 1000, // Only 30 seconds lockout
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      enableBiometric: false,
      enablePinCode: false,
      requireStrongPassword: false // Disabled for easier development
    };
    
    this.initializeSecurity();
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  private async initializeSecurity(): Promise<void> {
    try {
      await this.loadSecurityData();
      this.startSessionMonitoring();
      logger.info('Security manager initialized', 'SecurityManager');
    } catch (error) {
      logger.error('Failed to initialize security manager', 'SecurityManager', error);
    }
  }

  private async loadSecurityData(): Promise<void> {
    try {
      const stored = await asyncStorageManager.getItem('security_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.loginAttempts = new Map(data.loginAttempts || []);
        this.securityEvents = data.securityEvents || [];
      }
    } catch (error) {
      logger.error('Failed to load security data', 'SecurityManager', error);
    }
  }

  private async saveSecurityData(): Promise<void> {
    try {
      const data = {
        loginAttempts: Array.from(this.loginAttempts.entries()),
        securityEvents: this.securityEvents.slice(-1000) // Keep last 1000 events
      };
      await asyncStorageManager.setItem('security_data', JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save security data', 'SecurityManager', error);
    }
  }

  private startSessionMonitoring(): void {
    this.sessionTimer = setInterval(() => {
      this.checkSessionTimeout();
    }, 60000); // Check every minute
  }

  private checkSessionTimeout(): void {
    if (this.sessionStartTime) {
      const sessionDuration = Date.now() - this.sessionStartTime;
      if (sessionDuration > this.config.sessionTimeout) {
        this.handleSessionTimeout();
      }
    }
  }

  private handleSessionTimeout(): void {
    this.logSecurityEvent('session_timeout', {
      sessionDuration: Date.now() - (this.sessionStartTime || 0)
    });
    
    // Force logout
    this.endSession();
    logger.warn('Session timeout - user logged out', 'SecurityManager');
  }

  public startSession(userId: string): void {
    this.sessionStartTime = Date.now();
    this.logSecurityEvent('login_success', { userId });
    logger.info(`User session started: ${userId}`, 'SecurityManager');
  }

  public endSession(): void {
    if (this.sessionStartTime) {
      const sessionDuration = Date.now() - this.sessionStartTime;
      logger.info(`User session ended. Duration: ${sessionDuration}ms`, 'SecurityManager');
    }
    
    this.sessionStartTime = undefined;
  }

  public async recordLoginAttempt(email: string, success: boolean): Promise<boolean> {
    const now = Date.now();
    const attempt = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0, locked: false };
    
    if (success) {
      // Reset attempts on successful login
      this.loginAttempts.delete(email);
      this.logSecurityEvent('login_success', { email });
      await this.saveSecurityData();
      return true;
    }
    
    // Check if account is locked
    if (attempt.locked && (now - attempt.lastAttempt) < this.config.lockoutDuration) {
      this.logSecurityEvent('login_attempt', { email, blocked: true, reason: 'account_locked' });
      return false;
    }
    
    // Reset lockout if duration has passed
    if (attempt.locked && (now - attempt.lastAttempt) >= this.config.lockoutDuration) {
      attempt.locked = false;
      attempt.count = 0;
    }
    
    // Increment attempt count
    attempt.count++;
    attempt.lastAttempt = now;
    
    // Check if max attempts reached
    if (attempt.count >= this.config.maxLoginAttempts) {
      attempt.locked = true;
      this.logSecurityEvent('suspicious_activity', { 
        email, 
        type: 'account_locked',
        attempts: attempt.count 
      });
      
      errorHandler.handleError({
        type: ErrorType.AUTHENTICATION,
        message: 'Hesap güvenlik nedeniyle geçici olarak kilitlendi',
        code: 'ACCOUNT_LOCKED',
        context: 'SecurityManager',
        data: { email, attempts: attempt.count },
        timestamp: new Date().toISOString()
      });
    }
    
    this.loginAttempts.set(email, attempt);
    this.logSecurityEvent('login_failure', { email, attempts: attempt.count });
    await this.saveSecurityData();
    
    return !attempt.locked;
  }

  public isAccountLocked(email: string): boolean {
    const attempt = this.loginAttempts.get(email);
    if (!attempt) return false;
    
    const now = Date.now();
    if (attempt.locked && (now - attempt.lastAttempt) < this.config.lockoutDuration) {
      return true;
    }
    
    // Reset if lockout duration has passed
    if (attempt.locked && (now - attempt.lastAttempt) >= this.config.lockoutDuration) {
      attempt.locked = false;
      attempt.count = 0;
      this.loginAttempts.set(email, attempt);
    }
    
    return false;
  }

  public getRemainingLockoutTime(email: string): number {
    const attempt = this.loginAttempts.get(email);
    if (!attempt || !attempt.locked) return 0;
    
    const now = Date.now();
    const elapsed = now - attempt.lastAttempt;
    const remaining = this.config.lockoutDuration - elapsed;
    
    return Math.max(0, remaining);
  }

  private logSecurityEvent(type: SecurityEvent['type'], metadata?: any): void {
    const event: SecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.securityEvents.push(event);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }
    
    logger.info(`Security event: ${type}`, 'SecurityManager', metadata);
  }

  public validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Şifre en az 8 karakter olmalıdır');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Şifre en az bir büyük harf içermelidir');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Şifre en az bir küçük harf içermelidir');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Şifre en az bir rakam içermelidir');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Şifre en az bir özel karakter içermelidir');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  public generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public async getSecurityReport(): Promise<{
    loginAttempts: number;
    lockedAccounts: number;
    securityEvents: SecurityEvent[];
    sessionDuration: number;
  }> {
    const lockedAccounts = Array.from(this.loginAttempts.values())
      .filter(attempt => attempt.locked).length;
    
    return {
      loginAttempts: Array.from(this.loginAttempts.values())
        .reduce((sum, attempt) => sum + attempt.count, 0),
      lockedAccounts,
      securityEvents: this.securityEvents.slice(-100), // Last 100 events
      sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0
    };
  }

  public setConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public destroy(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
  }

  public unlockAccount(email: string): void {
    const sanitizedEmail = this.sanitizeInput(email);
    this.loginAttempts.delete(sanitizedEmail);
    logger.info(`Account unlocked for: ${sanitizedEmail}`, 'SecurityManager');
  }

  public clearAllLocks(): void {
    this.loginAttempts.clear();
    logger.info('All account locks cleared', 'SecurityManager');
  }
}

export const securityManager = SecurityManager.getInstance();


