import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/Logger';
import { errorHandler, ErrorType } from '../utils/ErrorHandler';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { cacheManager } from '../utils/CacheManager';

// ===== PROFESSIONAL LANGUAGE-AWARE MOVIE MATCHING SYSTEM =====

export interface MovieTranslation {
  iso_639_1: string;
  iso_3166_1: string;
  name: string;
  english_name: string;
  data: {
    title?: string;
    overview?: string;
    homepage?: string;
  };
}

export interface MovieLanguageData {
  id: number;
  originalTitle: string;
  originalLanguage: string;
  translations: MovieTranslation[];
  turkishTitle?: string;
  englishTitle?: string;
  normalizedTitle: string;
}

export interface LanguageAwareExclusionSet {
  movieIds: Set<number>;
  normalizedTitles: Set<string>;
  originalTitles: Set<string>;
  turkishTitles: Set<string>;
  englishTitles: Set<string>;
}

export class LanguageAwareMovieMatcher {
  private static instance: LanguageAwareMovieMatcher;
  private apiKey: string = 'ddcfa0968883c7e0486957cd244e0350';
  private baseURL: string = 'https://api.themoviedb.org/3';
  private apiClient: AxiosInstance;
  private translationCache: Map<number, MovieLanguageData> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

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

  public static getInstance(): LanguageAwareMovieMatcher {
    if (!LanguageAwareMovieMatcher.instance) {
      LanguageAwareMovieMatcher.instance = new LanguageAwareMovieMatcher();
    }
    return LanguageAwareMovieMatcher.instance;
  }

  // ===== MOVIE LANGUAGE DATA RETRIEVAL =====
  public async getMovieLanguageData(movieId: number): Promise<MovieLanguageData | null> {
    const cacheKey = `movie_language_${movieId}`;
    
    try {
      // Check cache first
      const cached = this.translationCache.get(movieId);
      if (cached) {
        logger.debug(`Cache hit for movie language data: ${movieId}`, 'LanguageMatcher');
        return cached;
      }

      performanceMonitor.startMetric('movie_language_data');

      // Get movie details and translations
      const [movieResponse, translationsResponse] = await Promise.all([
        this.apiClient.get(`/movie/${movieId}`),
        this.apiClient.get(`/movie/${movieId}/translations`)
      ]);

      const movie = movieResponse.data;
      const translations = translationsResponse.data.translations || [];

      // Process translations
      const turkishTranslation = translations.find(t => t.iso_639_1 === 'tr');
      const englishTranslation = translations.find(t => t.iso_639_1 === 'en');

      const languageData: MovieLanguageData = {
        id: movieId,
        originalTitle: movie.original_title || movie.title,
        originalLanguage: movie.original_language,
        translations,
        turkishTitle: turkishTranslation?.data?.title,
        englishTitle: englishTranslation?.data?.title,
        normalizedTitle: this.normalizeTitle(movie.title || movie.original_title)
      };

      // Cache the result
      this.translationCache.set(movieId, languageData);
      await cacheManager.set(cacheKey, languageData, this.cacheTimeout);

      const duration = performanceMonitor.endMetric('movie_language_data');
      logger.info(`Movie language data fetched in ${duration}ms`, 'LanguageMatcher');

      return languageData;
    } catch (error) {
      performanceMonitor.endMetric('movie_language_data');
      logger.error('Failed to get movie language data', 'LanguageMatcher', error);
      return null;
    }
  }

