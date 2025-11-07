import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Text, Chip, Badge, Avatar } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import * as Animatable from 'react-native-animatable';

import { useCoreEngine } from '../../core/CoreEngine';
import { EnterpriseCard } from './EnterpriseCard';
import { EnterpriseButton } from './EnterpriseButton';
import { EnterpriseInput } from './EnterpriseInput';
import { EnterpriseLayout, EnterpriseSection, EnterpriseGrid, EnterpriseRow } from './EnterpriseLayout';
import { spacing } from '../../core/theme';
import { performanceMonitor } from '../../utils/PerformanceMonitor';
import { logger } from '../../utils/Logger';
import { cacheManager } from '../../utils/CacheManager';

const { width: screenWidth } = Dimensions.get('window');

interface MovieData {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  popularity: number;
}

interface FilterState {
  type: 'all' | 'movie' | 'tv';
  genres: string[];
  year: string;
  rating: number;
  sortBy: 'popularity' | 'rating' | 'date' | 'title';
}

interface EnterpriseMovieSearchProps {
  selectedMovies: MovieData[];
  onMovieSelect: (movie: MovieData) => void;
  onMovieRemove: (movieId: number) => void;
  maxSelection?: number;
  minSelection?: number;
  showFilters?: boolean;
  showStats?: boolean;
}

const GENRE_MAP: { [key: number]: string } = {
  28: 'Aksiyon',
  12: 'Macera',
  16: 'Animasyon',
  35: 'Komedi',
  80: 'Suç',
  99: 'Belgesel',
  18: 'Dram',
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
  37: 'Western'
};

const GENRE_OPTIONS = [
  'Aksiyon', 'Macera', 'Animasyon', 'Komedi', 'Suç', 'Belgesel',
  'Dram', 'Aile', 'Fantastik', 'Tarih', 'Korku', 'Müzik',
  'Gizem', 'Romantik', 'Bilim Kurgu', 'Gerilim', 'Savaş', 'Western'
];

