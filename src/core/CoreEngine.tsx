import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { coreService } from './CoreService';
import { asyncStorageManager } from '../utils/AsyncStorageManager';

interface CoreEngineContextType {
  coreService: typeof coreService;
  authService: typeof coreService.authService;
  movieService: typeof coreService.movieService;
  userDataManager: typeof coreService.userDataManager;
  tmdbService: typeof coreService.tmdbService;
  firestoreService: typeof coreService.firestoreService;
  realTimeWatchingService: typeof coreService.realTimeWatchingService;
}

const CoreEngineContext = createContext<CoreEngineContextType | null>(null);

interface CoreEngineProps {
  children: ReactNode;
}

export const CoreEngine: React.FC<CoreEngineProps> = ({ children }) => {
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        console.log('Starting Core Engine initialization...');
        
        // First, check if AsyncStorage is available
        const isAsyncStorageAvailable = await asyncStorageManager.initialize();
        if (!isAsyncStorageAvailable) {
          console.warn('AsyncStorage Manager not available, some features may not work properly');
        }

        // Initialize CoreService
        await coreService.initialize();
        
        // Inject firestoreService into UserDataManager
        coreService.userDataManager.setFirestoreService(coreService.firestoreService);
        
        console.log('Core Engine initialized successfully');
        console.log('TMDB Service available:', !!coreService.tmdbService);
        console.log('AsyncStorage available:', isAsyncStorageAvailable);
        console.log('Service status:', coreService.getServiceStatus());
        
      } catch (error) {
        console.error('Failed to initialize Core Engine:', error);
      }
    };
    
    initializeEngine();
  }, []);

  // Context value'yu güvenli bir şekilde oluştur
  const contextValue: CoreEngineContextType = {
    coreService,
    authService: coreService?.authService || null as any,
    movieService: coreService?.movieService || null as any,
    userDataManager: coreService?.userDataManager || null as any,
    tmdbService: coreService?.tmdbService || null as any,
    firestoreService: coreService?.firestoreService || null as any,
    realTimeWatchingService: coreService?.realTimeWatchingService || null as any,
  };

  return (
    <CoreEngineContext.Provider value={contextValue}>
      {children}
    </CoreEngineContext.Provider>
  );
};

export const useCoreEngine = (): CoreEngineContextType => {
  const context = useContext(CoreEngineContext);
  if (!context) {
    throw new Error('useCoreEngine must be used within a CoreEngine');
  }
  return context;
};