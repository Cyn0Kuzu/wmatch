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
        
        // First, check if AsyncStorage is available
        const isAsyncStorageAvailable = await asyncStorageManager.initialize();
        if (!isAsyncStorageAvailable) {
          console.warn('AsyncStorage Manager not available, some features may not work properly');
        }

        // Initialize CoreService
        await coreService.initialize();
        
        // Inject firestoreService into UserDataManager
        coreService.userDataManager.setFirestoreService(coreService.firestoreService);
        
        
      } catch (error) {
        console.error('Failed to initialize Core Engine:', error);
      }
    };
    
    initializeEngine();
  }, []);

  const contextValue: CoreEngineContextType = {
    coreService,
    authService: coreService.authService,
    movieService: coreService.movieService,
    userDataManager: coreService.userDataManager,
    tmdbService: coreService.tmdbService,
    firestoreService: coreService.firestoreService,
    realTimeWatchingService: coreService.realTimeWatchingService,
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