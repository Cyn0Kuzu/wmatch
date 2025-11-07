import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/Logger';
import { errorHandler, ErrorType } from '../utils/ErrorHandler';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { cacheManager } from '../utils/CacheManager';
import { UserDataManager, UserMovieData } from './UserDataManager';
import { LanguageAwareMovieMatcher, LanguageAwareExclusionSet } from './LanguageAwareMatcher';
import { EnhancedLanguageAwareMatcher } from './EnhancedLanguageAwareMatcher';

// ===== PROFESSIONAL RECOMMENDATION ENGINE =====

export interface RecommendationResult {
  id: number;
  title: string;
  poster?: string;
  genre: string;
  year: number | string;
  rating: string;
  overview: string;
  type: 'movie' | 'tv';
  recommendationScore: number;
  reason: string;
  originalTitle?: string;
  preferredTitle?: string;
  languageData?: any;
}

export interface ProgressiveRecommendationResult {
  movies: RecommendationResult[];
  isLoading: boolean;
  progress: number; // 0-100
  totalProcessed: number;
  totalToProcess: number;
}

export interface RecommendationConfig {
  maxResults: number;
  minRating: number;
  preferredGenres: string[];
  excludeFavorites: boolean;
  excludeWatched: boolean;
  excludeWatchlist: boolean;
  language: string;
  cacheTimeout: number;
  progressiveLoading?: boolean;
  batchSize?: number;
  page?: number;
}

export class ProfessionalRecommendationEngine {
  private static instance: ProfessionalRecommendationEngine;
  private apiKey: string = 'ddcfa0968883c7e0486957cd244e0350';
  private baseURL: string = 'https://api.themoviedb.org/3';
  private apiClient: AxiosInstance;
  private genreCache: Map<string, any[]> = new Map();
  private genreCacheTimeout = 30 * 60 * 1000; // 30 minutes
  private userDataManager: UserDataManager | null = null;
  private languageAwareMatcher: LanguageAwareMovieMatcher | null = null;
  private enhancedLanguageAwareMatcher: EnhancedLanguageAwareMatcher | null = null;

  private constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
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

  public static getInstance(): ProfessionalRecommendationEngine {
    if (!ProfessionalRecommendationEngine.instance) {
      ProfessionalRecommendationEngine.instance = new ProfessionalRecommendationEngine();
    }
    return ProfessionalRecommendationEngine.instance;
  }

  public setUserDataManager(manager: UserDataManager): void {
    this.userDataManager = manager;
  }

  public setLanguageAwareMatcher(matcher: LanguageAwareMovieMatcher): void {
    this.languageAwareMatcher = matcher;
  }

  public setEnhancedLanguageAwareMatcher(matcher: EnhancedLanguageAwareMatcher): void {
    this.enhancedLanguageAwareMatcher = matcher;
  }

  // ===== INITIALIZATION =====
  public async initialize(): Promise<void> {
    try {
      performanceMonitor.startMetric('recommendation_engine_init');
      
      // Test API connection and load genres
      await Promise.all([
        this.loadMovieGenres(),
        this.loadTVGenres()
      ]);
      
      const duration = performanceMonitor.endMetric('recommendation_engine_init');
      logger.info(`Recommendation engine initialized in ${duration}ms`, 'RecommendationEngine');
    } catch (error) {
      logger.error('Failed to initialize recommendation engine', 'RecommendationEngine', error);
      throw error;
    }
  }

  // ===== GENRE MANAGEMENT =====
  private async loadMovieGenres(): Promise<void> {
    try {
      const response = await this.apiClient.get('/genre/movie/list', {
        params: { language: 'tr-TR' }
      });
      this.genreCache.set('movie', response.data.genres || []);
    } catch (error) {
      logger.error('Failed to load movie genres', 'RecommendationEngine', error);
    }
  }

  private async loadTVGenres(): Promise<void> {
    try {
      const response = await this.apiClient.get('/genre/tv/list', {
        params: { language: 'tr-TR' }
      });
      this.genreCache.set('tv', response.data.genres || []);
    } catch (error) {
      logger.error('Failed to load TV genres', 'RecommendationEngine', error);
    }
  }

