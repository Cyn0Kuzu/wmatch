import { FirestoreService } from './FirestoreService';
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
  name?: string; // For TV shows
  poster?: string;
  poster_path?: string; // TMDB poster path
  genre?: string;
  year?: number;
  release_date?: string; // TMDB release date
  first_air_date?: string; // TMDB first air date
  rating?: number;
  vote_average?: number; // TMDB rating
  overview?: string;
  type?: 'movie' | 'tv';
  media_type?: 'movie' | 'tv'; // TMDB media type
  addedAt?: Date;
  isFavorite?: boolean;
  progress?: number;
  completedAt?: Date;
  watchedAt?: Date;
  uid?: string;
  startedAt?: Date;
  [key: string]: any; // Allow any additional properties
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  preferences?: {
    genres?: string[];
    languages?: string[];
    notifications?: boolean;
  };
  createdAt?: Date;
  lastActiveAt?: Date;
}

export class UserDataManager {
  private static instance: UserDataManager;
  private firestoreService: FirestoreService | null = null;

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

  // ===== USER PROFILE MANAGEMENT =====
  public async createUserProfile(userData: UserProfile): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_create_profile');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      await this.firestoreService.updateUserDocument(userData.uid, {
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        preferences: userData.preferences || {},
        createdAt: userData.createdAt || new Date(),
        lastActiveAt: userData.lastActiveAt || new Date(),
      });
      
      const duration = performanceMonitor.endMetric('user_data_create_profile');
      logger.info(`User profile created in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_create_profile');
      logger.error('Failed to create user profile', 'UserDataManager', error);
      throw error;
    }
  }

  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      performanceMonitor.startMetric('user_data_get_profile');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      
      if (!userDoc) {
        return null;
      }

      const profile: UserProfile = {
        uid: userId,
        email: userDoc.email,
        displayName: userDoc.displayName,
        photoURL: userDoc.photoURL,
        preferences: userDoc.preferences,
        createdAt: userDoc.createdAt,
        lastActiveAt: userDoc.lastActiveAt,
      };
      
      const duration = performanceMonitor.endMetric('user_data_get_profile');
      logger.info(`User profile retrieved in ${duration}ms`, 'UserDataManager');
      
      return profile;
      
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

      const updateData: any = {};
      
      if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
      if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;
      if (updates.preferences !== undefined) updateData.preferences = updates.preferences;
      if (updates.lastActiveAt !== undefined) updateData.lastActiveAt = updates.lastActiveAt;

      await this.firestoreService.updateUserDocument(userId, updateData);
      
      const duration = performanceMonitor.endMetric('user_data_update_profile');
      logger.info(`User profile updated in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_update_profile');
      logger.error('Failed to update user profile', 'UserDataManager', error);
      throw error;
    }
  }

  // ===== FAVORITES MANAGEMENT =====
  public async addToFavorites(userId: string, movieData: UserMovieData): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_add_favorite');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        throw new Error('User not found');
      }

      const favorites = userDoc.favorites || [];
      
      // Check if already in favorites
      const existingIndex = favorites.findIndex((item: any) => item.id === movieData.id);
      if (existingIndex >= 0) {
        logger.info('Movie already in favorites', 'UserDataManager');
        return;
      }

      // Clean undefined values - Firestore doesn't accept undefined
      const favoriteData = cleanUndefinedValues({
        id: movieData.id,
        title: movieData.title,
        name: movieData.name,
        poster: movieData.poster,
        poster_path: movieData.poster_path,
        genre: movieData.genre,
        year: movieData.year,
        release_date: movieData.release_date,
        first_air_date: movieData.first_air_date,
        rating: movieData.rating,
        vote_average: movieData.vote_average,
        type: movieData.type,
        media_type: movieData.media_type,
        addedAt: movieData.addedAt || new Date(),
        isFavorite: true,
      });

      favorites.push(favoriteData);
      await this.firestoreService.updateUserDocument(userId, { favorites });
      
      const duration = performanceMonitor.endMetric('user_data_add_favorite');
      logger.info(`Added to favorites in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_add_favorite');
      logger.error('Failed to add to favorites', 'UserDataManager', error);
      throw error;
    }
  }

  public async removeFromFavorites(userId: string, movieId: number): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_remove_favorite');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        throw new Error('User not found');
      }

      const favorites = userDoc.favorites || [];
      const filteredFavorites = favorites.filter((item: any) => item.id !== movieId);
      
      await this.firestoreService.updateUserDocument(userId, { favorites: filteredFavorites });
      
      const duration = performanceMonitor.endMetric('user_data_remove_favorite');
      logger.info(`Removed from favorites in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_remove_favorite');
      logger.error('Failed to remove from favorites', 'UserDataManager', error);
      throw error;
    }
  }

  public async removeFromWatched(userId: string, movieId: number): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_remove_watched');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        throw new Error('User not found');
      }

      const watched = userDoc.watched || [];
      const filteredWatched = watched.filter((item: any) => item.id !== movieId);
      
      await this.firestoreService.updateUserDocument(userId, { watched: filteredWatched });
      
      const duration = performanceMonitor.endMetric('user_data_remove_watched');
      logger.info(`Removed from watched in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_remove_watched');
      logger.error('Failed to remove from watched', 'UserDataManager', error);
      throw error;
    }
  }

  public async getFavorites(userId: string): Promise<UserMovieData[]> {
    try {
      performanceMonitor.startMetric('user_data_get_favorites');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        return [];
      }

      const favorites = userDoc.favorites || [];
      
      const duration = performanceMonitor.endMetric('user_data_get_favorites');
      logger.info(`Favorites retrieved in ${duration}ms`, 'UserDataManager');
      
      return favorites;
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_get_favorites');
      logger.error('Failed to get favorites', 'UserDataManager', error);
      return [];
    }
  }

  // ===== WATCHED CONTENT MANAGEMENT =====
  public async markAsWatched(userId: string, movieData: UserMovieData): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_mark_watched');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        throw new Error('User not found');
      }

      const watched = userDoc.watched || [];
      
      // Clean undefined values - Firestore doesn't accept undefined
      const watchedData = cleanUndefinedValues({
        id: movieData.id,
        title: movieData.title,
        name: movieData.name,
        poster: movieData.poster,
        poster_path: movieData.poster_path,
        genre: movieData.genre,
        year: movieData.year,
        release_date: movieData.release_date,
        first_air_date: movieData.first_air_date,
        rating: movieData.rating,
        vote_average: movieData.vote_average,
        type: movieData.type,
        media_type: movieData.media_type,
        watchedAt: new Date(),
      });
      
      // Check if already watched
      const existingIndex = watched.findIndex((item: any) => item.id === movieData.id);
      if (existingIndex >= 0) {
        // Update existing entry
        watched[existingIndex] = { ...watched[existingIndex], ...watchedData };
      } else {
        // Add new entry
        watched.push(watchedData);
      }

      await this.firestoreService.updateUserDocument(userId, { watched });
      
      const duration = performanceMonitor.endMetric('user_data_mark_watched');
      logger.info(`Marked as watched in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_mark_watched');
      logger.error('Failed to mark as watched', 'UserDataManager', error);
      throw error;
    }
  }

  public async getWatchedContent(userId: string): Promise<UserMovieData[]> {
    try {
      performanceMonitor.startMetric('user_data_get_watched');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        return [];
      }

      const watched = userDoc.watched || [];
      
      const duration = performanceMonitor.endMetric('user_data_get_watched');
      logger.info(`Watched content retrieved in ${duration}ms`, 'UserDataManager');
      
      return watched;
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_get_watched');
      logger.error('Failed to get watched content', 'UserDataManager', error);
      return [];
    }
  }

  // ===== CURRENTLY WATCHING MANAGEMENT =====
  public async startWatching(userId: string, movieData: UserMovieData): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_start_watching');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        throw new Error('User not found');
      }

      const currentlyWatching = userDoc.currentlyWatching || [];
      
      // Clean undefined values - Firestore doesn't accept undefined
      const watchingData = cleanUndefinedValues({
        id: movieData.id,
        movieId: movieData.id, // Add movieId for consistency!
        title: movieData.title,
        name: movieData.name,
        poster: movieData.poster,
        poster_path: movieData.poster_path,
        genre: movieData.genre,
        genre_ids: movieData.genre_ids,
        year: movieData.year,
        release_date: movieData.release_date,
        first_air_date: movieData.first_air_date,
        rating: movieData.rating,
        vote_average: movieData.vote_average,
        type: movieData.type,
        media_type: movieData.media_type,
        startedAt: new Date(),
      });
      
      // Check if already watching (check both id and movieId)
      const existingIndex = currentlyWatching.findIndex((item: any) => 
        item.id === movieData.id || item.movieId === movieData.id
      );
      if (existingIndex >= 0) {
        // Update existing entry
        currentlyWatching[existingIndex] = { ...currentlyWatching[existingIndex], ...watchingData };
        console.log(`🔄 Updated existing watching entry for movie ${movieData.id}`);
      } else {
        // Add new entry
        currentlyWatching.push(watchingData);
        console.log(`➕ Added new watching entry for movie ${movieData.id}`);
      }

      // Eğer izlenen film son izlenen filmle aynıysa, lastWatchedMovie'yi temizle
      const lastWatchedMovie = userDoc.lastWatchedMovie;
      const updateData: any = { currentlyWatching };
      if (lastWatchedMovie && (lastWatchedMovie.id === movieData.id || lastWatchedMovie.movieId === movieData.id)) {
        updateData.lastWatchedMovie = null;
        console.log(`✅ Resuming last watched movie ${movieData.id}`);
      }

      await this.firestoreService.updateUserDocument(userId, updateData);
      
      const duration = performanceMonitor.endMetric('user_data_start_watching');
      logger.info(`Started watching in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_start_watching');
      logger.error('Failed to start watching', 'UserDataManager', error);
      throw error;
    }
  }

  public async stopWatching(userId: string, movieId: number): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_stop_watching');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        throw new Error('User not found');
      }

      const currentlyWatching = userDoc.currentlyWatching || [];
      const stoppedMovie = currentlyWatching.find((item: any) => item.id === movieId || item.movieId === movieId);
      const filteredWatching = currentlyWatching.filter((item: any) => item.id !== movieId && item.movieId !== movieId);
      
      // Son izlenen filmi kaydet
      const lastWatchedMovie = stoppedMovie ? cleanUndefinedValues({
        id: stoppedMovie.id || stoppedMovie.movieId,
        movieId: stoppedMovie.movieId || stoppedMovie.id,
        title: stoppedMovie.title,
        name: stoppedMovie.name,
        poster: stoppedMovie.poster,
        poster_path: stoppedMovie.poster_path,
        genre: stoppedMovie.genre,
        genre_ids: stoppedMovie.genre_ids,
        year: stoppedMovie.year,
        release_date: stoppedMovie.release_date,
        first_air_date: stoppedMovie.first_air_date,
        rating: stoppedMovie.rating,
        vote_average: stoppedMovie.vote_average,
        type: stoppedMovie.type,
        media_type: stoppedMovie.media_type,
        stoppedAt: new Date(),
      }) : null;
      
      await this.firestoreService.updateUserDocument(userId, { 
        currentlyWatching: filteredWatching,
        lastWatchedMovie: lastWatchedMovie
      });
      
      const duration = performanceMonitor.endMetric('user_data_stop_watching');
      logger.info(`Stopped watching in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_stop_watching');
      logger.error('Failed to stop watching', 'UserDataManager', error);
      throw error;
    }
  }

  public async getCurrentlyWatching(userId: string): Promise<UserMovieData[]> {
    try {
      performanceMonitor.startMetric('user_data_get_currently_watching');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        return [];
      }

      const currentlyWatching = userDoc.currentlyWatching || [];
      
      // Bir kullanıcı aynı anda sadece bir içerik izleyebilir
      // En son izlenen içeriği bul (en yeni startedAt değerine sahip olan)
      if (currentlyWatching.length > 1) {
        let latestMovie: any = null;
        let latestStartedAt = 0;
        
        for (const movie of currentlyWatching) {
          const startedAt = movie.startedAt 
            ? (movie.startedAt.toDate ? movie.startedAt.toDate().getTime() : 
               typeof movie.startedAt === 'number' ? movie.startedAt : 
               new Date(movie.startedAt).getTime())
            : 0;
          
          if (startedAt > latestStartedAt) {
            latestStartedAt = startedAt;
            latestMovie = movie;
          }
        }
        
        // Eğer en son izlenen bulunduysa, sadece onu döndür
        if (latestMovie) {
          const duration = performanceMonitor.endMetric('user_data_get_currently_watching');
          logger.info(`Currently watching retrieved in ${duration}ms (filtered to latest)`, 'UserDataManager');
          return [latestMovie];
        }
      }
      
      const duration = performanceMonitor.endMetric('user_data_get_currently_watching');
      logger.info(`Currently watching retrieved in ${duration}ms`, 'UserDataManager');
      
      return currentlyWatching;
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_get_currently_watching');
      logger.error('Failed to get currently watching', 'UserDataManager', error);
      return [];
    }
  }

  /**
   * Son izlenen filmi getir
   */
  public async getLastWatchedMovie(userId: string): Promise<UserMovieData | null> {
    try {
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        return null;
      }

      return userDoc.lastWatchedMovie || null;
    } catch (error) {
      logger.error('Failed to get last watched movie', 'UserDataManager', error);
      return null;
    }
  }


  public async getAllUsersCurrentlyWatching(): Promise<UserMovieData[]> {
    try {
      performanceMonitor.startMetric('user_data_get_all_currently_watching');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const allUsers = await this.firestoreService.getAllUsers();
      const allCurrentlyWatching: UserMovieData[] = [];
      
      allUsers.forEach((user: any) => {
        if (user.currentlyWatching && Array.isArray(user.currentlyWatching)) {
          user.currentlyWatching.forEach((item: any) => {
            allCurrentlyWatching.push({
              ...item,
              uid: user.uid,
            });
          });
        }
      });
      
      const duration = performanceMonitor.endMetric('user_data_get_all_currently_watching');
      logger.info(`All users currently watching retrieved in ${duration}ms`, 'UserDataManager');
      
      return allCurrentlyWatching;
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_get_all_currently_watching');
      logger.error('Failed to get all users currently watching', 'UserDataManager', error);
      return [];
    }
  }

  // ===== UTILITY METHODS =====
  public async clearUserData(userId: string): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_clear');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      await this.firestoreService.updateUserDocument(userId, {
        favorites: [],
        watched: [],
        currentlyWatching: [],
      });
      
      const duration = performanceMonitor.endMetric('user_data_clear');
      logger.info(`User data cleared in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_clear');
      logger.error('Failed to clear user data', 'UserDataManager', error);
      throw error;
    }
  }

  public async getUserStats(userId: string): Promise<{
    favoritesCount: number;
    watchedCount: number;
    currentlyWatchingCount: number;
  }> {
    try {
      const [favorites, watched, currentlyWatching] = await Promise.all([
        this.getFavorites(userId),
        this.getWatchedContent(userId),
        this.getCurrentlyWatching(userId),
      ]);

      return {
        favoritesCount: favorites.length,
        watchedCount: watched.length,
        currentlyWatchingCount: currentlyWatching.length,
      };
    } catch (error) {
      logger.error('Failed to get user stats', 'UserDataManager', error);
      return {
        favoritesCount: 0,
        watchedCount: 0,
        currentlyWatchingCount: 0,
      };
    }
  }

  public async addToWatched(userId: string, movieId: number, movieTitle: string): Promise<void> {
    try {
      performanceMonitor.startMetric('user_data_add_to_watched');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        throw new Error('User document not found');
      }

      const watched = userDoc.watched || [];
      
      // Zaten izlenenler listesinde var mı kontrol et
      const existingIndex = watched.findIndex(item => item.id === movieId);
      
      if (existingIndex === -1) {
        // Yeni film ekle
        watched.push({
          id: movieId,
          title: movieTitle,
          watchedAt: Date.now(),
          rating: 0
        });
      } else {
        // Mevcut filmi güncelle
        watched[existingIndex].watchedAt = Date.now();
      }

      await this.firestoreService.updateUserDocument(userId, { watched });
      
      const duration = performanceMonitor.endMetric('user_data_add_to_watched');
      logger.info(`Added to watched in ${duration}ms`, 'UserDataManager');
      
    } catch (error) {
      performanceMonitor.endMetric('user_data_add_to_watched');
      logger.error('Failed to add to watched', 'UserDataManager', error);
      throw error;
    }
  }

  // ===== ENHANCED METHODS FOR MATCHING =====
  public async getUserFavorites(userId: string): Promise<any[]> {
    return this.getFavorites(userId);
  }

  public async getUserWatchedContent(userId: string): Promise<any[]> {
    return this.getWatchedContent(userId);
  }

  public async getUserWatchlist(userId: string): Promise<any[]> {
    try {
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc) {
        return [];
      }

      return userDoc.watchlist || [];
    } catch (error) {
      logger.error('Failed to get user watchlist', 'UserDataManager', error);
      return [];
    }
  }

  public async clearAllUserCache(userId: string): Promise<void> {
    try {
      logger.info(`Clearing all cache for user ${userId}`, 'UserDataManager');
      // Cache temizleme işlemi - şimdilik boş, gelecekte eklenebilir
    } catch (error) {
      logger.error('Failed to clear user cache', 'UserDataManager', error);
    }
  }

  // ===== ALIAS METHODS FOR COMPATIBILITY =====
  public async getUserCurrentlyWatchingWithLanguagePriority(userId: string): Promise<any[]> {
    return this.getCurrentlyWatching(userId);
  }

  public async getUserWatchedContentWithLanguagePriority(userId: string): Promise<any[]> {
    return this.getWatchedContent(userId);
  }

  public async getUserFavoritesWithLanguagePriority(userId: string): Promise<any[]> {
    return this.getFavorites(userId);
  }
}

// Singleton instance
export const userDataManager = UserDataManager.getInstance();

