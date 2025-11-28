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
import { Icon, Icons } from './IconComponent';

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
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const handleImagePress = (imageUri: string) => {
    setPreviewImage(imageUri);
    setShowImagePreview(true);
  };

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
      
      console.log('📡 Fetching movie details from TMDB:', {
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
        console.log('✅ TMDB Details received:', {
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
        userDataManager.getUserFavorites(currentUser.uid),
        userDataManager.getUserWatchedContent(currentUser.uid),
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
  console.log('🎬 MovieDetailModal:', {
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
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          
          {/* Full Screen Poster - Clickable */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              const fullPosterUrl = posterPath
                ? `https://image.tmdb.org/t/p/w500${posterPath}`
                : 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image';
              handleImagePress(fullPosterUrl);
            }}
          >
          <Image
            source={{
              uri: posterPath
                ? `https://image.tmdb.org/t/p/w500${posterPath}`
                : 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Image',
            }}
            style={styles.modalPoster}
            resizeMode="cover"
          />
          </TouchableOpacity>
          
          {/* Film Bilgileri ve Butonlar - Absolute Position ile Altta */}
          <View style={styles.modalInfoContainer}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name={mediaType === 'tv' ? Icons.tv : Icons.movie} size={14} color="#FFFFFF" />
                    <Text style={styles.modalMediaType}>
                        {mediaType === 'tv' ? 'Dizi' : 'Film'}
                      </Text>
                      </View>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                        <Icon name={Icons.play} size={20} color="#FFFFFF" />
                        <Text style={styles.modalActionButtonText}>İzle</Text>
                      </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <Icon 
                        name={movieStatus.isFavorite ? Icons.unlike : Icons.favorite} 
                        size={20} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.modalActionButtonText}>
                        {movieStatus.isFavorite ? 'Favorilerden Kaldır' : 'Favorilere Ekle'}
                      </Text>
                    </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <Icon 
                        name={movieStatus.isWatched ? Icons.close : Icons.check} 
                        size={20} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.modalActionButtonText}>
                        {movieStatus.isWatched ? 'İzlenenlerden Kaldır' : 'İzlenenlere Ekle'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
        </View>
        
        {/* Image Preview Modal */}
        {showImagePreview && previewImage && (
          <Modal
            visible={showImagePreview}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowImagePreview(false)}
          >
            <View style={styles.imagePreviewContainer}>
              <TouchableOpacity
                style={styles.imagePreviewCloseButton}
                onPress={() => setShowImagePreview(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.imagePreviewCloseText}>✕</Text>
              </TouchableOpacity>
              <Image
                source={{ uri: previewImage }}
                style={styles.imagePreviewImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalPoster: {
    width: '100%',
    height: height,
    backgroundColor: '#000000',
  },
  modalInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.5,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalScrollView: {
    maxHeight: height * 0.5,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalRating: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  modalMediaType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingDetailsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingDetailsText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
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
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  watchButton: {
    backgroundColor: '#E50914',
    shadowColor: '#E50914',
    shadowOpacity: 0.4,
  },
  favoriteButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#E50914',
  },
  removeFavoriteButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#404040',
  },
  addWatchedButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  removeWatchedButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#404040',
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    width: width,
    height: height,
  },
  imagePreviewCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  imagePreviewCloseText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

