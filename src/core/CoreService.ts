import { FirebaseService } from '../services/FirebaseService';
import { AuthService } from '../services/AuthService';
import { TMDBService } from '../services/TMDBService';
import { MovieService } from '../services/MovieService';
import { MatchService } from '../services/MatchService';
import { RealTimeMatchService } from '../services/RealTimeMatchService';
import { MovieWatchingService } from '../services/MovieWatchingService';
import { FirestoreService } from '../services/FirestoreService';
import { UserDataManager } from '../services/UserDataManager';
import { EnhancedLanguageAwareMatcher } from '../services/EnhancedLanguageAwareMatcher';
import { LanguageAwareMovieMatcher } from '../services/LanguageAwareMatcher';
import { NotificationService } from '../services/NotificationService';
import { AnalyticsService } from '../services/AnalyticsService';
import { EventService } from '../services/EventService';
import { CacheService } from '../services/CacheService';
import { ConfigService } from '../services/ConfigService';
import { IconCacheService } from '../services/IconCacheService';
import { RealTimeWatchingService } from '../services/RealTimeWatchingService';
import { CacheCleanupUtil } from '../utils/CacheCleanupUtil';
import { ProfessionalRecommendationEngine } from '../services/RecommendationEngine';
import { logger } from '../utils/Logger';
import { performanceMonitor } from '../utils/PerformanceMonitor';

export class CoreService {
  private static instance: CoreService;
  private isInitialized = false;
  
  // Services
  public firebaseService: FirebaseService;
  public authService: AuthService;
  public tmdbService: TMDBService;
  public movieService: MovieService;
  public matchService: MatchService;
  public realTimeMatchService: RealTimeMatchService;
  public movieWatchingService: MovieWatchingService;
  public firestoreService: FirestoreService;
  public userDataManager: UserDataManager;
  public enhancedLanguageAwareMatcher: EnhancedLanguageAwareMatcher;
  public languageAwareMovieMatcher: LanguageAwareMovieMatcher;
  public notificationService: NotificationService;
  public analyticsService: AnalyticsService;
  public eventService: EventService;
  public cacheService: CacheService;
  public configService: ConfigService;
  public iconCacheService: IconCacheService;
  public realTimeWatchingService: RealTimeWatchingService;
  public recommendationEngine: ProfessionalRecommendationEngine;

  private constructor() {
    // Initialize all services with proper error handling
    // Firebase hatası olsa bile CoreService'in oluşturulmasına izin ver
    try {
      this.firebaseService = FirebaseService.getInstance();
    } catch (error) {
      if (logger) {
        logger.error('Failed to initialize FirebaseService in constructor', 'CoreService', error);
      } else {
        console.error('[CoreService] Failed to initialize FirebaseService in constructor:', error);
      }
      // Firebase hatası olsa bile devam et
    }
    
    try {
      this.authService = AuthService.getInstance();
      this.tmdbService = TMDBService.getInstance();
      this.movieService = MovieService.getInstance();
      this.matchService = MatchService.getInstance();
      this.realTimeMatchService = RealTimeMatchService.getInstance();
      this.movieWatchingService = MovieWatchingService.getInstance();
      this.firestoreService = FirestoreService.getInstance();
      this.userDataManager = UserDataManager.getInstance();
      this.enhancedLanguageAwareMatcher = EnhancedLanguageAwareMatcher.getInstance();
      this.languageAwareMovieMatcher = LanguageAwareMovieMatcher.getInstance();
      this.notificationService = NotificationService.getInstance();
      this.analyticsService = AnalyticsService.getInstance();
      this.eventService = EventService.getInstance();
      this.cacheService = CacheService.getInstance();
      this.configService = ConfigService.getInstance();
      this.iconCacheService = IconCacheService.getInstance();
      this.realTimeWatchingService = RealTimeWatchingService.getInstance();
      this.recommendationEngine = ProfessionalRecommendationEngine.getInstance();
    } catch (error) {
      if (logger) {
        logger.error('Failed to initialize some services in constructor', 'CoreService', error);
      } else {
        console.error('[CoreService] Failed to initialize some services in constructor:', error);
      }
      // Hata olsa bile CoreService'i oluştur, initialize() metodunda tekrar denenecek
    }
  }

