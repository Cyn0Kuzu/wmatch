import { logger } from './Logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  API = 'API',
  UI = 'UI',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  context?: string;
  data?: any;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  stack?: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount = 0;
  private maxErrorsPerSession = 50;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof global !== 'undefined') {
      global.addEventListener?.('unhandledrejection', (event: any) => {
        this.handleError({
          type: ErrorType.UNKNOWN,
          message: 'Unhandled Promise Rejection',
          data: { reason: event.reason },
          timestamp: new Date().toISOString()
        });
      });
    }

    // Handle JavaScript errors
    if (typeof ErrorUtils !== 'undefined') {
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        this.handleError({
          type: ErrorType.UNKNOWN,
          message: error.message,
          stack: error.stack,
          data: { isFatal },
          timestamp: new Date().toISOString()
        });
        
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  public handleError(error: AppError): void {
    this.errorCount++;
    
    // Prevent error spam
    if (this.errorCount > this.maxErrorsPerSession) {
      return;
    }

    // Log the error
    logger.error(error.message, error.context, {
      type: error.type,
      code: error.code,
      data: error.data,
      stack: error.stack
    });

    // Handle specific error types
    switch (error.type) {
      case ErrorType.NETWORK:
        this.handleNetworkError(error);
        break;
      case ErrorType.AUTHENTICATION:
        this.handleAuthError(error);
        break;
      case ErrorType.VALIDATION:
        this.handleValidationError(error);
        break;
      case ErrorType.DATABASE:
        this.handleDatabaseError(error);
        break;
      case ErrorType.API:
        this.handleApiError(error);
        break;
      default:
        this.handleUnknownError(error);
    }
  }

  private handleNetworkError(error: AppError): void {
    // Network error specific handling
    logger.warn('Network error occurred', 'ErrorHandler', error);
  }

  private handleAuthError(error: AppError): void {
    // Authentication error specific handling
    logger.warn('Authentication error occurred', 'ErrorHandler', error);
  }

  private handleValidationError(error: AppError): void {
    // Validation error specific handling
    logger.info('Validation error occurred', 'ErrorHandler', error);
  }

  private handleDatabaseError(error: AppError): void {
    // Database error specific handling
    logger.error('Database error occurred', 'ErrorHandler', error);
  }

  private handleApiError(error: AppError): void {
    // API error specific handling
    logger.error('API error occurred', 'ErrorHandler', error);
  }

  private handleUnknownError(error: AppError): void {
    // Unknown error specific handling
    logger.critical('Unknown error occurred', 'ErrorHandler', error);
  }

  public createError(
    type: ErrorType,
    message: string,
    code?: string,
    context?: string,
    data?: any
  ): AppError {
    return {
      type,
      message,
      code,
      context,
      data,
      timestamp: new Date().toISOString()
    };
  }

  public handleFirebaseError(error: any, context?: string): void {
    const errorCode = error?.code || 'unknown';
    const errorType = this.getFirebaseErrorType(errorCode);
    const userMessage = this.getFirebaseUserMessage(errorCode);
    
    this.handleError({
      type: errorType,
      message: userMessage,
      code: errorCode,
      context,
      data: error,
      timestamp: new Date().toISOString()
    });
  }

  private getFirebaseErrorType(code: string): ErrorType {
    if (!code) {
      return ErrorType.UNKNOWN;
    }
    
    if (code.startsWith('auth/')) {
      return ErrorType.AUTHENTICATION;
    } else if (code.startsWith('firestore/')) {
      return ErrorType.DATABASE;
    } else if (code.includes('network')) {
      return ErrorType.NETWORK;
    }
    return ErrorType.UNKNOWN;
  }

  private getFirebaseUserMessage(code: string): string {
    if (!code) {
      return 'Bilinmeyen bir hata oluştu';
    }
    
    const messages: { [key: string]: string } = {
      'auth/network-request-failed': 'İnternet bağlantınızı kontrol edin ve tekrar deneyin. Firebase sunucularına erişim sağlanamıyor.',
      'auth/too-many-requests': 'Çok fazla başarısız deneme. Lütfen bir süre bekleyin.',
      'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
      'auth/invalid-credential': 'E-posta veya şifre hatalı.',
      'auth/email-already-in-use': 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin veya farklı bir e-posta adresi kullanın.',
      'auth/weak-password': 'Şifre çok zayıf. En az 6 karakter olmalıdır',
      'auth/invalid-email': 'Geçersiz e-posta adresi',
      'auth/user-not-found': 'Kullanıcı bulunamadı',
      'auth/wrong-password': 'Hatalı şifre',
      'auth/too-many-requests-2': 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin',
      'firestore/permission-denied': 'Bu işlem için yetkiniz yok',
      'firestore/unavailable': 'Servis şu anda kullanılamıyor',
      'firestore/deadline-exceeded': 'İşlem zaman aşımına uğradı'
    };
    
    return messages[code] || 'Beklenmeyen bir hata oluştu';
  }

  public async getErrorReport(): Promise<string> {
    try {
      const logs = await logger.getLogs('ERROR' as any);
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      return 'Error report generation failed';
    }
  }
}

export const errorHandler = ErrorHandler.getInstance();
