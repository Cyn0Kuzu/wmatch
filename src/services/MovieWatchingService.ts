import { RealTimeMatchService } from '../services/RealTimeMatchService';
import { FirestoreService } from '../services/FirestoreService';
import { logger } from '../utils/Logger';

export interface MovieData {
  id: number;
  title: string;
  poster_path: string;
  overview: string;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
  backdrop_path?: string;
}

export class MovieWatchingService {
  private static instance: MovieWatchingService;
  private realTimeMatchService: RealTimeMatchService | null = null;
  private firestoreService: FirestoreService | null = null;

  private constructor() {}

  public static getInstance(): MovieWatchingService {
    if (!MovieWatchingService.instance) {
      MovieWatchingService.instance = new MovieWatchingService();
    }
    return MovieWatchingService.instance;
  }

  public setRealTimeMatchService(service: RealTimeMatchService): void {
    this.realTimeMatchService = service;
  }

  public setFirestoreService(service: FirestoreService): void {
    this.firestoreService = service;
  }

  public async initialize(): Promise<void> {
    // MovieWatchingService initialization if needed
  }

  /**
   * Kullanıcının film izlemeye başlamasını kaydet ve eşleşmeleri bul
   */
  public async startWatchingMovie(userId: string, movie: MovieData): Promise<void> {
    try {
      logger.info(`User ${userId} started watching movie: ${movie.title}`, 'MovieWatchingService');

      const currentlyWatchingData = {
        movieId: movie.id,
        movieTitle: movie.title,
        moviePoster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
        progress: 0,
        startedAt: new Date(),
        lastUpdated: new Date(),
        platform: 'Unknown'
      };

      // Kullanıcının izleme durumunu güncelle
      await this.realTimeMatchService.setCurrentlyWatching(userId, currentlyWatchingData);

      // Online durumunu güncelle
      await this.realTimeMatchService.updateUserOnlineStatus(userId, true);

      logger.info(`Successfully started watching movie for user ${userId}`, 'MovieWatchingService');
    } catch (error) {
      logger.error('Error starting movie watching', 'MovieWatchingService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının film izleme ilerlemesini güncelle
   */
  public async updateWatchingProgress(userId: string, movieId: number, progress: number): Promise<void> {
    try {
      await this.realTimeMatchService.updateWatchingProgress(userId, movieId, progress);
      logger.info(`Updated progress for user ${userId}, movie ${movieId} to ${progress}%`, 'MovieWatchingService');
    } catch (error) {
      logger.error('Error updating watching progress', 'MovieWatchingService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının film izlemeyi bitirmesini kaydet
   */
  public async finishWatchingMovie(userId: string, movieId: number): Promise<void> {
    try {
      logger.info(`User ${userId} finished watching movie ${movieId}`, 'MovieWatchingService');

      // İzleme durumunu sonlandır
      await this.realTimeMatchService.stopWatching(userId, movieId);

      logger.info(`Successfully finished watching movie for user ${userId}`, 'MovieWatchingService');
    } catch (error) {
      logger.error('Error finishing movie watching', 'MovieWatchingService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının şu anda izlediği filmi getir
   */
  public async getCurrentWatchingMovie(userId: string): Promise<any | null> {
    try {
      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc || !userDoc.currentlyWatching || userDoc.currentlyWatching.length === 0) {
        return null;
      }
      return userDoc.currentlyWatching[0];
    } catch (error) {
      logger.error('Error getting current watching movie', 'MovieWatchingService', error);
      return null;
    }
  }

  /**
   * Aynı filmi izleyen kullanıcıları getir
   */
  public async getUsersWatchingSameMovie(movieId: number, excludeUserId?: string): Promise<any[]> {
    try {
      return await this.firestoreService.getUsersWatchingSameMovie(movieId, excludeUserId);
    } catch (error) {
      logger.error('Error getting users watching same movie', 'MovieWatchingService', error);
      return [];
    }
  }

  /**
   * Kullanıcının izleme geçmişini temizle
   */
  public async clearWatchingHistory(userId: string): Promise<void> {
    try {
      await this.realTimeMatchService.clearWatchingHistory(userId);
      logger.info(`Cleared watching history for user ${userId}`, 'MovieWatchingService');
    } catch (error) {
      logger.error('Error clearing watching history', 'MovieWatchingService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının offline durumunu güncelle
   */
  public async setUserOffline(userId: string): Promise<void> {
    try {
      await this.realTimeMatchService.updateUserOnlineStatus(userId, false);
      logger.info(`Set user ${userId} offline`, 'MovieWatchingService');
    } catch (error) {
      logger.error('Error setting user offline', 'MovieWatchingService', error);
    }
  }

  /**
   * Kullanıcının online durumunu güncelle
   */
  public async setUserOnline(userId: string): Promise<void> {
    try {
      await this.realTimeMatchService.updateUserOnlineStatus(userId, true);
      logger.info(`Set user ${userId} online`, 'MovieWatchingService');
    } catch (error) {
      logger.error('Error setting user online', 'MovieWatchingService', error);
    }
  }
}

export const movieWatchingService = MovieWatchingService.getInstance();




