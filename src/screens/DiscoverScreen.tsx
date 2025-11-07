import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  Image, 
  Animated, 
  PanResponder, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Swipeable Profile Card Component (remains the same)
const SwipeableProfileCard: React.FC<{ 
  profile: any; 
  onSwipeLeft: () => void; 
  onSwipeRight: () => void 
}> = ({ profile, onSwipeLeft, onSwipeRight }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const passOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        
        const rotationValue = gestureState.dx / screenWidth * 20;
        rotate.setValue(rotationValue);
        
        if (gestureState.dx > 50) {
          likeOpacity.setValue(Math.min(gestureState.dx / 100, 1));
          passOpacity.setValue(0);
        } else if (gestureState.dx < -50) {
          passOpacity.setValue(Math.min(Math.abs(gestureState.dx) / 100, 1));
          likeOpacity.setValue(0);
        } else {
          likeOpacity.setValue(0);
          passOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 120) {
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: screenWidth + 100, y: gestureState.dy },
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(likeOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start(() => {
            onSwipeRight();
          });
        } else if (gestureState.dx < -120) {
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: -screenWidth - 100, y: gestureState.dy },
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(passOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          ]).start(() => {
            onSwipeLeft();
          });
        } else {
          Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(likeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(passOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  if (!profile) {
    return null;
  }

  const photos = profile.profilePhotos || profile.photos || [];
  const hasPhotos = photos.length > 0;

  const rotateValue = rotate.interpolate({
    inputRange: [-20, 0, 20],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: rotateValue },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View style={[styles.likeOverlay, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>BEĞEN</Text>
      </Animated.View>
      <Animated.View style={[styles.passOverlay, { opacity: passOpacity }]}>
        <Text style={styles.passText}>GEÇ</Text>
      </Animated.View>
      <View style={styles.photoSection}>
        {hasPhotos ? (
          <>
            <Image 
              source={{ uri: photos[currentPhotoIndex] }} 
              style={styles.cardPhoto} 
              resizeMode="cover"
            />
            {photos.length > 1 && (
              <View style={styles.photoDotsContainer}>
                {photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.photoDot,
                      index === currentPhotoIndex && styles.photoDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.noPhotoSection}>
            <View style={styles.noPhotoCircle}>
              <Text style={styles.noPhotoLetter}>
                {String((profile.firstName?.[0] || profile.name?.[0] || '?')).toUpperCase()}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.photoGradient} />
      </View>
      <ScrollView style={styles.infoSection} showsVerticalScrollIndicator={false}>
        <View style={styles.nameSection}>
          <Text style={styles.cardName}>
            {profile.name || profile.firstName || 'Kullanıcı'}
            {profile.age && profile.age > 0 ? `, ${profile.age}` : ''}
          </Text>
          {profile.location && (
            <Text style={styles.cardLocation}>📍 {profile.location}</Text>
          )}
        </View>

        {profile.bio && (
          <Text style={styles.cardBio}>{profile.bio}</Text>
        )}
        {profile.commonMovies > 0 && profile.previouslyWatched && profile.previouslyWatched.length > 0 && (
          <View style={styles.commonMoviesSection}>
            <View style={styles.commonMoviesHeader}>
              <Text style={styles.commonMoviesIcon}>🎬</Text>
              <Text style={styles.commonMoviesTitle}>
                Aynı Film/Dizileri İzlediniz
              </Text>
            </View>
            <Text style={styles.commonMoviesSubtitle}>
              {String(profile.commonMovies)} ortak içerik
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.movieThumbnails}>
              {profile.previouslyWatched.slice(0, 8).map((movie: any, index: number) => (
                <View key={index} style={styles.movieThumbnail}>
                  <Image 
                    source={{ uri: movie.poster }} 
                    style={styles.movieThumbnailImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.movieThumbnailTitle} numberOfLines={2}>
                    {movie.title || 'Bilinmeyen'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.interestsSection}>
            <Text style={styles.sectionTitle}>İlgi Alanları</Text>
            <View style={styles.interestTags}>
              {profile.interests.map((interest: string, index: number) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </Animated.View>
  );
};

export const DiscoverScreen: React.FC = () => {
  const { authService, coreService } = useCoreEngine();
  const matchService = coreService?.matchService;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'other' | 'all'>('all');
  const [ageRangeFilter, setAgeRangeFilter] = useState<[number, number]>([18, 55]);

  useEffect(() => {
    loadRecommendedProfiles();
  }, []);

  const loadRecommendedProfiles = async (filters: any = {}) => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      if (!matchService) {
        console.error('Match service not available');
        setLoading(false);
        return;
      }

      const recommendedProfiles = await matchService.getWatchedContentMatches(user.uid, {
        maxResults: 20,
        minMatchScore: 0.2,
        gender: filters.gender || genderFilter,
        ageRange: filters.ageRange || ageRangeFilter,
      });

      const { userDataManager } = coreService || {};
      const myWatched = userDataManager ? await userDataManager.getWatchedContent(user.uid) : [];
      const myWatchedIds = myWatched.map((m: any) => m.id);

      const formattedProfiles = recommendedProfiles.map(profile => {
        const theirWatchedIds = (profile.watchedContent || []).map((m: any) => m.id);
        const commonMovieIds = myWatchedIds.filter((id: any) => theirWatchedIds.includes(id));
        
        const commonMoviesData = (profile.watchedContent || [])
          .filter((movie: any) => commonMovieIds.includes(movie.id))
          .slice(0, 8)
          .map((movie: any) => ({
            id: movie.id,
            title: movie.title || movie.name || movie.movieTitle,
            poster: movie.poster_path 
              ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
              : movie.poster
              ? `https://image.tmdb.org/t/p/w200${movie.poster}`
              : 'https://via.placeholder.com/200x300/1a1a1a/666?text=No+Image',
          }));

        return {
          id: profile.id,
          name: profile.firstName + (profile.lastName ? ` ${profile.lastName}` : ''),
          firstName: profile.firstName,
          lastName: profile.lastName,
          age: profile.age,
          bio: profile.bio,
          location: profile.profile?.location || '',
          photos: profile.profilePhotos || [],
          profilePhotos: profile.profilePhotos || [],
          photoURL: (profile as any).photoURL || '',
          interests: profile.interests || [],
          commonMovies: commonMovieIds.length,
          previouslyWatched: commonMoviesData,
          matchScore: profile.matchScore,
          matchReason: profile.matchReason,
        };
      });

      setProfiles(formattedProfiles);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading recommended profiles:', error);
      Alert.alert('Hata', 'Profiller yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendedProfiles();
    setRefreshing(false);
  }, []);

  const handleSwipeLeft = async () => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(profiles.length);
    }
  };

  const handleSwipeRight = async () => {
    const currentProfile = profiles[currentIndex];
    try {
      const user = await authService.getCurrentUser();
      if (user && currentProfile) {
        await firestoreService.addToLikedList(user.uid, currentProfile.id);
      }
    } catch (error) {
      console.error('Error liking profile:', error);
    }

    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(profiles.length);
    }
  };

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    loadRecommendedProfiles({ gender: genderFilter, ageRange: ageRangeFilter });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Öneriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrele</Text>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Cinsiyet</Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[styles.genderButton, genderFilter === 'all' && styles.genderButtonActive]}
                  onPress={() => setGenderFilter('all')}
                >
                  <Text style={styles.genderButtonText}>Tümü</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, genderFilter === 'male' && styles.genderButtonActive]}
                  onPress={() => setGenderFilter('male')}
                >
                  <Text style={styles.genderButtonText}>Erkek</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderButton, genderFilter === 'female' && styles.genderButtonActive]}
                  onPress={() => setGenderFilter('female')}
                >
                  <Text style={styles.genderButtonText}>Kadın</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Yaş Aralığı: {ageRangeFilter[0]} - {ageRangeFilter[1]}</Text>
              <MultiSlider
                values={[ageRangeFilter[0], ageRangeFilter[1]]}
                onValuesChange={setAgeRangeFilter}
                min={18}
                max={55}
                step={1}
                sliderLength={screenWidth - 120}
                selectedStyle={{ backgroundColor: '#E50914' }}
                unselectedStyle={{ backgroundColor: '#333' }}
                markerStyle={{ backgroundColor: '#E50914', height: 20, width: 20 }}
              />
            </View>
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E50914']}
            tintColor="#E50914"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Senin İçin</Text>
          <Text style={styles.headerSubtitle}>İzlediğiniz filmlere göre öneriler</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {profiles.length > 0 && currentIndex < profiles.length ? (
          <>
            <View style={styles.cardContainer}>
              <SwipeableProfileCard
                profile={profiles[currentIndex]}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
            </View>

            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.passButton}
                onPress={handleSwipeLeft}
              >
                <Text style={styles.passButtonText}>✕</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.likeButton}
                onPress={handleSwipeRight}
              >
                <Text style={styles.likeButtonText}>♥</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {String(currentIndex + 1)} / {String(profiles.length)}
              </Text>
            </View>
          </>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyTitle}>Henüz Öneri Yok</Text>
            <Text style={styles.emptySubtitle}>
              Daha fazla film izleyerek kişiselleştirilmiş öneriler alın
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyTitle}>Tüm Profilleri Gördünüz!</Text>
            <Text style={styles.emptySubtitle}>
              Yeni öneriler için daha fazla film izleyin
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Text style={styles.refreshButtonText}>Yenile</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
      },
      scrollContent: {
        flexGrow: 1,
      },
      header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
      },
      headerTitle: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
      },
      headerSubtitle: {
        color: '#8C8C8C',
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
      },
      filterButton: {
        position: 'absolute',
        right: 20,
        top: 30,
      },
      cardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        minHeight: screenHeight * 0.6,
      },
      card: {
        width: screenWidth * 0.9,
        height: screenHeight * 0.68,
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
      likeOverlay: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        zIndex: 1000,
        transform: [{ rotate: '15deg' }],
      },
      likeText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
      },
      passOverlay: {
        position: 'absolute',
        top: 40,
        left: 20,
        backgroundColor: 'rgba(244, 67, 54, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        zIndex: 1000,
        transform: [{ rotate: '-15deg' }],
      },
      passText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
      },
      photoSection: {
        height: '55%',
        position: 'relative',
      },
      cardPhoto: {
        width: '100%',
        height: '100%',
      },
      noPhotoSection: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0A0A',
      },
      noPhotoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E50914',
        justifyContent: 'center',
        alignItems: 'center',
      },
      noPhotoLetter: {
        color: '#FFFFFF',
        fontSize: 56,
        fontWeight: 'bold',
      },
      photoGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'transparent',
      },
      photoDotsContainer: {
        position: 'absolute',
        top: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
      },
      photoDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
      },
      photoDotActive: {
        backgroundColor: '#FFFFFF',
        width: 20,
      },
      infoSection: {
        flex: 1,
        padding: 20,
      },
      nameSection: {
        marginBottom: 12,
      },
      cardName: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
      },
      cardLocation: {
        color: '#8C8C8C',
        fontSize: 14,
      },
      cardBio: {
        color: '#CCCCCC',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
      },
      commonMoviesSection: {
        marginBottom: 20,
        backgroundColor: 'rgba(229, 9, 20, 0.1)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(229, 9, 20, 0.3)',
      },
      commonMoviesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
      },
      commonMoviesIcon: {
        fontSize: 18,
        marginRight: 8,
      },
      commonMoviesTitle: {
        color: '#E50914',
        fontSize: 16,
        fontWeight: 'bold',
      },
      commonMoviesSubtitle: {
        color: '#CCCCCC',
        fontSize: 13,
        marginBottom: 12,
      },
      movieThumbnails: {
        flexDirection: 'row',
      },
      movieThumbnail: {
        marginRight: 10,
        width: 80,
      },
      movieThumbnailImage: {
        width: 80,
        height: 120,
        borderRadius: 8,
        backgroundColor: '#2A2A2A',
        marginBottom: 6,
      },
      movieThumbnailTitle: {
        color: '#FFFFFF',
        fontSize: 11,
        textAlign: 'center',
      },
      interestsSection: {
        marginBottom: 16,
      },
      sectionTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
      },
      interestTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
      },
      interestTag: {
        backgroundColor: '#2A2A2A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
      },
      interestTagText: {
        color: '#FFFFFF',
        fontSize: 12,
      },
      bottomSpace: {
        height: 20,
      },
      actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 60,
        paddingVertical: 20,
      },
      passButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2A2A2A',
        borderWidth: 2,
        borderColor: '#F44336',
        justifyContent: 'center',
        alignItems: 'center',
      },
      passButtonText: {
        color: '#F44336',
        fontSize: 32,
        fontWeight: 'bold',
      },
      likeButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2A2A2A',
        borderWidth: 2,
        borderColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
      },
      likeButtonText: {
        color: '#4CAF50',
        fontSize: 32,
        fontWeight: 'bold',
      },
      progressContainer: {
        alignItems: 'center',
        paddingVertical: 12,
      },
      progressText: {
        color: '#666',
        fontSize: 12,
      },
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      loadingText: {
        color: '#8C8C8C',
        fontSize: 16,
        marginTop: 12,
      },
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        minHeight: screenHeight * 0.6,
      },
      emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
      },
      emptyTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
      },
      emptySubtitle: {
        color: '#8C8C8C',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
      },
      refreshButton: {
        backgroundColor: '#E50914',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
      },
      refreshButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
      },
      modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      },
      modalContent: {
        width: screenWidth * 0.9,
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        padding: 20,
      },
      modalTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
      },
      filterGroup: {
        marginBottom: 20,
      },
      filterLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        marginBottom: 10,
      },
      genderOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      genderButton: {
        flex: 1,
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#333',
        alignItems: 'center',
        marginHorizontal: 5,
      },
      genderButtonActive: {
        backgroundColor: '#E50914',
      },
      genderButtonText: {
        color: '#FFFFFF',
      },
      applyButton: {
        backgroundColor: '#E50914',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
      },
      applyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
      },
});