  private getGenreNames(genreIds: number[], type: 'movie' | 'tv'): string {
    const genres = this.genreCache.get(type) || [];
    const genreNames = genreIds
      .map(id => genres.find((g: any) => g.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3); // İlk 3 türü al
    
    return genreNames.join(', ') || 'Bilinmiyor';
  }

  // ===== MOVIE RECOMMENDATIONS =====
  public async getMovieRecommendations(
    userId: string, 
    config: Partial<RecommendationConfig> = {}
  ): Promise<RecommendationResult[]> {
    const defaultConfig: RecommendationConfig = {
      maxResults: 20,
      minRating: 6.0,
      preferredGenres: [],
      excludeFavorites: false, // DISABLED
      excludeWatched: false, // DISABLED
      excludeWatchlist: false, // DISABLED
      language: 'tr-TR',
      cacheTimeout: 10 * 60 * 1000 // 10 minutes
    };

    const finalConfig = { ...defaultConfig, ...config };
    const cacheKey = `movie_recommendations_${userId}_${JSON.stringify(finalConfig)}`;

    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for movie recommendations: ${userId}`, 'RecommendationEngine');
        return cached as any;
      }

      performanceMonitor.startMetric('movie_recommendations');

      // Get enhanced exclusion set
      const exclusionSet = new Set<number>(); // Simplified - no enhanced exclusion
      logger.info(`Exclusion set contains ${exclusionSet.size} movies for user ${userId}`, 'RecommendationEngine');

      // Get multiple pages of popular movies for better variety
      const moviePromises = [];
      const startPage = finalConfig.page || 1;
      const endPage = finalConfig.page ? startPage : startPage + 2; // Reduced from 6 to 2 pages for better performance
      
      for (let page = startPage; page <= endPage; page++) {
        moviePromises.push(
          this.apiClient.get('/movie/popular', {
            params: { 
              page, 
              language: finalConfig.language,
              sort_by: 'popularity.desc'
            }
          })
        );
      }

      const responses = await Promise.all(moviePromises);
      const allMovies = responses.flatMap(response => response.data.results || []);

      // Filter movies using enhanced exclusion
      const basicFilteredMovies = allMovies.filter(movie => {
        // Basic filters
        if (!movie.poster_path) return false;
        if (movie.vote_average < finalConfig.minRating) return false;
        
        // Genre filter if specified
        if (finalConfig.preferredGenres.length > 0) {
          const movieGenres = this.getGenreNames(movie.genre_ids || [], 'movie');
          const hasPreferredGenre = finalConfig.preferredGenres.some(genre => 
            movieGenres.toLowerCase().includes(genre.toLowerCase())
          );
          if (!hasPreferredGenre) return false;
        }

        return true;
      });

      const filteredMovies = await this.enhancedLanguageAwareMatcher.filterMoviesByEnhancedExclusion(
        basicFilteredMovies,
        exclusionSet as any
      );

      const finalFilteredMovies = filteredMovies.slice(0, finalConfig.maxResults * 2); // Get more than needed for scoring

      // Process and score recommendations with language priority
      const recommendations = await Promise.all(
        finalFilteredMovies.map(async (movie) => {
          // Process movie with language priority
          const processedMovie = await this.enhancedLanguageAwareMatcher.processMovieWithLanguagePriority(movie);
          const score = this.calculateRecommendationScore(movie, finalConfig);
          
          return {
            id: processedMovie.id,
            title: processedMovie.title,
            originalTitle: processedMovie.originalTitle,
            preferredTitle: processedMovie.preferredTitle,
            poster: processedMovie.poster,
            genre: processedMovie.genre,
            year: processedMovie.year,
            rating: processedMovie.rating,
            overview: processedMovie.overview,
            type: processedMovie.type,
            recommendationScore: score,
            reason: this.generateRecommendationReason(movie, score),
            languageData: processedMovie.languageData
          };
        })
      );

      // Sort by recommendation score and limit results
      const sortedRecommendations = recommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, finalConfig.maxResults);

      // Cache the results
      await cacheManager.set(cacheKey, sortedRecommendations, finalConfig.cacheTimeout);

      const duration = performanceMonitor.endMetric('movie_recommendations');
      logger.info(`Generated ${sortedRecommendations.length} movie recommendations in ${duration}ms`, 'RecommendationEngine');

      return sortedRecommendations as any;
    } catch (error) {
      performanceMonitor.endMetric('movie_recommendations');
      logger.error('Failed to get movie recommendations', 'RecommendationEngine', error);
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to get movie recommendations',
        context: 'RecommendationEngine',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  // ===== PROGRESSIVE MOVIE RECOMMENDATIONS =====
  public async getProgressiveMovieRecommendations(
    userId: string, 
    config: Partial<RecommendationConfig> = {},
    onProgress?: (result: ProgressiveRecommendationResult) => void
  ): Promise<ProgressiveRecommendationResult> {
    const defaultConfig: RecommendationConfig = {
      maxResults: 20,
      minRating: 6.0,
      preferredGenres: [],
      excludeFavorites: false, // DISABLED
      excludeWatched: false, // DISABLED
      excludeWatchlist: false, // DISABLED
      language: 'tr-TR',
      cacheTimeout: 10 * 60 * 1000,
      progressiveLoading: true,
      batchSize: 5
    };

    const finalConfig = { ...defaultConfig, ...config };
    const batchSize = finalConfig.batchSize || 5;
    
    try {
      performanceMonitor.startMetric('progressive_movie_recommendations');

      // Get enhanced exclusion set for proper filtering
      const exclusionSet = new Set<number>(); // Simplified - no enhanced exclusion
      logger.info(`Exclusion set contains ${exclusionSet.size} movies for user ${userId}`, 'RecommendationEngine');
      

      // For new users with minimal data, use a more lenient exclusion set
      const userFavorites = await this.userDataManager.getUserFavorites(userId);
      const userWatched = await this.userDataManager.getUserWatchedContent(userId);
      const userWatchlist = await this.userDataManager.getUserWatchlist(userId);
      
      const totalUserData = userFavorites.length + userWatched.length + userWatchlist.length;
      
      // Simplified exclusion logic
      if (totalUserData === 0) {
        // No exclusion if user has no data
      } else {
        // Use the enhanced exclusion set but with smart filtering
        // Exclusion set already defined
      }

      // Get first page immediately for quick initial results
      const firstPageResponse = await this.apiClient.get('/movie/popular', {
        params: { 
          page: 1, 
          language: finalConfig.language,
          sort_by: 'popularity.desc'
        }
      });

      const firstPageMovies = firstPageResponse.data.results || [];
      
      // Basic filtering
      const basicFilteredMovies = firstPageMovies.filter((movie: any) => {
        return movie.vote_average >= finalConfig.minRating && 
               movie.poster_path && 
               movie.overview;
      });
      const filteredMovies = await this.enhancedLanguageAwareMatcher.filterMoviesByEnhancedExclusion(
        basicFilteredMovies,
        exclusionSet as any
      );

      const allMovies = filteredMovies.slice(0, finalConfig.maxResults * 2);
      const totalToProcess = Math.min(allMovies.length, finalConfig.maxResults);
      
      let processedMovies: RecommendationResult[] = [];
      let currentBatch = 0;

      // Process movies in batches
      for (let i = 0; i < allMovies.length && processedMovies.length < finalConfig.maxResults; i += batchSize) {
        const batch = allMovies.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (movie) => {
            const processedMovie = await this.enhancedLanguageAwareMatcher.processMovieWithLanguagePriority(movie);
            const score = this.calculateRecommendationScore(movie, finalConfig);
            
            return {
              id: processedMovie.id,
              title: processedMovie.title,
              originalTitle: processedMovie.originalTitle,
              preferredTitle: processedMovie.preferredTitle,
              poster: processedMovie.poster,
              genre: processedMovie.genre,
              year: processedMovie.year,
              rating: processedMovie.rating,
              overview: processedMovie.overview,
              type: processedMovie.type,
              recommendationScore: score,
              reason: this.generateRecommendationReason(movie, score),
              languageData: processedMovie.languageData
            };
          })
        );

        // Sort and add to results
        const sortedBatch = batchResults.sort((a, b) => b.recommendationScore - a.recommendationScore);
        const combined = [...processedMovies, ...sortedBatch] as any;
        processedMovies = combined
          .sort((a: any, b: any) => b.recommendationScore - a.recommendationScore)
          .slice(0, finalConfig.maxResults);

        currentBatch++;
        const progress = Math.min(100, Math.round((processedMovies.length / finalConfig.maxResults) * 100));
        
        // Send progress update
        if (onProgress) {
          onProgress({
            movies: processedMovies,
            isLoading: processedMovies.length < finalConfig.maxResults,
            progress,
            totalProcessed: processedMovies.length,
            totalToProcess: finalConfig.maxResults
          });
        }

        // Small delay to allow UI updates
        await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
      }

      const duration = performanceMonitor.endMetric('progressive_movie_recommendations');
      logger.info(`Generated ${processedMovies.length} progressive movie recommendations in ${duration}ms`, 'RecommendationEngine');

      return {
        movies: processedMovies,
        isLoading: false,
        progress: 100,
        totalProcessed: processedMovies.length,
        totalToProcess: finalConfig.maxResults
      };

    } catch (error) {
      performanceMonitor.endMetric('progressive_movie_recommendations');
      logger.error('Failed to get progressive movie recommendations', 'RecommendationEngine', error);
      errorHandler.handleError({
        type: ErrorType.NETWORK,
        message: 'Failed to get progressive movie recommendations',
        context: 'RecommendationEngine',
        data: error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // ===== TV SHOW RECOMMENDATIONS =====
  public async getTVRecommendations(
    userId: string, 
    config: Partial<RecommendationConfig> = {}
  ): Promise<RecommendationResult[]> {
    const defaultConfig: RecommendationConfig = {
      maxResults: 20,
      minRating: 6.0,
      preferredGenres: [],
      excludeFavorites: false, // DISABLED
      excludeWatched: false, // DISABLED
      excludeWatchlist: false, // DISABLED
      language: 'tr-TR',
      cacheTimeout: 10 * 60 * 1000 // 10 minutes
    };

    const finalConfig = { ...defaultConfig, ...config };
    const cacheKey = `tv_recommendations_${userId}_${JSON.stringify(finalConfig)}`;

    try {
      // Check cache first
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for TV recommendations: ${userId}`, 'RecommendationEngine');
        return cached as any;
      }

