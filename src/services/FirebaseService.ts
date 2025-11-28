import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/Logger';
import * as FirebaseApp from 'firebase/app';
import * as FirebaseFirestore from 'firebase/firestore';
import * as FirebaseAuth from 'firebase/auth';
import * as FirebaseStorage from 'firebase/storage';

const getReactNativePersistence =
  typeof (FirebaseAuth as any)?.getReactNativePersistence === 'function'
    ? (FirebaseAuth as any).getReactNativePersistence
    : null;

if (!getReactNativePersistence && __DEV__) {
  console.warn('[FirebaseService] getReactNativePersistence not available, Firebase will use default persistence');
}

const firebaseConfig = {
  apiKey: "AIzaSyCb7O_gdgIZFU-Yo-Iaqr09YG4wxR83lrc",
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
    // Constructor'da Firebase'i başlatma, initialize() metodunda yapılacak
    // Bu şekilde lazy loading ile modüller yüklenecek
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (logger) {
        logger.info('Initializing Firebase Service...', 'FirebaseService');
      } else {
        console.log('[FirebaseService] Initializing Firebase Service...');
      }

      if (typeof FirebaseApp.initializeApp !== 'function') {
        throw new Error('firebase/app initializeApp is not available. Check Firebase installation.');
      }

      // Firebase app'i başlat
      try {
        this.app = FirebaseApp.initializeApp(firebaseConfig);
        if (logger) {
          logger.info('Firebase app initialized', 'FirebaseService');
        } else {
          console.log('[FirebaseService] Firebase app initialized');
        }
      } catch (error: any) {
        const alreadyExists =
          typeof error?.message === 'string' &&
          (error.message.includes('already exists') || error.code === 'app/duplicate-app');

        if (alreadyExists) {
          try {
            if (typeof FirebaseApp.getApp !== 'function') {
              throw new Error('firebase/app getApp is not available. Check Firebase installation.');
            }
            this.app = FirebaseApp.getApp();
            if (logger) {
              logger.info('Firebase app retrieved from existing apps', 'FirebaseService');
            } else {
              console.log('[FirebaseService] Firebase app retrieved from existing apps');
            }
          } catch (getAppError) {
            if (logger) {
              logger.error('Failed to get existing Firebase app', 'FirebaseService', getAppError);
            } else {
              console.error('[FirebaseService] Failed to get existing Firebase app:', getAppError);
            }
            throw getAppError;
          }
        } else {
          throw error;
        }
      }
      
      // Set Firebase log level to silent to prevent console warnings
      if (typeof FirebaseApp.setLogLevel === 'function') {
        FirebaseApp.setLogLevel('silent');
      }
      
      // Initialize Firestore
      if (!FirebaseFirestore.getFirestore || typeof FirebaseFirestore.getFirestore !== 'function') {
        throw new Error('firebase/firestore getFirestore is not available. Check Firebase installation.');
      }
      this.firestore = FirebaseFirestore.getFirestore(this.app);
      if (logger) {
        logger.info('Firestore initialized', 'FirebaseService');
      } else {
        console.log('[FirebaseService] Firestore initialized');
      }
      
      // Initialize Storage
      if (!FirebaseStorage.getStorage || typeof FirebaseStorage.getStorage !== 'function') {
        throw new Error('firebase/storage getStorage is not available. Check Firebase installation.');
      }
      this.storage = FirebaseStorage.getStorage(this.app);
      if (logger) {
        logger.info('Firebase Storage initialized', 'FirebaseService');
      } else {
        console.log('[FirebaseService] Firebase Storage initialized');
      }
      
      // Initialize Auth with AsyncStorage persistence for React Native
      try {
        if (!FirebaseAuth.getAuth || typeof FirebaseAuth.getAuth !== 'function' || 
            !FirebaseAuth.initializeAuth || typeof FirebaseAuth.initializeAuth !== 'function') {
          throw new Error('firebase/auth functions are not available. Check Firebase installation.');
        }
        
        // Check if auth is already initialized
        try {
          this.auth = FirebaseAuth.getAuth(this.app);
          if (logger) {
            logger.info('Firebase Auth retrieved successfully', 'FirebaseService');
          } else {
            console.log('[FirebaseService] Firebase Auth retrieved successfully');
          }
        } catch (getAuthError) {
          // Auth not initialized yet, initialize with AsyncStorage persistence if available
          if (getReactNativePersistence) {
            this.auth = FirebaseAuth.initializeAuth(this.app, {
              persistence: getReactNativePersistence(AsyncStorage)
            });
            if (logger) {
              logger.info('Firebase Auth initialized with AsyncStorage persistence', 'FirebaseService');
            } else {
              console.log('[FirebaseService] Firebase Auth initialized with AsyncStorage persistence');
            }
          } else {
            // Fallback: Firebase React Native automatically uses AsyncStorage
            this.auth = FirebaseAuth.initializeAuth(this.app);
            if (logger) {
              logger.info('Firebase Auth initialized (using default React Native persistence)', 'FirebaseService');
            } else {
              console.log('[FirebaseService] Firebase Auth initialized (using default React Native persistence)');
            }
          }
        }
      } catch (error) {
        if (logger) {
          logger.error('Failed to initialize Firebase Auth', 'FirebaseService', error);
        } else {
          console.error('[FirebaseService] Failed to initialize Firebase Auth:', error);
        }
        // Final fallback to getAuth
        try {
          this.auth = FirebaseAuth.getAuth(this.app);
          if (logger) {
            logger.warn('Firebase Auth initialized with getAuth (fallback)', 'FirebaseService');
          } else {
            console.warn('[FirebaseService] Firebase Auth initialized with getAuth (fallback)');
          }
        } catch (fallbackError) {
          if (logger) {
            logger.error('Failed to initialize Firebase Auth even with fallback', 'FirebaseService', fallbackError);
          } else {
            console.error('[FirebaseService] Failed to initialize Firebase Auth even with fallback:', fallbackError);
          }
          throw fallbackError;
        }
      }

      this.isInitialized = true;
      if (logger) {
        logger.info('Firebase Service initialized successfully', 'FirebaseService');
      } else {
        console.log('[FirebaseService] Firebase Service initialized successfully');
      }
      
    } catch (error) {
      if (logger) {
        logger.error('Failed to initialize Firebase Service', 'FirebaseService', error);
      } else {
        console.error('[FirebaseService] Failed to initialize Firebase Service:', error);
      }
      // Don't throw error, allow app to continue with limited functionality
      this.isInitialized = true;
    }
  }

  public getFirestore() {
    if (!this.isInitialized) {
      if (logger) {
        logger.warn('Firebase Service not initialized, returning null', 'FirebaseService');
      }
      return null;
    }
    return this.firestore;
  }

  public getAuth() {
    if (!this.isInitialized) {
      if (logger) {
        logger.warn('Firebase Service not initialized, returning null', 'FirebaseService');
      }
      return null;
    }
    return this.auth;
  }

  public getStorage() {
    if (!this.isInitialized) {
      if (logger) {
        logger.warn('Firebase Service not initialized, returning null', 'FirebaseService');
      }
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
      if (logger) {
        logger.info('Shutting down Firebase Service...', 'FirebaseService');
      }
      
      // Firebase doesn't require explicit shutdown
      this.isInitialized = false;
      
      if (logger) {
        logger.info('Firebase Service shutdown completed', 'FirebaseService');
      }
    } catch (error) {
      if (logger) {
        logger.error('Error during Firebase Service shutdown', 'FirebaseService', error);
      } else {
        console.error('[FirebaseService] Error during shutdown:', error);
      }
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
      if (logger) {
        logger.error('Failed to get current user', 'FirebaseService', error);
      } else {
        console.error('[FirebaseService] Failed to get current user:', error);
      }
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
      if (logger) {
        logger.error('Failed to check authentication status', 'FirebaseService', error);
      } else {
        console.error('[FirebaseService] Failed to check authentication status:', error);
      }
      return false;
    }
  }
}

export const firebaseService = FirebaseService.getInstance();
