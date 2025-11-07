import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  runTransaction,
  onSnapshot,
  QueryConstraint,
  DocumentSnapshot
} from 'firebase/firestore';
import { FirebaseService } from '../services/FirebaseService';
import { logger } from '../utils/Logger';
import { errorHandler, ErrorType } from '../utils/ErrorHandler';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { cacheManager } from '../utils/CacheManager';
import { 
  UserProfile, 
  MovieData, 
  UserRating, 
  UserMatch,
  COLLECTIONS,
  VALIDATION_RULES 
} from './DatabaseSchema';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private firebaseService: FirebaseService;
  private isInitialized = false;

  private constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.firebaseService.initialize();
      this.isInitialized = true;
    }
  }

  private getDb() {
    return this.firebaseService.getFirestore();
  }

  // ===== USER MANAGEMENT =====
  public async createUser(userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.ensureInitialized();
    performanceMonitor.startMetric('db_create_user');

    try {
      const db = this.getDb();
      const now = Timestamp.now();

      // Validate user data
      this.validateUserData(userData);

      const userProfile: Omit<UserProfile, 'id'> = {
        ...userData,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      };

      // Use transaction for atomic operations
      const result = await runTransaction(db, async (transaction) => {
        // Create user profile
        const userRef = doc(collection(db, COLLECTIONS.USERS));
        transaction.set(userRef, userProfile);

        // Username is already stored in the user profile, no need for separate collection
        return userRef.id;
      });

      const duration = performanceMonitor.endMetric('db_create_user');
      logger.info(`User created in ${duration}ms`, 'DatabaseManager');

      // Clear related caches
      await cacheManager.delete(`user_${userData.uid}`);
      await cacheManager.delete(`username_${userData.username.toLowerCase()}`);

      return result;
    } catch (error) {
      performanceMonitor.endMetric('db_create_user');
      logger.error('Failed to create user', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'User creation failed',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  public async getUserByUid(uid: string): Promise<UserProfile | null> {
    const cacheKey = `user_${uid}`;
    
    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached as any;
      }

      performanceMonitor.startMetric('db_get_user');
      await this.ensureInitialized();

      const db = this.getDb();
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('uid', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const userData = { id: doc.id, ...doc.data() } as UserProfile;

      // Cache for 5 minutes
      await cacheManager.set(cacheKey, userData, 5 * 60 * 1000);

      const duration = performanceMonitor.endMetric('db_get_user');
      logger.info(`User fetched in ${duration}ms`, 'DatabaseManager');

      return userData;
    } catch (error) {
      performanceMonitor.endMetric('db_get_user');
      logger.error('Failed to get user', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'Failed to fetch user',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  public async updateUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
    await this.ensureInitialized();
    performanceMonitor.startMetric('db_update_user');

    try {
      const db = this.getDb();
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('uid', '==', uid), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('User not found');
      }

      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });

      const duration = performanceMonitor.endMetric('db_update_user');
      logger.info(`User updated in ${duration}ms`, 'DatabaseManager');

      // Clear cache
      await cacheManager.delete(`user_${uid}`);
    } catch (error) {
      performanceMonitor.endMetric('db_update_user');
      logger.error('Failed to update user', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'User update failed',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // ===== MOVIE MANAGEMENT =====
  public async createOrUpdateMovie(movieData: Omit<MovieData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.ensureInitialized();
    performanceMonitor.startMetric('db_create_movie');

    try {
      const db = this.getDb();
      const now = Timestamp.now();

      // Check if movie already exists
      const moviesRef = collection(db, COLLECTIONS.MOVIES);
      const q = query(moviesRef, where('tmdbId', '==', movieData.tmdbId), limit(1));
      const querySnapshot = await getDocs(q);

      let movieId: string;

      if (!querySnapshot.empty) {
        // Update existing movie
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          ...movieData,
          updatedAt: now
        });
        movieId = querySnapshot.docs[0].id;
      } else {
        // Create new movie
        const movieDoc: Omit<MovieData, 'id'> = {
          ...movieData,
          createdAt: now,
          updatedAt: now
        };
        const docRef = await addDoc(moviesRef, movieDoc);
        movieId = docRef.id;
      }

      const duration = performanceMonitor.endMetric('db_create_movie');
      logger.info(`Movie created/updated in ${duration}ms`, 'DatabaseManager');

      // Clear cache
      await cacheManager.delete(`movie_${movieData.tmdbId}`);

      return movieId;
    } catch (error) {
      performanceMonitor.endMetric('db_create_movie');
      logger.error('Failed to create/update movie', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'Movie creation/update failed',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  public async getUserRatings(userId: string, limitCount: number = 50): Promise<UserRating[]> {
    const cacheKey = `user_ratings_${userId}_${limitCount}`;
    
    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached as any;
      }

      performanceMonitor.startMetric('db_get_user_ratings');
      await this.ensureInitialized();

      const db = this.getDb();
      const ratingsRef = collection(db, COLLECTIONS.USER_RATINGS);
      const q = query(
        ratingsRef, 
        where('userId', '==', userId),
        orderBy('ratedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const ratings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRating[];

      // Cache for 2 minutes
      await cacheManager.set(cacheKey, ratings, 2 * 60 * 1000);

      const duration = performanceMonitor.endMetric('db_get_user_ratings');
      logger.info(`User ratings fetched in ${duration}ms`, 'DatabaseManager');

      return ratings;
    } catch (error) {
      performanceMonitor.endMetric('db_get_user_ratings');
      logger.error('Failed to get user ratings', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'Failed to fetch user ratings',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  // ===== MATCHING SYSTEM =====
  public async findPotentialMatches(userId: string, limitCount: number = 10): Promise<UserMatch[]> {
    const cacheKey = `potential_matches_${userId}_${limitCount}`;
    
    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached as any;
      }

      performanceMonitor.startMetric('db_find_matches');
      await this.ensureInitialized();

      // This is a simplified version - in production, you'd use more sophisticated algorithms
      const db = this.getDb();
      const matchesRef = collection(db, COLLECTIONS.USER_MATCHES);
      const q = query(
        matchesRef,
        where('user1Id', '==', userId),
        where('status', '==', 'pending'),
        orderBy('compatibilityScore', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const matches = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserMatch[];

      // Cache for 5 minutes
      await cacheManager.set(cacheKey, matches, 5 * 60 * 1000);

      const duration = performanceMonitor.endMetric('db_find_matches');
      logger.info(`Potential matches found in ${duration}ms`, 'DatabaseManager');

      return matches;
    } catch (error) {
      performanceMonitor.endMetric('db_find_matches');
      logger.error('Failed to find potential matches', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'Failed to find matches',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  // ===== ANALYTICS =====
  public async recordUserAnalytics(userId: string, analytics: Partial<any>): Promise<void> {
    await this.ensureInitialized();
    performanceMonitor.startMetric('db_record_analytics');

    try {
      const db = this.getDb();
      const today = new Date().toISOString().split('T')[0];
      
      // Get or create today's analytics record
      const analyticsRef = collection(db, COLLECTIONS.USER_ANALYTICS);
      const q = query(
        analyticsRef,
        where('userId', '==', userId),
        where('date', '==', today),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Create new analytics record
        const newAnalytics: any = {
          userId,
          date: today,
          sessionDuration: 0,
          screensVisited: [],
          actionsPerformed: {},
          moviesViewed: 0,
          moviesRated: 0,
          searchesPerformed: 0,
          recommendationsClicked: 0,
          messagesSent: 0,
          messagesReceived: 0,
          profilesViewed: 0,
          matchesCreated: 0,
          createdAt: Timestamp.now(),
          ...analytics
        };
        await addDoc(analyticsRef, newAnalytics);
      } else {
        // Update existing record
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          ...analytics,
          updatedAt: Timestamp.now()
        });
      }

      const duration = performanceMonitor.endMetric('db_record_analytics');
      logger.info(`Analytics recorded in ${duration}ms`, 'DatabaseManager');
    } catch (error) {
      performanceMonitor.endMetric('db_record_analytics');
      logger.error('Failed to record analytics', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'Analytics recording failed',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ===== VALIDATION =====
  private validateUserData(userData: Partial<UserProfile>): void {
    if (userData.username) {
      if (userData.username.length < VALIDATION_RULES.USERNAME.minLength ||
          userData.username.length > VALIDATION_RULES.USERNAME.maxLength) {
        throw new Error('Username must be between 3-30 characters');
      }
      
      if (!VALIDATION_RULES.USERNAME.pattern.test(userData.username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }
      
      if (VALIDATION_RULES.USERNAME.reserved.includes(userData.username.toLowerCase() as any)) {
        throw new Error('This username is reserved');
      }
    }

    if (userData.email && !VALIDATION_RULES.EMAIL.pattern.test(userData.email)) {
      throw new Error('Invalid email format');
    }
  }

  // ===== BATCH OPERATIONS =====
  public async batchCreateUsers(users: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    await this.ensureInitialized();
    performanceMonitor.startMetric('db_batch_create_users');

    try {
      const db = this.getDb();
      const batch = writeBatch(db);
      const userIds: string[] = [];
      const now = Timestamp.now();

      users.forEach(userData => {
        this.validateUserData(userData);
        
        const userRef = doc(collection(db, COLLECTIONS.USERS));
        const userProfile: Omit<UserProfile, 'id'> = {
          ...userData,
          createdAt: now,
          updatedAt: now
        };
        
        batch.set(userRef, userProfile);
        userIds.push(userRef.id);
      });

      await batch.commit();

      const duration = performanceMonitor.endMetric('db_batch_create_users');
      logger.info(`Batch created ${users.length} users in ${duration}ms`, 'DatabaseManager');

      return userIds;
    } catch (error) {
      performanceMonitor.endMetric('db_batch_create_users');
      logger.error('Failed to batch create users', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'Batch user creation failed',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // ===== REAL-TIME LISTENERS =====
  public subscribeToUserUpdates(uid: string, callback: (user: UserProfile | null) => void): () => void {
    const db = this.getDb();
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('uid', '==', uid), limit(1));

    return onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        callback(null);
        return;
      }

      const doc = querySnapshot.docs[0];
      const userData = { id: doc.id, ...doc.data() } as UserProfile;
      callback(userData);
    }, (error) => {
      logger.error('User subscription error', 'DatabaseManager', error);
      errorHandler.handleError({
        type: ErrorType.DATABASE,
        message: 'User subscription failed',
        context: 'DatabaseManager',
        data: error,
        timestamp: new Date().toISOString()
      });
    });
  }

  // ===== SYSTEM HEALTH =====
  public async getDatabaseHealth(): Promise<{
    connected: boolean;
    responseTime: number;
    collections: string[];
    errorRate: number;
  }> {
    try {
      performanceMonitor.startMetric('db_health_check');
      await this.ensureInitialized();

      const db = this.getDb();
      const startTime = Date.now();
      
      // Simple health check - try to read a document
      const testRef = doc(db, COLLECTIONS.SYSTEM_CONFIG, 'health_check');
      await getDoc(testRef);
      
      const responseTime = Date.now() - startTime;
      performanceMonitor.endMetric('db_health_check');

      return {
        connected: true,
        responseTime,
        collections: Object.values(COLLECTIONS),
        errorRate: 0 // TODO: Implement error rate tracking
      };
    } catch (error) {
      performanceMonitor.endMetric('db_health_check');
      logger.error('Database health check failed', 'DatabaseManager', error);
      return {
        connected: false,
        responseTime: -1,
        collections: [],
        errorRate: 1
      };
    }
  }

  // ===== PROFILE METHODS =====
  public async getUserProfile(uid: string): Promise<UserProfile | null> {
    return this.getUserByUid(uid);
  }

  public async getUserFavorites(uid: string): Promise<any[]> {
    try {
      performanceMonitor.startMetric('db_get_user_favorites');
      await this.ensureInitialized();

      const db = this.getDb();
      const ratingsRef = collection(db, COLLECTIONS.USER_RATINGS);
      const q = query(
        ratingsRef, 
        where('userId', '==', uid),
        where('favorite', '==', true),
        orderBy('ratedAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const favorites = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const duration = performanceMonitor.endMetric('db_get_user_favorites');
      logger.info(`User favorites fetched in ${duration}ms`, 'DatabaseManager');

      return favorites;
    } catch (error) {
      performanceMonitor.endMetric('db_get_user_favorites');
      logger.error('Failed to get user favorites', 'DatabaseManager', error);
      return [];
    }
  }

  public async getUserWatchlist(uid: string): Promise<any[]> {
    try {
      performanceMonitor.startMetric('db_get_user_watchlist');
      await this.ensureInitialized();

      const db = this.getDb();
      const watchlistRef = collection(db, COLLECTIONS.USER_WATCHLISTS);
      const q = query(
        watchlistRef, 
        where('userId', '==', uid),
        orderBy('addedAt', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const watchlist = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const duration = performanceMonitor.endMetric('db_get_user_watchlist');
      logger.info(`User watchlist fetched in ${duration}ms`, 'DatabaseManager');

      return watchlist;
    } catch (error) {
      performanceMonitor.endMetric('db_get_user_watchlist');
      logger.error('Failed to get user watchlist', 'DatabaseManager', error);
      return [];
    }
  }

  public async getUserActivity(uid: string, limitCount: number = 20): Promise<any[]> {
    try {
      performanceMonitor.startMetric('db_get_user_activity');
      await this.ensureInitialized();

      const db = this.getDb();
      const ratingsRef = collection(db, COLLECTIONS.USER_RATINGS);
      const q = query(
        ratingsRef, 
        where('userId', '==', uid),
        orderBy('ratedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const duration = performanceMonitor.endMetric('db_get_user_activity');
      logger.info(`User activity fetched in ${duration}ms`, 'DatabaseManager');

      return activities;
    } catch (error) {
      performanceMonitor.endMetric('db_get_user_activity');
      logger.error('Failed to get user activity', 'DatabaseManager', error);
      return [];
    }
  }

  public async getUserStatistics(uid: string): Promise<any> {
    try {
      performanceMonitor.startMetric('db_get_user_statistics');
      await this.ensureInitialized();

      const db = this.getDb();
      const ratingsRef = collection(db, COLLECTIONS.USER_RATINGS);
      const q = query(ratingsRef, where('userId', '==', uid));
      
      const querySnapshot = await getDocs(q);
      const ratings = querySnapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const moviesWatched = ratings.filter(r => r.watched).length;
      const moviesRated = ratings.filter(r => r.rating > 0).length;
      const totalRating = ratings.reduce((sum, r) => sum + (r.rating || 0), 0);
      const averageRating = moviesRated > 0 ? totalRating / moviesRated : 0;

      const statistics = {
        moviesWatched,
        moviesRated,
        averageRating: Math.round(averageRating * 10) / 10,
        totalWatchTime: 0, // This would need to be calculated from movie runtimes
        favoriteActors: [],
        favoriteDirectors: [],
        favoriteGenres: []
      };

      const duration = performanceMonitor.endMetric('db_get_user_statistics');
      logger.info(`User statistics calculated in ${duration}ms`, 'DatabaseManager');

      return statistics;
    } catch (error) {
      performanceMonitor.endMetric('db_get_user_statistics');
      logger.error('Failed to get user statistics', 'DatabaseManager', error);
      return {
        moviesWatched: 0,
        moviesRated: 0,
        averageRating: 0,
        totalWatchTime: 0,
        favoriteActors: [],
        favoriteDirectors: [],
        favoriteGenres: []
      };
    }
  }
}

export const databaseManager = DatabaseManager.getInstance();
