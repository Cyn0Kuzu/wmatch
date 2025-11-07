import { errorHandler } from './ErrorHandler';
import { logger } from './Logger';

/**
 * Global error handler for React Native
 * Catches unhandled errors and provides graceful degradation
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // Handle JavaScript errors
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error, isFatal) => {
        logger.error('Global JavaScript error', 'GlobalErrorHandler', {
          error: error.message,
          stack: error.stack,
          isFatal
        });

        // Handle AsyncStorage related errors specifically
        if (error.message.includes('getItem') || 
            error.message.includes('setItem') || 
            error.message.includes('AsyncStorage')) {
          logger.warn('AsyncStorage related error detected, continuing with limited functionality', 'GlobalErrorHandler');
          return; // Don't crash the app
        }

        // Call original handler for other errors
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });

      // Handle Promise rejections
      const originalUnhandledRejectionHandler = global.onunhandledrejection;
      global.onunhandledrejection = (event) => {
        logger.error('Unhandled Promise rejection', 'GlobalErrorHandler', {
          reason: event.reason,
          promise: event.promise
        });

        // Handle AsyncStorage related promise rejections
        if (event.reason && 
            (event.reason.message?.includes('getItem') || 
             event.reason.message?.includes('setItem') || 
             event.reason.message?.includes('AsyncStorage'))) {
          logger.warn('AsyncStorage related promise rejection detected, continuing', 'GlobalErrorHandler');
          event.preventDefault(); // Prevent crash
          return;
        }

        // Call original handler for other rejections
        if (originalUnhandledRejectionHandler) {
          originalUnhandledRejectionHandler(event);
        }
      };

      this.isInitialized = true;
      logger.info('Global error handler initialized', 'GlobalErrorHandler');
    } catch (error) {
      console.error('Failed to initialize global error handler:', error);
    }
  }

  public destroy(): void {
    // Reset to original handlers
    ErrorUtils.setGlobalHandler(ErrorUtils.getGlobalHandler());
    global.onunhandledrejection = undefined;
    this.isInitialized = false;
  }
}

export const globalErrorHandler = GlobalErrorHandler.getInstance();




