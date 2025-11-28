import { logger } from '../utils/Logger';
import { errorHandler, ErrorType } from '../utils/ErrorHandler';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { securityManager } from '../utils/SecurityManager';

export class AuthService {
  private static instance: AuthService;
  private firebaseService: any = null;
  private analyticsService: any = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public setFirebaseService(service: any): void {
    this.firebaseService = service;
  }

  public setAnalyticsService(service: any): void {
    this.analyticsService = service;
  }

  public async initialize(): Promise<void> {
    // Clear any existing locks for development/testing
    securityManager.clearAllLocks();
    logger.info('AuthService initialized - all locks cleared for development', 'AuthService');
  }

  // Development helper method
  public unlockAccount(email: string): void {
    securityManager.unlockAccount(email);
    logger.info(`Account unlocked for development: ${email}`, 'AuthService');
  }

  public async signIn(email: string, password: string): Promise<any> {
    performanceMonitor.startMetric('auth_signin');
    
    try {
      // Security check
      const canLogin = await securityManager.recordLoginAttempt(email, false);
      if (!canLogin) {
        const lockoutTime = securityManager.getRemainingLockoutTime(email);
        throw new Error(`Hesap geçici olarak kilitlendi. ${Math.ceil(lockoutTime / 60000)} dakika sonra tekrar deneyin.`);
      }

      // Only use real Firebase authentication - no mock data

      // Implement Firebase Auth sign in with retry mechanism
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      if (!this.firebaseService) {
        throw new Error('Firebase service not initialized');
      }
      
      const auth = this.firebaseService.getAuth();
      
      if (!auth) {
        throw new Error('Firebase Auth not available');
      }
      
      // Retry mechanism for network issues with exponential backoff
      let user;
      let retryCount = 0;
      const maxRetries = 5; // Increased retry count
      
      while (retryCount < maxRetries) {
        try {
          user = await signInWithEmailAndPassword(auth, email, password);
          break; // Success, exit retry loop
        } catch (error: any) {
          retryCount++;
          if (error.code === 'auth/network-request-failed' && retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // Exponential backoff with max 10s
            logger.warn(`Network error, retrying... (${retryCount}/${maxRetries}) - waiting ${delay}ms`, 'AuthService');
            await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
            continue;
          }
          throw error; // Re-throw if not network error or max retries reached
        }
      }
      
      // Check if email is verified
      if (!user.user.emailVerified) {
        // Email doğrulanmamış - hata fırlat
        const verificationError = new Error('EMAIL_NOT_VERIFIED');
        (verificationError as any).user = user.user; // Kullanıcı bilgisini ekle
        logger.warn(`Email not verified: ${email}`, 'AuthService');
        throw verificationError;
      }
      
      // Record successful login
      await securityManager.recordLoginAttempt(email, true);
      securityManager.startSession(user.user.uid);
      
      if (this.analyticsService) {
        this.analyticsService.trackEvent('user_sign_in', { method: 'email' });
      }
      logger.info(`User signed in: ${email}`, 'AuthService');
      
      const duration = performanceMonitor.endMetric('auth_signin');
      logger.info(`Sign in completed in ${duration}ms`, 'AuthService');
      
      return user;
    } catch (error: any) {
      performanceMonitor.endMetric('auth_signin');
      logger.error('Sign in error', 'AuthService', error);
      errorHandler.handleFirebaseError(error, 'AuthService.signIn');
      throw error;
    }
  }

