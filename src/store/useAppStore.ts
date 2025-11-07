import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorageWrapper } from '../utils/SafeStorageWrapper';

// User interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  profilePhoto?: string;
  location?: string;
  age?: number;
  bio?: string;
  interests: string[];
  favoriteMovies: string[];
  favoriteGenres: string[];
  isVerified: boolean;
  followers: number;
  following: number;
  matches: number;
}

// Settings interface
interface Settings {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    recommendations: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showEmail: boolean;
    showAge: boolean;
    allowMessages: boolean;
  };
  preferences: {
    autoPlay: boolean;
    videoQuality: 'low' | 'medium' | 'high';
    language: string;
    theme: 'light' | 'dark' | 'auto';
  };
  account: {
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
  };
}

// Movie interface
export interface Movie {
  id: string;
  title: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  releaseDate: string;
  voteAverage: number;
  genreIds: number[];
  isMovie: boolean;
}

// Match interface
interface Match {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  matchScore: number;
  commonInterests: string[];
  location: string;
  age: number;
  bio: string;
  isLiked: boolean;
  isDisliked: boolean;
  createdAt: string;
}

// App state interface
interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Settings state
  settings: Settings;
  
  // Movies state
  movies: Movie[];
  tvShows: Movie[];
  trendingMovies: Movie[];
  popularMovies: Movie[];
  topRatedMovies: Movie[];
  upcomingMovies: Movie[];
  
  // Matches state
  matches: Match[];
  currentMatchIndex: number;
  likedMatches: Match[];
  dislikedMatches: Match[];
  
  // UI state
  selectedCategory: string;
  searchQuery: string;
  isSearching: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  
  updateSettings: (settings: Partial<Settings>) => void;
  updateUserProfile: (profile: Partial<User>) => void;
  
  setMovies: (movies: Movie[]) => void;
  setTvShows: (tvShows: Movie[]) => void;
  setTrendingMovies: (movies: Movie[]) => void;
  setPopularMovies: (movies: Movie[]) => void;
  setTopRatedMovies: (movies: Movie[]) => void;
  setUpcomingMovies: (movies: Movie[]) => void;
  
  setMatches: (matches: Match[]) => void;
  setCurrentMatchIndex: (index: number) => void;
  likeMatch: (matchId: string) => void;
  dislikeMatch: (matchId: string) => void;
  resetMatches: () => void;
  
  setSelectedCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  setSearching: (isSearching: boolean) => void;
  
  // Utility actions
  logout: () => void;
  resetApp: () => void;
}

// Default settings
const defaultSettings: Settings = {
  notifications: {
    email: true,
    push: true,
    marketing: false,
    recommendations: true,
  },
  privacy: {
    publicProfile: true,
    showEmail: false,
    showAge: true,
    allowMessages: true,
  },
  preferences: {
    autoPlay: true,
    videoQuality: 'high',
    language: 'tr',
    theme: 'dark',
  },
  account: {
    twoFactorEnabled: false,
    biometricEnabled: false,
  },
};

// Default user
const defaultUser: User = {
  id: '',
  email: '',
  firstName: '',
  lastName: '',
  username: '',
  interests: [],
  favoriteMovies: [],
  favoriteGenres: [],
  isVerified: false,
  followers: 0,
  following: 0,
  matches: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      settings: defaultSettings,
      movies: [],
      tvShows: [],
      trendingMovies: [],
      popularMovies: [],
      topRatedMovies: [],
      upcomingMovies: [],
      matches: [],
      currentMatchIndex: 0,
      likedMatches: [],
      dislikedMatches: [],
      selectedCategory: 'trending',
      searchQuery: '',
      isSearching: false,

      // User actions
      setUser: (user) => set({ user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setLoading: (isLoading) => set({ isLoading }),
      
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      
      updateUserProfile: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null,
        })),

      // Movies actions
      setMovies: (movies) => set({ movies }),
      setTvShows: (tvShows) => set({ tvShows }),
      setTrendingMovies: (trendingMovies) => set({ trendingMovies }),
      setPopularMovies: (popularMovies) => set({ popularMovies }),
      setTopRatedMovies: (topRatedMovies) => set({ topRatedMovies }),
      setUpcomingMovies: (upcomingMovies) => set({ upcomingMovies }),

      // Matches actions
      setMatches: (matches) => set({ matches, currentMatchIndex: 0 }),
      setCurrentMatchIndex: (currentMatchIndex) => set({ currentMatchIndex }),
      
      likeMatch: (matchId) => {
        const state = get();
        const match = state.matches.find(m => m.id === matchId);
        if (match) {
          const updatedMatch = { ...match, isLiked: true, isDisliked: false };
          set({
            likedMatches: [...state.likedMatches, updatedMatch],
            matches: state.matches.filter(m => m.id !== matchId),
            currentMatchIndex: Math.min(state.currentMatchIndex, state.matches.length - 2),
          });
        }
      },
      
      dislikeMatch: (matchId) => {
        const state = get();
        const match = state.matches.find(m => m.id === matchId);
        if (match) {
          const updatedMatch = { ...match, isLiked: false, isDisliked: true };
          set({
            dislikedMatches: [...state.dislikedMatches, updatedMatch],
            matches: state.matches.filter(m => m.id !== matchId),
            currentMatchIndex: Math.min(state.currentMatchIndex, state.matches.length - 2),
          });
        }
      },
      
      resetMatches: () => set({
        matches: [],
        currentMatchIndex: 0,
        likedMatches: [],
        dislikedMatches: [],
      }),

      // UI actions
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSearching: (isSearching) => set({ isSearching }),

      // Utility actions
      logout: () => set({
        user: null,
        isAuthenticated: false,
        matches: [],
        currentMatchIndex: 0,
        likedMatches: [],
        dislikedMatches: [],
      }),
      
      resetApp: () => set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        settings: defaultSettings,
        movies: [],
        tvShows: [],
        trendingMovies: [],
        popularMovies: [],
        topRatedMovies: [],
        upcomingMovies: [],
        matches: [],
        currentMatchIndex: 0,
        likedMatches: [],
        dislikedMatches: [],
        selectedCategory: 'trending',
        searchQuery: '',
        isSearching: false,
      }),
    }),
    {
      name: 'mwatch-storage',
      storage: createJSONStorage(() => safeStorageWrapper),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
        likedMatches: state.likedMatches,
        selectedCategory: state.selectedCategory,
      }),
    }
  )
);