  public static getInstance(): CoreService {
    if (!CoreService.instance) {
      CoreService.instance = new CoreService();
    }
    return CoreService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      performanceMonitor.startMetric('core_service_initialization');
      if (logger) {
        logger.info('Initializing Core Service...', 'CoreService');
      }

      // Initialize services in proper order with error handling
      await this.initializeCoreServices();
      await this.initializeDataServices();
      await this.initializeUtilityServices();
      
      // Clean up any corrupted cache
      await CacheCleanupUtil.initializeSafeCache();
      
      this.isInitialized = true;
      
      const duration = performanceMonitor.endMetric('core_service_initialization');
      if (logger) {
        logger.info(`Core Service initialized successfully in ${duration}ms`, 'CoreService');
      }
      
    } catch (error) {
      performanceMonitor.endMetric('core_service_initialization');
      if (logger) {
        logger.error('Failed to initialize Core Service', 'CoreService', error);
      } else {
        console.error('[CoreService] Failed to initialize Core Service:', error);
      }
      throw error;
    }
  }

  private async initializeCoreServices(): Promise<void> {
    try {
      // Initialize Firebase first
      await this.firebaseService.initialize();
      
      // Initialize Auth Service with dependencies
      this.authService.setFirebaseService(this.firebaseService);
      this.authService.setAnalyticsService(this.analyticsService);
      await this.authService.initialize();
      
      // Initialize Config Service
      await this.configService.initialize();
      
      if (logger) {
        logger.info('Core services initialized', 'CoreService');
      }
    } catch (error) {
      if (logger) {
        logger.error('Failed to initialize core services', 'CoreService', error);
      } else {
        console.error('[CoreService] Failed to initialize core services:', error);
      }
      throw error;
    }
  }

  private async initializeDataServices(): Promise<void> {
    try {
      // Initialize Firestore Service
      await this.firestoreService.initialize();
      
      // Initialize TMDB Service
      this.tmdbService.setRecommendationEngine(this.recommendationEngine);
      this.tmdbService.setUserDataManager(this.userDataManager);
      await this.tmdbService.initialize();
      
      // Initialize Recommendation Engine with dependencies
      this.recommendationEngine.setUserDataManager(this.userDataManager);
      this.recommendationEngine.setLanguageAwareMatcher(this.languageAwareMovieMatcher);
      this.recommendationEngine.setEnhancedLanguageAwareMatcher(this.enhancedLanguageAwareMatcher);
      await this.recommendationEngine.initialize();
      
      // Initialize Movie Service
      await this.movieService.initialize();
      
      // Initialize Match Service with dependencies
      this.matchService.setFirestoreService(this.firestoreService);
      this.matchService.setUserDataManager(this.userDataManager);
      await this.matchService.initialize();
      
      // Initialize Real Time Match Service with dependencies
      this.realTimeMatchService.setFirestoreService(this.firestoreService);
      await this.realTimeMatchService.initialize();
      
      // Initialize Movie Watching Service with dependencies
      this.movieWatchingService.setRealTimeMatchService(this.realTimeMatchService);
      this.movieWatchingService.setFirestoreService(this.firestoreService);
      await this.movieWatchingService.initialize();
      
      // Initialize Real Time Watching Service
      this.realTimeWatchingService.setFirestoreService(this.firestoreService);
      this.realTimeWatchingService.setTMDBService(this.tmdbService);
      await this.realTimeWatchingService.initialize();
      
      if (logger) {
        logger.info('Data services initialized', 'CoreService');
      }
    } catch (error) {
      if (logger) {
        logger.error('Failed to initialize data services', 'CoreService', error);
      } else {
        console.error('[CoreService] Failed to initialize data services:', error);
      }
      throw error;
    }
  }

  private async initializeUtilityServices(): Promise<void> {
    try {
      // Initialize Cache Service
      await this.cacheService.initialize();
      
      // Initialize Icon Cache Service
      await this.iconCacheService.initialize();
      
      // Initialize Notification Service
      await this.notificationService.initialize();
      
      // Initialize Analytics Service
      await this.analyticsService.initialize();
      
      // Initialize Event Service
      await this.eventService.initialize();
      
      if (logger) {
        logger.info('Utility services initialized', 'CoreService');
      }
    } catch (error) {
      if (logger) {
        logger.error('Failed to initialize utility services', 'CoreService', error);
      } else {
        console.error('[CoreService] Failed to initialize utility services:', error);
      }
      throw error;
    }
  }

  public getServiceStatus(): Record<string, boolean> {
    return {
      firebaseService: !!this.firebaseService,
      authService: !!this.authService,
      tmdbService: !!this.tmdbService,
      movieService: !!this.movieService,
      matchService: !!this.matchService,
      realTimeMatchService: !!this.realTimeMatchService,
      movieWatchingService: !!this.movieWatchingService,
      firestoreService: !!this.firestoreService,
      userDataManager: !!this.userDataManager,
      enhancedLanguageAwareMatcher: !!this.enhancedLanguageAwareMatcher,
      notificationService: !!this.notificationService,
      analyticsService: !!this.analyticsService,
      eventService: !!this.eventService,
      cacheService: !!this.cacheService,
      configService: !!this.configService,
      iconCacheService: !!this.iconCacheService,
      realTimeWatchingService: !!this.realTimeWatchingService,
    };
  }
}

export const coreService = CoreService.getInstance();