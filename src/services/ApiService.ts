import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Movie } from '../store/useAppStore';

// TMDB API configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'your_tmdb_api_key_here'; // Replace with actual API key
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// API endpoints
const ENDPOINTS = {
  // Movies
  TRENDING_MOVIES: '/trending/movie/day',
  POPULAR_MOVIES: '/movie/popular',
  TOP_RATED_MOVIES: '/movie/top_rated',
  UPCOMING_MOVIES: '/movie/upcoming',
  NOW_PLAYING_MOVIES: '/movie/now_playing',
  
  // TV Shows
  TRENDING_TV: '/trending/tv/day',
  POPULAR_TV: '/tv/popular',
  TOP_RATED_TV: '/tv/top_rated',
  ON_THE_AIR_TV: '/tv/on_the_air',
  AIRING_TODAY_TV: '/tv/airing_today',
  
  // Search
  SEARCH_MOVIE: '/search/movie',
  SEARCH_TV: '/search/tv',
  SEARCH_MULTI: '/search/multi',
  
  // Genres
  MOVIE_GENRES: '/genre/movie/list',
  TV_GENRES: '/genre/tv/list',
  
  // Details
  MOVIE_DETAILS: '/movie',
  TV_DETAILS: '/tv',
  
  // Credits
  MOVIE_CREDITS: '/movie/{id}/credits',
  TV_CREDITS: '/tv/{id}/credits',
  
  // Videos
  MOVIE_VIDEOS: '/movie/{id}/videos',
  TV_VIDEOS: '/tv/{id}/videos',
  
  // Similar
  SIMILAR_MOVIES: '/movie/{id}/similar',
  SIMILAR_TV: '/tv/{id}/similar',
  
  // Recommendations
  RECOMMENDED_MOVIES: '/movie/{id}/recommendations',
  RECOMMENDED_TV: '/tv/{id}/recommendations',
} as const;

// Image sizes
export const IMAGE_SIZES = {
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    xlarge: 'w780',
  },
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    xlarge: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
  },
} as const;

// TMDB API response interfaces
interface TMDBMovieResponse {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  adult: boolean;
  video: boolean;
  vote_count: number;
  popularity: number;
  original_language: string;
  original_title: string;
}

interface TMDBTVResponse {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
  adult: boolean;
  vote_count: number;
  popularity: number;
  original_language: string;
  original_name: string;
}

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

class ApiService {
  private api: AxiosInstance;
  private genres: { movies: TMDBGenre[]; tv: TMDBGenre[] } = {
    movies: [],
    tv: [],
  };

  constructor() {
    this.api = axios.create({
      baseURL: TMDB_BASE_URL,
      params: {
        api_key: TMDB_API_KEY,
        language: 'tr-TR', // Turkish language
      },
      timeout: 10000,
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    // Load genres on initialization
    this.loadGenres();
  }

  // Load movie and TV genres
  private async loadGenres(): Promise<void> {
    try {
      const [movieGenresResponse, tvGenresResponse] = await Promise.all([
        this.api.get<TMDBResponse<TMDBGenre>>(ENDPOINTS.MOVIE_GENRES),
        this.api.get<TMDBResponse<TMDBGenre>>(ENDPOINTS.TV_GENRES),
      ]);

      this.genres.movies = movieGenresResponse.data.results;
      this.genres.tv = tvGenresResponse.data.results;
    } catch (error) {
      console.error('Failed to load genres:', error);
    }
  }

  // Convert TMDB response to Movie format
  private convertToMovie(tmdbItem: TMDBMovieResponse | TMDBTVResponse, isMovie: boolean = true): Movie {
    return {
      id: tmdbItem.id.toString(),
      title: isMovie ? (tmdbItem as TMDBMovieResponse).title : (tmdbItem as TMDBTVResponse).name,
      overview: tmdbItem.overview,
      posterPath: tmdbItem.poster_path || '',
      backdropPath: tmdbItem.backdrop_path || '',
      releaseDate: isMovie ? (tmdbItem as TMDBMovieResponse).release_date : (tmdbItem as TMDBTVResponse).first_air_date,
      voteAverage: tmdbItem.vote_average,
      genreIds: tmdbItem.genre_ids,
      isMovie,
    };
  }

  // Get image URL
  public getImageUrl(path: string, size: keyof typeof IMAGE_SIZES.poster = 'medium'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${IMAGE_SIZES.poster[size]}${path}`;
  }

  public getBackdropUrl(path: string, size: keyof typeof IMAGE_SIZES.backdrop = 'large'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE_URL}/${IMAGE_SIZES.backdrop[size]}${path}`;
  }

  // Movies
  public async getTrendingMovies(): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse>>(ENDPOINTS.TRENDING_MOVIES);
      return response.data.results.map(item => this.convertToMovie(item, true));
    } catch (error) {
      console.error('Failed to fetch trending movies:', error);
      return [];
    }
  }