      performanceMonitor.startMetric('tv_recommendations');

      // Get enhanced exclusion set for proper filtering
      const exclusionSet = new Set<number>(); // Simplified - no enhanced exclusion
      logger.info(`Exclusion set contains ${exclusionSet.size} movies for user ${userId}`, 'RecommendationEngine');
      

      // For new users with minimal data, use a more lenient exclusion set
      const userFavorites = await this.userDataManager.getUserFavorites(userId);
      const userWatched = await this.userDataManager.getUserWatchedContent(userId);
      const userWatchlist = await this.userDataManager.getUserWatchlist(userId);
      
      const totalUserData = userFavorites.length + userWatched.length + userWatchlist.length;
      
      // Simplified exclusion logic
      if (totalUserData === 0) {
        // No exclusion if user has no data
      } else {
        // Use the enhanced exclusion set but with smart filtering
        // Exclusion set already defined
      }

      // Get multiple pages of popular TV shows for better variety
      const tvPromises = [];
      for (let page = 1; page <= 2; page++) { // Reduced from 5 to 2 pages for better performance
        tvPromises.push(
          this.apiClient.get('/tv/popular', {
            params: { 
              page, 
              language: finalConfig.language,
              sort_by: 'popularity.desc'
            }
          })
        );
      }

      const responses = await Promise.all(tvPromises);
      const allShows = responses.flatMap(response => response.data.results || []);