export const EnterpriseMovieSearch: React.FC<EnterpriseMovieSearchProps> = ({
  selectedMovies,
  onMovieSelect,
  onMovieRemove,
  maxSelection = 5,
  minSelection = 3,
  showFilters = true,
  showStats = true
}) => {
  const { coreService, tmdbService } = useCoreEngine();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    genres: [],
    year: '',
    rating: 0,
    sortBy: 'popularity'
  });

  // Debounced search
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch popular content
  const { data: popularMovies = [], isLoading: moviesLoading, refetch: refetchMovies } = useQuery({
    queryKey: ['popular_movies_search'],
    queryFn: () => tmdbService.getPopularMovies(1),
    staleTime: 10 * 60 * 1000,
  });

  const { data: popularTVShows = [], isLoading: tvLoading, refetch: refetchTV } = useQuery({
    queryKey: ['popular_tvshows_search'],
    queryFn: () => tmdbService.getPopularTVShows(1),
    staleTime: 10 * 60 * 1000,
  });

  // Search functionality
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['movie_search', debouncedQuery, filters],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      
      performanceMonitor.startMetric('movie_search');
      const results = await Promise.all([
        tmdbService.searchMovies(debouncedQuery, 1),
        tmdbService.searchTVShows(debouncedQuery, 1)
      ]);
      
      const combined = [
        ...results[0].map(movie => ({ ...movie, media_type: 'movie' as const })),
        ...results[1].map(tv => ({ ...tv, media_type: 'tv' as const }))
      ];
      
      const duration = performanceMonitor.endMetric('movie_search');
      logger.info(`Movie search completed in ${duration}ms`, 'EnterpriseMovieSearch');
      
      return applyFilters(combined);
    },
    enabled: !!debouncedQuery.trim(),
    staleTime: 2 * 60 * 1000,
  });

  const applyFilters = useCallback((data: MovieData[]): MovieData[] => {
    let filtered = [...data];

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(item => item.media_type === filters.type);
    }

    // Genre filter
    if (filters.genres.length > 0) {
      filtered = filtered.filter(item => {
        const itemGenres = item.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);
        return filters.genres.some(genre => itemGenres.includes(genre));
      });
    }

    // Year filter
    if (filters.year) {
      const year = parseInt(filters.year);
      filtered = filtered.filter(item => {
        const releaseYear = new Date(item.release_date || item.first_air_date || '').getFullYear();
        return releaseYear === year;
      });
    }

    // Rating filter
    if (filters.rating > 0) {
      filtered = filtered.filter(item => item.vote_average >= filters.rating);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return b.vote_average - a.vote_average;
        case 'date':
          return new Date(b.release_date || b.first_air_date || '').getTime() - 
                 new Date(a.release_date || a.first_air_date || '').getTime();
        case 'title':
          return (a.title || a.name || '').localeCompare(b.title || b.name || '');
        default:
          return b.popularity - a.popularity;
      }
    });

    return filtered;
  }, [filters]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      performanceMonitor.startMetric('movie_search_refresh');
      await Promise.all([refetchMovies(), refetchTV()]);
      const duration = performanceMonitor.endMetric('movie_search_refresh');
      logger.info(`Movie search refreshed in ${duration}ms`, 'EnterpriseMovieSearch');
    } catch (error) {
      logger.error('Refresh error', 'EnterpriseMovieSearch', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMovieSelect = (movie: MovieData) => {
    // No maximum limit - users can select as many movies as they want

    if (selectedMovies.find(m => m.id === movie.id)) {
      Alert.alert('Bilgi', 'Bu film zaten seçilmiş');
      return;
    }

    performanceMonitor.trackUserInteraction('movie_select');
    onMovieSelect(movie);
    logger.info(`Movie selected: ${movie.title || movie.name}`, 'EnterpriseMovieSearch');
  };

  const handleMovieRemove = (movieId: number) => {
    performanceMonitor.trackUserInteraction('movie_remove');
    onMovieRemove(movieId);
    logger.info(`Movie removed: ${movieId}`, 'EnterpriseMovieSearch');
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    performanceMonitor.trackUserInteraction(`filter_change_${key}`);
  };

  const toggleGenre = (genre: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      genres: [],
      year: '',
      rating: 0,
      sortBy: 'popularity'
    });
    performanceMonitor.trackUserInteraction('clear_filters');
  };

  const getDisplayData = (): MovieData[] => {
    if (debouncedQuery.trim()) {
      return searchResults;
    }
    
    const combined = [
      ...popularMovies.slice(0, 10).map(movie => ({ ...movie, media_type: 'movie' as const })),
      ...popularTVShows.slice(0, 10).map(tv => ({ ...tv, media_type: 'tv' as const }))
    ];
    
    return applyFilters(combined);
  };

  const displayData = getDisplayData();
  const isLoading = moviesLoading || tvLoading || searchLoading;

  return (
    <EnterpriseLayout scrollable={true} padding={spacing.md}>
      <ScrollView 
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
        <EnterpriseSection>
          <EnterpriseInput
            label="Film veya Dizi Ara"
            placeholder="Örn: Inception, Breaking Bad..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Text style={styles.searchIcon}>🔍</Text>}
            animation="fadeInUp"
            delay={200}
          />
        </EnterpriseSection>

        {/* Selection Stats */}
        {showStats && (
          <EnterpriseSection>
            <EnterpriseCard variant="glass">
              <EnterpriseRow justifyContent="space-between" alignItems="center">
                <View>
                  <Text style={styles.statsTitle}>Seçilen İçerik</Text>
                  <Text style={styles.statsSubtitle}>
                    {selectedMovies.length} film/dizi seçildi
                  </Text>
                </View>
                <Badge size={24} style={styles.selectionBadge}>
                  {selectedMovies.length}
                </Badge>
              </EnterpriseRow>
              
              {selectedMovies.length < 5 && (
                <View style={styles.minSelectionWarning}>
                  <Text style={styles.warningText}>
                    En az 5 film/dizi seçmelisiniz
                  </Text>
                </View>
              )}
            </EnterpriseCard>
          </EnterpriseSection>
        )}

        {/* Filters */}
        {showFilters && (
          <EnterpriseSection>
            <EnterpriseCard variant="outlined" title="Filtreler">
              {/* Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Tür:</Text>
                <EnterpriseRow spacing={spacing.sm}>
                  {(['all', 'movie', 'tv'] as const).map(type => (
                    <Chip
                      key={type}
                      mode={filters.type === type ? 'flat' : 'outlined'}
                      selected={filters.type === type}
                      onPress={() => handleFilterChange('type', type)}
                      style={styles.filterChip}
                      textStyle={styles.filterChipText}
                    >
                      {type === 'all' ? 'Tümü' : type === 'movie' ? 'Film' : 'Dizi'}
                    </Chip>
                  ))}
                </EnterpriseRow>
              </View>

              {/* Genre Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Kategori:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
                  <EnterpriseRow spacing={spacing.sm}>
                    {GENRE_OPTIONS.map(genre => (
                      <Chip
                        key={genre}
                        mode={filters.genres.includes(genre) ? 'flat' : 'outlined'}
                        selected={filters.genres.includes(genre)}
                        onPress={() => toggleGenre(genre)}
                        style={styles.genreChip}
                        textStyle={styles.genreChipText}
                      >
                        {genre}
                      </Chip>
                    ))}
                  </EnterpriseRow>
                </ScrollView>
              </View>

              {/* Year Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Yıl:</Text>
                <EnterpriseInput
                  placeholder="2024"
                  value={filters.year}
                  onChangeText={(value) => handleFilterChange('year', value)}
                  keyboardType="numeric"
                  maxLength={4}
                  style={styles.yearInput}
                />
              </View>

              {/* Clear Filters */}
              <EnterpriseButton
                title="Filtreleri Temizle"
                onPress={clearFilters}
                variant="ghost"
                size="small"
                style={styles.clearFiltersButton}
              />
            </EnterpriseCard>
          </EnterpriseSection>
        )}

        {/* Selected Movies */}
        {selectedMovies.length > 0 && (
          <EnterpriseSection>
            <Text style={styles.sectionTitle}>
              Seçilen İçerik ({selectedMovies.length})
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedScroll}>
              <EnterpriseRow spacing={spacing.md}>
                {selectedMovies.map((movie, index) => (
                  <Animatable.View
                    key={movie.id}
                    animation="fadeInUp"
                    delay={index * 100}
                    style={styles.selectedMovieCard}
                  >
                    <EnterpriseCard variant="elevated" size="small">
                      <View style={styles.selectedMovieContent}>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleMovieRemove(movie.id)}
                        >
                          <Text style={styles.removeButtonText}>×</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.selectedMovieTitle} numberOfLines={2}>
                          {movie.title || movie.name}
                        </Text>
                        
                        <Chip 
                          mode="outlined" 
                          compact 
                          style={styles.selectedMediaTypeChip}
                          textStyle={styles.selectedMediaTypeText}
                        >
                          {movie.media_type === 'movie' ? 'Film' : 'Dizi'}
                        </Chip>
                      </View>
                    </EnterpriseCard>
                  </Animatable.View>
                ))}
              </EnterpriseRow>
            </ScrollView>
          </EnterpriseSection>
        )}

        {/* Results */}
        <EnterpriseSection>
          <EnterpriseRow justifyContent="space-between" alignItems="center">
            <Text style={styles.sectionTitle}>
              {debouncedQuery.trim() ? 'Arama Sonuçları' : 'Popüler İçerik'}
            </Text>
            <Text style={styles.resultCount}>
              {displayData.length} sonuç
            </Text>
          </EnterpriseRow>
          
          {isLoading ? (
            <EnterpriseCard variant="outlined">
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </EnterpriseCard>
          ) : displayData.length === 0 ? (
            <EnterpriseCard variant="outlined">
              <Text style={styles.noResultsText}>
                {debouncedQuery.trim() ? 'Arama sonucu bulunamadı' : 'İçerik yüklenemedi'}
              </Text>
            </EnterpriseCard>
          ) : (
            <EnterpriseGrid columns={2} spacing={spacing.md}>
              {displayData.map((movie, index) => (
                <Animatable.View
                  key={`${movie.media_type}-${movie.id}`}
                  animation="fadeInUp"
                  delay={index * 50}
                  style={styles.movieCard}
                >
                  <EnterpriseCard
                    variant="elevated"
                    onPress={() => handleMovieSelect(movie)}
                    style={styles.movieCardInner}
                  >
                    <View style={styles.movieContent}>
                      <View style={styles.movieHeader}>
                        <Chip 
                          mode="outlined" 
                          compact 
                          style={styles.mediaTypeChip}
                          textStyle={styles.mediaTypeText}
                        >
                          {movie.media_type === 'movie' ? 'Film' : 'Dizi'}
                        </Chip>
                        <Text style={styles.movieRating}>
                          ⭐ {movie.vote_average?.toFixed(1) || 'N/A'}
                        </Text>
                      </View>
                      
                      <Text style={styles.movieTitle} numberOfLines={2}>
                        {movie.title || movie.name}
                      </Text>
                      
                      <Text style={styles.movieYear}>
                        {new Date(movie.release_date || movie.first_air_date || '').getFullYear()}
                      </Text>
                      
                      <Text style={styles.movieOverview} numberOfLines={3}>
                        {movie.overview}
                      </Text>
                    </View>
                  </EnterpriseCard>
                </Animatable.View>
              ))}
            </EnterpriseGrid>
          )}
        </EnterpriseSection>
      </ScrollView>
    </EnterpriseLayout>
  );
};

