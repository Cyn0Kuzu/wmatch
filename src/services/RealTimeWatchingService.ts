import { FirestoreService } from './FirestoreService';
import { TMDBService } from './TMDBService';
import { logger } from '../utils/Logger';
import { performanceMonitor } from '../utils/PerformanceMonitor';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  name?: string;
  username?: string;
  photoURL?: string;
  profilePhotos?: string[]; // Array of profile photo URLs for consistency
  isOnline: boolean;
  lastSeen: number;
}

export interface CurrentlyWatchingItem {
  id: string;
  movieId: number;
  title: string;
  name?: string;
  poster_path?: string;
  media_type: 'movie' | 'tv';
  genre_ids?: number[];
  viewers: UserProfile[];
  currentTime: number; // Saniye cinsinden
  totalDuration: number; // Saniye cinsinden
  startedAt: number; // Unix timestamp
}

export interface SearchResult {
  id: number;
  title: string;
  name?: string;
  poster_path?: string;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  popularity?: number;
  genre_ids?: number[];
}

export class RealTimeWatchingService {
  private static instance: RealTimeWatchingService;
  private firestoreService: FirestoreService | null = null;
  private tmdbService: TMDBService | null = null;
  private watchingData: Map<number, CurrentlyWatchingItem> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): RealTimeWatchingService {
    if (!RealTimeWatchingService.instance) {
      RealTimeWatchingService.instance = new RealTimeWatchingService();
    }
    return RealTimeWatchingService.instance;
  }

  public setFirestoreService(service: FirestoreService): void {
    this.firestoreService = service;
  }

  public setTMDBService(service: TMDBService): void {
    this.tmdbService = service;
    logger.info('TMDBService injected into RealTimeWatchingService', 'RealTimeWatchingService');
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      performanceMonitor.startMetric('realtime_watching_init');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      if (!this.tmdbService) {
        logger.warn('TMDBService not available, some features may not work', 'RealTimeWatchingService');
      } else {
        // TMDB servisi varsa başlat
        try {
          await this.tmdbService.initialize();
          logger.info('TMDBService initialized for RealTimeWatchingService', 'RealTimeWatchingService');
        } catch (tmdbError) {
          logger.error('TMDBService initialization failed, continuing without it', 'RealTimeWatchingService', tmdbError);
        }
      }

      // Gerçek kullanıcı verilerini yükle
      await this.loadUserProfiles();
      await this.loadCurrentlyWatchingData();
      
      // Gerçek zamanlı dinleyicileri başlat
      this.startRealTimeListeners();
      
      this.isInitialized = true;
      const duration = performanceMonitor.endMetric('realtime_watching_init');
      logger.info(`RealTimeWatchingService initialized in ${duration}ms`, 'RealTimeWatchingService');
      
    } catch (error) {
      performanceMonitor.endMetric('realtime_watching_init');
      logger.error('Failed to initialize RealTimeWatchingService', 'RealTimeWatchingService', error);
      throw error;
    }
  }

  private async loadUserProfiles(): Promise<void> {
    try {
      performanceMonitor.startMetric('load_user_profiles');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not available');
      }

      // Tüm kullanıcı profillerini yükle
      const usersSnapshot = await this.firestoreService.getAllUsers();
      if (Array.isArray(usersSnapshot)) {
        usersSnapshot.forEach((user: any) => {
          const profile: UserProfile = {
            id: user.id || user.uid,
            email: user.email || '',
            displayName: user.displayName || user.firstName || user.username || user.email?.split('@')[0] || 'Kullanıcı',
            photoURL: user.photoURL || user.profilePhotos?.[0] || user.profilePhoto || null,
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen || Date.now()
          };
          this.userProfiles.set(profile.id, profile);
        });
      }
      
      const duration = performanceMonitor.endMetric('load_user_profiles');
      logger.info(`Loaded ${this.userProfiles.size} user profiles in ${duration}ms`, 'RealTimeWatchingService');
      
    } catch (error) {
      performanceMonitor.endMetric('load_user_profiles');
      if (this.isPermissionError(error)) {
        logger.warn('Firestore permission denied while loading user profiles, continuing with empty cache', 'RealTimeWatchingService');
        this.userProfiles.clear();
        return;
      }
      logger.error('Failed to load user profiles', 'RealTimeWatchingService', error);
      throw error;
    }
  }

  private async loadCurrentlyWatchingData(): Promise<void> {
    try {
      performanceMonitor.startMetric('load_currently_watching');
      
      if (!this.firestoreService) {
        throw new Error('FirestoreService not available');
      }

      // Şu anda izlenen içerikleri yükle
      const watchingSnapshot = await this.firestoreService.getCurrentlyWatchingContent();
      this.watchingData.clear();
      
      if (watchingSnapshot && typeof watchingSnapshot.forEach === 'function') {
        watchingSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const watchingItem: CurrentlyWatchingItem = {
            id: doc.id,
            movieId: data.movieId,
            title: data.title || data.name || 'Bilinmeyen',
            name: data.name,
            poster_path: data.poster_path,
            media_type: data.media_type || 'movie',
            viewers: data.viewers || [],
            currentTime: data.currentTime || 0,
            totalDuration: data.totalDuration || 0,
            startedAt: data.startedAt || Date.now()
          };
          this.watchingData.set(data.movieId, watchingItem);
        });
      }
      
      const duration = performanceMonitor.endMetric('load_currently_watching');
      logger.info(`Loaded ${this.watchingData.size} currently watching items in ${duration}ms`, 'RealTimeWatchingService');
      
    } catch (error) {
      performanceMonitor.endMetric('load_currently_watching');
      if (this.isPermissionError(error)) {
        logger.warn('Firestore permission denied while loading currently watching data, continuing with empty cache', 'RealTimeWatchingService');
        this.watchingData.clear();
        return;
      }
      logger.error('Failed to load currently watching data', 'RealTimeWatchingService', error);
      throw error;
    }
  }

  private startRealTimeListeners(): void {
    if (!this.firestoreService) {
      logger.warn('FirestoreService not available for real-time listeners', 'RealTimeWatchingService');
      return;
    }

    try {
      // Şu anda izlenen içerikler için gerçek zamanlı dinleyici
      this.firestoreService.onCurrentlyWatchingChange((snapshot) => {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const movieId = data.movieId;
          
          if (change.type === 'added' || change.type === 'modified') {
            const watchingItem: CurrentlyWatchingItem = {
              id: change.doc.id,
              movieId: data.movieId,
              title: data.title || data.name || 'Bilinmeyen',
              name: data.name,
              poster_path: data.poster_path,
              media_type: data.media_type || 'movie',
              viewers: data.viewers || [],
              currentTime: data.currentTime || 0,
              totalDuration: data.totalDuration || 0,
              startedAt: data.startedAt || Date.now()
            };
            this.watchingData.set(movieId, watchingItem);
          } else if (change.type === 'removed') {
            this.watchingData.delete(movieId);
          }
        });
        
        logger.debug('Currently watching data updated', 'RealTimeWatchingService');
      });

      // Kullanıcı profilleri için gerçek zamanlı dinleyici
      this.firestoreService.onUsersChange((snapshot) => {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data();
          const userId = change.doc.id;
          
          if (change.type === 'added' || change.type === 'modified') {
            // Get profile photos array
            const profilePhotos = Array.isArray(data.profilePhotos) 
              ? data.profilePhotos.filter((p: any) => p && typeof p === 'string' && p.trim() !== '')
              : [];
            
            // Get photoURL - prioritize profilePhotos array, then photoURL field
            const photoURL = profilePhotos.length > 0 
              ? profilePhotos[0] 
              : (data.photoURL || null);
            
            const profile: UserProfile = {
              id: userId,
              email: data.email || '',
              displayName: data.displayName || data.firstName || data.email?.split('@')[0] || 'Kullanıcı',
              firstName: data.firstName || data.displayName || '',
              name: data.name || data.displayName || '',
              username: data.username || '',
              photoURL: photoURL,
              profilePhotos: profilePhotos, // Include full array for consistency
              isOnline: data.isOnline || false,
              lastSeen: data.lastSeen || Date.now()
            };
            this.userProfiles.set(userId, profile);
          } else if (change.type === 'removed') {
            this.userProfiles.delete(userId);
          }
        });
        
        logger.debug('User profiles updated', 'RealTimeWatchingService');
      });

      logger.info('Real-time listeners started', 'RealTimeWatchingService');
      
    } catch (error) {
      logger.error('Failed to start real-time listeners', 'RealTimeWatchingService', error);
    }
  }

  public getCurrentlyWatching(mediaType?: 'movie' | 'tv'): CurrentlyWatchingItem[] {
    const items = Array.from(this.watchingData.values());
    
    if (mediaType) {
      return items.filter(item => item.media_type === mediaType);
    }
    
    return items.sort((a, b) => b.viewers.length - a.viewers.length);
  }

  public getUserProfile(userId: string): UserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  public getAllUserProfiles(): UserProfile[] {
    return Array.from(this.userProfiles.values());
  }

  public async searchContent(query: string, category: 'movies' | 'tv' | 'users'): Promise<SearchResult[]> {
    try {
      performanceMonitor.startMetric('search_content');
      
      if (!query.trim()) {
        return [];
      }

      let results: SearchResult[] = [];

      if (category === 'users') {
        // Kullanıcı arama
        const users = this.getAllUserProfiles();
        results = users
          .filter(user => 
            user.displayName.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase())
          )
          .map(user => ({
            id: parseInt(user.id) || 0,
            title: user.displayName,
            name: user.displayName,
            poster_path: user.photoURL || undefined,
            overview: user.email,
            vote_average: 0,
            media_type: 'movie' as const,
            popularity: user.isOnline ? 1 : 0
          }));
      } else {
        // Film/Dizi arama - TMDB API'den gerçek veriler
        if (!this.tmdbService) {
          throw new Error('TMDBService not available');
        }

        let searchResults: any[] = [];
        
        if (category === 'movies') {
          const movieResults = await this.tmdbService.searchMovies(query);
          searchResults = movieResults.results || [];
        } else if (category === 'tv') {
          const tvResults = await this.tmdbService.searchTVShows(query);
          searchResults = tvResults.results || [];
        }

        results = searchResults.map(item => ({
          id: item.id,
          title: item.title || item.name || 'Bilinmeyen',
          name: item.name,
          poster_path: item.poster_path,
          overview: item.overview || '',
          vote_average: item.vote_average || 0,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          media_type: (category === 'movies' ? 'movie' : 'tv') as 'movie' | 'tv',
          popularity: item.popularity || 0,
          genre_ids: item.genre_ids || []
        }));
      }

      const duration = performanceMonitor.endMetric('search_content');
      logger.info(`Search completed for "${query}" in ${duration}ms, found ${results.length} results`, 'RealTimeWatchingService');
      
      return results;
      
    } catch (error) {
      performanceMonitor.endMetric('search_content');
      logger.error(`Search failed for "${query}"`, 'RealTimeWatchingService', error);
      return [];
    }
  }

  public async addUserToWatching(movieId: number, userId: string, currentTime: number = 0): Promise<void> {
    try {
      if (!this.firestoreService) {
        throw new Error('FirestoreService not available');
      }

      const userProfile = this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Kullanıcıyı izlenen içeriğe ekle
      await this.firestoreService.addUserToWatchingContent(movieId, userId, currentTime);
      
      logger.info(`User ${userId} added to watching ${movieId}`, 'RealTimeWatchingService');
      
    } catch (error) {
      logger.error(`Failed to add user ${userId} to watching ${movieId}`, 'RealTimeWatchingService', error);
      throw error;
    }
  }

  public async removeUserFromWatching(movieId: number, userId: string): Promise<void> {
    try {
      if (!this.firestoreService) {
        throw new Error('FirestoreService not available');
      }

      // Kullanıcıyı izlenen içerikten çıkar
      await this.firestoreService.removeUserFromWatchingContent(movieId, userId);
      
      logger.info(`User ${userId} removed from watching ${movieId}`, 'RealTimeWatchingService');
      
    } catch (error) {
      logger.error(`Failed to remove user ${userId} from watching ${movieId}`, 'RealTimeWatchingService', error);
      throw error;
    }
  }

  public getWatchingStats(): { totalWatching: number; totalUsers: number; onlineUsers: number } {
    const totalWatching = this.watchingData.size;
    const totalUsers = this.userProfiles.size;
    const onlineUsers = Array.from(this.userProfiles.values()).filter(user => user.isOnline).length;
    
    return {
      totalWatching,
      totalUsers,
      onlineUsers
    };
  }

  /**
   * Kullanıcının film/dizi izlemeye başlamasını kaydet
   */
  public async startWatching(userId: string, movieId: number, mediaType: 'movie' | 'tv', currentTime: number = 0): Promise<void> {
    try {
      if (!this.firestoreService || !this.tmdbService) {
        throw new Error('Services not initialized');
      }

      const userProfile = this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // TMDB'den film/dizi detaylarını al
      let mediaDetails: any;
      if (mediaType === 'movie') {
        mediaDetails = await this.tmdbService.getMovieDetails(movieId);
      } else {
        mediaDetails = await this.tmdbService.getTVShowDetails(movieId);
      }

      if (!mediaDetails) {
        throw new Error('Media details not found');
      }

      // Kullanıcıyı izlenen içeriğe ekle
      await this.firestoreService.addUserToWatchingContent(movieId, userId, currentTime);

      // Yerel veriyi güncelle
      const watchingItem = this.watchingData.get(movieId);
      if (watchingItem) {
        // Mevcut izleyici listesine ekle
        if (!watchingItem.viewers.find(v => v.id === userId)) {
          watchingItem.viewers.push(userProfile);
        }
      } else {
        // Yeni izleme öğesi oluştur
        const newWatchingItem: CurrentlyWatchingItem = {
          id: movieId.toString(),
          movieId: movieId,
          title: mediaDetails.title || mediaDetails.name || 'Bilinmeyen',
          name: mediaDetails.name,
          poster_path: mediaDetails.poster_path,
          media_type: mediaType,
          viewers: [userProfile],
          currentTime: currentTime,
          totalDuration: mediaDetails.runtime || 0,
          startedAt: Date.now()
        };
        this.watchingData.set(movieId, newWatchingItem);
      }

      logger.info(`User ${userId} started watching ${mediaType} ${movieId}`, 'RealTimeWatchingService');
      
      // Listener'ları notify et
      // this.notifyListeners(); // Not implemented yet
      
    } catch (error) {
      logger.error(`Failed to start watching for user ${userId}`, 'RealTimeWatchingService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının izleme durumunu güncelle
   */
  public async updateWatchingProgress(userId: string, movieId: number, currentTime: number): Promise<void> {
    try {
      if (!this.firestoreService) {
        throw new Error('FirestoreService not available');
      }

      const watchingItem = this.watchingData.get(movieId);
      if (watchingItem) {
        watchingItem.currentTime = currentTime;
        
        // Firestore'da da güncelle
        await this.firestoreService.updateWatchingProgress(userId, movieId, currentTime);
      }

      logger.debug(`Updated watching progress for user ${userId}, movie ${movieId} to ${currentTime}s`, 'RealTimeWatchingService');
      
    } catch (error) {
      logger.error(`Failed to update watching progress for user ${userId}`, 'RealTimeWatchingService', error);
      throw error;
    }
  }

  /**
   * Kullanıcının izlemeyi bitirmesini kaydet
   */
  public async stopWatching(userId: string, movieId: number): Promise<void> {
    try {
      if (!this.firestoreService) {
        throw new Error('FirestoreService not available');
      }

      // Kullanıcıyı izlenen içerikten çıkar
      await this.firestoreService.removeUserFromWatchingContent(movieId, userId);

      // Yerel veriyi güncelle
      const watchingItem = this.watchingData.get(movieId);
      if (watchingItem) {
        watchingItem.viewers = watchingItem.viewers.filter(v => v.id !== userId);
        
        // Eğer hiç izleyici kalmadıysa öğeyi sil
        if (watchingItem.viewers.length === 0) {
          this.watchingData.delete(movieId);
        }
      }

      logger.info(`User ${userId} stopped watching ${movieId}`, 'RealTimeWatchingService');
      
    } catch (error) {
      logger.error(`Failed to stop watching for user ${userId}`, 'RealTimeWatchingService', error);
      throw error;
    }
  }

  private listeners: (() => void)[] = [];

  public onCurrentlyWatchingChange(callback: () => void): () => void {
    this.listeners.push(callback);
    
    // Unsubscribe fonksiyonu döndür
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Tüm kullanıcıların şu anda izlediği içerikleri getir
   */
  public async getAllCurrentlyWatching(): Promise<CurrentlyWatchingItem[]> {
    try {
      if (!this.firestoreService) {
        throw new Error('FirestoreService not initialized');
      }

      // Firestore'dan tüm kullanıcıların currentlyWatching verilerini al
      const allUsersWatching = await this.firestoreService.getAllUsersCurrentlyWatching();
      
      // RealTimeWatchingService formatına dönüştür - Map kullanarak gruplama
      const movieMap = new Map<number, CurrentlyWatchingItem>(); // Group by movieId
      
      console.log(`📊 Processing ${allUsersWatching.length} users' watching data...`);
      
      // User Map to track which movie each user is watching (to prevent duplicates)
      const userMovieMap = new Map<string, { movieId: number; startedAt: number }>();
      
      for (const userWatching of allUsersWatching) {
        const watchingItems = userWatching.currentlyWatching || [];
        
        // Bir kullanıcı aynı anda sadece bir içerik izleyebilir
        // En son izlediği içeriği bul (en yeni startedAt değerine sahip olan)
        let latestWatchingItem: any = null;
        let latestStartedAt = 0;
        
        for (const watchingItem of watchingItems) {
          const startedAt = watchingItem.startedAt 
            ? (watchingItem.startedAt.toDate ? watchingItem.startedAt.toDate().getTime() : watchingItem.startedAt)
            : 0;
          
          if (startedAt > latestStartedAt) {
            latestStartedAt = startedAt;
            latestWatchingItem = watchingItem;
          }
        }
        
        // Eğer kullanıcının izlediği bir içerik yoksa, atla
        if (!latestWatchingItem) {
          continue;
        }
        
        // Support both old and new field names
        const rawMovieId = latestWatchingItem.movieId || latestWatchingItem.id;
        const movieId = typeof rawMovieId === 'string' ? parseInt(rawMovieId, 10) : rawMovieId;
        const movieTitle = latestWatchingItem.movieTitle || latestWatchingItem.title || latestWatchingItem.name;
        const moviePoster = latestWatchingItem.moviePoster || latestWatchingItem.poster || latestWatchingItem.poster_path;
        const mediaType = latestWatchingItem.media_type || latestWatchingItem.type || 'movie';
        const genreIds = latestWatchingItem.genre_ids || [];
        
        if (!movieId || isNaN(movieId)) {
          console.warn(`⚠️ Invalid movieId:`, rawMovieId);
          continue; // Skip if no ID or invalid
        }
        
        // Kullanıcı daha önce başka bir filmde görünmüşse, eski kaydı kaldır
        const previousMovie = userMovieMap.get(userWatching.userId);
        if (previousMovie && previousMovie.movieId !== movieId) {
          const oldItem = movieMap.get(previousMovie.movieId);
          if (oldItem) {
            oldItem.viewers = oldItem.viewers.filter(v => v.id !== userWatching.userId);
            if (oldItem.viewers.length === 0) {
              movieMap.delete(previousMovie.movieId);
            }
          }
        }
        
        // Kullanıcının şu anki film bilgisini güncelle
        userMovieMap.set(userWatching.userId, { movieId, startedAt: latestStartedAt });
        
        console.log(`📺 Processing watching item: ${movieTitle} (${movieId}) for user ${userWatching.userId}`);
        
        // Bu film/dizi zaten Map'te var mı kontrol et
        const existingItem = movieMap.get(movieId);
        
        if (existingItem) {
          // Mevcut öğeye kullanıcıyı ekle (eğer yoksa)
          let userProfile = this.getUserProfile(userWatching.userId);
          
          // Eğer profil Map'te yoksa, dinamik olarak oluştur
          if (!userProfile && this.firestoreService) {
            try {
              const userDoc = await this.firestoreService.getUserDocument(userWatching.userId);
              if (userDoc) {
                // Get profile photos array
                const profilePhotos = Array.isArray(userDoc.profilePhotos) 
                  ? userDoc.profilePhotos.filter((p: any) => p && typeof p === 'string' && p.trim() !== '')
                  : [];
                
                // Get photoURL - prioritize profilePhotos array, then photoURL field
                const photoURL = profilePhotos.length > 0 
                  ? profilePhotos[0] 
                  : (userDoc.photoURL || null);
                
                userProfile = {
                  id: userWatching.userId,
                  email: userDoc.email || '',
                  displayName: userDoc.displayName || userDoc.firstName || userDoc.username || 'Kullanıcı',
                  firstName: userDoc.firstName || userDoc.displayName || '',
                  name: userDoc.name || userDoc.displayName || '',
                  username: userDoc.username || '',
                  photoURL: photoURL,
                  profilePhotos: profilePhotos, // Include full array for consistency
                  isOnline: userDoc.isOnline || false,
                  lastSeen: userDoc.lastSeen || Date.now()
                };
                this.userProfiles.set(userWatching.userId, userProfile);
              }
            } catch (error) {
              console.error('Error loading user profile:', error);
            }
          }
          
          if (userProfile && !existingItem.viewers.find(v => v.id === userProfile!.id)) {
            existingItem.viewers.push(userProfile);
            console.log(`✅ Added user to existing movie: ${movieTitle} (now ${existingItem.viewers.length} viewers)`);
          }
        } else {
          // Yeni öğe oluştur
          let userProfile = this.getUserProfile(userWatching.userId);
          
          // Eğer profil Map'te yoksa, dinamik olarak oluştur
          if (!userProfile && this.firestoreService) {
            try {
              const userDoc = await this.firestoreService.getUserDocument(userWatching.userId);
              if (userDoc) {
                // Get profile photos array
                const profilePhotos = Array.isArray(userDoc.profilePhotos) 
                  ? userDoc.profilePhotos.filter((p: any) => p && typeof p === 'string' && p.trim() !== '')
                  : [];
                
                // Get photoURL - prioritize profilePhotos array, then photoURL field
                const photoURL = profilePhotos.length > 0 
                  ? profilePhotos[0] 
                  : (userDoc.photoURL || null);
                
                userProfile = {
                  id: userWatching.userId,
                  email: userDoc.email || '',
                  displayName: userDoc.displayName || userDoc.firstName || userDoc.username || 'Kullanıcı',
                  firstName: userDoc.firstName || userDoc.displayName || '',
                  name: userDoc.name || userDoc.displayName || '',
                  username: userDoc.username || '',
                  photoURL: photoURL,
                  profilePhotos: profilePhotos, // Include full array for consistency
                  isOnline: userDoc.isOnline || false,
                  lastSeen: userDoc.lastSeen || Date.now()
                };
                this.userProfiles.set(userWatching.userId, userProfile);
              }
            } catch (error) {
              console.error('Error loading user profile:', error);
            }
          }
          
          if (userProfile) {
            const newItem: CurrentlyWatchingItem = {
              id: movieId.toString(),
              movieId: movieId,
              title: movieTitle,
              name: movieTitle,
              poster_path: moviePoster,
              media_type: mediaType as 'movie' | 'tv',
              genre_ids: genreIds,
              viewers: [userProfile],
              currentTime: latestWatchingItem.progress || latestWatchingItem.currentTime || 0,
              totalDuration: 0,
              startedAt: latestStartedAt || Date.now()
            };
            movieMap.set(movieId, newItem);
            console.log(`➕ Created new watching item: ${movieTitle} (1 viewer)`);
          }
        }
      }
      
      // Convert Map to Array
      const result = Array.from(movieMap.values());
      console.log(`📊 Total unique movies being watched: ${result.length}`);
      result.forEach(item => {
        console.log(`  - ${item.title}: ${item.viewers.length} viewer(s)`);
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to get all currently watching', 'RealTimeWatchingService', error);
      return [];
    }
  }

  private isPermissionError(error: any): boolean {
    if (!error) {
      return false;
    }

    const message = typeof error?.message === 'string' ? error.message : '';
    return error?.code === 'permission-denied' ||
      message.includes('Missing or insufficient permissions') ||
      message.includes('permission-denied');
  }
}

export const realTimeWatchingService = RealTimeWatchingService.getInstance();