      // Filter TV shows using enhanced exclusion
      const basicFilteredShows = allShows.filter(show => {
        // Basic filters
        if (!show.poster_path) return false;
        if (show.vote_average < finalConfig.minRating) return false;
        
        // Genre filter if specified
        if (finalConfig.preferredGenres.length > 0) {
          const showGenres = this.getGenreNames(show.genre_ids || [], 'tv');
          const hasPreferredGenre = finalConfig.preferredGenres.some(genre => 
            showGenres.toLowerCase().includes(genre.toLowerCase())
          );
          if (!hasPreferredGenre) return false;
        }

        return true;
      });

      // PROFESSIONAL FILTERING: Use enhanced filtering with smart exclusion
      const filteredShows = await this.enhancedLanguageAwareMatcher.filterTVShowsByEnhancedExclusion(
        basicFilteredShows,
        exclusionSet as any
      );

      const finalFilteredShows = filteredShows.slice(0, finalConfig.maxResults * 2); // Get more than needed for scoring

      // Process and score recommendations with language priority
      const recommendations = await Promise.all(
        finalFilteredShows.map(async (show) => {
          // Process show with language priority
          const processedShow = await this.enhancedLanguageAwareMatcher.processMovieWithLanguagePriority(show);
          const score = this.calculateRecommendationScore(show, finalConfig);
          
          return {
            id: processedShow.id,
            title: processedShow.title,
            originalTitle: processedShow.originalTitle,
            preferredTitle: processedShow.preferredTitle,
            poster: processedShow.poster,
            genre: processedShow.genre,
            year: processedShow.year,
            rating: processedShow.rating,
            overview: processedShow.overview,
            type: processedShow.type,
            recommendationScore: score,
            reason: this.generateRecommendationReason(show, score),
            languageData: processedShow.languageData
          };
        })
      );