const styles = StyleSheet.create({
  searchIcon: {
    fontSize: 16,
    color: '#8C8C8C',
  },
  statsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSubtitle: {
    color: '#8C8C8C',
    fontSize: 14,
    marginTop: spacing.xs,
  },
  selectionBadge: {
    backgroundColor: '#E50914',
  },
  minSelectionWarning: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  warningText: {
    color: '#FFC107',
    fontSize: 12,
    textAlign: 'center',
  },
  filterSection: {
    marginBottom: spacing.md,
  },
  filterLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  filterChip: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderColor: '#E50914',
  },
  filterChipText: {
    color: '#E50914',
  },
  genreScroll: {
    marginHorizontal: -spacing.md,
  },
  genreChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  genreChipText: {
    color: '#FFFFFF',
  },
  yearInput: {
    marginTop: spacing.sm,
  },
  clearFiltersButton: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  resultCount: {
    color: '#8C8C8C',
    fontSize: 14,
  },
  selectedScroll: {
    marginHorizontal: -spacing.md,
  },
  selectedMovieCard: {
    width: 120,
  },
  selectedMovieContent: {
    position: 'relative',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedMovieTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  selectedMediaTypeChip: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderColor: '#E50914',
  },
  selectedMediaTypeText: {
    color: '#E50914',
    fontSize: 10,
  },
  loadingText: {
    color: '#8C8C8C',
    fontSize: 16,
    textAlign: 'center',
    padding: spacing.lg,
  },
  noResultsText: {
    color: '#8C8C8C',
    fontSize: 16,
    textAlign: 'center',
    padding: spacing.lg,
  },
  movieCard: {
    flex: 1,
  },
  movieCardInner: {
    height: 280,
  },
  movieContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  movieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  mediaTypeChip: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    borderColor: '#E50914',
  },
  mediaTypeText: {
    color: '#E50914',
    fontSize: 10,
  },
  movieRating: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  movieYear: {
    color: '#8C8C8C',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  movieOverview: {
    color: '#8C8C8C',
    fontSize: 11,
    lineHeight: 16,
  },
});