  // ===== TITLE NORMALIZATION =====
  private normalizeTitle(title: string): string {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  // ===== LANGUAGE-AWARE EXCLUSION SET GENERATION =====
  public async generateLanguageAwareExclusionSet(userMovieData: any[]): Promise<LanguageAwareExclusionSet> {
    try {
      performanceMonitor.startMetric('language_aware_exclusion_set');

      const exclusionSet: LanguageAwareExclusionSet = {
        movieIds: new Set(),
        normalizedTitles: new Set(),
        originalTitles: new Set(),
        turkishTitles: new Set(),
        englishTitles: new Set()
      };

      // Process each movie in user's data
      for (const movie of userMovieData) {
        // Add direct ID
        exclusionSet.movieIds.add(movie.id);

        // Add normalized title
        const normalizedTitle = this.normalizeTitle(movie.title);
        if (normalizedTitle) {
          exclusionSet.normalizedTitles.add(normalizedTitle);
        }

        // Add original title
        if (movie.originalTitle) {
          exclusionSet.originalTitles.add(this.normalizeTitle(movie.originalTitle));
        }

        // Get language data for this movie
        const languageData = await this.getMovieLanguageData(movie.id);
        if (languageData) {
          // Add Turkish title if available
          if (languageData.turkishTitle) {
            exclusionSet.turkishTitles.add(this.normalizeTitle(languageData.turkishTitle));
          }

          // Add English title if available
          if (languageData.englishTitle) {
            exclusionSet.englishTitles.add(this.normalizeTitle(languageData.englishTitle));
          }

          // Add normalized original title
          exclusionSet.originalTitles.add(languageData.normalizedTitle);
        }
      }

      const duration = performanceMonitor.endMetric('language_aware_exclusion_set');
      logger.info(`Generated language-aware exclusion set with ${exclusionSet.movieIds.size} movies in ${duration}ms`, 'LanguageMatcher');

      return exclusionSet;
    } catch (error) {
      performanceMonitor.endMetric('language_aware_exclusion_set');
      logger.error('Failed to generate language-aware exclusion set', 'LanguageMatcher', error);
      return {
        movieIds: new Set(),
        normalizedTitles: new Set(),
        originalTitles: new Set(),
        turkishTitles: new Set(),
        englishTitles: new Set()
      };
    }
  }

  // ===== MOVIE MATCHING =====
  public async isMovieExcluded(movie: any, exclusionSet: LanguageAwareExclusionSet): Promise<boolean> {
    try {
      // Direct ID check
      if (exclusionSet.movieIds.has(movie.id)) {
        logger.debug(`Movie ${movie.id} excluded by direct ID match`, 'LanguageMatcher');
        return true;
      }

      // Get language data for the movie
      const languageData = await this.getMovieLanguageData(movie.id);
      if (!languageData) {
        // Fallback to simple title matching
        const normalizedTitle = this.normalizeTitle(movie.title);
        return exclusionSet.normalizedTitles.has(normalizedTitle);
      }

      // Check Turkish title
      if (languageData.turkishTitle) {
        const normalizedTurkishTitle = this.normalizeTitle(languageData.turkishTitle);
        if (exclusionSet.turkishTitles.has(normalizedTurkishTitle) || 
            exclusionSet.normalizedTitles.has(normalizedTurkishTitle)) {
          logger.debug(`Movie ${movie.id} excluded by Turkish title match: ${languageData.turkishTitle}`, 'LanguageMatcher');
          return true;
        }
      }

      // Check English title
      if (languageData.englishTitle) {
        const normalizedEnglishTitle = this.normalizeTitle(languageData.englishTitle);
        if (exclusionSet.englishTitles.has(normalizedEnglishTitle) || 
            exclusionSet.normalizedTitles.has(normalizedEnglishTitle)) {
          logger.debug(`Movie ${movie.id} excluded by English title match: ${languageData.englishTitle}`, 'LanguageMatcher');
          return true;
        }
      }

      // Check original title
      const normalizedOriginalTitle = this.normalizeTitle(languageData.originalTitle);
      if (exclusionSet.originalTitles.has(normalizedOriginalTitle) || 
          exclusionSet.normalizedTitles.has(normalizedOriginalTitle)) {
        logger.debug(`Movie ${movie.id} excluded by original title match: ${languageData.originalTitle}`, 'LanguageMatcher');
        return true;
      }

      // Check current title
      const normalizedCurrentTitle = this.normalizeTitle(movie.title);
      if (exclusionSet.normalizedTitles.has(normalizedCurrentTitle)) {
        logger.debug(`Movie ${movie.id} excluded by current title match: ${movie.title}`, 'LanguageMatcher');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking movie exclusion', 'LanguageMatcher', error);
      return false;
    }
  }

  // ===== BATCH PROCESSING =====
  public async filterMoviesByLanguageAwareExclusion(
    movies: any[], 
    exclusionSet: LanguageAwareExclusionSet
  ): Promise<any[]> {
    try {
      performanceMonitor.startMetric('batch_language_filtering');

      const filteredMovies = [];
      
      for (const movie of movies) {
        const isExcluded = await this.isMovieExcluded(movie, exclusionSet);
        if (!isExcluded) {
          filteredMovies.push(movie);
        }
      }

      const duration = performanceMonitor.endMetric('batch_language_filtering');
      logger.info(`Filtered ${movies.length} movies to ${filteredMovies.length} in ${duration}ms`, 'LanguageMatcher');

      return filteredMovies;
    } catch (error) {
      performanceMonitor.endMetric('batch_language_filtering');
      logger.error('Error in batch language filtering', 'LanguageMatcher', error);
      return movies; // Return original list on error
    }
  }

  // ===== LANGUAGE PREFERENCE LOGIC =====
  public getPreferredTitle(movie: any, languageData: MovieLanguageData | null): string {
    if (!languageData) {
      return movie.title || movie.original_title;
    }

    // Priority: Turkish > English > Original > Current
    if (languageData.turkishTitle) {
      return languageData.turkishTitle;
    }
    
    if (languageData.englishTitle) {
      return languageData.englishTitle;
    }
    
    if (languageData.originalTitle) {
      return languageData.originalTitle;
    }
    
    return movie.title || movie.original_title;
  }

  // ===== CACHE MANAGEMENT =====
  public clearCache(): void {
    this.translationCache.clear();
  }

  public async clearUserCache(userId: string): Promise<void> {
    const cacheKeys = [
      `movie_language_${userId}`,
      `exclusion_set_${userId}`
    ];

    await Promise.all(
      cacheKeys.map(key => cacheManager.delete(key))
    );
  }

  // ===== ANALYTICS =====
  public getCacheStats(): {
    cacheSize: number;
    cacheKeys: string[];
  } {
    return {
      cacheSize: this.translationCache.size,
      cacheKeys: Array.from(this.translationCache.keys()).map(id => `movie_language_${id}`)
    };
  }
}

export const languageAwareMatcher = LanguageAwareMovieMatcher.getInstance();




