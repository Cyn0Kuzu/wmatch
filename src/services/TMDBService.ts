import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/Logger';
import { errorHandler, ErrorType } from '../utils/ErrorHandler';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { cacheManager } from '../utils/CacheManager';
import { ProfessionalRecommendationEngine } from './RecommendationEngine';
import { UserDataManager } from './UserDataManager';

export class TMDBService {
  private static instance: TMDBService;
  private apiKey: string = 'ddcfa0968883c7e0486957cd244e0350';
  private baseURL: string = 'https://api.themoviedb.org/3';
  private apiClient: AxiosInstance;
  private recommendationEngine: ProfessionalRecommendationEngine | null = null;
  private userDataManager: UserDataManager | null = null;

  private constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for API key
    this.apiClient.interceptors.request.use((config) => {
      config.params = {
        ...config.params,
        api_key: this.apiKey,
      };
      return config;
    });
  }

  public async initialize(): Promise<void> {
    try {
      // Test API connection with detailed logging
      logger.info('Testing TMDB API connection...', 'TMDBService');
      const configResponse = await this.apiClient.get('/configuration');
      logger.info('TMDB API configuration loaded successfully', 'TMDBService');
      
      // Test popular movies endpoint
      const popularResponse = await this.apiClient.get('/movie/popular', {
        params: { page: 1 }
      });
      logger.info(`TMDB API popular movies loaded: ${popularResponse.data.results?.length || 0} movies`, 'TMDBService');
      
      // Initialize recommendation engine
      if (this.recommendationEngine) {
        await this.recommendationEngine.initialize();
        logger.info('Recommendation engine initialized', 'TMDBService');
      }

      // Load genres
      await this.loadGenres();
      
      logger.info('TMDB Service with Professional Recommendation Engine initialized successfully', 'TMDBService');
    } catch (error) {
      logger.error('TMDB Service initialization failed', 'TMDBService', error);
      // Don't throw error, allow service to work with limited functionality
    }
  }

  // ===== SEARCH FUNCTIONS =====
  public async searchMovies(query: string, page: number = 1): Promise<any> {
    try {
      const response = await this.apiClient.get('/search/movie', {
        params: { 
          query,
          page,
          include_adult: false,
          language: 'tr-TR'
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching movies:', error);
      return { results: [] };
    }
  }

  public async searchTVShows(query: string, page: number = 1): Promise<any> {
    try {
      const response = await this.apiClient.get('/search/tv', {
        params: { 
          query,
          page,
          include_adult: false,
          language: 'tr-TR'
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching TV shows:', error);
      return { results: [] };
    }
  }

  public async searchMulti(query: string, page: number = 1): Promise<any> {
    try {
      const response = await this.apiClient.get('/search/multi', {
        params: { 
          query,
          page,
          include_adult: false,
          language: 'tr-TR'
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching multi:', error);
      return { results: [] };
    }
  }

  // ===== MOVIE FUNCTIONS =====
  public async getMovies(page: number = 1, category: 'popular' | 'top_rated' | 'now_playing' | 'upcoming' = 'popular'): Promise<any[]> {
    try {
      const response = await this.apiClient.get(`/movie/${category}`, {
        params: { page },
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching movies:', error);
      return [];
    }
  }

  public async getPopularMovies(page: number = 1): Promise<any[]> {
    const cacheKey = `popular_movies_${page}`;
    
    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached && Array.isArray(cached)) {
        return cached;
      }

      performanceMonitor.startMetric('tmdb_popular_movies');
      
      const response = await this.apiClient.get('/movie/popular', {
        params: { page },
      });

      const movies = response.data.results || [];
      
      // Cache the results for 10 minutes
      await cacheManager.set(cacheKey, movies, 10 * 60 * 1000);

      const duration = performanceMonitor.endMetric('tmdb_popular_movies');
      logger.info(`Popular movies fetched in ${duration}ms`, 'TMDBService');
      
      return movies;
    } catch (error) {
      performanceMonitor.endMetric('tmdb_popular_movies');
      logger.error('Error fetching popular movies', 'TMDBService', error);
      
      // Return empty array if API fails - no mock data
      logger.warn('Failed to fetch popular movies from TMDB API', 'TMDBService');
      
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to fetch popular movies',
        context: 'TMDBService',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  public async getTopRatedMovies(page: number = 1): Promise<any[]> {
    const cacheKey = `top_rated_movies_${page}`;
    
    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached && Array.isArray(cached)) {
        return cached;
      }

      performanceMonitor.startMetric('tmdb_top_rated_movies');
      
      const response = await this.apiClient.get('/movie/top_rated', {
        params: { page },
      });

      const movies = response.data.results || [];
      
      // Cache the results for 10 minutes
      await cacheManager.set(cacheKey, movies, 10 * 60 * 1000);

      const duration = performanceMonitor.endMetric('tmdb_top_rated_movies');
      logger.info(`Top rated movies fetched in ${duration}ms`, 'TMDBService');
      
      return movies;
    } catch (error) {
      performanceMonitor.endMetric('tmdb_top_rated_movies');
      logger.error('Error fetching top rated movies', 'TMDBService', error);
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to fetch top rated movies',
        context: 'TMDBService',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  // ===== TV SHOW FUNCTIONS =====
  public async getTVShows(page: number = 1, category: 'popular' | 'top_rated' | 'on_the_air' | 'airing_today' = 'popular'): Promise<any[]> {
    try {
      const response = await this.apiClient.get(`/tv/${category}`, {
        params: { page },
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching TV shows:', error);
      return [];
    }
  }

  public async getPopularTVShows(page: number = 1): Promise<any[]> {
    const cacheKey = `popular_tv_shows_${page}`;
    
    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached && Array.isArray(cached)) {
        return cached;
      }

      performanceMonitor.startMetric('tmdb_popular_tv_shows');
      
      const response = await this.apiClient.get('/tv/popular', {
        params: { page },
      });

      const shows = response.data.results || [];
      
      // Cache the results for 10 minutes
      await cacheManager.set(cacheKey, shows, 10 * 60 * 1000);

      const duration = performanceMonitor.endMetric('tmdb_popular_tv_shows');
      logger.info(`Popular TV shows fetched in ${duration}ms`, 'TMDBService');
      
      return shows;
    } catch (error) {
      performanceMonitor.endMetric('tmdb_popular_tv_shows');
      logger.error('Error fetching popular TV shows', 'TMDBService', error);
      
      // Return empty array if API fails - no mock data
      logger.warn('Failed to fetch popular TV shows from TMDB API', 'TMDBService');
      
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to fetch popular TV shows',
        context: 'TMDBService',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  public async getTopRatedTVShows(page: number = 1): Promise<any[]> {
    const cacheKey = `top_rated_tv_shows_${page}`;
    
    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached && Array.isArray(cached)) {
        return cached;
      }

      performanceMonitor.startMetric('tmdb_top_rated_tv_shows');
      
      const response = await this.apiClient.get('/tv/top_rated', {
        params: { page },
      });

      const shows = response.data.results || [];
      
      // Cache the results for 10 minutes
      await cacheManager.set(cacheKey, shows, 10 * 60 * 1000);

      const duration = performanceMonitor.endMetric('tmdb_top_rated_tv_shows');
      logger.info(`Top rated TV shows fetched in ${duration}ms`, 'TMDBService');
      
      return shows;
    } catch (error) {
      performanceMonitor.endMetric('tmdb_top_rated_tv_shows');
      logger.error('Error fetching top rated TV shows', 'TMDBService', error);
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to fetch top rated TV shows',
        context: 'TMDBService',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  // ===== DETAIL FUNCTIONS =====
  public async getMovieDetails(movieId: number): Promise<any> {
    try {
      // Add append_to_response to get additional data including genres
      const response = await this.apiClient.get(`/movie/${movieId}?append_to_response=genres`);
      return response.data;
    } catch (error) {
      console.error('Error fetching movie details:', error);
      return null;
    }
  }

  public async getTVShowDetails(showId: number): Promise<any> {
    try {
      const response = await this.apiClient.get(`/tv/${showId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching TV show details:', error);
      return null;
    }
  }

  // ===== GENRE FUNCTIONS =====
  public async getMovieGenres(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/genre/movie/list');
      return response.data.genres || [];
    } catch (error) {
      console.error('Error fetching movie genres:', error);
      return [];
    }
  }

  public async getTVGenres(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/genre/tv/list');
      return response.data.genres || [];
    } catch (error) {
      console.error('Error fetching TV genres:', error);
      return [];
    }
  }

  // Tür ID'lerini tür isimlerine çevir
  public getGenreNames(genreIds: number[], mediaType: 'movie' | 'tv'): string[] {
    const genres = mediaType === 'movie' ? this.movieGenres : this.tvGenres;
    return genreIds.map(id => {
      const genre = genres.find(g => g.id === id);
      return genre ? this.translateGenre(genre.name) : '';
    }).filter(name => name);
  }

  // Tür isimlerini Türkçe'ye çevir
  private translateGenre(genreName: string): string {
    const genreTranslations: {[key: string]: string} = {
      // Film türleri
      'Action': 'Aksiyon',
      'Adventure': 'Macera',
      'Animation': 'Animasyon',
      'Comedy': 'Komedi',
      'Crime': 'Suç',
      'Documentary': 'Belgesel',
      'Drama': 'Dram',
      'Family': 'Aile',
      'Fantasy': 'Fantastik',
      'History': 'Tarih',
      'Horror': 'Korku',
      'Music': 'Müzik',
      'Mystery': 'Gizem',
      'Romance': 'Romantik',
      'Science Fiction': 'Bilim Kurgu',
      'TV Movie': 'TV Filmi',
      'Thriller': 'Gerilim',
      'War': 'Savaş',
      'Western': 'Western',
      
      // Dizi türleri
      'Action & Adventure': 'Aksiyon ve Macera',
      'Kids': 'Çocuk',
      'News': 'Haber',
      'Reality': 'Reality',
      'Sci-Fi & Fantasy': 'Bilim Kurgu ve Fantastik',
      'Soap': 'Pembe Dizi',
      'Talk': 'Talk Show',
      'War & Politics': 'Savaş ve Politika'
    };
    
    return genreTranslations[genreName] || genreName;
  }

  private movieGenres: any[] = [];
  private tvGenres: any[] = [];

  public async loadGenres(): Promise<void> {
    try {
      this.movieGenres = await this.getMovieGenres();
      this.tvGenres = await this.getTVGenres();
      logger.info(`Loaded ${this.movieGenres.length} movie genres and ${this.tvGenres.length} TV genres`, 'TMDBService');
    } catch (error) {
      logger.error('Failed to load genres', 'TMDBService', error);
    }
  }

  // ===== HELPER FUNCTIONS =====
  public getImageURL(path: string, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string {
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  // ===== PROFESSIONAL RECOMMENDATION SYSTEM =====
  
  // Öneri fonksiyonları - Profesyonel sistem ile
  public async getMovieRecommendations(userId: string): Promise<any[]> {
    try {
      performanceMonitor.startMetric('tmdb_movie_recommendations');
      
      // Use professional recommendation engine
      const recommendations = await this.recommendationEngine.getMovieRecommendations(userId, {
        maxResults: 20,
        minRating: 6.0,
        excludeFavorites: true,
        excludeWatched: true,
        excludeWatchlist: true,
        language: 'tr-TR'
      });

      const duration = performanceMonitor.endMetric('tmdb_movie_recommendations');
      logger.info(`Movie recommendations generated in ${duration}ms`, 'TMDBService');
      
      return recommendations;
    } catch (error) {
      performanceMonitor.endMetric('tmdb_movie_recommendations');
      logger.error('Error getting movie recommendations', 'TMDBService', error);
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to get movie recommendations',
        context: 'TMDBService',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  public async getTVRecommendations(userId: string): Promise<any[]> {
    try {
      performanceMonitor.startMetric('tmdb_tv_recommendations');
      
      // Use professional recommendation engine
      const recommendations = await this.recommendationEngine.getTVRecommendations(userId, {
        maxResults: 20,
        minRating: 6.0,
        excludeFavorites: true,
        excludeWatched: true,
        excludeWatchlist: true,
        language: 'tr-TR'
      });

      const duration = performanceMonitor.endMetric('tmdb_tv_recommendations');
      logger.info(`TV recommendations generated in ${duration}ms`, 'TMDBService');
      
      return recommendations;
    } catch (error) {
      performanceMonitor.endMetric('tmdb_tv_recommendations');
      logger.error('Error getting TV recommendations', 'TMDBService', error);
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to get TV recommendations',
        context: 'TMDBService',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  public static getInstance(): TMDBService {
    if (!TMDBService.instance) {
      TMDBService.instance = new TMDBService();
    }
    return TMDBService.instance;
  }


  public setRecommendationEngine(engine: ProfessionalRecommendationEngine): void {
    this.recommendationEngine = engine;
  }

  public setUserDataManager(manager: UserDataManager): void {
    this.userDataManager = manager;
  }
}

export const tmdbService = TMDBService.getInstance();