  public async getPopularMovies(): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse>>(ENDPOINTS.POPULAR_MOVIES);
      return response.data.results.map(item => this.convertToMovie(item, true));
    } catch (error) {
      console.error('Failed to fetch popular movies:', error);
      return [];
    }
  }

  public async getTopRatedMovies(): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse>>(ENDPOINTS.TOP_RATED_MOVIES);
      return response.data.results.map(item => this.convertToMovie(item, true));
    } catch (error) {
      console.error('Failed to fetch top rated movies:', error);
      return [];
    }
  }

  public async getUpcomingMovies(): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse>>(ENDPOINTS.UPCOMING_MOVIES);
      return response.data.results.map(item => this.convertToMovie(item, true));
    } catch (error) {
      console.error('Failed to fetch upcoming movies:', error);
      return [];
    }
  }

  // TV Shows
  public async getTrendingTV(): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBTVResponse>>(ENDPOINTS.TRENDING_TV);
      return response.data.results.map(item => this.convertToMovie(item, false));
    } catch (error) {
      console.error('Failed to fetch trending TV shows:', error);
      return [];
    }
  }

  public async getPopularTV(): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBTVResponse>>(ENDPOINTS.POPULAR_TV);
      return response.data.results.map(item => this.convertToMovie(item, false));
    } catch (error) {
      console.error('Failed to fetch popular TV shows:', error);
      return [];
    }
  }

  public async getTopRatedTV(): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBTVResponse>>(ENDPOINTS.TOP_RATED_TV);
      return response.data.results.map(item => this.convertToMovie(item, false));
    } catch (error) {
      console.error('Failed to fetch top rated TV shows:', error);
      return [];
    }
  }

  // Search
  public async searchMovies(query: string, page: number = 1): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse>>(ENDPOINTS.SEARCH_MOVIE, {
        params: { query, page },
      });
      return response.data.results.map(item => this.convertToMovie(item, true));
    } catch (error) {
      console.error('Failed to search movies:', error);
      return [];
    }
  }

  public async searchTV(query: string, page: number = 1): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBTVResponse>>(ENDPOINTS.SEARCH_TV, {
        params: { query, page },
      });
      return response.data.results.map(item => this.convertToMovie(item, false));
    } catch (error) {
      console.error('Failed to search TV shows:', error);
      return [];
    }
  }

  public async searchMulti(query: string, page: number = 1): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse | TMDBTVResponse>>(ENDPOINTS.SEARCH_MULTI, {
        params: { query, page },
      });
      return response.data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((item: any) => this.convertToMovie(item, item.media_type === 'movie'));
    } catch (error) {
      console.error('Failed to search multi:', error);
      return [];
    }
  }

  // Get movie/TV details
  public async getMovieDetails(id: string): Promise<Movie | null> {
    try {
      const response = await this.api.get<TMDBMovieResponse>(`${ENDPOINTS.MOVIE_DETAILS}/${id}`);
      return this.convertToMovie(response.data, true);
    } catch (error) {
      console.error('Failed to fetch movie details:', error);
      return null;
    }
  }

  public async getTVDetails(id: string): Promise<Movie | null> {
    try {
      const response = await this.api.get<TMDBTVResponse>(`${ENDPOINTS.TV_DETAILS}/${id}`);
      return this.convertToMovie(response.data, false);
    } catch (error) {
      console.error('Failed to fetch TV details:', error);
      return null;
    }
  }

  // Get similar content
  public async getSimilarMovies(id: string): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse>>(
        ENDPOINTS.SIMILAR_MOVIES.replace('{id}', id)
      );
      return response.data.results.map(item => this.convertToMovie(item, true));
    } catch (error) {
      console.error('Failed to fetch similar movies:', error);
      return [];
    }
  }

  public async getSimilarTV(id: string): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBTVResponse>>(
        ENDPOINTS.SIMILAR_TV.replace('{id}', id)
      );
      return response.data.results.map(item => this.convertToMovie(item, false));
    } catch (error) {
      console.error('Failed to fetch similar TV shows:', error);
      return [];
    }
  }

  // Get recommendations
  public async getRecommendedMovies(id: string): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBMovieResponse>>(
        ENDPOINTS.RECOMMENDED_MOVIES.replace('{id}', id)
      );
      return response.data.results.map(item => this.convertToMovie(item, true));
    } catch (error) {
      console.error('Failed to fetch recommended movies:', error);
      return [];
    }
  }

  public async getRecommendedTV(id: string): Promise<Movie[]> {
    try {
      const response = await this.api.get<TMDBResponse<TMDBTVResponse>>(
        ENDPOINTS.RECOMMENDED_TV.replace('{id}', id)
      );
      return response.data.results.map(item => this.convertToMovie(item, false));
    } catch (error) {
      console.error('Failed to fetch recommended TV shows:', error);
      return [];
    }
  }

  // Get genres
  public getMovieGenres(): TMDBGenre[] {
    return this.genres.movies;
  }

  public getTVGenres(): TMDBGenre[] {
    return this.genres.tv;
  }

  public getGenreName(genreId: number, isMovie: boolean = true): string {
    const genres = isMovie ? this.genres.movies : this.genres.tv;
    const genre = genres.find(g => g.id === genreId);
    return genre?.name || 'Unknown';
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;


