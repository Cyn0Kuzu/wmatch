import { FirestoreService } from './FirestoreService';
import { UserDataManager } from './UserDataManager';
import { logger } from '../utils/Logger';
import { performanceMonitor } from '../utils/PerformanceMonitor';

// ===== PROFESSIONAL MATCHING SERVICE =====

export interface MatchProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePhotos?: string[];
  bio?: string;
  biography?: string;
  letterboxdLink?: string;
  age?: number;
  gender?: string;
  interests?: string[];
  social?: Record<string, any>;
  socialLinks?: Record<string, any>;
  profile: {
    bio?: string;
    location?: string;
    age?: number;
    gender?: string;
    interests?: string[];
    photos?: string[];
  };
  preferences: {
    selectedMovies: any[];
    selectedGenres: string[];
    ageRange: [number, number];
    maxDistance: number;
  };
  currentlyWatching: any[];
  watchedContent: any[];
  favorites: any[];
  watchlist: any[];
  matchScore: number;
  matchReason: string;
}

export interface MatchConfig {
  maxResults: number;
  minMatchScore: number;
  includeCurrentlyWatching: boolean;
  includeWatchedContent: boolean;
  includeFavorites: boolean;
  ageRange?: [number, number];
  maxDistance?: number;
}

export class MatchService {
  private static instance: MatchService;
  private firestoreService: FirestoreService | null = null;
  private userDataManager: UserDataManager | null = null;

  private constructor() {}

  public static getInstance(): MatchService {
    if (!MatchService.instance) {
      MatchService.instance = new MatchService();
    }
    return MatchService.instance;
  }

  public setFirestoreService(service: FirestoreService): void {
    this.firestoreService = service;
  }

  public setUserDataManager(manager: UserDataManager): void {
    this.userDataManager = manager;
  }

  public async initialize(): Promise<void> {
    // MatchService initialization if needed
  }

