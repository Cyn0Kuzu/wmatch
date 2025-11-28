import { FirestoreService } from './FirestoreService';
import { logger } from '../utils/Logger';
import { performanceMonitor } from '../utils/PerformanceMonitor';

export interface CurrentlyWatchingData {
  movieId: number;
  movieTitle: string;
  moviePoster: string;
  progress: number; // 0-100 percentage
  startedAt: Date;
  lastUpdated: Date;
  platform?: string; // Netflix, Amazon Prime, etc.
}

export interface RealTimeMatch {
  userId: string;
  username: string;
  firstName: string;
  profilePhoto: string;
  bio?: string;
  age?: number;
  location?: string;
  currentlyWatching: CurrentlyWatchingData[];
  matchScore: number;
  lastSeen: Date;
}

export class RealTimeMatchService {
  private static instance: RealTimeMatchService;
  private firestoreService: FirestoreService | null = null;
  private watchListeners: Map<string, () => void> = new Map();

  private constructor() {}

  public static getInstance(): RealTimeMatchService {
    if (!RealTimeMatchService.instance) {
      RealTimeMatchService.instance = new RealTimeMatchService();
    }
    return RealTimeMatchService.instance;
  }

  public setFirestoreService(service: FirestoreService): void {
    this.firestoreService = service;
  }

  public async initialize(): Promise<void> {
    // RealTimeMatchService initialization if needed
  }

