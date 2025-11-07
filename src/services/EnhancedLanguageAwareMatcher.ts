import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/Logger';
import { errorHandler, ErrorType } from '../utils/ErrorHandler';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { cacheManager } from '../utils/CacheManager';

// ===== ENHANCED LANGUAGE-AWARE MOVIE MATCHING SYSTEM =====

export interface AlternativeTitle {
  iso_3166_1: string;
  iso_639_1: string;
  title: string;
  type: string;
}

export interface MovieAlternativeTitles {
  id: number;
  titles: AlternativeTitle[];
}

export interface EnhancedMovieData {
  id: number;
  originalTitle: string;
  originalLanguage: string;
  currentTitle: string;
  translations: any[];
  alternativeTitles: AlternativeTitle[];
  allPossibleTitles: string[];
  normalizedTitles: string[];
}

export interface EnhancedExclusionSet {
  movieIds: Set<number>;
  allTitles: Set<string>;
  normalizedTitles: Set<string>;
  alternativeTitles: Set<string>;
  turkishTitles: Set<string>;
  englishTitles: Set<string>;
  originalTitles: Set<string>;
}

export class EnhancedLanguageAwareMatcher {
  private static instance: EnhancedLanguageAwareMatcher;
  private apiKey: string = 'ddcfa0968883c7e0486957cd244e0350';
  private baseURL: string = 'https://api.themoviedb.org/3';
  private apiClient: AxiosInstance;
  private movieDataCache: Map<number, EnhancedMovieData> = new Map();
  private cacheTimeout = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 20000,
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

  public static getInstance(): EnhancedLanguageAwareMatcher {
    if (!EnhancedLanguageAwareMatcher.instance) {
      EnhancedLanguageAwareMatcher.instance = new EnhancedLanguageAwareMatcher();
    }
    return EnhancedLanguageAwareMatcher.instance;
  }

  public async initialize(): Promise<void> {
    // EnhancedLanguageAwareMatcher initialization if needed
  }

  // ===== BATCH PROCESSING FOR PERFORMANCE =====
  public async getBatchEnhancedMovieData(movieIds: number[]): Promise<Map<number, EnhancedMovieData>> {
    const results = new Map<number, EnhancedMovieData>();
    const batchSize = 5; // Process 5 movies at a time to avoid overwhelming the API
    
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (movieId) => {
        try {
          const data = await this.getEnhancedMovieData(movieId);
          if (data) {
            results.set(movieId, data);
          }
        } catch (error) {
          logger.warn(`Failed to get enhanced data for movie ${movieId}`, 'EnhancedMatcher');
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < movieIds.length) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
      }
    }
    
