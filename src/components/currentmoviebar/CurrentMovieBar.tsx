import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, AppState, Animated } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCoreEngine } from '../../core/CoreEngine';
import { userDataManager } from '../../services/UserDataManager';
import { eventService } from '../../services/EventService';
import { realTimeWatchingService } from '../../services/RealTimeWatchingService';
import { Icon, Icons } from '../ui/IconComponent';

const { width } = Dimensions.get('window');

export const CurrentMovieBar: React.FC = () => {
  const { authService, tmdbService } = useCoreEngine();
  const navigation = useNavigation();
  const [currentMovie, setCurrentMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const intervalRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const processedMoviesRef = useRef<Set<number>>(new Set()); // Track processed movies

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
      console.log('📢 CurrentMovieBar: Update triggered');
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
        
        if (currentlyWatching && currentlyWatching.length > 0) {
          // Bir kullanıcı aynı anda sadece bir içerik izleyebilir
          // En son izlenen içeriği bul (en yeni startedAt değerine sahip olan)
          let latestMovie: any = null;
          let latestStartedAt = 0;
          
          for (const movie of currentlyWatching) {
            const startedAt = movie.startedAt 
              ? (movie.startedAt.toDate ? movie.startedAt.toDate().getTime() : 
                 typeof movie.startedAt === 'number' ? movie.startedAt : 
                 new Date(movie.startedAt).getTime())
              : 0;
            
            if (startedAt > latestStartedAt) {
              latestStartedAt = startedAt;
              latestMovie = movie;
            }
          }
          
          // Eğer startedAt yoksa, ilk elemanı al
          if (!latestMovie && currentlyWatching.length > 0) {
            latestMovie = currentlyWatching[0];
          }
          
          if (latestMovie && (!currentMovie || currentMovie.id !== latestMovie.id)) {
            setCurrentMovie(latestMovie);
            
            // Automatically add to watched list if not already processed
            if (latestMovie.id && !processedMoviesRef.current.has(latestMovie.id)) {
              try {
                processedMoviesRef.current.add(latestMovie.id);
                
                // Get genre information
                const mediaType = latestMovie.media_type || latestMovie.type || (latestMovie.first_air_date ? 'tv' : 'movie');
                let genreIds = latestMovie.genre_ids || [];
                let genreText = latestMovie.genre || '';
                
                // If genre_ids not available, try to get from TMDB
                if (genreIds.length === 0 && tmdbService) {
                  try {
                    let details;
                    if (mediaType === 'tv') {
                      details = await tmdbService.getTVShowDetails(latestMovie.id);
                    } else {
                      details = await tmdbService.getMovieDetails(latestMovie.id);
                    }
                    if (details) {
                      genreIds = details.genres?.map((g: any) => g.id) || [];
                      genreText = details.genres?.map((g: any) => g.name).join(', ') || '';
                    }
                  } catch (error) {
                    console.warn('Could not fetch genre details:', error);
                  }
                }
                
                // Add to watched list automatically
                await userDataManager.markAsWatched(user.uid, {
                  id: latestMovie.id,
                  title: latestMovie.title || latestMovie.name,
                  name: latestMovie.name,
                  poster: latestMovie.poster_path || latestMovie.poster,
                  poster_path: latestMovie.poster_path || latestMovie.poster,
                  rating: latestMovie.vote_average || latestMovie.rating,
                  vote_average: latestMovie.vote_average || latestMovie.rating,
                  type: mediaType,
                  media_type: mediaType,
                  release_date: latestMovie.release_date,
                  first_air_date: latestMovie.first_air_date,
                  year: latestMovie.year || new Date(latestMovie.release_date || latestMovie.first_air_date || '').getFullYear(),
                  genre: genreText,
                  genre_ids: genreIds,
                  watchedAt: new Date(),
                });
                
                console.log(`✅ CurrentMovieBar: Automatically added ${latestMovie.title || latestMovie.name} to watched list`);
              } catch (error) {
                console.error('Error adding to watched list:', error);
                processedMoviesRef.current.delete(latestMovie.id); // Remove on error to retry
              }
            }
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
      console.log('📱 CurrentMovieBar pressed');
    } else {
      // Navigate to Watch screen
      (navigation as any).navigate('Watch');
    }
  };

  const handleStopWatching = async () => {
    if (!currentMovie || isStopping) return;
    
    try {
      setIsStopping(true);
      const user = await authService.getCurrentUser();
      if (!user) return;

      const movieId = currentMovie.id || currentMovie.movieId;
      if (!movieId) return;

      // Stop watching using UserDataManager
      await userDataManager.stopWatching(user.uid, movieId);
      
      // Also stop using RealTimeWatchingService if available
      if (realTimeWatchingService) {
        await realTimeWatchingService.stopWatching(user.uid, movieId);
      }

      // Clear current movie
      setCurrentMovie(null);
      processedMoviesRef.current.delete(movieId);
      
      // Emit event
      if (eventService) {
        eventService.emit('watchingStopped', { userId: user.uid, movieId });
      }

      console.log(`✅ Stopped watching movie ${movieId}`);
    } catch (error) {
      console.error('Error stopping watching:', error);
    } finally {
      setIsStopping(false);
    }
  };

  const handleStartWatching = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        (navigation as any).navigate('Watch');
        return;
      }

      // Son izlenen filmi kontrol et
      const lastWatchedMovie = await userDataManager.getLastWatchedMovie(user.uid);
      
      if (lastWatchedMovie) {
        // Son izlenen filmi otomatik olarak devam ettir
        const movieId = lastWatchedMovie.id || lastWatchedMovie.movieId;
        const mediaType = lastWatchedMovie.media_type || lastWatchedMovie.type || (lastWatchedMovie.first_air_date ? 'tv' : 'movie');
        
        // İzlemeyi başlat
        await userDataManager.startWatching(user.uid, {
          id: movieId,
          title: lastWatchedMovie.title,
          name: lastWatchedMovie.name,
          poster: lastWatchedMovie.poster_path || lastWatchedMovie.poster,
          poster_path: lastWatchedMovie.poster_path || lastWatchedMovie.poster,
          rating: lastWatchedMovie.vote_average || lastWatchedMovie.rating,
          vote_average: lastWatchedMovie.vote_average || lastWatchedMovie.rating,
          type: mediaType,
          media_type: mediaType,
          release_date: lastWatchedMovie.release_date,
          first_air_date: lastWatchedMovie.first_air_date,
          year: lastWatchedMovie.year,
          genre: lastWatchedMovie.genre,
          genre_ids: lastWatchedMovie.genre_ids,
          startedAt: new Date(),
        });

        // Real-time watching service'i de başlat
        if (realTimeWatchingService) {
          await realTimeWatchingService.startWatching(user.uid, movieId, mediaType, 0);
        }

        // Event emit
        if (eventService) {
          eventService.emit('watchingStarted', { movieId, title: lastWatchedMovie.title || lastWatchedMovie.name });
          eventService.emit('currentMovieUpdate', { movieId, title: lastWatchedMovie.title || lastWatchedMovie.name });
        }

        // Current movie'yi yeniden yükle
        loadCurrentMovie();
        
        console.log(`✅ Resumed last watched movie: ${lastWatchedMovie.title || lastWatchedMovie.name}`);
      } else {
        // Son izlenen film yoksa Watch ekranına git
        (navigation as any).navigate('Watch');
      }
    } catch (error) {
      console.error('Error resuming last watched movie:', error);
      // Hata durumunda Watch ekranına git
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
                : null
            }} 
            style={styles.poster} 
          />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentMovie.title || currentMovie.name || 'Bilinmeyen'}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>
                <Icon name={currentMovie.media_type === 'tv' ? Icons.tv : Icons.movie} size={14} color="#8C8C8C" /> 
              </Text>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>Canlı</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.stopButton, isStopping && styles.stopButtonDisabled]}
            onPress={handleStopWatching}
            disabled={isStopping}
            activeOpacity={0.7}
          >
            <Icon name={Icons.pause} size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Icon name={Icons.watch} size={32} color="#8C8C8C" />
          <View style={styles.emptyInfo}>
            <Text style={styles.emptyTitle}>Şu anda izlenen film yok</Text>
            <Text style={styles.emptySubtitle}>Bir film seçmek için tıkla</Text>
          </View>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartWatching}
            activeOpacity={0.7}
          >
            <Icon name={Icons.play} size={16} color="#FFFFFF" />
          </TouchableOpacity>
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
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  startButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    color: '#CCCCCC',
    fontSize: 11,
  },
  arrow: {
    marginLeft: 8,
  },
  arrowText: {
    color: '#CCCCCC',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

