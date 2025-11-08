import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCoreEngine } from '../../core/CoreEngine';
import { userDataManager } from '../../services/UserDataManager';
import { realTimeWatchingService } from '../../services/RealTimeWatchingService';
import { eventService } from '../../services/EventService';

const { width, height } = Dimensions.get('window');

interface MovieDetailModalProps {
  visible: boolean;
  movie: any;
  onClose: () => void;
  onStatusChange?: () => void; // Callback when favorite/watched status changes
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  visible,
  movie,
  onClose,
  onStatusChange,
}) => {
  const { authService, tmdbService } = useCoreEngine();
  const [movieStatus, setMovieStatus] = useState({
    isFavorite: false,
    isWatched: false,
    isCurrentlyWatching: false,
  });
  const [loading, setLoading] = useState(false);
  const [movieDetails, setMovieDetails] = useState<any>(null);

  useEffect(() => {
    if (visible && movie) {
      loadMovieDetails();
      checkMovieStatus();
    }
  }, [visible, movie]);

  const loadMovieDetails = async () => {
    try {
      if (!movie || !movie.id) {
        setMovieDetails(movie);
        return;
      }

      // Always fetch from TMDB for complete data
      const mediaType = movie.media_type || movie.type || (movie.first_air_date ? 'tv' : 'movie');
      
      console.log('Loading movie details:', {
        id: movie.id,
        mediaType,
        title: movie.title || movie.name
      });
      
      let details;
      
      if (mediaType === 'tv') {
        details = await tmdbService.getTVShowDetails(movie.id);
      } else {
        details = await tmdbService.getMovieDetails(movie.id);
      }

      if (details) {
        console.log('Movie details loaded:', {
          title: details.title || details.name,
          year: details.release_date || details.first_air_date,
          rating: details.vote_average,
          genres: details.genres?.length || 0
        });
        
        setMovieDetails({
          ...movie,
          ...details,
          genre_ids: details.genres?.map((g: any) => g.id) || movie.genre_ids || [],
          vote_average: details.vote_average || movie.vote_average || movie.rating,
          release_date: details.release_date || movie.release_date,
          first_air_date: details.first_air_date || movie.first_air_date,
        });
      } else {
        console.warn('⚠️ No details from TMDB, using original data');
        setMovieDetails(movie);
      }
    } catch (error) {
      console.error('❌ Error loading movie details:', error);
      setMovieDetails(movie);
    }
  };

  const checkMovieStatus = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !movie) return;

      const movieId = movie.id;

      const [favorites, watched, currentlyWatching]: [any[], any[], any] = await Promise.all([
        userDataManager.getFavorites(currentUser.uid),
        userDataManager.getWatchedContent(currentUser.uid),
        userDataManager.getCurrentlyWatching(currentUser.uid),
      ]);

      const isFavorite = favorites?.some((fav: any) => fav.id === movieId) || false;
      const isWatched = watched?.some((w: any) => w.id === movieId) || false;
      const isCurrentlyWatching = Array.isArray(currentlyWatching)
        ? currentlyWatching.some((w: any) => w.id === movieId)
        : currentlyWatching?.id === movieId;

      setMovieStatus({
        isFavorite,
        isWatched,
        isCurrentlyWatching,
      });
    } catch (error) {
      console.error('Error checking movie status:', error);
    }
  };

  const handleWatchMovie = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
        return;
      }

      const movieId = movie.id;
      const mediaType = movie.media_type || movie.type || (movie.first_air_date ? 'tv' : 'movie');
      const title = movie.title || movie.name;
      
      // Get genre text
      const genreIds = movieDetails?.genre_ids || movie.genre_ids || [];
      const genreText = genreIds.length > 0
        ? tmdbService.getGenreNames(genreIds, mediaType === 'tv' ? 'tv' : 'movie').join(', ')
        : '';

      // 1. Add to currently watching
      await userDataManager.startWatching(currentUser.uid, {
        id: movieId,
        title: title,
        name: movie.name,
        poster: movie.poster_path || movie.poster,
        poster_path: movie.poster_path || movie.poster,
        rating: movie.vote_average || movie.rating,
        vote_average: movie.vote_average || movie.rating,
        type: mediaType,
        media_type: mediaType,
        release_date: movie.release_date,
        first_air_date: movie.first_air_date,
        year: movie.year || new Date(movie.release_date || movie.first_air_date || '').getFullYear(),
        genre: genreText,
        genre_ids: genreIds,
        startedAt: new Date(),
      });

      // 2. Start real-time watching
      await realTimeWatchingService.startWatching(currentUser.uid, movieId, mediaType, 0);

      // 3. Add to watched list automatically
      await userDataManager.markAsWatched(currentUser.uid, {
        id: movieId,
        title: title,
        name: movie.name,
        poster: movie.poster_path || movie.poster,
        poster_path: movie.poster_path || movie.poster,
        rating: movie.vote_average || movie.rating,
        vote_average: movie.vote_average || movie.rating,
        type: mediaType,
        media_type: mediaType,
        release_date: movie.release_date,
        first_air_date: movie.first_air_date,
        year: movie.year || new Date(movie.release_date || movie.first_air_date || '').getFullYear(),
        genre: genreText,
        genre_ids: genreIds,
        watchedAt: new Date(),
      });

      // 4. Trigger events
      if (eventService) {
        eventService.emit('watchingStarted', { movieId, title });
        eventService.emit('currentMovieUpdate', { movieId, title });
      }

      // 5. Reload status
      await checkMovieStatus();
      if (onStatusChange) onStatusChange();

      Alert.alert('✅ Başarılı', `${title} izlemeye başladınız!`);
    } catch (error) {
      console.error('Failed to start watching:', error);
      Alert.alert('Hata', 'İzlemeye başlarken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !movie) return;

      if (movieStatus.isFavorite) {
        await userDataManager.removeFromFavorites(currentUser.uid, movie.id);
        Alert.alert('✅ Başarılı', `${movie.title || movie.name} favorilerden kaldırıldı!`);
      } else {
        const mediaType = movie.media_type || movie.type || 'movie';
        const genreIds = movieDetails?.genre_ids || movie.genre_ids || [];
        const genreText = genreIds.length > 0
          ? tmdbService.getGenreNames(genreIds, mediaType === 'tv' ? 'tv' : 'movie').join(', ')
          : '';
        
        await userDataManager.addToFavorites(currentUser.uid, {
          id: movie.id,
          title: movie.title || movie.name,
          name: movie.name,
          poster: movie.poster_path || movie.poster,
          poster_path: movie.poster_path || movie.poster,
          rating: movie.vote_average || movie.rating,
          vote_average: movie.vote_average || movie.rating,
          type: mediaType,
          media_type: mediaType,
          release_date: movie.release_date,
          first_air_date: movie.first_air_date,
          year: movie.year || new Date(movie.release_date || movie.first_air_date || '').getFullYear(),
          genre: genreText,
          genre_ids: genreIds,
          addedAt: new Date(),
        });
        Alert.alert('✅ Başarılı', `${movie.title || movie.name} favorilere eklendi!`);
      }

      await checkMovieStatus();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWatched = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !movie) return;

      if (movieStatus.isWatched) {
        await userDataManager.removeFromWatched(currentUser.uid, movie.id);
        Alert.alert('✅ Başarılı', `${movie.title || movie.name} izlenenlerden kaldırıldı!`);
      } else {
        const mediaType = movie.media_type || movie.type || 'movie';
        const genreIds = movieDetails?.genre_ids || movie.genre_ids || [];
        const genreText = genreIds.length > 0
          ? tmdbService.getGenreNames(genreIds, mediaType === 'tv' ? 'tv' : 'movie').join(', ')
          : '';
          
        await userDataManager.markAsWatched(currentUser.uid, {
          id: movie.id,
          title: movie.title || movie.name,
          name: movie.name,
          poster: movie.poster_path || movie.poster,
          poster_path: movie.poster_path || movie.poster,
          rating: movie.vote_average || movie.rating,
          vote_average: movie.vote_average || movie.rating,
          type: mediaType,
          media_type: mediaType,
          release_date: movie.release_date,
          first_air_date: movie.first_air_date,
          year: movie.year || new Date(movie.release_date || movie.first_air_date || '').getFullYear(),
          genre: genreText,
          genre_ids: genreIds,
          watchedAt: new Date(),
        });
        Alert.alert('✅ Başarılı', `${movie.title || movie.name} izlenenlere eklendi!`);
      }

      await checkMovieStatus();
      if (onStatusChange) onStatusChange();
    } catch (error) {
      console.error('Failed to toggle watched:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!movie) return null;

  // Use movieDetails if loaded, otherwise use movie
  const displayMovie = movieDetails || movie;

  // Extract movie information with fallbacks
  const title = displayMovie.title || displayMovie.name || 'İsimsiz';
  const releaseDate = displayMovie.release_date || displayMovie.first_air_date || '';
  const year = releaseDate ? new Date(releaseDate).getFullYear() : (displayMovie.year || 'N/A');
  const rating = displayMovie.vote_average || displayMovie.rating || null;
  const posterPath = displayMovie.poster_path || displayMovie.poster || '';
  const mediaType = displayMovie.media_type || displayMovie.type || (displayMovie.first_air_date ? 'tv' : 'movie');
  
  const genres = displayMovie.genre_ids && displayMovie.genre_ids.length > 0
    ? tmdbService.getGenreNames(displayMovie.genre_ids, mediaType === 'tv' ? 'tv' : 'movie')
    : [];

  // Debug log
  console.log('MovieDetailModal render:', {
    title,
    year,
    rating,
    posterPath: posterPath ? 'exists' : 'missing',
    genres: genres.length,
    genreIds: displayMovie.genre_ids,
    rawMovie: {
      release_date: displayMovie.release_date,
      first_air_date: displayMovie.first_air_date,
      vote_average: displayMovie.vote_average,
      rating: displayMovie.rating,
    }
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <Image
            source={{
              uri: posterPath
                ? `https://image.tmdb.org/t/p/w500${posterPath}`
                : 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image',
            }}
            style={styles.modalPoster}
            resizeMode="cover"
          />
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.modalInfo}>
              {!movieDetails ? (
                <View style={styles.loadingDetailsContainer}>
                  <ActivityIndicator size="small" color="#E50914" />
                  <Text style={styles.loadingDetailsText}>Film bilgileri yükleniyor...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <View style={styles.modalMeta}>
                    <Text style={styles.modalYear}>{year}</Text>
                    {rating && rating > 0 && (
                      <Text style={styles.modalRating}>
                        ⭐ {rating.toFixed(1)}
                      </Text>
                    )}
                    <Text style={styles.modalMediaType}>
                      {mediaType === 'tv' ? '📺 Dizi' : '🎬 Film'}
                    </Text>
                  </View>

                  {/* Film Türleri */}
                  {genres.length > 0 && (
                    <View style={styles.genresContainer}>
                      {genres.map((genre: string, index: number) => (
                        <View key={index} style={styles.genreTag}>
                          <Text style={styles.genreText}>{genre}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Action Buttons - Show even while loading */}
              {movieDetails && (
                <View style={styles.modalActions}>
                  {/* İzle Butonu - Her zaman göster */}
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.watchButton]}
                    onPress={handleWatchMovie}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalActionButtonText}>▶ İzle</Text>
                    )}
                  </TouchableOpacity>

                  {/* Favorilere Ekle/Kaldır */}
                  <TouchableOpacity
                    style={[
                      styles.modalActionButton,
                      movieStatus.isFavorite ? styles.removeFavoriteButton : styles.favoriteButton,
                    ]}
                    onPress={handleToggleFavorite}
                    disabled={loading}
                  >
                    <Text style={styles.modalActionButtonText}>
                      {movieStatus.isFavorite ? '💔 Favorilerden Kaldır' : '❤ Favorilere Ekle'}
                    </Text>
                  </TouchableOpacity>

                  {/* İzlenenlere Ekle/Kaldır */}
                  <TouchableOpacity
                    style={[
                      styles.modalActionButton,
                      movieStatus.isWatched ? styles.removeWatchedButton : styles.addWatchedButton,
                    ]}
                    onPress={handleToggleWatched}
                    disabled={loading}
                  >
                    <Text style={styles.modalActionButtonText}>
                      {movieStatus.isWatched ? '✕ İzlenenlerden Kaldır' : '✓ İzlenenlere Ekle'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.75,
  },
  modalPoster: {
    width: '100%',
    height: height * 0.40,
    backgroundColor: '#2A2A2A',
  },
  modalScrollView: {
    maxHeight: height * 0.35,
  },
  modalInfo: {
    padding: 16,
    paddingBottom: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  modalYear: {
    color: '#8C8C8C',
    fontSize: 16,
  },
  modalRating: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  modalMediaType: {
    color: '#8C8C8C',
    fontSize: 14,
  },
  loadingDetailsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingDetailsText: {
    color: '#8C8C8C',
    fontSize: 14,
    marginTop: 12,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 12,
  },
  genreTag: {
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genreText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  modalActions: {
    gap: 10,
    marginTop: 8,
  },
  modalActionButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  watchButton: {
    backgroundColor: '#E50914',
  },
  favoriteButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#E50914',
  },
  removeFavoriteButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#666',
  },
  addWatchedButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  removeWatchedButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#666',
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

