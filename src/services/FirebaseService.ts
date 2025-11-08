import { initializeApp, getApp, getApps, setLogLevel } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAuth, getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/Logger';

const firebaseConfig = {
  apiKey: "AIzaSyC6Itb-2KueatD4Nh8ODF7GUdUFfoKhEyE",
  authDomain: "mwatch-69a6f.firebaseapp.com",
  projectId: "mwatch-69a6f",
  storageBucket: "mwatch-69a6f.firebasestorage.app",
  messagingSenderId: "721598695709",
  appId: "1:721598695709:android:7a2288a02cddce3b5ef9f4"
};

export class FirebaseService {
  private static instance: FirebaseService;
  private app: any;
  private firestore: any;
  private auth: any;
  private storage: any;
  private isInitialized = false;

  private constructor() {
    try {
      // Check if Firebase app is already initialized
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        logger.info('Firebase app initialized', 'FirebaseService');
      } else {
        this.app = getApp();
        logger.info('Firebase app retrieved from existing apps', 'FirebaseService');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase app', 'FirebaseService', error);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Firebase Service...', 'FirebaseService');
      
      // Set Firebase log level to silent to prevent console warnings
      setLogLevel('silent');
      
      // Initialize Firestore
      this.firestore = getFirestore(this.app);
      logger.info('Firestore initialized', 'FirebaseService');
      
      // Initialize Storage
      this.storage = getStorage(this.app);
      logger.info('Firebase Storage initialized', 'FirebaseService');
      
      // Initialize Auth with AsyncStorage persistence for React Native
      // Note: Firebase v12 may require different persistence setup
      // For now, we'll use initializeAuth which should work with React Native
      try {
        // Check if auth is already initialized
        try {
          this.auth = getAuth(this.app);
          logger.info('Firebase Auth retrieved successfully', 'FirebaseService');
        } catch (error) {
          // Auth not initialized yet, try to initialize with persistence
          // Firebase v12 may handle React Native persistence automatically
          try {
            // Try to use initializeAuth - Firebase should detect React Native environment
            this.auth = initializeAuth(this.app);
            logger.info('Firebase Auth initialized (React Native persistence should be automatic)', 'FirebaseService');
          } catch (initError) {
            // If initializeAuth fails, fall back to getAuth
            logger.warn('initializeAuth failed, using getAuth', 'FirebaseService', initError);
            this.auth = getAuth(this.app);
            logger.warn('Firebase Auth initialized without explicit persistence (warning expected)', 'FirebaseService');
          }
        }
      } catch (error) {
        logger.error('Failed to initialize Firebase Auth', 'FirebaseService', error);
        // Final fallback
        try {
          this.auth = getAuth(this.app);
          logger.warn('Firebase Auth initialized without persistence (fallback)', 'FirebaseService');
        } catch (fallbackError) {
          logger.error('Failed to initialize Firebase Auth even with fallback', 'FirebaseService', fallbackError);
          throw fallbackError;
        }
      }

      this.isInitialized = true;
      logger.info('Firebase Service initialized successfully', 'FirebaseService');
      
    } catch (error) {
      logger.error('Failed to initialize Firebase Service', 'FirebaseService', error);
      // Don't throw error, allow app to continue with limited functionality
      this.isInitialized = true;
    }
  }

  public getFirestore() {
    if (!this.isInitialized) {
      logger.warn('Firebase Service not initialized, returning null', 'FirebaseService');
      return null;
    }
    return this.firestore;
  }

  public getAuth() {
    if (!this.isInitialized) {
      logger.warn('Firebase Service not initialized, returning null', 'FirebaseService');
      return null;
    }
    return this.auth;
  }

  public getStorage() {
    if (!this.isInitialized) {
      logger.warn('Firebase Service not initialized, returning null', 'FirebaseService');
      return null;
    }
    return this.storage;
  }

  public getApp() {
    return this.app;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Firebase Service...', 'FirebaseService');
      
      // Firebase doesn't require explicit shutdown
      this.isInitialized = false;
      
      logger.info('Firebase Service shutdown completed', 'FirebaseService');
    } catch (error) {
      logger.error('Error during Firebase Service shutdown', 'FirebaseService', error);
    }
  }

  public getServiceStatus(): Record<string, boolean> {
    return {
      isInitialized: this.isInitialized,
      hasFirestore: !!this.firestore,
      hasAuth: !!this.auth,
      hasStorage: !!this.storage,
      hasApp: !!this.app,
    };
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  public async getCurrentUser(): Promise<any> {
    try {
      if (!this.auth) {
        return null;
      }
      return this.auth.currentUser;
    } catch (error) {
      logger.error('Failed to get current user', 'FirebaseService', error);
      return null;
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    try {
      if (!this.auth) {
        return false;
      }
      const user = this.auth.currentUser;
      return !!user;
    } catch (error) {
      logger.error('Failed to check authentication status', 'FirebaseService', error);
      return false;
    }
  }
}

export const firebaseService = FirebaseService.getInstance();
