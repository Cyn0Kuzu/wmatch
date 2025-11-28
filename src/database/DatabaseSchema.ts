import { Timestamp } from 'firebase/firestore';

// ===== USER MANAGEMENT =====
export interface UserProfile {
  // Basic Information
  id?: string;
  uid: string;
  email: string;
  username: string;
  firstName: string;
  lastName?: string; // Opsiyonel
  displayName: string;
  
  // Profile Data
  profile: {
    bio?: string;
    location?: string;
    birthDate?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    interests: string[];
    profilePhotos: string[];
    coverPhoto?: string;
  };
  
  // Preferences
  preferences: {
    favoriteGenres: string[];
    favoriteYears: string[];
    movieTypePreference: 'movie' | 'tv' | 'both';
    language: string;
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      email: boolean;
      push: boolean;
      marketing: boolean;
    };
  };
  
  // Settings
  settings: {
    publicProfile: boolean;
    showEmail: boolean;
    showAge: boolean;
    allowMessages: boolean;
    privacyLevel: 'public' | 'friends' | 'private';
  };
  
  // Statistics
  statistics: {
    moviesWatched: number;
    moviesRated: number;
    averageRating: number;
    totalWatchTime: number; // in minutes
    favoriteActors: string[];
    favoriteDirectors: string[];
    favoriteGenres: string[];
    joinDate: Timestamp;
    lastActive: Timestamp;
  };
  
  // Social
  social: {
    followers: number;
    following: number;
    isVerified: boolean;
    isPremium: boolean;
    socialLinks: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      youtube?: string;
      linkedin?: string;
      letterboxd?: string;
    };
  };
  
  // Security
  security: {
    emailVerified: boolean;
    phoneVerified: boolean;
    twoFactorEnabled: boolean;
    lastPasswordChange: Timestamp;
    loginAttempts: number;
    accountLocked: boolean;
    lockoutUntil?: Timestamp;
  };
  
  // Registration
  registration: {
    step: number;
    completed: boolean;
    selectedMovies: any[];
    onboardingCompleted: boolean;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

// ===== MOVIE/TV DATA =====
export interface MovieData {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  genres: string[];
  runtime?: number;
  budget?: number;
  revenue?: number;
  status: 'released' | 'upcoming' | 'cancelled';
  type: 'movie' | 'tv';
  
  // Additional Data
  cast: {
    id: number;
    name: string;
    character: string;
    profilePath?: string;
  }[];
  
  crew: {
    id: number;
    name: string;
    job: string;
    department: string;
    profilePath?: string;
  }[];
  
  // User Interactions
  userRatings: {
    [userId: string]: {
      rating: number;
      review?: string;
      watched: boolean;
      watchlist: boolean;
      favorite: boolean;
      watchedAt?: Timestamp;
      ratedAt?: Timestamp;
    };
  };
  
  // Aggregated Data
  aggregated: {
    averageRating: number;
    totalRatings: number;
    totalWatches: number;
    totalWatchlists: number;
    totalFavorites: number;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===== USER INTERACTIONS =====
export interface UserRating {
  id: string;
  userId: string;
  movieId: string;
  rating: number; // 1-10
  review?: string;
  watched: boolean;
  watchlist: boolean;
  favorite: boolean;
  watchedAt?: Timestamp;
  ratedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserWatchlist {
  id: string;
  userId: string;
  movieId: string;
  addedAt: Timestamp;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

// ===== SOCIAL FEATURES =====
export interface UserFollow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
  status: 'active' | 'blocked';
}

export interface UserMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'movie_recommendation';
  movieId?: string;
  read: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ===== RECOMMENDATIONS =====
export interface MovieRecommendation {
  id: string;
  fromUserId: string;
  toUserId: string;
  movieId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'watched';
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

export interface SystemRecommendation {
  id: string;
  userId: string;
  movieId: string;
  algorithm: 'collaborative' | 'content_based' | 'hybrid' | 'trending';
  score: number;
  reason: string;
  createdAt: Timestamp;
  shown: boolean;
  clicked: boolean;
}

// ===== MATCHING SYSTEM =====
export interface UserMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  compatibilityScore: number;
  commonMovies: string[];
  commonGenres: string[];
  matchFactors: {
    genreSimilarity: number;
    ratingSimilarity: number;
    watchHistorySimilarity: number;
    ageSimilarity?: number;
    locationSimilarity?: number;
  };
  status: 'pending' | 'matched' | 'declined' | 'blocked';
  createdAt: Timestamp;
  matchedAt?: Timestamp;
}

// ===== ANALYTICS =====
export interface UserAnalytics {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  
  // Usage Metrics
  sessionDuration: number; // in minutes
  screensVisited: string[];
  actionsPerformed: {
    [action: string]: number;
  };
  
  // Content Metrics
  moviesViewed: number;
  moviesRated: number;
  searchesPerformed: number;
  recommendationsClicked: number;
  
  // Social Metrics
  messagesSent: number;
  messagesReceived: number;
  profilesViewed: number;
  matchesCreated: number;
  
  createdAt: Timestamp;
}

// ===== SYSTEM CONFIGURATION =====
export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  isPublic: boolean;
  updatedBy: string;
  updatedAt: Timestamp;
}

// ===== COLLECTIONS =====
export const COLLECTIONS = {
  USERS: 'users',
  MOVIES: 'movies',
  TV_SHOWS: 'tv_shows',
  USER_RATINGS: 'user_ratings',
  USER_WATCHLISTS: 'user_watchlists',
  USER_FOLLOWS: 'user_follows',
  USER_MESSAGES: 'user_messages',
  MOVIE_RECOMMENDATIONS: 'movie_recommendations',
  SYSTEM_RECOMMENDATIONS: 'system_recommendations',
  USER_MATCHES: 'user_matches',
  USER_ANALYTICS: 'user_analytics',
  SYSTEM_CONFIG: 'system_config',
  SECURITY_EVENTS: 'security_events',
  PERFORMANCE_METRICS: 'performance_metrics',
  ERROR_LOGS: 'error_logs'
} as const;

// ===== INDEXES =====
export const INDEXES = {
  // User indexes
  USERS_EMAIL: 'users_email_idx',
  USERS_USERNAME: 'users_username_idx',
  USERS_LOCATION: 'users_location_idx',
  USERS_LAST_ACTIVE: 'users_last_active_idx',
  
  // Movie indexes
  MOVIES_GENRE: 'movies_genre_idx',
  MOVIES_RELEASE_DATE: 'movies_release_date_idx',
  MOVIES_RATING: 'movies_rating_idx',
  MOVIES_POPULARITY: 'movies_popularity_idx',
  
  // Rating indexes
  RATINGS_USER_MOVIE: 'ratings_user_movie_idx',
  RATINGS_MOVIE_RATING: 'ratings_movie_rating_idx',
  RATINGS_USER_RATING: 'ratings_user_rating_idx',
  
  // Social indexes
  FOLLOWS_FOLLOWER: 'follows_follower_idx',
  FOLLOWS_FOLLOWING: 'follows_following_idx',
  MESSAGES_CONVERSATION: 'messages_conversation_idx',
  
  // Analytics indexes
  ANALYTICS_USER_DATE: 'analytics_user_date_idx',
  ANALYTICS_DATE: 'analytics_date_idx'
} as const;

// ===== VALIDATION RULES =====
export const VALIDATION_RULES = {
  USERNAME: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
    reserved: ['admin', 'root', 'system', 'api', 'www']
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PASSWORD: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  BIO: {
    maxLength: 500
  },
  RATING: {
    min: 1,
    max: 10
  }
} as const;