    return results;
  }

  // ===== ENHANCED MOVIE DATA RETRIEVAL =====
  public async getEnhancedMovieData(movieId: number | undefined): Promise<EnhancedMovieData | null> {
    // Handle undefined movieId
    if (!movieId || movieId === undefined) {
      logger.error('Failed to get enhanced movie data for undefined movieId', 'EnhancedMatcher');
      return null;
    }
    
    const cacheKey = `enhanced_movie_data_${movieId}`;
    
    try {
      // Check cache first
      const cached = this.movieDataCache.get(movieId);
      if (cached) {
        logger.debug(`Cache hit for enhanced movie data: ${movieId}`, 'EnhancedMatcher');
        return cached;
      }

      performanceMonitor.startMetric('enhanced_movie_data');

      // Get movie details, translations, and alternative titles
      const [movieResponse, translationsResponse, alternativeTitlesResponse] = await Promise.all([
        this.apiClient.get(`/movie/${movieId}`),
        this.apiClient.get(`/movie/${movieId}/translations`),
        this.apiClient.get(`/movie/${movieId}/alternative_titles`)
      ]);

      const movie = movieResponse.data;
      const translations = translationsResponse.data.translations || [];
      const alternativeTitles = alternativeTitlesResponse.data.titles || [];

      // Process all possible titles
      const allPossibleTitles: string[] = [];
      const normalizedTitles: string[] = [];

      // Add current title
      if (movie.title) {
        allPossibleTitles.push(movie.title);
        normalizedTitles.push(this.normalizeTitle(movie.title));
      }

      // Add original title
      if (movie.original_title && movie.original_title !== movie.title) {
        allPossibleTitles.push(movie.original_title);
        normalizedTitles.push(this.normalizeTitle(movie.original_title));
      }

      // Add translations
      translations.forEach((translation: any) => {
        if (translation.data?.title) {
          allPossibleTitles.push(translation.data.title);
          normalizedTitles.push(this.normalizeTitle(translation.data.title));
        }
      });

      // Add alternative titles
      alternativeTitles.forEach((altTitle: AlternativeTitle) => {
        if (altTitle.title) {
          allPossibleTitles.push(altTitle.title);
          normalizedTitles.push(this.normalizeTitle(altTitle.title));
        }
      });

      const enhancedData: EnhancedMovieData = {
        id: movieId,
        originalTitle: movie.original_title || movie.title,
        originalLanguage: movie.original_language,
        currentTitle: movie.title,
        translations,
        alternativeTitles,
        allPossibleTitles: [...new Set(allPossibleTitles)], // Remove duplicates
        normalizedTitles: [...new Set(normalizedTitles)] // Remove duplicates
      };

      // Cache the result
      this.movieDataCache.set(movieId, enhancedData);
      await cacheManager.set(cacheKey, enhancedData, this.cacheTimeout);

      const duration = performanceMonitor.endMetric('enhanced_movie_data');
      logger.info(`Enhanced movie data fetched in ${duration}ms for movie ${movieId}`, 'EnhancedMatcher');

      return enhancedData;
    } catch (error) {
      performanceMonitor.endMetric('enhanced_movie_data');
      logger.error(`Failed to get enhanced movie data for ${movieId}`, 'EnhancedMatcher', error);
      return null;
    }
  }

  // ===== ENHANCED TITLE NORMALIZATION =====
  private normalizeTitle(title: string): string {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[çğıöşü]/g, (char) => {
        const map: { [key: string]: string } = {
          'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u'
        };
        return map[char] || char;
      })
      .trim();
  }

  // ===== FUZZY TITLE MATCHING =====
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // ===== ENHANCED EXCLUSION SET GENERATION =====
  public async generateEnhancedExclusionSet(userMovieData: any[]): Promise<EnhancedExclusionSet> {
    try {
      performanceMonitor.startMetric('enhanced_exclusion_set');

      const exclusionSet: EnhancedExclusionSet = {
        movieIds: new Set(),
        allTitles: new Set(),
        normalizedTitles: new Set(),
        alternativeTitles: new Set(),
        turkishTitles: new Set(),
        englishTitles: new Set(),
        originalTitles: new Set()
      };

      logger.info(`Processing ${userMovieData.length} user movies for enhanced exclusion set`, 'EnhancedMatcher');

      // Process each movie in user's data
      for (const movie of userMovieData) {
        // Add direct ID
        exclusionSet.movieIds.add(movie.id);

        // Add basic title
        const normalizedTitle = this.normalizeTitle(movie.title);
        if (normalizedTitle) {
          exclusionSet.normalizedTitles.add(normalizedTitle);
          exclusionSet.allTitles.add(normalizedTitle);
        }

        // Get enhanced data for this movie
        const enhancedData = await this.getEnhancedMovieData(movie.id);
        if (enhancedData) {
          // Add all possible titles
          enhancedData.allPossibleTitles.forEach(title => {
            const normalized = this.normalizeTitle(title);
            exclusionSet.allTitles.add(normalized);
            exclusionSet.normalizedTitles.add(normalized);
          });

          // Add normalized titles
          enhancedData.normalizedTitles.forEach(title => {
            exclusionSet.normalizedTitles.add(title);
          });

          // Add alternative titles
          enhancedData.alternativeTitles.forEach(altTitle => {
            const normalized = this.normalizeTitle(altTitle.title);
            exclusionSet.alternativeTitles.add(normalized);
            exclusionSet.allTitles.add(normalized);
          });

          // Categorize by language
          enhancedData.translations.forEach((translation: any) => {
            if (translation.data?.title) {
              const normalized = this.normalizeTitle(translation.data.title);
              exclusionSet.allTitles.add(normalized);
              
              if (translation.iso_639_1 === 'tr') {
                exclusionSet.turkishTitles.add(normalized);
              } else if (translation.iso_639_1 === 'en') {
                exclusionSet.englishTitles.add(normalized);
              }
            }
          });

          // Add original title
          const normalizedOriginal = this.normalizeTitle(enhancedData.originalTitle);
          exclusionSet.originalTitles.add(normalizedOriginal);
          exclusionSet.allTitles.add(normalizedOriginal);
        }
      }

      const duration = performanceMonitor.endMetric('enhanced_exclusion_set');
      logger.info(`Generated enhanced exclusion set with ${exclusionSet.movieIds.size} movies and ${exclusionSet.allTitles.size} titles in ${duration}ms`, 'EnhancedMatcher');

      return exclusionSet;
    } catch (error) {
      performanceMonitor.endMetric('enhanced_exclusion_set');
      logger.error('Failed to generate enhanced exclusion set', 'EnhancedMatcher', error);
      return {
        movieIds: new Set(),
        allTitles: new Set(),
        normalizedTitles: new Set(),
        alternativeTitles: new Set(),
        turkishTitles: new Set(),
        englishTitles: new Set(),
        originalTitles: new Set()
      };
    }
  }

  // ===== ENHANCED MOVIE MATCHING =====
  public async isMovieExcluded(movie: any, exclusionSet: EnhancedExclusionSet): Promise<boolean> {
    try {
      // Direct ID check
      if (exclusionSet.movieIds.has(movie.id)) {
        logger.debug(`Movie ${movie.id} excluded by direct ID match`, 'EnhancedMatcher');
        return true;
      }

      // SIMPLE ID-BASED EXCLUSION: No title-based exclusion
      // Only exclude by ID to prevent over-filtering

      return false;
    } catch (error) {
      logger.error('Error checking movie exclusion', 'EnhancedMatcher', error);
      return false;
    }
  }

  // ===== TV SHOW FILTERING =====
  public async filterTVShowsByEnhancedExclusion(
    tvShows: any[], 
    exclusionSet: EnhancedExclusionSet
  ): Promise<any[]> {
    try {
      performanceMonitor.startMetric('batch_enhanced_tv_filtering');

      const filteredShows = [];
      
      logger.info(`Starting enhanced filtering of ${tvShows.length} TV shows`, 'EnhancedMatcher');
      
      // Process TV shows in batches to improve performance
      const batchSize = 10;
      for (let i = 0; i < tvShows.length; i += batchSize) {
        const batch = tvShows.slice(i, i + batchSize);
        const batchPromises = batch.map(async (show) => {
          const isExcluded = await this.isTVShowExcluded(show, exclusionSet);
          return { show, isExcluded };
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(({ show, isExcluded }) => {
          if (!isExcluded) {
            filteredShows.push(show);
          } else {
          }
        });
        
        // Small delay between batches to prevent overwhelming the API
        if (i + batchSize < tvShows.length) {
          await new Promise<void>(resolve => setTimeout(() => resolve(), 50));
        }
      }

      const duration = performanceMonitor.endMetric('batch_enhanced_tv_filtering');
      logger.info(`Enhanced TV filtering: ${tvShows.length} -> ${filteredShows.length} shows in ${duration}ms`, 'EnhancedMatcher');

      return filteredShows;
    } catch (error) {
      performanceMonitor.endMetric('batch_enhanced_tv_filtering');
      logger.error('Error in batch enhanced TV filtering', 'EnhancedMatcher', error);
      return tvShows; // Return original list on error
    }
  }

  public async isTVShowExcluded(show: any, exclusionSet: EnhancedExclusionSet): Promise<boolean> {
    try {
      // Direct ID check
      if (exclusionSet.movieIds.has(show.id)) {
        logger.debug(`TV Show ${show.id} excluded by direct ID match`, 'EnhancedMatcher');
        return true;
      }

      // SIMPLE ID-BASED EXCLUSION: No title-based exclusion
      // Only exclude by ID to prevent over-filtering

      return false;
    } catch (error) {
      logger.error('Error checking TV show exclusion', 'EnhancedMatcher', error);
      return false;
    }
  }

  public async getEnhancedTVData(tvId: number): Promise<any> {
    try {
      const cacheKey = `enhanced_tv_data_${tvId}`;
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for enhanced TV data: ${tvId}`, 'EnhancedMatcher');
        return cached;
      }

      performanceMonitor.startMetric('enhanced_tv_data');

      // Get translations and alternative titles
      const [translationsResponse, alternativeTitlesResponse] = await Promise.all([
        this.apiClient.get(`/tv/${tvId}/translations`).catch(() => ({ data: { translations: [] } })),
        this.apiClient.get(`/tv/${tvId}/alternative_titles`).catch(() => ({ data: { results: [] } }))
      ]);

      const translations = translationsResponse.data.translations || [];
      const alternativeTitles = alternativeTitlesResponse.data.results || [];

      // Extract all possible titles
      const allPossibleTitles = new Set<string>();
      
      // Add original title
      if (alternativeTitles.length > 0) {
        alternativeTitles.forEach((alt: any) => {
          if (alt.title) allPossibleTitles.add(alt.title);
        });
      }

      // Add translated titles
      translations.forEach((translation: any) => {
        if (translation.data?.name) allPossibleTitles.add(translation.data.name);
        if (translation.data?.title) allPossibleTitles.add(translation.data.title);
      });

      const enhancedData = {
        allPossibleTitles: Array.from(allPossibleTitles),
        translations,
        alternativeTitles
      };

      // Cache for 1 hour
      await cacheManager.set(cacheKey, enhancedData, 60 * 60 * 1000);

      const duration = performanceMonitor.endMetric('enhanced_tv_data');
      logger.info(`Enhanced TV data fetched in ${duration}ms`, 'EnhancedMatcher');

      return enhancedData;
    } catch (error) {
      performanceMonitor.endMetric('enhanced_tv_data');
      logger.error(`Failed to get enhanced TV data for ${tvId}`, 'EnhancedMatcher', error);
      return null;
    }
  }

  // ===== BATCH PROCESSING =====
  public async filterMoviesByEnhancedExclusion(
    movies: any[], 
    exclusionSet: EnhancedExclusionSet
  ): Promise<any[]> {
    try {
      performanceMonitor.startMetric('batch_enhanced_filtering');

      const filteredMovies = [];
      
      logger.info(`Starting enhanced filtering of ${movies.length} movies`, 'EnhancedMatcher');
      
      // Process movies in batches to improve performance
      const batchSize = 10;
      for (let i = 0; i < movies.length; i += batchSize) {
        const batch = movies.slice(i, i + batchSize);
        const batchPromises = batch.map(async (movie) => {
          const isExcluded = await this.isMovieExcluded(movie, exclusionSet);
          return { movie, isExcluded };
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(({ movie, isExcluded }) => {
          if (!isExcluded) {
            filteredMovies.push(movie);
          } else {
          }
        });
        
        // Small delay between batches to prevent overwhelming the API
        if (i + batchSize < movies.length) {
          await new Promise<void>(resolve => setTimeout(() => resolve(), 50));
        }
      }

      const duration = performanceMonitor.endMetric('batch_enhanced_filtering');
      logger.info(`Enhanced filtering: ${movies.length} -> ${filteredMovies.length} movies in ${duration}ms`, 'EnhancedMatcher');

      return filteredMovies;
    } catch (error) {
      performanceMonitor.endMetric('batch_enhanced_filtering');
      logger.error('Error in batch enhanced filtering', 'EnhancedMatcher', error);
      return movies; // Return original list on error
    }
  }

  // ===== DEBUGGING AND ANALYTICS =====
  public async debugMovieExclusion(movie: any, exclusionSet: EnhancedExclusionSet): Promise<{
    isExcluded: boolean;
    reasons: string[];
    enhancedData: EnhancedMovieData | null;
  }> {
    const reasons: string[] = [];
    let isExcluded = false;

    // Direct ID check
    if (exclusionSet.movieIds.has(movie.id)) {
      isExcluded = true;
      reasons.push(`Direct ID match: ${movie.id}`);
    }

    // Get enhanced data
    const enhancedData = await this.getEnhancedMovieData(movie.id);
    if (enhancedData) {
      // Check all titles
      for (const title of enhancedData.allPossibleTitles) {
        const normalizedTitle = this.normalizeTitle(title);
        
        if (exclusionSet.allTitles.has(normalizedTitle)) {
          isExcluded = true;
          reasons.push(`Title match: ${title} -> ${normalizedTitle}`);
        }
      }
    }

    return {
      isExcluded,
      reasons,
      enhancedData
    };
  }

  // ===== CACHE MANAGEMENT =====
  public clearCache(): void {
    this.movieDataCache.clear();
  }

  public async clearUserCache(userId: string): Promise<void> {
    const cacheKeys = [
      `enhanced_movie_data_${userId}`,
      `enhanced_exclusion_set_${userId}`
    ];

    await Promise.all(
      cacheKeys.map(key => cacheManager.delete(key))
    );
  }

  // ===== LANGUAGE PREFERENCE LOGIC =====
  public getPreferredTitle(movie: any, enhancedData: EnhancedMovieData | null): string {
    if (!enhancedData) {
      return movie.title || movie.original_title;
    }

    // Priority: Turkish > English > Original > Current
    const turkishTranslation = enhancedData.translations.find(t => t.iso_639_1 === 'tr');
    if (turkishTranslation?.data?.title) {
      return turkishTranslation.data.title;
    }
    
    const englishTranslation = enhancedData.translations.find(t => t.iso_639_1 === 'en');
    if (englishTranslation?.data?.title) {
      return englishTranslation.data.title;
    }
    
    if (enhancedData.originalTitle) {
      return enhancedData.originalTitle;
    }
    
    return movie.title || movie.original_title;
  }

  // ===== ENHANCED MOVIE PROCESSING WITH LANGUAGE PRIORITY =====
  public async processMovieWithLanguagePriority(movie: any): Promise<{
    id: number;
    title: string;
    originalTitle: string;
    preferredTitle: string;
    poster: string;
    genre: string;
    year: string;
    rating: string;
    overview: string;
    type: string;
    languageData: EnhancedMovieData | null;
  }> {
    try {
      // Fix undefined movie ID issue - use movieId if id is undefined
      const movieId = movie.id || movie.movieId;
      
      // Get enhanced language data
      const enhancedData = await this.getEnhancedMovieData(movieId);
      
      // Get preferred title based on language priority
      const preferredTitle = this.getPreferredTitle(movie, enhancedData);
      
      // Get genre names
      const genre = this.getGenreNames(movie.genre_ids || [], movie.media_type || 'movie');
      
      // Get year
      const year = movie.release_date 
        ? new Date(movie.release_date).getFullYear().toString()
        : movie.first_air_date 
        ? new Date(movie.first_air_date).getFullYear().toString()
        : 'Bilinmiyor';

      return {
        id: movieId,
        title: movie.title || movie.name,
        originalTitle: movie.original_title || movie.original_name,
        preferredTitle,
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        genre,
        year,
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
        overview: movie.overview || '',
        type: movie.media_type || (movie.name ? 'tv' : 'movie'),
        languageData: enhancedData
      };
    } catch (error) {
      logger.error('Error processing movie with language priority', 'EnhancedMatcher', error);
      const movieId = movie.id || movie.movieId;
      return {
        id: movieId,
        title: movie.title || movie.name,
        originalTitle: movie.original_title || movie.original_name,
        preferredTitle: movie.title || movie.name,
        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        genre: 'Bilinmiyor',
        year: 'Bilinmiyor',
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
        overview: movie.overview || '',
        type: movie.media_type || (movie.name ? 'tv' : 'movie'),
        languageData: null
      };
    }
  }

  // ===== GENRE NAMES HELPER =====
  private getGenreNames(genreIds: number[], contentType: string): string {
    const movieGenres: { [key: number]: string } = {
      28: 'Aksiyon',
      12: 'Macera',
      16: 'Animasyon',
      35: 'Komedi',
      80: 'Suç',
      99: 'Belgesel',
      18: 'Drama',
      10751: 'Aile',
      14: 'Fantastik',
      36: 'Tarih',
      27: 'Korku',
      10402: 'Müzik',
      9648: 'Gizem',
      10749: 'Romantik',
      878: 'Bilim Kurgu',
      10770: 'TV Filmi',
      53: 'Gerilim',
      10752: 'Savaş',
      37: 'Batı'
    };

    const tvGenres: { [key: number]: string } = {
      10759: 'Aksiyon & Macera',
      16: 'Animasyon',
      35: 'Komedi',
      80: 'Suç',
      99: 'Belgesel',
      18: 'Drama',
      10751: 'Aile',
      10762: 'Çocuk',
      9648: 'Gizem',
      10763: 'Haber',
      10764: 'Reality',
      10765: 'Bilim Kurgu & Fantastik',
      10766: 'Sabun Dizisi',
      10767: 'Konuşma',
      10768: 'Savaş & Politika',
      37: 'Batı'
    };

    const genreMap = contentType === 'tv' ? tvGenres : movieGenres;
    const genreNames = genreIds.map(id => genreMap[id] || 'Bilinmiyor').filter(name => name !== 'Bilinmiyor');
    
    return genreNames.length > 0 ? genreNames.join(', ') : 'Bilinmiyor';
  }

  // ===== STATISTICS =====
  public getCacheStats(): {
    cacheSize: number;
    cacheKeys: string[];
  } {
    return {
      cacheSize: this.movieDataCache.size,
      cacheKeys: Array.from(this.movieDataCache.keys()).map(id => `enhanced_movie_data_${id}`)
    };
  }
}

export const enhancedLanguageAwareMatcher = EnhancedLanguageAwareMatcher.getInstance();