  // ===== CURRENTLY WATCHING MATCHES (Match Screen) =====
  public async getCurrentlyWatchingMatches(
    userId: string,
    config: Partial<MatchConfig> = {}
  ): Promise<MatchProfile[]> {
    const defaultConfig: MatchConfig = {
      maxResults: 20,
      minMatchScore: 0.3,
      includeCurrentlyWatching: true,
      includeWatchedContent: false,
      includeFavorites: false,
      ageRange: [18, 99],
      maxDistance: 50
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      performanceMonitor.startMetric('currently_watching_matches');
      logger.info('Getting currently watching matches', 'MatchService');

      // Mevcut kullanıcının izlediği filmleri al
      if (!this.userDataManager) {
        throw new Error('UserDataManager not initialized');
      }
      const currentUserWatching = await this.userDataManager.getCurrentlyWatching(userId);
      
      // Safety check - ensure it's an array
      if (!currentUserWatching || !Array.isArray(currentUserWatching)) {
        logger.info('No currently watching content found or invalid data', 'MatchService');
        return [];
      }
      
      const currentUserWatchingIds = currentUserWatching
        .map(movie => {
          const rawId = movie.id || (movie as any).movieId;
          // Convert to number for consistent comparison
          return typeof rawId === 'string' ? parseInt(rawId, 10) : rawId;
        })
        .filter(id => id !== undefined && id !== null && !isNaN(id));

      console.log('👤 Current user watching IDs:', currentUserWatchingIds);

      if (currentUserWatchingIds.length === 0) {
        logger.info('No currently watching content found', 'MatchService');
        return [];
      }

      // Tüm kullanıcıları al
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }
      const allUsers = await this.firestoreService.getAllUsers();
      const otherUsers = allUsers.filter(user => user.id !== userId);

      const matches: MatchProfile[] = [];

      // Batch fetch all users' currently watching data for better performance
      const userWatchingPromises = otherUsers.map(async (user) => {
        try {
          // Use the most reliable user identifier
          const userId = user.uid || user.id;
          const userWatching = await this.userDataManager.getCurrentlyWatching(userId);
          return { user, userWatching, userId };
        } catch (error) {
          logger.error(`Error fetching watching data for user ${user.id}`, 'MatchService', error);
          return { user, userWatching: [], userId: user.uid || user.id };
        }
      });

      const userWatchingResults = await Promise.all(userWatchingPromises);

      for (const { user, userWatching, userId } of userWatchingResults) {
        try {
          // Safety check
          if (!userWatching || !Array.isArray(userWatching)) {
            continue;
          }
          
          const userWatchingIds = userWatching
            .map(movie => {
              const rawId = movie.id || (movie as any).movieId;
              // Convert to number for consistent comparison
              return typeof rawId === 'string' ? parseInt(rawId, 10) : rawId;
            })
            .filter(id => id !== undefined && id !== null && !isNaN(id));

          console.log(`🔍 Checking user ${userId}:`, {
            watchingIds: userWatchingIds,
            currentUserIds: currentUserWatchingIds
          });

          // Ortak izlenen filmleri bul
          const commonWatching = currentUserWatchingIds.filter((id: any) => 
            userWatchingIds.includes(id)
          );

          console.log(`🎯 Common watching found:`, commonWatching);

          if (commonWatching.length > 0) {
            const matchScore = this.calculateCurrentlyWatchingScore(
              commonWatching as any[], 
              currentUserWatchingIds as any[]
            );
            
            console.log(`✅ Match found! Score: ${matchScore}`);
            
            if (matchScore >= finalConfig.minMatchScore) {
              console.log(`✅ Match score acceptable (>= ${finalConfig.minMatchScore})`);
              
              // Sadece gerçek verisi olan kullanıcıları ekle - very lenient requirements for matching
              if (user.id || user.uid) {
                const matchUserId = user.uid || user.id;
                
                console.log(`✅ Adding match for user: ${user.firstName || user.username || matchUserId}`);
                
                // Batch fetch all user data in parallel for better performance
                const [userDoc, userFavorites, userWatched, userWatchlist] = await Promise.all([
                  this.firestoreService.getUserDocument(matchUserId).catch(() => null),
                  this.userDataManager.getFavorites(matchUserId).catch(() => []),
                  this.userDataManager.getWatchedContent(matchUserId).catch(() => []),
                  this.firestoreService.getUserDocument(matchUserId).then(doc => doc?.watchlist || []).catch(() => [])
                ]);

                // Extract data safely
                const fullProfile = userDoc ? (userDoc.profile || {}) : {};
                const favorites = userFavorites || [];
                const watched = userWatched || [];
                const watchlist = userWatchlist || [];

                // Only add users with real data - no empty or placeholder data
                if (user.firstName || user.username || user.email) {
                  matches.push({
                    id: String(matchUserId),
                    firstName: String(user.firstName || user.username || 'Kullanıcı'),
                    lastName: user.lastName && typeof user.lastName === 'string' ? user.lastName : '',
                    username: user.username && typeof user.username === 'string' ? user.username : `user_${String(matchUserId).substring(0, 8)}`,
                    profilePhotos: Array.isArray(user.profilePhotos) ? user.profilePhotos.filter((p: any) => p && typeof p === 'string') : [],
                    bio: fullProfile.bio && typeof fullProfile.bio === 'string' ? fullProfile.bio : '',
                    biography: userDoc?.biography || fullProfile.bio || '',
                    letterboxdLink: userDoc?.letterboxdLink || userDoc?.socialLinks?.letterboxd || userDoc?.social?.socialLinks?.letterboxd || '',
                    age: fullProfile.age && typeof fullProfile.age === 'number' ? fullProfile.age : 0,
                    gender: fullProfile.gender && typeof fullProfile.gender === 'string' ? fullProfile.gender : '',
                    interests: Array.isArray(fullProfile.interests) ? fullProfile.interests.filter((i: any) => i && typeof i === 'string') : [],
                    social: userDoc?.social || {},
                    socialLinks: userDoc?.socialLinks || userDoc?.social?.socialLinks || {},
                    profile: {
                      bio: fullProfile.bio || '',
                      location: fullProfile.location || '',
                      age: fullProfile.age || 0,
                      gender: fullProfile.gender || '',
                      interests: fullProfile.interests || [],
                      photos: user.profilePhotos || []
                    },
                    preferences: {
                      selectedMovies: (user.preferences as any)?.selectedMovies || [],
                      selectedGenres: (user.preferences as any)?.selectedGenres || [],
                      ageRange: (user.preferences as any)?.ageRange || [18, 99],
                      maxDistance: (user.preferences as any)?.maxDistance || 50
                    },
                    currentlyWatching: Array.isArray(userWatching) ? userWatching : [],
                    watchedContent: Array.isArray(watched) ? watched.filter((w: any) => w && typeof w === 'object') : [],
                    favorites: Array.isArray(favorites) ? favorites.filter((f: any) => f && typeof f === 'object') : [],
                    watchlist: Array.isArray(watchlist) ? watchlist : [],
                    matchScore,
                    matchReason: `Şu anda ${commonWatching.length} film/dizi izliyorsunuz`
                  });
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Error processing user ${user.id}`, 'MatchService', error);
        }
      }

      console.log(`📊 Match Results:`, {
        totalMatches: matches.length,
        matchedUsers: matches.map(m => ({ 
          id: m.id, 
          name: m.firstName || m.username,
          score: m.matchScore 
        }))
      });

      // Rastgele sırala (Tinder mantığı)
      const shuffledMatches = this.shuffleArray(matches);
      const result = shuffledMatches.slice(0, finalConfig.maxResults);
      
      performanceMonitor.endMetric('currently_watching_matches');
      logger.info(`Found ${result.length} currently watching matches`, 'MatchService');

      return result;
    } catch (error) {
      performanceMonitor.endMetric('currently_watching_matches');
      logger.error('Error getting currently watching matches', 'MatchService', error);
      throw error;
    }
  }


  // ===== UTILITY METHODS =====
  /**
   * Array'i rastgele karıştır (Fisher-Yates shuffle)
   */
  private shuffleArray<T>(array: T[]): T[] {
    if (!array || !Array.isArray(array)) {
      return [];
    }
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ===== SCORE CALCULATION METHODS =====
  private calculateCurrentlyWatchingScore(commonIds: any[], totalIds: any[]): number {
    if (!commonIds || !totalIds || !Array.isArray(commonIds) || !Array.isArray(totalIds)) {
      return 0;
    }
    if (totalIds.length === 0) return 0;
    
    const commonRatio = commonIds.length / totalIds.length;
    const bonusMultiplier = Math.min(commonIds.length / 3, 2); // Max 2x bonus for 3+ common items
    
    return Math.min(commonRatio * bonusMultiplier, 1);
  }


  // ===== UTILITY METHODS =====
  public async refreshMatches(userId: string): Promise<void> {
    try {
      logger.info('Refreshing matches for user', 'MatchService');
      
      // Cache'i temizle (optional - no-op for now)
      // await this.userDataManager.clearAllUserCache(userId);
      
      // Yeni eşleşmeleri hesapla
      await this.getCurrentlyWatchingMatches(userId);
      
      logger.info('Matches refreshed successfully', 'MatchService');
    } catch (error) {
      logger.error('Error refreshing matches', 'MatchService', error);
      throw error;
    }
  }
}

export const matchService = MatchService.getInstance();