  /**
   * Kullanıcının şu anda izlediği filmi kaydet
   */
  public async setCurrentlyWatching(
    userId: string, 
    movieData: CurrentlyWatchingData
  ): Promise<void> {
    try {
      performanceMonitor.startMetric('set_currently_watching');
      logger.info(`Setting currently watching for user ${userId}`, 'RealTimeMatchService');

      await this.firestoreService.updateUserDocument(userId, {
        currentlyWatching: [movieData],
        lastActivity: new Date(),
        isOnline: true
      });

      performanceMonitor.endMetric('set_currently_watching');
      logger.info(`Successfully set currently watching for user ${userId}`, 'RealTimeMatchService');
    } catch (error) {
      performanceMonitor.endMetric('set_currently_watching');
      logger.error('Error setting currently watching', 'RealTimeMatchService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının izleme durumunu güncelle
   */
  public async updateWatchingProgress(
    userId: string, 
    movieId: number, 
    progress: number
  ): Promise<void> {
    try {
      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc || !userDoc.currentlyWatching) return;

      const updatedWatching = userDoc.currentlyWatching.map((movie: CurrentlyWatchingData) => 
        movie.movieId === movieId 
          ? { ...movie, progress, lastUpdated: new Date() }
          : movie
      );

      await this.firestoreService.updateUserDocument(userId, {
        currentlyWatching: updatedWatching,
        lastActivity: new Date()
      });

      logger.info(`Updated progress for user ${userId}, movie ${movieId} to ${progress}%`, 'RealTimeMatchService');
    } catch (error) {
      logger.error('Error updating watching progress', 'RealTimeMatchService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının izleme durumunu sonlandır
   */
  public async stopWatching(userId: string, movieId: number): Promise<void> {
    try {
      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc || !userDoc.currentlyWatching) return;

      // İzlenen filmi watchedMovies'a ekle
      const watchedMovie = userDoc.currentlyWatching.find((movie: CurrentlyWatchingData) => 
        movie.movieId === movieId
      );

      if (watchedMovie) {
        const watchedMovies = userDoc.watchedMovies || [];
        watchedMovies.push({
          ...watchedMovie,
          completedAt: new Date(),
          progress: 100
        });

        // Currently watching'dan kaldır
        const updatedWatching = userDoc.currentlyWatching.filter((movie: CurrentlyWatchingData) => 
          movie.movieId !== movieId
        );

        await this.firestoreService.updateUserDocument(userId, {
          currentlyWatching: updatedWatching,
          watchedMovies: watchedMovies,
          lastActivity: new Date()
        });

        logger.info(`User ${userId} finished watching movie ${movieId}`, 'RealTimeMatchService');
      }
    } catch (error) {
      logger.error('Error stopping watching', 'RealTimeMatchService', error);
      throw error;
    }
  }

  /**
   * Aynı filmi izleyen kullanıcıları gerçek zamanlı olarak bul
   */
  public async getRealTimeMatches(userId: string): Promise<RealTimeMatch[]> {
    try {
      performanceMonitor.startMetric('get_realtime_matches');
      logger.info(`Getting real-time matches for user ${userId}`, 'RealTimeMatchService');

      const userDoc = await this.firestoreService.getUserDocument(userId);
      if (!userDoc || !userDoc.currentlyWatching || userDoc.currentlyWatching.length === 0) {
        logger.info('User has no currently watching content', 'RealTimeMatchService');
        return [];
      }

      const userWatchingIds = userDoc.currentlyWatching.map((movie: CurrentlyWatchingData) => movie.movieId);
      
      // Tüm kullanıcıları al ve filtrele
      const allUsers = await this.firestoreService.getAllUsers();
      const otherUsers = allUsers.filter(user => user.id !== userId);

      const matches: RealTimeMatch[] = [];

      for (const user of otherUsers) {
        try {
          // Kullanıcının şu anda izlediği filmleri kontrol et
          const userAny = user as any;
          if (userAny.currentlyWatching && userAny.currentlyWatching.length > 0) {
            const userWatchingIds = userAny.currentlyWatching.map((movie: CurrentlyWatchingData) => movie.movieId);
            
            // Ortak izlenen filmleri bul
            const commonMovies = userDoc.currentlyWatching.filter((movie: CurrentlyWatchingData) => 
              userWatchingIds.includes(movie.movieId)
            );

            if (commonMovies.length > 0) {
              // Match score hesapla
              const matchScore = this.calculateRealTimeMatchScore(commonMovies, userDoc.currentlyWatching);
              
              // Son görülme zamanını kontrol et (5 dakika içinde aktif olmalı)
              const userAny = user as any;
              const lastSeen = userAny.lastActivity?.toDate?.() || new Date(0);
              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
              
              if (lastSeen > fiveMinutesAgo) {
                // Gerçek kullanıcı verilerini kullan, demo verileri yok
                const userAny = user as any;
                matches.push({
                  userId: user.id,
                  username: user.username || '',
                  firstName: user.firstName || '',
                  profilePhoto: user.profilePhotos?.[0] || '',
                  bio: user.profile?.bio || '',
                  age: userAny.age || 0,
                  location: user.profile?.location || '',
                  currentlyWatching: userAny.currentlyWatching || [],
                  matchScore,
                  lastSeen
                });
              }
            }
          }
        } catch (error) {
          logger.error(`Error processing user ${user.id}`, 'RealTimeMatchService', error);
        }
      }

      // Rastgele sırala (Tinder/MatchMusic mantığı)
      const shuffledMatches = this.shuffleArray(matches).slice(0, 20); // En fazla 20 eşleşme


      performanceMonitor.endMetric('get_realtime_matches');
      logger.info(`Found ${shuffledMatches.length} real-time matches for user ${userId}`, 'RealTimeMatchService');

      return shuffledMatches;
    } catch (error) {
      performanceMonitor.endMetric('get_realtime_matches');
      logger.error('Error getting real-time matches', 'RealTimeMatchService', error);
      throw error;
    }
  }

  /**
   * Array'i rastgele karıştır (Fisher-Yates shuffle)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Gerçek zamanlı match score hesapla
   */
  private calculateRealTimeMatchScore(
    commonMovies: CurrentlyWatchingData[], 
    userMovies: CurrentlyWatchingData[]
  ): number {
    if (commonMovies.length === 0) return 0;

    // Ortak film sayısına göre temel skor
    const baseScore = commonMovies.length / userMovies.length;
    
    // Progress benzerliği bonusu (aynı anda izliyorlar mı?)
    const progressBonus = commonMovies.reduce((bonus, movie) => {
      const userMovie = userMovies.find(m => m.movieId === movie.movieId);
      if (userMovie) {
        const progressDiff = Math.abs(movie.progress - userMovie.progress);
        // Progress farkı az ise bonus ver
        return bonus + (1 - progressDiff / 100) * 0.3;
      }
      return bonus;
    }, 0);

    // Son aktivite bonusu (yakın zamanda aktif olanlar)
    const activityBonus = commonMovies.reduce((bonus, movie) => {
      const timeDiff = Date.now() - movie.lastUpdated.getTime();
      const minutesAgo = timeDiff / (1000 * 60);
      // 10 dakika içinde aktif ise bonus
      return bonus + (minutesAgo < 10 ? 0.2 : 0);
    }, 0);

    return Math.min(baseScore + progressBonus + activityBonus, 1);
  }

  /**
   * Kullanıcının online durumunu güncelle
   */
  public async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.firestoreService.updateUserDocument(userId, {
        isOnline,
        lastActivity: new Date()
      });
    } catch (error) {
      logger.error('Error updating user online status', 'RealTimeMatchService', error);
    }
  }

  /**
   * Gerçek zamanlı dinleyici başlat (gelecekte WebSocket için)
   */
  public startRealTimeListener(userId: string, callback: (matches: RealTimeMatch[]) => void): void {
    // Şimdilik polling kullanıyoruz, gelecekte WebSocket'e geçilebilir
    const interval = setInterval(async () => {
      try {
        const matches = await this.getRealTimeMatches(userId);
        callback(matches);
      } catch (error) {
        logger.error('Error in real-time listener', 'RealTimeMatchService', error);
      }
    }, 30000); // 30 saniyede bir güncelle

    this.watchListeners.set(userId, () => clearInterval(interval));
  }

  /**
   * Gerçek zamanlı dinleyiciyi durdur
   */
  public stopRealTimeListener(userId: string): void {
    const stopListener = this.watchListeners.get(userId);
    if (stopListener) {
      stopListener();
      this.watchListeners.delete(userId);
    }
  }

  /**
   * Kullanıcının izleme geçmişini temizle
   */
  public async clearWatchingHistory(userId: string): Promise<void> {
    try {
      await this.firestoreService.updateUserDocument(userId, {
        currentlyWatching: [],
        lastActivity: new Date()
      });
      logger.info(`Cleared watching history for user ${userId}`, 'RealTimeMatchService');
    } catch (error) {
      logger.error('Error clearing watching history', 'RealTimeMatchService', error);
      throw error;
    }
  }
}

export const realTimeMatchService = RealTimeMatchService.getInstance();

