import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
} from 'react-native';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { Timestamp } from 'firebase/firestore';
import { MovieDetailModal } from '../components/ui/MovieDetailModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
// Horizontal scroll için kart boyutu
const HORIZONTAL_CARD_WIDTH = 120; // Sabit genişlik
const HORIZONTAL_CARD_HEIGHT = HORIZONTAL_CARD_WIDTH * 1.5; // Standart poster oranı

// Enhanced Match Card Component
const EnhancedMatchCard: React.FC<{ 
  user: any; 
  onPass: () => void; 
  onLike: () => void;
  currentMovie: any;
}> = ({ user, onPass, onLike, currentMovie }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [activeTab, setActiveTab] = useState<'favorites' | 'watched'>('favorites');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;

  // Safe getters - prevent any non-string values
  const getName = () => {
    try {
      return String(user?.firstName || user?.username || 'Kullanıcı');
    } catch {
      return 'Kullanıcı';
    }
  };
  
  const getLastName = () => {
    try {
      return user?.lastName && typeof user.lastName === 'string' ? `, ${user.lastName}` : '';
    } catch {
      return '';
    }
  };
  
  const getUsername = () => {
    try {
      return user?.username && typeof user.username === 'string' ? `@${user.username}` : null;
    } catch {
      return null;
    }
  };
  
  const getBio = () => {
    try {
      return user?.bio && typeof user.bio === 'string' && user.bio !== 'Profil bilgileri henüz tamamlanmamış' ? user.bio : null;
    } catch {
      return null;
    }
  };
  
  const getAge = () => {
    try {
      return user?.age && typeof user.age === 'number' && user.age > 0 ? user.age : null;
    } catch {
      return null;
    }
  };

  // Filter movies by type
  const getFilteredMovies = (movies: any[]) => {
    try {
      if (!movies || !Array.isArray(movies)) return [];
      if (mediaType === 'all') return movies;
      return movies.filter((item) => {
        if (!item) return false;
        const type = item.type || item.media_type;
        if (mediaType === 'movie') {
          return type === 'movie' || !type || type === 'film';
        } else if (mediaType === 'tv') {
          return type === 'tv' || type === 'series';
        }
        return true;
      });
    } catch (error) {
      console.error('Error filtering movies:', error);
      return [];
    }
  };

  const filteredFavorites = getFilteredMovies(user?.favorites || []);
  const filteredWatched = getFilteredMovies(user?.watchedContent || []);

  // Debug log
  console.log('🎴 EnhancedMatchCard:', {
    user: user?.firstName,
    activeTab,
    mediaType,
    favCount: filteredFavorites.length,
    watchCount: filteredWatched.length,
    rawFavCount: user?.favorites?.length || 0,
    rawWatchCount: user?.watchedContent?.length || 0
  });

  // Safety check
  if (!user || typeof user !== 'object') {
    console.warn('⚠️ Invalid user object');
    return (
      <View style={styles.cardContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      </View>
    );
  }

  const handleMoviePress = (movie: any) => {
    setSelectedMovie(movie);
    setShowMovieModal(true);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        
        // Calculate rotation based on horizontal movement
        const rotation = gestureState.dx / screenWidth * 15;
        rotate.setValue(rotation);
        
        // Show like/nope indicators
        if (gestureState.dx > 50) {
          likeOpacity.setValue(Math.min(gestureState.dx / 100, 1));
          nopeOpacity.setValue(0);
        } else if (gestureState.dx < -50) {
          nopeOpacity.setValue(Math.min(Math.abs(gestureState.dx) / 100, 1));
          likeOpacity.setValue(0);
        } else {
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        
        if (gestureState.dx > 120) {
          // Swipe right - Like
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: screenWidth + 100, y: gestureState.dy },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(likeOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onLike();
          });
        } else if (gestureState.dx < -120) {
          // Swipe left - Pass
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: -screenWidth - 100, y: gestureState.dy },
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(nopeOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onPass();
          });
        } else {
          // Return to center
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(likeOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(nopeOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const photos = user?.profilePhotos && Array.isArray(user.profilePhotos) && user.profilePhotos.length > 0 
    ? user.profilePhotos.filter((p: any) => p && typeof p === 'string')
    : [];
  const hasPhotos = photos.length > 0;

  const nextPhoto = () => {
    if (currentPhotoIndex < photos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    }
  };

  const prevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const rotateValue = rotate.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: rotateValue },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Like/Nope Indicators */}
      <Animated.View style={[styles.likeIndicator, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>BEĞEN</Text>
      </Animated.View>
      <Animated.View style={[styles.nopeIndicator, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>GEÇ</Text>
      </Animated.View>

      {/* Photo Section */}
      <View style={styles.photoSection}>
        {hasPhotos ? (
          <>
            <Image 
              source={{ uri: photos[currentPhotoIndex] }} 
              style={styles.photo} 
              resizeMode="cover"
            />
            {photos.length > 1 && (
              <>
                <View style={styles.photoIndicators}>
                  {photos.map((_, index) => (
                    <View
                      key={`photo-indicator-${index}`}
                      style={[
                        styles.photoIndicator,
                        index === currentPhotoIndex && styles.photoIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
                <TouchableOpacity style={styles.leftPhotoButton} onPress={prevPhoto}>
                  <Text style={styles.photoButtonText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rightPhotoButton} onPress={nextPhoto}>
                  <Text style={styles.photoButtonText}>›</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={styles.noPhoto}>
            <View style={styles.noPhotoIcon}>
              <Text style={styles.noPhotoText}>
                {String((user.firstName?.[0] || user.username?.[0] || '?')).toUpperCase()}
              </Text>
            </View>
          </View>
        )}
        
        {/* Gradient Overlay */}
        <View style={styles.photoGradient} />
      </View>

      {/* Info Section */}
      <ScrollView style={styles.infoSection} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <View style={styles.basicInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {getName()}{getLastName()}
            </Text>
            {getAge() !== null && (
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{String(getAge())}</Text>
              </View>
            )}
          </View>
          
          {getUsername() && (
            <Text style={styles.username}>{getUsername()}</Text>
          )}
          
          {getBio() && (
            <Text style={styles.bio}>{getBio()}</Text>
          )}
        </View>

        {/* Interests */}
        {user.interests && Array.isArray(user.interests) && user.interests.length > 0 && !user.interests.includes('Profil tamamlanmamış') && (
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailIcon}>🎯</Text>
              <Text style={styles.detailTitle}>İlgi Alanları</Text>
            </View>
            <View style={styles.tagContainer}>
              {user.interests
                .filter((interest: any) => interest && typeof interest === 'string' && interest.trim().length > 0)
                .map((interest: string, index: number) => (
                  <View key={`interest-${index}-${interest.substring(0,5)}`} style={styles.tag}>
                    <Text style={styles.tagText}>{String(interest)}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Tab Buttons - Favoriler / İzlenenler */}
        {((user.favorites && user.favorites.length > 0) || (user.watchedContent && user.watchedContent.length > 0)) && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'favorites' && styles.tabButtonActive]}
              onPress={() => setActiveTab('favorites')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'favorites' && styles.tabButtonTextActive]}>
                ⭐ Favoriler ({user.favorites?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'watched' && styles.tabButtonActive]}
              onPress={() => setActiveTab('watched')}
            >
              <Text style={[styles.tabButtonText, activeTab === 'watched' && styles.tabButtonTextActive]}>
                👀 İzlenenler ({user.watchedContent?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Media Type Filter - Film / Dizi */}
        {((activeTab === 'favorites' && user.favorites && user.favorites.length > 0) || 
          (activeTab === 'watched' && user.watchedContent && user.watchedContent.length > 0)) && (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, mediaType === 'all' && styles.filterButtonActive]}
              onPress={() => setMediaType('all')}
            >
              <Text style={[styles.filterButtonText, mediaType === 'all' && styles.filterButtonTextActive]}>
                Tümü
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, mediaType === 'movie' && styles.filterButtonActive]}
              onPress={() => setMediaType('movie')}
            >
              <Text style={[styles.filterButtonText, mediaType === 'movie' && styles.filterButtonTextActive]}>
                🎬 Filmler
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, mediaType === 'tv' && styles.filterButtonActive]}
              onPress={() => setMediaType('tv')}
            >
              <Text style={[styles.filterButtonText, mediaType === 'tv' && styles.filterButtonTextActive]}>
                📺 Diziler
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Movies Grid - Favoriler */}
        {activeTab === 'favorites' && (
          <View style={styles.detailSection}>
            {filteredFavorites && filteredFavorites.length > 0 ? (
              <>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                  style={styles.horizontalScroll}
                  nestedScrollEnabled={true}
                >
                  {Array.isArray(filteredFavorites) && filteredFavorites
                    .slice(0, 8)
                    .filter((movie: any) => movie && typeof movie === 'object' && (movie.title || movie.movieTitle))
                    .map((movie: any, index: number) => {
                      const posterUrl = movie.poster_path
                        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                        : 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Image';
                      const title = movie.title || movie.movieTitle || movie.name || 'İsimsiz';
                      const year = movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || movie.year || '';
                      const rating = movie.vote_average?.toFixed(1) || movie.rating || '';
                      const type = movie.type || movie.media_type || 'movie';

                      return (
                        <TouchableOpacity 
                          key={`favorite-${movie.id || `idx-${index}`}`} 
                          style={styles.horizontalMovieCard}
                          activeOpacity={0.8}
                          onPress={() => handleMoviePress(movie)}
                        >
                          <Image
                            source={{ uri: posterUrl }}
                            style={styles.horizontalMoviePoster}
                            resizeMode="cover"
                          />
                          <View style={styles.horizontalMovieInfo}>
                            <Text style={styles.horizontalMovieTitle} numberOfLines={2}>
                              {title}
                            </Text>
                            <View style={styles.movieMeta}>
                              {year && year.trim() !== '' && (
                                <Text style={styles.movieYear}>{year}</Text>
                              )}
                              {rating && rating.trim() !== '' && (
                                <View style={styles.ratingBadge}>
                                  <Text style={styles.ratingText}>⭐ {rating}</Text>
                                </View>
                              )}
                            </View>
                            {type && (
                              <Text style={styles.movieType}>
                                {type === 'tv' || type === 'series' ? '📺 Dizi' : '🎬 Film'}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
                {filteredFavorites.length > 8 && (
                  <Text style={styles.moreText}>+{String(filteredFavorites.length - 8)} daha</Text>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {mediaType === 'movie' ? 'Favori film yok' : 
                   mediaType === 'tv' ? 'Favori dizi yok' : 
                   'Favori içerik yok'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Movies Grid - İzlenenler */}
        {activeTab === 'watched' && (
          <View style={styles.detailSection}>
            {filteredWatched && filteredWatched.length > 0 ? (
              <>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScrollContent}
                  style={styles.horizontalScroll}
                  nestedScrollEnabled={true}
                >
                  {Array.isArray(filteredWatched) && filteredWatched
                    .slice(0, 8)
                    .filter((movie: any) => movie && typeof movie === 'object' && (movie.title || movie.movieTitle))
                    .map((movie: any, index: number) => {
                      const posterUrl = movie.poster_path
                        ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
                        : 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Image';
                      const title = movie.title || movie.movieTitle || movie.name || 'İsimsiz';
                      const year = movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || movie.year || '';
                      const rating = movie.vote_average?.toFixed(1) || movie.rating || '';
                      const type = movie.type || movie.media_type || 'movie';
                      
                      // Get genre information
                      let genreText = '';
                      if (movie.genre && typeof movie.genre === 'string') {
                        genreText = movie.genre;
                      } else if (movie.genre_ids && Array.isArray(movie.genre_ids) && movie.genre_ids.length > 0) {
                        // Note: We would need to import tmdbService for this
                        // For now, just skip genre IDs conversion in MatchScreen
                      } else if (movie.genres && Array.isArray(movie.genres) && movie.genres.length > 0) {
                        genreText = movie.genres.slice(0, 2).map((g: any) => g.name).join(', ');
                      }

                      return (
                        <TouchableOpacity 
                          key={`watched-${movie.id || `idx-${index}`}`} 
                          style={styles.horizontalMovieCard}
                          activeOpacity={0.8}
                          onPress={() => handleMoviePress(movie)}
                        >
                          <Image
                            source={{ uri: posterUrl }}
                            style={styles.horizontalMoviePoster}
                            resizeMode="cover"
                          />
                          <View style={styles.horizontalMovieInfo}>
                            <Text style={styles.horizontalMovieTitle} numberOfLines={2}>
                              {title}
                            </Text>
                            <View style={styles.movieMeta}>
                              {year && year.trim() !== '' && (
                                <Text style={styles.movieYear}>{year}</Text>
                              )}
                              {rating && rating.trim() !== '' && (
                                <View style={styles.ratingBadge}>
                                  <Text style={styles.ratingText}>⭐ {rating}</Text>
                                </View>
                              )}
                            </View>
                            {genreText ? (
                              <Text style={styles.movieGenre} numberOfLines={1}>
                                {genreText}
                              </Text>
                            ) : null}
                            {type && (
                              <Text style={styles.movieType}>
                                {type === 'tv' || type === 'series' ? '📺 Dizi' : '🎬 Film'}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
                {filteredWatched && filteredWatched.length > 8 && (
                  <Text style={styles.moreText}>+{String(filteredWatched.length - 8)} daha</Text>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {mediaType === 'movie' ? 'İzlenen film yok' : 
                   mediaType === 'tv' ? 'İzlenen dizi yok' : 
                   'İzlenen içerik yok'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <MovieDetailModal
          visible={showMovieModal}
          movie={selectedMovie}
          onClose={() => setShowMovieModal(false)}
        />
      )}
    </Animated.View>
  );
};

export const MatchScreen: React.FC = () => {
  const { authService, coreService, userDataManager } = useCoreEngine();
  const matchService = coreService?.matchService;
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentMovie, setCurrentMovie] = useState<any>(null);
  const [swipedUsers, setSwipedUsers] = useState<Set<string>>(new Set());
  const [currentMovieId, setCurrentMovieId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı');
        return;
      }

      if (!matchService) {
        Alert.alert('Hata', 'Match servisi hazır değil');
        setLoading(false);
        return;
      }

      // Get REAL currently watching with full details
      const currentUserMovies = await userDataManager.getUserCurrentlyWatchingWithLanguagePriority(user.uid);
      
      if (currentUserMovies.length > 0) {
        const movie = currentUserMovies[0];
        const movieTitle = movie.title || movie.name || movie.movieTitle || 'Bilinmeyen';
        const moviePoster = movie.poster_path || movie.moviePoster || '';
        const movieRating = movie.vote_average ? Number(movie.vote_average).toFixed(1) : (movie.rating ? String(movie.rating) : '');
        const movieYear = movie.release_date?.substring(0, 4) || movie.first_air_date?.substring(0, 4) || movie.year || '';
        const movieType = movie.media_type || movie.type || 'movie';
        const movieId = movie.id || movie.movieId;
        
        setCurrentMovie({
          id: movieId,
          title: movieTitle,
          name: movie.name || movieTitle,
          poster_path: moviePoster,
          rating: movieRating,
          year: movieYear,
          media_type: movieType,
        });
        setCurrentMovieId(movieId?.toString() || null);
      } else {
        // Kullanıcı şu anda bir şey izlemiyor
        setCurrentMovie(null);
        setCurrentMovieId(null);
      }

      const matches = await matchService.getCurrentlyWatchingMatches(user.uid);
      
      if (matches.length === 0) {
        Alert.alert('Bilgi', 'Şu anda izlediğiniz bir film yok veya eşleşen kullanıcı bulunamadı. Önce bir film izlemeye başlayın.');
        setLoading(false);
        return;
      }
      
      const otherUsers = matches
        .filter(match => match && match.id && match.id !== user.uid)
        .map(match => {
          // Safely extract and validate all fields
          const userId = String(match.id || '');
          const firstName = String(match.firstName || (match as any).name || `Kullanıcı ${userId.substring(0, 8)}`);
          const lastName = match.lastName && typeof match.lastName === 'string' ? String(match.lastName) : '';
          const username = match.username && typeof match.username === 'string' ? String(match.username) : `user_${userId.substring(0, 8)}`;
          const bio = match.bio && typeof match.bio === 'string' && match.bio !== 'Profil bilgileri henüz tamamlanmamış' ? String(match.bio) : '';
          const age = match.age && typeof match.age === 'number' && match.age > 0 ? Number(match.age) : 0;
          const gender = match.gender && typeof match.gender === 'string' ? String(match.gender) : '';
          
          // Safely process photos
          const profilePhotos = Array.isArray(match.profilePhotos) 
            ? match.profilePhotos.filter((p: any) => p && typeof p === 'string' && p.trim() !== '') 
            : [];
          
          // Safely process interests
          const interests = Array.isArray(match.interests) 
            ? match.interests.filter((i: any) => i && typeof i === 'string' && i.trim() !== '' && i !== 'Profil tamamlanmamış') 
            : [];
          
          // Safely process favorites
          const favorites = Array.isArray(match.favorites) 
            ? match.favorites.filter((f: any) => f && typeof f === 'object' && (f.title || f.movieTitle))
            : [];
          
          // Safely process watched content
          const watchedContent = Array.isArray(match.watchedContent) 
            ? match.watchedContent.filter((w: any) => w && typeof w === 'object' && (w.title || w.movieTitle))
            : [];
          
          return {
            ...match,
            id: userId,
            firstName,
            lastName,
            username,
            bio,
            age,
            gender,
            profilePhotos,
            interests,
            favorites,
            watchedContent,
          };
        });
      
      const filteredUsers = otherUsers.filter(user => {
        const userKey = `${user.id}_${currentMovieId}`;
        return !swipedUsers.has(userKey);
      });
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading matches:', error);
      Alert.alert('Hata', 'Eşleşmeler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePass = () => {
    const currentUser = users[currentUserIndex];
    if (currentUser && currentMovieId) {
      const userKey = `${currentUser.id}_${currentMovieId}`;
      setSwipedUsers(prev => new Set([...prev, userKey]));
    }
    setCurrentUserIndex(prev => prev + 1);
  };

  const handleLike = async () => {
    const currentUser = users[currentUserIndex];
    if (!currentUser) return;

    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      await firestoreService.addToLikedList(user.uid, currentUser.id);
      
      if (currentMovieId) {
        const userKey = `${currentUser.id}_${currentMovieId}`;
        setSwipedUsers(prev => new Set([...prev, userKey]));
      }
      
      const isMatch = await checkForMatch(user.uid, currentUser.id);
      if (isMatch) {
        Alert.alert('🎉 Eşleşme!', `${currentUser.username} ile eşleştiniz!`);
        await saveMatch(user.uid, currentUser);
      }

      setCurrentUserIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error liking user:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu');
    }
  };

  const checkForMatch = async (currentUserId: string, targetUserId: string): Promise<boolean> => {
    try {
      const targetUser = await firestoreService.getUserDocument(targetUserId);
      return targetUser?.social?.likedUsers?.includes(currentUserId) || false;
    } catch (error) {
      console.error('Error checking match:', error);
      return false;
    }
  };

  const saveMatch = async (currentUserId: string, matchedUser: any) => {
    try {
      await firestoreService.addMatch(currentUserId, {
        matchedUserId: matchedUser.id,
        matchedAt: Timestamp.now(),
        matchedMovie: currentMovie?.title
      });
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Eşleşmeler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (users.length === 0 || !users[currentUserIndex]) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>Tüm eşleşmeleri gördünüz!</Text>
          <Text style={styles.emptySubtitle}>
            Daha fazla eşleşme için yeni filmler izlemeye başlayın
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadMatches}>
            <Text style={styles.refreshButtonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentUser = users[currentUserIndex];
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardSection}>
        {currentUser && currentUser.id ? (
          <EnhancedMatchCard
            user={currentUser}
            onPass={handlePass}
            onLike={handleLike}
            currentMovie={currentMovie || null}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E50914" />
            <Text style={styles.loadingText}>Kullanıcı yükleniyor...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {String(currentUserIndex + 1)} / {String(users.length)}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cardSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  cardContainer: {
    width: screenWidth * 0.95,
    height: screenHeight * 0.80,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  likeIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 1000,
    transform: [{ rotate: '-20deg' }],
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  likeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  nopeIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 1000,
    transform: [{ rotate: '20deg' }],
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  nopeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  photoSection: {
    height: '50%',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  noPhotoIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  photoIndicators: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  photoIndicator: {
    width: 30,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  photoIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  leftPhotoButton: {
    position: 'absolute',
    left: 8,
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightPhotoButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  basicInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    flex: 1,
    letterSpacing: 0.5,
  },
  ageBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  ageText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  username: {
    color: '#E50914',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '500',
  },
  bio: {
    color: '#BBBBBB',
    fontSize: 13,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  tabButtonText: {
    color: '#8C8C8C',
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: '#2A2A2A',
    borderColor: '#E50914',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#E50914',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A3A',
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    color: '#E0E0E0',
    fontSize: 11,
    fontWeight: '500',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  horizontalScroll: {
    marginBottom: 8,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  horizontalMovieCard: {
    width: HORIZONTAL_CARD_WIDTH,
    marginRight: 12,
  },
  horizontalMoviePoster: {
    width: HORIZONTAL_CARD_WIDTH,
    height: HORIZONTAL_CARD_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  horizontalMovieInfo: {
    marginTop: 8,
    width: HORIZONTAL_CARD_WIDTH,
  },
  horizontalMovieTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '700',
    lineHeight: 15,
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  movieYear: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '500',
    marginRight: 6,
  },
  ratingBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  ratingText: {
    color: '#FF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  movieGenre: {
    color: '#999',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  movieType: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  movieItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  movieItemTitle: {
    color: '#CCCCCC',
    fontSize: 12,
    flex: 1,
  },
  movieItemRating: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  moreText: {
    color: '#777',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  bottomPadding: {
    height: 20,
  },
  footer: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  footerText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#999',
    fontSize: 15,
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#000',
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  refreshButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
