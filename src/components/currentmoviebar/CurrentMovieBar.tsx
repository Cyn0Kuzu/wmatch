import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, AppState, Animated } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCoreEngine } from '../../core/CoreEngine';
import { userDataManager } from '../../services/UserDataManager';
import { eventService } from '../../services/EventService';
import { realTimeWatchingService } from '../../services/RealTimeWatchingService';

const { width } = Dimensions.get('window');

export const CurrentMovieBar: React.FC = () => {
  const { authService } = useCoreEngine();
  const navigation = useNavigation();
  const [currentMovie, setCurrentMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadCurrentMovie();
    
    // Update every 5 seconds for real-time sync
    intervalRef.current = setInterval(() => {
      loadCurrentMovie();
    }, 5000);

    // Pulse animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // App state listener
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        loadCurrentMovie();
      }
      appStateRef.current = nextAppState;
    });

    // Event listeners for real-time updates
    const handleUpdate = () => {
      loadCurrentMovie();
    };

    if (eventService) {
      eventService.on('currentMovieUpdate', handleUpdate);
      eventService.on('watchingStarted', handleUpdate);
      eventService.on('watchingStopped', handleUpdate);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription?.remove();
      if (eventService) {
        eventService.off('currentMovieUpdate', handleUpdate);
        eventService.off('watchingStarted', handleUpdate);
        eventService.off('watchingStopped', handleUpdate);
      }
    };
  }, []);

  // Reload on screen focus
  useFocusEffect(
    React.useCallback(() => {
      loadCurrentMovie();
    }, [])
  );

  const loadCurrentMovie = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        const currentlyWatching = await userDataManager.getCurrentlyWatching(user.uid);
        
        if (currentlyWatching) {
          // Handle array or single object
          const movie = Array.isArray(currentlyWatching) 
            ? currentlyWatching[0] 
            : currentlyWatching;
          
          if (movie && (!currentMovie || currentMovie.id !== movie.id)) {
            setCurrentMovie(movie);
          }
        } else {
          if (currentMovie) {
            setCurrentMovie(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading current movie:', error);
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const handlePress = () => {
    if (currentMovie) {
      // Navigate to detail or expand
    } else {
      // Navigate to Watch screen
      (navigation as any).navigate('Watch');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
      {currentMovie ? (
        <>
          <Image 
            source={{ 
              uri: currentMovie.poster_path 
                ? `https://image.tmdb.org/t/p/w92${currentMovie.poster_path}` 
                : currentMovie.poster
                ? `https://image.tmdb.org/t/p/w92${currentMovie.poster}`
                : 'https://via.placeholder.com/40x60/1a1a1a/666?text=🎬'
            }} 
            style={styles.poster} 
          />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentMovie.title || currentMovie.name || 'Bilinmeyen'}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>
                {currentMovie.media_type === 'tv' ? '📺' : '🎬'} 
              </Text>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>Canlı</Text>
            </View>
          </View>
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <View style={styles.emptyInfo}>
            <Text style={styles.emptyTitle}>Şu anda izlenen film yok</Text>
            <Text style={styles.emptySubtitle}>Bir film seçmek için tıkla</Text>
          </View>
          <View style={styles.arrow}>
            <Text style={styles.arrowText}>›</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    minHeight: 50,
  },
  poster: {
    width: 32,
    height: 48,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#2A2A2A',
  },
  info: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E50914',
  },
  liveText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: '600',
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emptyIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  emptyInfo: {
    flex: 1,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  emptySubtitle: {
    color: '#8C8C8C',
    fontSize: 11,
  },
  arrow: {
    marginLeft: 8,
  },
  arrowText: {
    color: '#8C8C8C',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

