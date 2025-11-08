import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  Animated,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { realTimeWatchingService, CurrentlyWatchingItem } from '../services/RealTimeWatchingService';
import { firestoreService } from '../services/FirestoreService';
import { tmdbService } from '../services/TMDBService';
import { authService } from '../services/AuthService';
import { userDataManager } from '../services/UserDataManager';
import { eventService } from '../services/EventService';
import { MovieDetailModal } from '../components/ui/MovieDetailModal';
import { logger } from '../utils/Logger';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.35;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export const WatchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | 'movie' | 'tv'>('all');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Currently watching states
  const [allCurrentlyWatching, setAllCurrentlyWatching] = useState<CurrentlyWatchingItem[]>([]);
  const [watchingFilter, setWatchingFilter] = useState<'all' | 'movie' | 'tv'>('all');
  
  // Content states with pagination
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [popularMoviesPage, setPopularMoviesPage] = useState(1);
  const [loadingPopularMovies, setLoadingPopularMovies] = useState(false);
  
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>([]);
  const [topRatedMoviesPage, setTopRatedMoviesPage] = useState(1);
  const [loadingTopRatedMovies, setLoadingTopRatedMovies] = useState(false);
  
  const [popularTVShows, setPopularTVShows] = useState<any[]>([]);
  const [popularTVShowsPage, setPopularTVShowsPage] = useState(1);
  const [loadingPopularTV, setLoadingPopularTV] = useState(false);
  
  const [topRatedTVShows, setTopRatedTVShows] = useState<any[]>([]);
  const [topRatedTVShowsPage, setTopRatedTVShowsPage] = useState(1);
  const [loadingTopRatedTV, setLoadingTopRatedTV] = useState(false);
  
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [showMovieModal, setShowMovieModal] = useState(false);

  useEffect(() => {
    initializeScreen();
    
    // Real-time listener for currently watching updates
    const unsubscribe = realTimeWatchingService.onCurrentlyWatchingChange(() => {
      loadCurrentlyWatching();
    });
    
    // Auto-refresh currently watching every 10 seconds
    const refreshInterval = setInterval(() => {
      loadCurrentlyWatching();
    }, 10000);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearInterval(refreshInterval);
    };
  }, []);


  const initializeScreen = async () => {
    try {
      setLoading(true);
      
      await firestoreService.initialize();
      await tmdbService.initialize();
      
      realTimeWatchingService.setFirestoreService(firestoreService);
      realTimeWatchingService.setTMDBService(tmdbService);
      userDataManager.setFirestoreService(firestoreService);
      
      await realTimeWatchingService.initialize();
      
      await Promise.all([
        loadCurrentlyWatching(),
        loadInitialContent()
      ]);
      
      setLoading(false);
    } catch (error) {
      logger.error('Failed to initialize WatchScreen:', 'WatchScreen', error);
      setLoading(false);
    }
  };

  const loadCurrentlyWatching = async () => {
    try {
      // Load all users' currently watching
      const allWatching = await realTimeWatchingService.getAllCurrentlyWatching();
      setAllCurrentlyWatching(allWatching);
      
      console.log('Currently watching loaded:', {
        total: allWatching.length,
        items: allWatching.map(item => ({
          id: item.movieId,
          title: item.title,
          viewers: item.viewers.length
        }))
      });
    } catch (error) {
      logger.error('Failed to load currently watching:', 'WatchScreen', error);
    }
  };

  const loadInitialContent = async () => {
    try {
      // Load 10 items for each category initially
      const [movies, topMovies, tvShows, topTVShows] = await Promise.all([
        tmdbService.getPopularMovies(1),
        tmdbService.getTopRatedMovies(1),
        tmdbService.getPopularTVShows(1),
        tmdbService.getTopRatedTVShows(1)
      ]);

      setPopularMovies(movies.slice(0, 10));
      setTopRatedMovies(topMovies.slice(0, 10));
      setPopularTVShows(tvShows.slice(0, 10));
      setTopRatedTVShows(topTVShows.slice(0, 10));
    } catch (error) {
      logger.error('Failed to load initial content:', 'WatchScreen', error);
    }
  };

  const loadMorePopularMovies = async () => {
    if (loadingPopularMovies) return;
    
    try {
      setLoadingPopularMovies(true);
      const nextPage = popularMoviesPage + 1;
      const movies = await tmdbService.getPopularMovies(nextPage);
      setPopularMovies([...popularMovies, ...movies.slice(0, 10)]);
      setPopularMoviesPage(nextPage);
    } catch (error) {
      logger.error('Failed to load more popular movies:', 'WatchScreen', error);
    } finally {
      setLoadingPopularMovies(false);
    }
  };

  const loadMoreTopRatedMovies = async () => {
    if (loadingTopRatedMovies) return;
    
    try {
      setLoadingTopRatedMovies(true);
      const nextPage = topRatedMoviesPage + 1;
      const movies = await tmdbService.getTopRatedMovies(nextPage);
      setTopRatedMovies([...topRatedMovies, ...movies.slice(0, 10)]);
      setTopRatedMoviesPage(nextPage);
    } catch (error) {
      logger.error('Failed to load more top rated movies:', 'WatchScreen', error);
    } finally {
      setLoadingTopRatedMovies(false);
    }
  };

  const loadMorePopularTV = async () => {
    if (loadingPopularTV) return;
    
    try {
      setLoadingPopularTV(true);
      const nextPage = popularTVShowsPage + 1;
      const shows = await tmdbService.getPopularTVShows(nextPage);
      setPopularTVShows([...popularTVShows, ...shows.slice(0, 10)]);
      setPopularTVShowsPage(nextPage);
    } catch (error) {
      logger.error('Failed to load more popular TV:', 'WatchScreen', error);
    } finally {
      setLoadingPopularTV(false);
    }
  };

  const loadMoreTopRatedTV = async () => {
    if (loadingTopRatedTV) return;
    
    try {
      setLoadingTopRatedTV(true);
      const nextPage = topRatedTVShowsPage + 1;
      const shows = await tmdbService.getTopRatedTVShows(nextPage);
      setTopRatedTVShows([...topRatedTVShows, ...shows.slice(0, 10)]);
      setTopRatedTVShowsPage(nextPage);
    } catch (error) {
      logger.error('Failed to load more top rated TV:', 'WatchScreen', error);
    } finally {
      setLoadingTopRatedTV(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadCurrentlyWatching(),
        loadInitialContent()
      ]);
    } catch (error) {
      logger.error('Failed to refresh:', 'WatchScreen', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      
      let results: any[] = [];
      
      if (searchCategory === 'all') {
        const multiResults = await tmdbService.searchMulti(query, 1);
        results = multiResults.results || [];
      } else if (searchCategory === 'movie') {
        const movieResults = await tmdbService.searchMovies(query, 1);
        results = movieResults.results || [];
      } else {
        const tvResults = await tmdbService.searchTVShows(query, 1);
        results = tvResults.results || [];
      }

      setSearchResults(results.slice(0, 20));
    } catch (error) {
      logger.error('Search failed:', 'WatchScreen', error);
      Alert.alert('Hata', 'Arama sırasında bir hata oluştu');
    } finally {
      setSearchLoading(false);
    }
  };

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auto-search when typing
  useEffect(() => {
    if (!searchExpanded) return;

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500); // Debounce 500ms

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, searchCategory, searchExpanded]);

  const renderMovieCard = (item: any, index: number, section?: string) => {
    const releaseDate = item.release_date || item.first_air_date || '';
    const year = releaseDate ? new Date(releaseDate).getFullYear() : (item.year || 'N/A');
    const rating = item.vote_average || item.rating;
    const genres = item.genre_ids && item.genre_ids.length > 0 
      ? tmdbService.getGenreNames(item.genre_ids, item.first_air_date || item.media_type === 'tv' ? 'tv' : 'movie')
      : [];
    
    return (
      <TouchableOpacity
        key={`${section || 'movie'}-${item.id}-${index}`}
        style={styles.movieCard}
        onPress={() => {
          setSelectedMovie(item);
          setShowMovieModal(true);
        }}
        activeOpacity={0.8}
      >
        <Image
          source={{ 
            uri: item.poster_path 
              ? `https://image.tmdb.org/t/p/w342${item.poster_path}` 
              : item.poster
              ? `https://image.tmdb.org/t/p/w342${item.poster}`
              : 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Image'
          }}
          style={styles.moviePoster}
          resizeMode="cover"
        />
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          {genres.length > 0 && (
            <Text style={styles.movieGenre} numberOfLines={1}>
              {genres.slice(0, 2).join(', ')}
            </Text>
          )}
          <View style={styles.movieMeta}>
            <Text style={styles.movieYear}>{year}</Text>
            {rating && (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>⭐ {rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCurrentlyWatchingItem = (item: CurrentlyWatchingItem, index: number) => {
    const itemAny = item as any;
    const genres = itemAny.genre_ids && itemAny.genre_ids.length > 0 
      ? tmdbService.getGenreNames(itemAny.genre_ids, item.media_type === 'tv' ? 'tv' : 'movie')
      : [];
    
    return (
      <TouchableOpacity
        key={`currently-${item.id}-${index}`}
        style={styles.currentlyWatchingCard}
        onPress={() => {
          // Pass full item with all data
          setSelectedMovie({
            ...itemAny,
            id: item.movieId,
            title: item.title,
            name: item.name,
            poster_path: item.poster_path,
            media_type: item.media_type,
          });
          setShowMovieModal(true);
        }}
        activeOpacity={0.8}
      >
        <Image
          source={{ 
            uri: item.poster_path 
              ? `https://image.tmdb.org/t/p/w342${item.poster_path}` 
              : 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Image'
          }}
          style={styles.currentlyWatchingPoster}
          resizeMode="cover"
        />
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>CANLI</Text>
        </View>
        <View style={styles.currentlyWatchingInfo}>
          <Text style={styles.currentlyWatchingTitle} numberOfLines={2}>
            {item.title || item.name}
          </Text>
          {genres.length > 0 && (
            <Text style={styles.movieGenre} numberOfLines={1}>
              {genres.slice(0, 2).join(', ')}
            </Text>
          )}
          
          {/* İzleyici Profilleri */}
          <View style={styles.viewersSection}>
            <View style={styles.viewersAvatars}>
              {item.viewers.slice(0, 5).map((viewer, idx) => (
                <View key={viewer.id} style={[styles.viewerAvatar, idx > 0 && styles.viewerAvatarOverlap]}>
                  {viewer.photoURL ? (
                    <Image
                      source={{ uri: viewer.photoURL }}
                      style={styles.viewerAvatarImage}
                    />
                  ) : (
                    <View style={styles.viewerAvatarPlaceholder}>
                      <Text style={styles.viewerAvatarText}>
                        {viewer.displayName?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {item.viewers.length > 5 && (
                <View style={[styles.viewerAvatar, styles.viewerAvatarOverlap, styles.viewerAvatarMore]}>
                  <Text style={styles.viewerAvatarMoreText}>+{item.viewers.length - 5}</Text>
                </View>
              )}
            </View>
            <Text style={styles.viewersText}>{item.viewers.length} kişi izliyor</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredCurrentlyWatching = watchingFilter === 'all' 
    ? allCurrentlyWatching
    : allCurrentlyWatching.filter(item => 
        watchingFilter === 'movie' 
          ? item.media_type === 'movie' 
          : item.media_type === 'tv'
      );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>İçerikler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E50914']}
            tintColor="#E50914"
          />
        }
      >
        {/* Şu Anda İzlenenler - Film/Dizi Filtreli */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.liveIndicatorHeader}>
                <View style={styles.liveDotPulse} />
              </View>
              <Text style={styles.sectionTitleLive}>Şu An İzlenenler</Text>
            </View>
            <Text style={styles.sectionCount}>{filteredCurrentlyWatching.length} içerik</Text>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, watchingFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setWatchingFilter('all')}
            >
              <Text style={[styles.filterButtonText, watchingFilter === 'all' && styles.filterButtonTextActive]}>
                Tümü
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, watchingFilter === 'movie' && styles.filterButtonActive]}
              onPress={() => setWatchingFilter('movie')}
            >
              <Text style={[styles.filterButtonText, watchingFilter === 'movie' && styles.filterButtonTextActive]}>
                🎬 Filmler
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, watchingFilter === 'tv' && styles.filterButtonActive]}
              onPress={() => setWatchingFilter('tv')}
            >
              <Text style={[styles.filterButtonText, watchingFilter === 'tv' && styles.filterButtonTextActive]}>
                📺 Diziler
              </Text>
            </TouchableOpacity>
          </View>

          {filteredCurrentlyWatching.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {filteredCurrentlyWatching.map((item, index) => renderCurrentlyWatchingItem(item, index))}
            </ScrollView>
          ) : (
            <View style={styles.emptyWatchingContainer}>
              <Text style={styles.emptyWatchingIcon}>📺</Text>
              <Text style={styles.emptyWatchingText}>
                {watchingFilter === 'all' ? 'Şu anda kimse izlemiyor' : 
                 watchingFilter === 'movie' ? 'Şu anda kimse film izlemiyor' : 
                 'Şu anda kimse dizi izlemiyor'}
              </Text>
              <Text style={styles.emptyWatchingSubtext}>İlk izleyici sen ol!</Text>
            </View>
          )}
        </View>

        {/* Film/Dizi Ara Barı */}
        <View style={styles.searchSection}>
          <TouchableOpacity 
            style={styles.searchContainer}
            onPress={() => setSearchExpanded(true)}
            activeOpacity={searchExpanded ? 1 : 0.7}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Film veya dizi ara..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchExpanded(true)}
            />
            {searchLoading && <ActivityIndicator size="small" color="#E50914" />}
            {searchExpanded && searchQuery && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
          {/* Arama Kategorisi Butonları - Sadece açıkken göster */}
          {searchExpanded && (
            <View style={styles.searchCategoryButtons}>
              <TouchableOpacity
                style={[styles.searchCategoryButton, searchCategory === 'all' && styles.searchCategoryButtonActive]}
                onPress={() => setSearchCategory('all')}
              >
                <Text style={[styles.searchCategoryButtonText, searchCategory === 'all' && styles.searchCategoryButtonTextActive]}>
                  Tümü
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchCategoryButton, searchCategory === 'movie' && styles.searchCategoryButtonActive]}
                onPress={() => setSearchCategory('movie')}
              >
                <Text style={[styles.searchCategoryButtonText, searchCategory === 'movie' && styles.searchCategoryButtonTextActive]}>
                  🎬 Filmler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchCategoryButton, searchCategory === 'tv' && styles.searchCategoryButtonActive]}
                onPress={() => setSearchCategory('tv')}
              >
                <Text style={[styles.searchCategoryButtonText, searchCategory === 'tv' && styles.searchCategoryButtonTextActive]}>
                  📺 Diziler
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Arama Sonuçları */}
        {searchExpanded && searchResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔍 Arama Sonuçları</Text>
              <TouchableOpacity onPress={() => {
                setSearchExpanded(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <Text style={styles.closeSearchText}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {searchResults.map((item, index) => <View key={`search-${item.id}-${index}`}>{renderMovieCard(item, index)}</View>)}
            </ScrollView>
          </View>
        )}

        {/* Popüler Filmler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 Popüler Filmler</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isEndReached = layoutMeasurement.width + contentOffset.x >= contentSize.width - 100;
              if (isEndReached && !loadingPopularMovies) {
                loadMorePopularMovies();
              }
            }}
            scrollEventThrottle={16}
          >
            {popularMovies.map((item, index) => <View key={`popular-movies-${item.id}-${index}`}>{renderMovieCard(item, index)}</View>)}
            {loadingPopularMovies && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#E50914" />
              </View>
            )}
          </ScrollView>
        </View>

        {/* En Yüksek Puan Alan Filmler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 En Yüksek Puan Alan Filmler</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isEndReached = layoutMeasurement.width + contentOffset.x >= contentSize.width - 100;
              if (isEndReached && !loadingTopRatedMovies) {
                loadMoreTopRatedMovies();
              }
            }}
            scrollEventThrottle={16}
          >
            {topRatedMovies.map((item, index) => <View key={`top-movies-${item.id}-${index}`}>{renderMovieCard(item, index)}</View>)}
            {loadingTopRatedMovies && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#E50914" />
              </View>
            )}
          </ScrollView>
        </View>

        {/* Popüler Diziler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📺 Popüler Diziler</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isEndReached = layoutMeasurement.width + contentOffset.x >= contentSize.width - 100;
              if (isEndReached && !loadingPopularTV) {
                loadMorePopularTV();
              }
            }}
            scrollEventThrottle={16}
          >
            {popularTVShows.map((item, index) => <View key={`popular-tv-${item.id}-${index}`}>{renderMovieCard(item, index)}</View>)}
            {loadingPopularTV && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#E50914" />
              </View>
            )}
          </ScrollView>
        </View>

        {/* En Yüksek Puan Alan Diziler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 En Yüksek Puan Alan Diziler</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isEndReached = layoutMeasurement.width + contentOffset.x >= contentSize.width - 100;
              if (isEndReached && !loadingTopRatedTV) {
                loadMoreTopRatedTV();
              }
            }}
            scrollEventThrottle={16}
          >
            {topRatedTVShows.map((item, index) => <View key={`top-tv-${item.id}-${index}`}>{renderMovieCard(item, index)}</View>)}
            {loadingTopRatedTV && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#E50914" />
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        visible={showMovieModal}
        movie={selectedMovie}
        onClose={() => setShowMovieModal(false)}
        onStatusChange={() => loadCurrentlyWatching()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8C8C8C',
    fontSize: 16,
    marginTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleLive: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  liveIndicatorHeader: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDotPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E50914',
  },
  sectionCount: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  filterButtonText: {
    color: '#8C8C8C',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  horizontalScroll: {
    paddingLeft: 20,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: '#8C8C8C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeSearchText: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '600',
  },
  searchCategoryButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  searchCategoryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  searchCategoryButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  searchCategoryButtonText: {
    color: '#8C8C8C',
    fontSize: 13,
    fontWeight: '600',
  },
  searchCategoryButtonTextActive: {
    color: '#FFFFFF',
  },
  movieCard: {
    width: CARD_WIDTH,
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  moviePoster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#2A2A2A',
  },
  movieInfo: {
    padding: 8,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  movieGenre: {
    color: '#8C8C8C',
    fontSize: 10,
    marginBottom: 3,
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movieYear: {
    color: '#8C8C8C',
    fontSize: 11,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  currentlyWatchingCard: {
    width: CARD_WIDTH,
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#E50914',
  },
  currentlyWatchingPoster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#2A2A2A',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  currentlyWatchingInfo: {
    padding: 8,
  },
  currentlyWatchingTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  viewersSection: {
    marginTop: 6,
  },
  viewersAvatars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  viewerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  viewerAvatarOverlap: {
    marginLeft: -8,
  },
  viewerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  viewerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewerAvatarMore: {
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerAvatarMoreText: {
    color: '#E50914',
    fontSize: 9,
    fontWeight: 'bold',
  },
  viewersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewersIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  viewersText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyWatchingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyWatchingIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyWatchingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyWatchingSubtext: {
    color: '#8C8C8C',
    fontSize: 14,
  },
  loadingMore: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpace: {
    height: 40,
  },
});
