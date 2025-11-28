import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { spacing } from '../../core/theme';
import { debounce, optimizeImageUrl } from '../../utils/performance';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 360;
const isMediumScreen = width >= 360 && width < 400;

interface Movie {
  id: number;
  title: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
  media_type?: 'movie' | 'tv';
  genre_ids?: number[];
}

interface MovieSearchComponentProps {
  selectedMovies: Movie[];
  onMoviesSelected: (movies: Movie[]) => void;
  tmdbService: any;
  letterboxdLink?: string;
  onLetterboxdLinkChange?: (link: string) => void;
}

export const MovieSearchComponent: React.FC<MovieSearchComponentProps> = ({
  selectedMovies,
  onMoviesSelected,
  tmdbService,
  letterboxdLink = '',
  onLetterboxdLinkChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularTVShows, setPopularTVShows] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

      setIsLoading(true);
      try {
        if (tmdbService && typeof tmdbService.searchMovies === 'function') {
          // Search both movies and TV shows
          const [movieResults, tvResults] = await Promise.all([
            tmdbService.searchMovies(query),
            tmdbService.searchTVShows ? tmdbService.searchTVShows(query) : []
          ]);
          
          // Combine results
          const combinedResults = [...(movieResults || []), ...(tvResults || [])];
          setSearchResults(combinedResults);
        } else {
          console.warn('TMDB Service not available or search methods missing');
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [tmdbService]
  );

  // Load popular content on component mount
  useEffect(() => {
    const loadPopularContent = async () => {
      try {
        if (tmdbService && typeof tmdbService.getPopularMovies === 'function') {
          // Load both movies and TV shows
          const [movies, tvShows] = await Promise.all([
            tmdbService.getPopularMovies(),
            tmdbService.getPopularTVShows ? tmdbService.getPopularTVShows() : []
          ]);
          
          setPopularMovies(movies || []);
          setPopularTVShows(tvShows || []);
        } else {
          console.warn('TMDB Service not available or methods missing');
          setPopularMovies([]);
          setPopularTVShows([]);
        }
      } catch (error) {
        console.error('Error loading popular content:', error);
        setPopularMovies([]);
        setPopularTVShows([]);
      } finally {
        setIsLoadingPopular(false);
      }
    };

    loadPopularContent();
  }, [tmdbService]);

  // Pull to refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tmdbService && typeof tmdbService.getPopularMovies === 'function') {
        // Refresh both movies and TV shows
      const [movies, tvShows] = await Promise.all([
          tmdbService.getPopularMovies(),
          tmdbService.getPopularTVShows ? tmdbService.getPopularTVShows() : []
        ]);
        
        setPopularMovies(movies || []);
        setPopularTVShows(tvShows || []);
      }
      // Clear search results on refresh
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [tmdbService]);

  // Handle search input change
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  }, [debouncedSearch]);

  // Toggle movie selection
  const toggleMovieSelection = useCallback((movie: Movie) => {
    const isSelected = selectedMovies.some(m => m.id === movie.id);
    
    if (isSelected) {
      // Remove movie
      const updatedMovies = selectedMovies.filter(m => m.id !== movie.id);
      onMoviesSelected(updatedMovies);
    } else {
      // Add movie (no limit)
      // Users can select as many movies as they want
      const updatedMovies = [...selectedMovies, movie];
      onMoviesSelected(updatedMovies);
    }
  }, [selectedMovies, onMoviesSelected]);

  // Toggle genre selection
  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  }, []);

  // Filter function
  const filterData = useCallback((data: Movie[]) => {
    let filtered = data;
    
    // Filter by type
    if (selectedType === 'movie') {
      filtered = filtered.filter(item => item.title && !item.name);
    } else if (selectedType === 'tv') {
      filtered = filtered.filter(item => item.name && !item.title);
    }
    
    // Filter by genres (multiple selection)
    if (selectedGenres.length > 0) {
      const genreMap: { [key: string]: number } = {
        'action': 28,
        'comedy': 35,
        'drama': 18,
        'horror': 27,
        'romance': 10749,
        'sci-fi': 878,
        'thriller': 53,
        'adventure': 12,
        'animation': 16,
        'crime': 80,
        'documentary': 99,
        'family': 10751,
        'fantasy': 14,
        'history': 36,
        'music': 10402,
        'mystery': 9648,
        'war': 10752,
        'western': 37
      };
      
      const selectedGenreIds = selectedGenres.map(genre => genreMap[genre]).filter(id => id);
      
      if (selectedGenreIds.length > 0) {
        filtered = filtered.filter(item => 
          item.genre_ids && item.genre_ids.some((genreId: number) => selectedGenreIds.includes(genreId))
        );
      }
    }
    
    // Filter by year
    if (selectedYear) {
      filtered = filtered.filter(item => {
        const releaseDate = item.release_date || item.first_air_date || '';
        const year = releaseDate ? new Date(releaseDate).getFullYear().toString() : '';
        return year === selectedYear;
      });
    }
    
    return filtered;
  }, [selectedType, selectedGenres, selectedYear]);

  // Get current data to display
  const currentData = useMemo(() => {
    let data: Movie[] = [];
    
    if (searchQuery.trim()) {
      data = searchResults;
    } else {
      // Combine movies and TV shows for popular content
      data = [...popularMovies, ...popularTVShows];
    }
    
    return filterData(data);
  }, [searchQuery, searchResults, popularMovies, popularTVShows, filterData]);

  // Render movie card
  const renderMovieCard = useCallback((movie: Movie, index: number) => {
    const isSelected = selectedMovies.some(m => m.id === movie.id);
    const movieTitle = movie.title || movie.name || 'Bilinmeyen';
    const releaseDate = movie.release_date || movie.first_air_date || '';
    const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
    // Determine media type based on available properties
    let mediaType = 'Film'; // default
    if (movie.name && !movie.title) {
      mediaType = 'Dizi';
    } else if (movie.media_type === 'tv') {
      mediaType = 'Dizi';
    } else if (movie.media_type === 'movie') {
      mediaType = 'Film';
    } else if (movie.first_air_date && !movie.release_date) {
      mediaType = 'Dizi';
    } else if (movie.release_date && !movie.first_air_date) {
      mediaType = 'Film';
    }

    return (
      <TouchableOpacity
        key={`${movie.id}-${index}`}
        style={[styles.movieCard, isSelected && styles.selectedMovieCard]}
        onPress={() => toggleMovieSelection(movie)}
        activeOpacity={0.7}
      >
        <View style={styles.moviePosterContainer}>
          <Image
            source={{
              uri: movie.poster_path
                ? tmdbService.getImageURL(movie.poster_path, 'w300')
                : 'https://via.placeholder.com/200x300/333333/FFFFFF?text=No+Image'
            }}
            style={styles.moviePoster}
            resizeMode="cover"
          />
          <View style={styles.mediaTypeBadge}>
            <Text style={styles.mediaTypeText}>{mediaType}</Text>
          </View>
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <Text style={styles.selectedText}>✓</Text>
            </View>
          )}
        </View>
        
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {movieTitle}
          </Text>
          {year && (
          <Text style={styles.movieYear}>
              {year}
          </Text>
          )}
          <View style={styles.movieRating}>
            <Text style={styles.ratingText}>
              ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
          </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [selectedMovies, toggleMovieSelection, tmdbService]);

  return (
    <ScrollView 
      style={styles.container} 
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
      {/* Search Section */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Film veya dizi ara..."
          placeholderTextColor="#8C8C8C"
          value={searchQuery}
          onChangeText={handleSearchChange}
          textAlign="center"
        />

      <View style={[
        styles.selectionInfo,
        {
          backgroundColor: selectedMovies.length >= 5 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(229, 9, 20, 0.1)',
          borderWidth: 1,
          borderColor: selectedMovies.length >= 5 ? '#4CAF50' : '#E50914',
          borderRadius: 6,
          padding: spacing.xs,
          marginBottom: spacing.xs
        }
      ]}>
          <Text style={[
            styles.selectionCount, 
            { 
              color: selectedMovies.length >= 5 ? '#4CAF50' : '#E50914',
              fontWeight: 'bold',
              fontSize: 14
            }
          ]}>
            Seçilen: {selectedMovies.length} film/dizi
        </Text>
          {selectedMovies.length < 5 && (
            <Text style={[styles.selectionHint, { 
              fontSize: 16, 
              fontWeight: 'bold',
              color: '#E50914',
              textAlign: 'center',
              marginTop: spacing.xs
            }]}>
              ⚠️ En az 5 film/dizi seçmelisiniz
            </Text>
          )}
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Filtrele</Text>
        
        {/* Type Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Tür:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedType('all')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'all' && styles.filterButtonTextActive]}>
                Tümü
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'movie' && styles.filterButtonActive]}
              onPress={() => setSelectedType('movie')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'movie' && styles.filterButtonTextActive]}>
                Film
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'tv' && styles.filterButtonActive]}
              onPress={() => setSelectedType('tv')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'tv' && styles.filterButtonTextActive]}>
                Dizi
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Genre Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Kategori:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScrollView}>
            <View style={styles.genreButtons}>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.length === 0 && styles.genreButtonActive]}
                onPress={() => setSelectedGenres([])}
              >
                <Text style={[styles.genreButtonText, selectedGenres.length === 0 && styles.genreButtonTextActive]}>
                  Tümü
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('action') && styles.genreButtonActive]}
                onPress={() => toggleGenre('action')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('action') && styles.genreButtonTextActive]}>
                  Aksiyon
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('comedy') && styles.genreButtonActive]}
                onPress={() => toggleGenre('comedy')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('comedy') && styles.genreButtonTextActive]}>
                  Komedi
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('drama') && styles.genreButtonActive]}
                onPress={() => toggleGenre('drama')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('drama') && styles.genreButtonTextActive]}>
                  Dram
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('horror') && styles.genreButtonActive]}
                onPress={() => toggleGenre('horror')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('horror') && styles.genreButtonTextActive]}>
                  Korku
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('romance') && styles.genreButtonActive]}
                onPress={() => toggleGenre('romance')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('romance') && styles.genreButtonTextActive]}>
                  Romantik
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('sci-fi') && styles.genreButtonActive]}
                onPress={() => toggleGenre('sci-fi')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('sci-fi') && styles.genreButtonTextActive]}>
                  Bilim Kurgu
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('thriller') && styles.genreButtonActive]}
                onPress={() => toggleGenre('thriller')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('thriller') && styles.genreButtonTextActive]}>
                  Gerilim
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('adventure') && styles.genreButtonActive]}
                onPress={() => toggleGenre('adventure')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('adventure') && styles.genreButtonTextActive]}>
                  Macera
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('animation') && styles.genreButtonActive]}
                onPress={() => toggleGenre('animation')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('animation') && styles.genreButtonTextActive]}>
                  Animasyon
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('crime') && styles.genreButtonActive]}
                onPress={() => toggleGenre('crime')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('crime') && styles.genreButtonTextActive]}>
                  Suç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('documentary') && styles.genreButtonActive]}
                onPress={() => toggleGenre('documentary')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('documentary') && styles.genreButtonTextActive]}>
                  Belgesel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('family') && styles.genreButtonActive]}
                onPress={() => toggleGenre('family')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('family') && styles.genreButtonTextActive]}>
                  Aile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('fantasy') && styles.genreButtonActive]}
                onPress={() => toggleGenre('fantasy')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('fantasy') && styles.genreButtonTextActive]}>
                  Fantastik
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('history') && styles.genreButtonActive]}
                onPress={() => toggleGenre('history')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('history') && styles.genreButtonTextActive]}>
                  Tarih
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('music') && styles.genreButtonActive]}
                onPress={() => toggleGenre('music')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('music') && styles.genreButtonTextActive]}>
                  Müzik
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('mystery') && styles.genreButtonActive]}
                onPress={() => toggleGenre('mystery')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('mystery') && styles.genreButtonTextActive]}>
                  Gizem
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('war') && styles.genreButtonActive]}
                onPress={() => toggleGenre('war')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('war') && styles.genreButtonTextActive]}>
                  Savaş
        </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genreButton, selectedGenres.includes('western') && styles.genreButtonActive]}
                onPress={() => toggleGenre('western')}
              >
                <Text style={[styles.genreButtonText, selectedGenres.includes('western') && styles.genreButtonTextActive]}>
                  Western
        </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
      </View>

        {/* Year Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Yıl:</Text>
      <ScrollView
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.yearScrollContainer}
            contentContainerStyle={styles.yearScrollContent}
          >
            <TouchableOpacity
              style={[styles.yearButton, !selectedYear && styles.yearButtonActive]}
              onPress={() => setSelectedYear('')}
            >
              <Text style={[styles.yearButtonText, !selectedYear && styles.yearButtonTextActive]}>
                Tümü
              </Text>
            </TouchableOpacity>
            {Array.from({ length: 135 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearButton, selectedYear === year.toString() && styles.yearButtonActive]}
                  onPress={() => setSelectedYear(year.toString())}
                >
                  <Text style={[styles.yearButtonText, selectedYear === year.toString() && styles.yearButtonTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
                </View>

      {/* Movies Section */}
      <View style={styles.moviesSection}>
        {isLoadingPopular ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Filmler yükleniyor...</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery.trim() ? 'Arama Sonuçları' : 'Popüler İçerikler'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {searchQuery.trim() ? `${searchResults.length} sonuç bulundu` : 'Sağa kaydırarak daha fazla görün'}
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E50914" />
                <Text style={styles.loadingText}>Aranıyor...</Text>
              </View>
            ) : currentData.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.moviesScrollContainer}
                style={styles.moviesScroll}
              >
                {currentData.map((movie, index) => renderMovieCard(movie, index))}
              </ScrollView>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {searchQuery.trim() ? 'Arama sonucu bulunamadı' : 'Filmler yüklenemedi'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery.trim() ? 'Farklı bir arama terimi deneyin' : 'Lütfen daha sonra tekrar deneyin'}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Letterboxd Section */}
      {onLetterboxdLinkChange && (
        <View style={styles.letterboxdSection}>
          <Text style={styles.letterboxdLabel}>
            Letterboxd Profil Linki (Opsiyonel)
          </Text>
          <TextInput
            placeholder="https://letterboxd.com/kullaniciadi"
            value={letterboxdLink}
            onChangeText={onLetterboxdLinkChange}
            style={styles.letterboxdInput}
            textAlign="center"
            placeholderTextColor="#8C8C8C"
          />
          <Text style={styles.letterboxdHint}>
            Letterboxd profil linkinizi paylaşarak film tercihlerinizi daha iyi analiz edebiliriz
          </Text>
        </View>
        )}
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  searchSection: {
    marginBottom: spacing.lg,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectionInfo: {
    alignItems: 'center',
  },
  selectionCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  selectionHint: {
    color: '#8C8C8C',
    fontSize: 14,
    textAlign: 'center',
  },
  moviesSection: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: '#8C8C8C',
    fontSize: 14,
    textAlign: 'center',
  },
  moviesScroll: {
    flexGrow: 0,
  },
  moviesScrollContainer: {
    paddingHorizontal: spacing.sm,
  },
  movieCard: {
    width: 220,
    marginRight: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedMovieCard: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  moviePosterContainer: {
    position: 'relative',
  },
  moviePoster: {
    width: '100%',
    height: 300,
    backgroundColor: '#333333',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E50914',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mediaTypeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  movieInfo: {
    padding: spacing.sm,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  movieYear: {
    color: '#8C8C8C',
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  movieRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: '#8C8C8C',
    fontSize: 16,
    marginTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#8C8C8C',
    fontSize: 14,
    textAlign: 'center',
  },
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    marginBottom: spacing.sm,
  },
  filterTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  filterLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    width: 40,
    marginRight: spacing.sm,
  },
  filterButtons: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  genreScrollView: {
    flex: 1,
  },
  genreButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  genreButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 60,
  },
  genreButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  genreButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  genreButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  letterboxdSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  letterboxdLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  letterboxdInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  letterboxdHint: {
    color: '#8C8C8C',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  yearScrollContainer: {
    flex: 1,
    maxHeight: 40,
  },
  yearScrollContent: {
    paddingRight: spacing.md,
  },
  yearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    minWidth: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearButtonActive: {
    backgroundColor: '#E50914',
  },
  yearButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  yearButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});