  public async signUp(email: string, password: string, firstName?: string, lastName?: string, username?: string, additionalData?: any): Promise<any> {
    performanceMonitor.startMetric('auth_signup');
    
    try {
      // Security validation
      const sanitizedEmail = securityManager.sanitizeInput(email);
      const sanitizedFirstName = firstName ? securityManager.sanitizeInput(firstName) : undefined;
      const sanitizedLastName = lastName ? securityManager.sanitizeInput(lastName) : undefined;
      const sanitizedUsername = username ? securityManager.sanitizeInput(username) : undefined;

      // Password strength validation
      const passwordValidation = securityManager.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Ensure Firebase is initialized
      await this.firebaseService.initialize();
      
      // Implement Firebase Auth sign up
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const auth = this.firebaseService.getAuth();
      
      if (!auth) {
        throw new Error('Firebase Auth başlatılamadı');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      
      // Update user profile with additional data
      const displayName = sanitizedFirstName 
        ? (sanitizedLastName ? `${sanitizedFirstName} ${sanitizedLastName}` : sanitizedFirstName)
        : sanitizedUsername || sanitizedEmail;
      await updateProfile(userCredential.user, { displayName });
      
      // NOT: Email verification RegisterScreen'de gönderilecek (fotoğraflar yüklendikten sonra)
      
      // Store additional user data in Firestore (if needed)
      if (additionalData) {
        logger.info('Additional user data received', 'AuthService', additionalData);
      }
      
      if (this.analyticsService) {
        this.analyticsService.trackEvent('user_sign_up', { method: 'email' });
      }
      logger.info(`User signed up: ${sanitizedEmail}`, 'AuthService');
      
      const duration = performanceMonitor.endMetric('auth_signup');
      logger.info(`Sign up completed in ${duration}ms`, 'AuthService');
      
      return userCredential;
    } catch (error: any) {
      performanceMonitor.endMetric('auth_signup');
      logger.error('Sign up error', 'AuthService', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        const userFriendlyError = new Error('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin veya farklı bir e-posta adresi kullanın.');
        errorHandler.handleError({
          type: ErrorType.AUTHENTICATION,
          message: userFriendlyError.message,
          context: 'AuthService.signUp',
          data: error,
          timestamp: new Date().toISOString()
        });
        throw userFriendlyError;
      } else if (error.code === 'auth/weak-password') {
        const userFriendlyError = new Error('Şifre çok zayıf. En az 6 karakter olmalıdır.');
        errorHandler.handleError({
          type: ErrorType.AUTHENTICATION,
          message: userFriendlyError.message,
          context: 'AuthService.signUp',
          data: error,
          timestamp: new Date().toISOString()
        });
        throw userFriendlyError;
      } else if (error.code === 'auth/invalid-email') {
        const userFriendlyError = new Error('Geçersiz e-posta adresi formatı.');
        errorHandler.handleError({
          type: ErrorType.AUTHENTICATION,
          message: userFriendlyError.message,
          context: 'AuthService.signUp',
          data: error,
          timestamp: new Date().toISOString()
        });
        throw userFriendlyError;
      } else if (error.code === 'auth/network-request-failed') {
        const userFriendlyError = new Error('İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
        errorHandler.handleError({
          type: ErrorType.NETWORK,
          message: userFriendlyError.message,
          context: 'AuthService.signUp',
          data: error,
          timestamp: new Date().toISOString()
        });
        throw userFriendlyError;
      } else {
        // Handle other errors
        errorHandler.handleFirebaseError(error, 'AuthService.signUp');
        throw error;
      }
    }
  }

  public async resendVerificationEmail(user?: any): Promise<void> {
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      const auth = this.firebaseService.getAuth();
      
      if (!auth) {
        throw new Error('Firebase Auth başlatılamadı');
      }

      const currentUser = user || auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      if (currentUser.emailVerified) {
        logger.info('Email already verified', 'AuthService');
        return;
      }

      await sendEmailVerification(currentUser, {
        url: 'https://mwatch-69a6f.firebaseapp.com',
        handleCodeInApp: false,
      });
      
      logger.info('Verification email resent', 'AuthService');
    } catch (error) {
      logger.error('Failed to resend verification email', 'AuthService', error);
      throw error;
    }
  }

  public async checkEmailVerification(): Promise<boolean> {
    try {
      const auth = this.firebaseService.getAuth();
      if (!auth || !auth.currentUser) {
        return false;
      }

      // Reload user to get latest emailVerified status
      await auth.currentUser.reload();
      return auth.currentUser.emailVerified;
    } catch (error) {
      logger.error('Failed to check email verification', 'AuthService', error);
      return false;
    }
  }

  public async signOut(): Promise<void> {
    try {
      const { signOut } = await import('firebase/auth');
      const auth = this.firebaseService.getAuth();
      await signOut(auth);
      
      securityManager.endSession();
      if (this.analyticsService) {
        this.analyticsService.trackEvent('user_sign_out');
      }
      logger.info('User signed out', 'AuthService');
    } catch (error) {
      logger.error('Sign out error', 'AuthService', error);
      errorHandler.handleError({
        type: ErrorType.AUTHENTICATION,
        message: 'Sign out failed',
        context: 'AuthService',
        data: error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  public async getCurrentUser(): Promise<any> {
    return this.firebaseService.getCurrentUser();
  }

  public async isAuthenticated(): Promise<boolean> {
    return this.firebaseService.isAuthenticated();
  }

  public async sendEmailVerification(): Promise<void> {
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      const auth = this.firebaseService.getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Kullanıcı oturum açmamış');
      }
      
      await sendEmailVerification(user);
      logger.info('E-posta doğrulama maili gönderildi', 'AuthService');
    } catch (error: any) {
      logger.error('E-posta doğrulama gönderme hatası', 'AuthService', error);
      throw new Error('E-posta doğrulama maili gönderilemedi');
    }
  }

  public onAuthStateChanged(callback: (user: any) => void): () => void {
    try {
      // Get Firebase Auth directly from FirebaseService
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      if (!auth) {
        logger.warn('Firebase Auth not initialized, cannot set up auth state listener', 'AuthService');
        return () => {}; // Return empty unsubscribe function
      }
      
      const { onAuthStateChanged } = require('firebase/auth');
      return onAuthStateChanged(auth, callback);
    } catch (error) {
      logger.error('Error setting up auth state listener', 'AuthService', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  public async isEmailVerified(): Promise<boolean> {
    try {
      const { getAuth } = require('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        return false;
      }
      
      // Refresh user data to get latest email verification status
      await user.reload();
      return user.emailVerified;
    } catch (error) {
      logger.error('E-posta doğrulama kontrolü hatası', 'AuthService', error);
      return false;
    }
  }

  public async reloadUser(): Promise<void> {
    try {
      const auth = this.firebaseService.getAuth();
      const user = auth.currentUser;
      
      if (user) {
        await user.reload();
      }
    } catch (error) {
      logger.error('Kullanıcı yenileme hatası', 'AuthService', error);
    }
  }
}

export const authService = AuthService.getInstance();
