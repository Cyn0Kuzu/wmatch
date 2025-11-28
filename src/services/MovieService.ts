import { TMDBService } from './TMDBService';

export class MovieService {
  private static instance: MovieService;
  private tmdbService: TMDBService;

  private constructor() {
    this.tmdbService = TMDBService.getInstance();
  }

  public static getInstance(): MovieService {
    if (!MovieService.instance) {
      MovieService.instance = new MovieService();
    }
    return MovieService.instance;
  }

  public async initialize(): Promise<void> {
    // MovieService initialization if needed
  }

  public async getMovies(page: number = 1): Promise<any[]> {
    return this.tmdbService.getMovies(page);
  }

  public async getRecommendations(): Promise<any[]> {
    return this.tmdbService.getPopularMovies(1);
  }

  public async getTVShows(page: number = 1): Promise<any[]> {
    return this.tmdbService.getTVShows(page);
  }

  public async searchContent(query: string): Promise<any[]> {
    const results = await this.tmdbService.searchMulti(query, 1);
    return results.results || [];
  }

  public async getTrending(): Promise<any[]> {
    return this.tmdbService.getPopularMovies(1);
  }
}

export const movieService = MovieService.getInstance();