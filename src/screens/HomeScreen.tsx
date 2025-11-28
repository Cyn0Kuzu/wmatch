import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Avatar, Chip, Badge } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import * as Animatable from 'react-native-animatable';

import { useCoreEngine } from '../core/CoreEngine';
import { AnimatedText } from '../components/ui/AnimatedText';
import { LoadingSpinner } from '../components/ui/LoadingComponents';
import { BottomActionBar } from '../components/ui/BottomActionBar';
import { EnterpriseCard } from '../components/enterprise/EnterpriseCard';
import { EnterpriseButton } from '../components/enterprise/EnterpriseButton';
import { EnterpriseLayout, EnterpriseSection, EnterpriseGrid, EnterpriseRow } from '../components/enterprise/EnterpriseLayout';
import { spacing } from '../core/theme';
import { databaseManager } from '../database/DatabaseManager';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { logger } from '../utils/Logger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MovieCard {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
}

interface UserStats {
  moviesWatched: number;
  moviesRated: number;
  averageRating: number;
  matches: number;
  watchlist: number;
  followers: number;
  following: number;
}

export const HomeScreen: React.FC = () => {
  const { coreService, movieService, tmdbService, authService } = useCoreEngine();
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    moviesWatched: 0,
    moviesRated: 0,
    averageRating: 0,
    matches: 0,
    watchlist: 0,
    followers: 0,
    following: 0
  });

  // Track screen load
  useEffect(() => {
    performanceMonitor.trackScreenLoad('HomeScreen');
    loadUserStats();
    
    return () => {
      performanceMonitor.endScreenLoad('HomeScreen');
    };
  }, []);

  const { data: popularMovies = [], isLoading: moviesLoading, refetch: refetchMovies } = useQuery({
    queryKey: ['popular_movies'],
    queryFn: () => tmdbService.getPopularMovies(1),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: popularTVShows = [], isLoading: tvLoading, refetch: refetchTV } = useQuery({
    queryKey: ['popular_tvshows'],
    queryFn: () => tmdbService.getPopularTVShows(1),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => movieService.getRecommendations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loadUserStats = async () => {
    try {
      performanceMonitor.startMetric('load_user_stats');
      
      // Get current user from Firebase
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        // Default stats for non-authenticated users
        setUserStats({
          moviesWatched: 0,
          moviesRated: 0,
          averageRating: 0,
          matches: 0,
          watchlist: 0,
          followers: 0,
          following: 0
        });
        return;
      }
      
      // In a real app, you'd fetch this from Firestore
      // For now, we'll use realistic default values
      const stats: UserStats = {
        moviesWatched: 0,
        moviesRated: 0,
        averageRating: 0,
        matches: 0,
        watchlist: 0,
        followers: 0,
        following: 0
      };
      
      setUserStats(stats);
      
      const duration = performanceMonitor.endMetric('load_user_stats');
      logger.info(`User stats loaded in ${duration}ms`, 'HomeScreen');
    } catch (error) {
      logger.error('Failed to load user stats', 'HomeScreen', error);
      // Set default stats on error
      setUserStats({
        moviesWatched: 0,
        moviesRated: 0,
        averageRating: 0,
        matches: 0,
        watchlist: 0,
        followers: 0,
        following: 0
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      performanceMonitor.startMetric('home_refresh');
      
      await Promise.all([
        refetchMovies(),
        refetchTV(),
        loadUserStats()
      ]);
      
      const duration = performanceMonitor.endMetric('home_refresh');
      logger.info(`Home screen refreshed in ${duration}ms`, 'HomeScreen');
    } catch (error) {
      logger.error('Refresh error', 'HomeScreen', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMoviePress = (movie: MovieCard) => {
    performanceMonitor.trackUserInteraction('movie_card_press');
    logger.info(`Movie pressed: ${movie.title || movie.name}`, 'HomeScreen');
    // Navigate to movie details
  };

  const handleQuickAction = (action: string) => {
    performanceMonitor.trackUserInteraction(`quick_action_${action}`);
    logger.info(`Quick action: ${action}`, 'HomeScreen');
    // Handle quick actions
  };

  if (moviesLoading || tvLoading) {
    return (
      <EnterpriseLayout>
        <LoadingSpinner />
      </EnterpriseLayout>
    );
  }

  const combinedContent = [
    ...popularMovies.slice(0, 5).map(movie => ({ ...movie, media_type: 'movie' as const })),
    ...popularTVShows.slice(0, 5).map(tv => ({ ...tv, media_type: 'tv' as const }))
  ].sort(() => Math.random() - 0.5);

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
        {/* Header Section */}
        <EnterpriseSection>
          <EnterpriseRow justifyContent="space-between" alignItems="center">
            <View>
              <AnimatedText variant="h2" animation="fadeInUp" delay={200} style={styles.welcomeTitle}>
                Merhaba! 👋
              </AnimatedText>
              <AnimatedText variant="body1" animation="fadeInUp" delay={400} style={styles.welcomeSubtitle}>
                Bugün ne izlemek istiyorsun?
              </AnimatedText>
            </View>
            <TouchableOpacity onPress={() => handleQuickAction('profile')}>
              <Avatar.Image 
                size={48} 
                source={{ uri: 'https://via.placeholder.com/48' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </EnterpriseRow>
        </EnterpriseSection>

        {/* Quick Stats */}
        <EnterpriseSection>
          <EnterpriseGrid columns={4} spacing={spacing.sm}>
            <EnterpriseCard variant="glass" size="small">
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.moviesWatched}</Text>
                <Text style={styles.statLabel}>İzlenen</Text>
              </View>
            </EnterpriseCard>
            
            <EnterpriseCard variant="glass" size="small">
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.matches}</Text>
                <Text style={styles.statLabel}>Eşleşme</Text>
              </View>
            </EnterpriseCard>
            
            <EnterpriseCard variant="glass" size="small">
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.watchlist}</Text>
                <Text style={styles.statLabel}>Liste</Text>
              </View>
            </EnterpriseCard>
            
            <EnterpriseCard variant="glass" size="small">
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.followers}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </View>
            </EnterpriseCard>
          </EnterpriseGrid>
        </EnterpriseSection>

        {/* Quick Actions */}
        <EnterpriseSection>
          <AnimatedText variant="h3" animation="fadeInUp" delay={600} style={styles.sectionTitle}>
            Hızlı İşlemler
          </AnimatedText>
          
          <EnterpriseRow spacing={spacing.md}>
            <EnterpriseButton
              title="Keşfet"
              onPress={() => handleQuickAction('discover')}
              variant="primary"
              size="medium"
              style={styles.quickActionButton}
            />
            <EnterpriseButton
              title="Eşleş"
              onPress={() => handleQuickAction('match')}
              variant="secondary"
              size="medium"
              style={styles.quickActionButton}
            />
            <EnterpriseButton
              title="Listem"
              onPress={() => handleQuickAction('watchlist')}
              variant="outline"
              size="medium"
              style={styles.quickActionButton}
            />
          </EnterpriseRow>
        </EnterpriseSection>

        {/* Trending Content */}
        <EnterpriseSection>
          <EnterpriseRow justifyContent="space-between" alignItems="center">
            <AnimatedText variant="h3" animation="fadeInUp" delay={800} style={styles.sectionTitle}>
              Trend Olanlar
            </AnimatedText>
            <EnterpriseButton
              title="Tümünü Gör"
              onPress={() => handleQuickAction('view_all_trending')}
              variant="ghost"
              size="small"
            />
          </EnterpriseRow>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.horizontalScroll}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {combinedContent.slice(0, 10).map((item, index) => (
              <Animatable.View
                key={`${item.media_type}-${item.id}`}
                animation="fadeInUp"
                delay={1000 + index * 100}
                style={styles.movieCard}
              >
                <EnterpriseCard
                  variant="elevated"
                  size="small"
                  onPress={() => handleMoviePress(item)}
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
                        {item.media_type === 'movie' ? 'Film' : 'Dizi'}
                      </Chip>
                      <Text style={styles.movieRating}>
                        ⭐ {item.vote_average?.toFixed(1) || 'N/A'}
                      </Text>
      </View>

                    <Text style={styles.movieTitle} numberOfLines={2}>
                      {item.title || item.name}
                    </Text>
                    
                    <Text style={styles.movieYear}>
                      {new Date(item.release_date || item.first_air_date || '').getFullYear()}
                    </Text>
                  </View>
                </EnterpriseCard>
              </Animatable.View>
            ))}
          </ScrollView>
        </EnterpriseSection>

        {/* Personalized Recommendations */}
        <EnterpriseSection>
          <EnterpriseCard
            variant="glass"
            title="Size Özel Öneriler"
            subtitle="Tercihlerinize göre özel olarak seçilmiş içerikler"
            headerAction={
              <Badge size={16} style={styles.recommendationBadge}>
                {recommendations.length}
              </Badge>
            }
          >
            <EnterpriseRow spacing={spacing.md}>
              <EnterpriseButton
                title="Önerileri Gör"
                onPress={() => handleQuickAction('view_recommendations')}
          variant="primary"
                size="medium"
                style={styles.recommendationButton}
              />
              <EnterpriseButton
                title="Tercihleri Düzenle"
                onPress={() => handleQuickAction('edit_preferences')}
                variant="outline"
                size="medium"
                style={styles.recommendationButton}
              />
            </EnterpriseRow>
          </EnterpriseCard>
        </EnterpriseSection>

        {/* Recent Activity */}
        <EnterpriseSection>
          <AnimatedText variant="h3" animation="fadeInUp" delay={1200} style={styles.sectionTitle}>
            Son Aktiviteler
          </AnimatedText>
          
          <EnterpriseCard variant="outlined">
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>Henüz aktivite bulunmuyor</Text>
              <Text style={styles.emptyStateSubtext}>Film izlemeye başladığınızda aktiviteleriniz burada görünecek</Text>
            </View>
          </EnterpriseCard>
        </EnterpriseSection>
      </ScrollView>
      
      {/* Fixed bottom section with safe area handling */}
      <BottomActionBar
        showCopyright={true}
        copyrightText="© 2025 WMatch"
        poweredByText="Powered by MWatch"
        copyrightDelay={1200}
      />
    </EnterpriseLayout>
  );
};

const styles = StyleSheet.create({
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    color: '#8C8C8C',
    fontSize: 16,
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#E50914',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  quickActionButton: {
    flex: 1,
  },
  horizontalScroll: {
    marginHorizontal: -spacing.md,
  },
  horizontalScrollContent: {
    paddingHorizontal: spacing.md,
  },
  movieCard: { 
    width: 160,
    marginRight: spacing.md,
  },
  movieCardInner: {
    height: 200,
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
  },
  recommendationBadge: {
    backgroundColor: '#E50914',
  },
  recommendationButton: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  activityIcon: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  activityTime: {
    color: '#8C8C8C',
    fontSize: 12,
  },
  activityRating: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#8C8C8C',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});