      // Sort by recommendation score and limit results
      const sortedRecommendations = recommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, finalConfig.maxResults);

      // Cache the results
      await cacheManager.set(cacheKey, sortedRecommendations, finalConfig.cacheTimeout);

      const duration = performanceMonitor.endMetric('tv_recommendations');
      logger.info(`Generated ${sortedRecommendations.length} TV recommendations in ${duration}ms`, 'RecommendationEngine');

      return sortedRecommendations as any;
    } catch (error) {
      performanceMonitor.endMetric('tv_recommendations');
      logger.error('Failed to get TV recommendations', 'RecommendationEngine', error);
      errorHandler.handleError({
        type: ErrorType.API,
        message: 'Failed to get TV recommendations',
        context: 'RecommendationEngine',
        data: error,
        timestamp: new Date().toISOString()
      });
      return [];
    }
  }

  // ===== RECOMMENDATION SCORING =====
  private calculateRecommendationScore(item: any, config: RecommendationConfig): number {
    let score = 0;

    // Base popularity score (0-40 points)
    score += Math.min((item.popularity || 0) / 10, 40);

    // Rating score (0-30 points)
    if (item.vote_average) {
      score += (item.vote_average / 10) * 30;
    }

    // Vote count score (0-20 points)
    if (item.vote_count) {
      score += Math.min(Math.log10(item.vote_count + 1) * 5, 20);
    }

    // Genre preference score (0-10 points)
    if (config.preferredGenres.length > 0) {
      const itemGenres = this.getGenreNames(item.genre_ids || [], item.media_type || 'movie');
      const genreMatches = config.preferredGenres.filter(genre => 
        itemGenres.toLowerCase().includes(genre.toLowerCase())
      ).length;
      score += (genreMatches / config.preferredGenres.length) * 10;
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  private generateRecommendationReason(item: any, score: number): string {
    const reasons = [];
    
    if (item.vote_average >= 8.0) {
      reasons.push('Yüksek puanlı');
    } else if (item.vote_average >= 7.0) {
      reasons.push('İyi puanlı');
    }
    
    if (item.popularity >= 100) {
      reasons.push('Popüler');
    }
    
    if (item.vote_count >= 1000) {
      reasons.push('Çok izlenen');
    }

    if (reasons.length === 0) {
      return 'Önerilen içerik';
    }

    return reasons.join(', ');
  }

  // ===== CACHE MANAGEMENT =====
  public async clearUserRecommendations(userId: string): Promise<void> {
    const cacheKeys = [
      `movie_recommendations_${userId}`,
      `tv_recommendations_${userId}`
    ];

    await Promise.all(
      cacheKeys.map(key => cacheManager.delete(key))
    );
  }

  // ===== ANALYTICS =====
  public async getRecommendationAnalytics(userId: string): Promise<{
    totalRecommendations: number;
    averageScore: number;
    genreDistribution: { [key: string]: number };
    typeDistribution: { movie: number; tv: number };
  }> {
    try {
      const [movieRecs, tvRecs] = await Promise.all([
        this.getMovieRecommendations(userId, { maxResults: 100 }),
        this.getTVRecommendations(userId, { maxResults: 100 })
      ]);

      const allRecommendations = [...movieRecs, ...tvRecs];
      
      const averageScore = allRecommendations.length > 0
        ? allRecommendations.reduce((sum, rec) => sum + rec.recommendationScore, 0) / allRecommendations.length
        : 0;

      const genreDistribution: { [key: string]: number } = {};
      allRecommendations.forEach(rec => {
        const genres = rec.genre.split(', ');
        genres.forEach(genre => {
          genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
        });
      });

      const typeDistribution = {
        movie: movieRecs.length,
        tv: tvRecs.length
      };

      return {
        totalRecommendations: allRecommendations.length,
        averageScore: Math.round(averageScore * 100) / 100,
        genreDistribution,
        typeDistribution
      };
    } catch (error) {
      logger.error('Failed to get recommendation analytics', 'RecommendationEngine', error);
      return {
        totalRecommendations: 0,
        averageScore: 0,
        genreDistribution: {},
        typeDistribution: { movie: 0, tv: 0 }
      };
    }
  }
}

export const recommendationEngine = ProfessionalRecommendationEngine.getInstance();
