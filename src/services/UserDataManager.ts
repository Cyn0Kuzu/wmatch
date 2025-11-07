import { FirestoreService, UserProfile } from './FirestoreService';
import { logger } from '../utils/Logger';
import { performanceMonitor } from '../utils/PerformanceMonitor';

// Helper function to clean undefined values from objects
const cleanUndefinedValues = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

export interface UserMovieData {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: 'movie' | 'tv';
  [key: string]: any;
}

export class UserDataManager {
  private static instance: UserDataManager;
  private firestoreService: FirestoreService | null = null;
  private userProfileCache = new Map<string, UserProfile>();

  private constructor() {}

  public static getInstance(): UserDataManager {
    if (!UserDataManager.instance) {
      UserDataManager.instance = new UserDataManager();
    }
    return UserDataManager.instance;
  }

  public setFirestoreService(service: FirestoreService): void {
    this.firestoreService = service;
    logger.info('FirestoreService injected into UserDataManager', 'UserDataManager');
  }

  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (this.userProfileCache.has(userId)) {
      return this.userProfileCache.get(userId) || null;
    }

    try {
      performanceMonitor.startMetric('user_data_get_profile');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      
      if (!userDoc) {
        return null;
      }

      this.userProfileCache.set(userId, userDoc);
      
      const duration = performanceMonitor.endMetric('user_data_get_profile');
      logger.info(`User profile retrieved in ${duration}ms`, 'UserDataManager');
      
      return userDoc;
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_get_profile');
      logger.error('Failed to get user profile', 'UserDataManager', error);
      return null;
    }
  }

  public async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_update_profile');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      await this.firestoreService.updateUserDocument(userId, updates);
      this.userProfileCache.delete(userId);
      
      const duration = performanceMonitor.endMetric('user_data_update_profile');
      logger.info(`User profile updated in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_update_profile');
      logger.error('Failed to update user profile', 'UserDataManager', error);
      throw error;
    }
  }

  public async getFavorites(userId: string): Promise<UserMovieData[]> {
    try {
      const userProfile = await this.getUserProfile(userId);
      return (userProfile as any)?.favorites || [];
    } catch (error) {
      logger.error('Failed to get favorites', 'UserDataManager', error);
      return [];
    }
  }

  public async getWatchedContent(userId: string): Promise<UserMovieData[]> {
    try {
        const userProfile = await this.getUserProfile(userId);
        return (userProfile as any)?.watchedContent || [];
    } catch (error) {
        logger.error('Failed to get watched content', 'UserDataManager', error);
        return [];
    }
  }

  public async getCurrentlyWatching(userId: string): Promise<UserMovieData[]> {
    try {
        const userProfile = await this.getUserProfile(userId);
        return (userProfile as any)?.currentlyWatching || [];
    } catch (error) {
        logger.error('Failed to get currently watching', 'UserDataManager', error);
        return [];
    }
  }

  public async startWatching(userId: string, movieData: UserMovieData): Promise<void> {
    try {
      const userDoc = await this.getUserProfile(userId);
      if (!userDoc) throw new Error('User not found');

      const currentlyWatching = (userDoc as any).currentlyWatching || [];
      const watchingData = cleanUndefinedValues({
        ...movieData,
        startedAt: new Date(),
      });

      const existingIndex = currentlyWatching.findIndex((item: any) => item.id === movieData.id);
      if (existingIndex >= 0) {
        currentlyWatching[existingIndex] = { ...currentlyWatching[existingIndex], ...watchingData };
      } else {
        currentlyWatching.push(watchingData);
      }

      await this.updateUserProfile(userId, { currentlyWatching } as any);
    } catch (error) {
      logger.error('Failed to start watching', 'UserDataManager', error);
      throw error;
    }
  }

  public async stopWatching(userId: string, movieId: number): Promise<void> {
    try {
        const userDoc = await this.getUserProfile(userId);
        if (!userDoc) throw new Error('User not found');

        const currentlyWatching = ((userDoc as any).currentlyWatching || []).filter((item: any) => item.id !== movieId);
        await this.updateUserProfile(userId, { currentlyWatching } as any);
    } catch (error) {
        logger.error('Failed to stop watching', 'UserDataManager', error);
        throw error;
    }
  }

  public async getUserCurrentlyWatchingWithLanguagePriority(userId: string): Promise<any[]> {
    return this.getCurrentlyWatching(userId);
  }
}

export const userDataManager = UserDataManager.getInstance();
