import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { logger } from '../utils/Logger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const HORIZONTAL_CARD_WIDTH = 120;
const HORIZONTAL_CARD_HEIGHT = HORIZONTAL_CARD_WIDTH * 1.5;

// Enhanced Match Card Component
const EnhancedMatchCard: React.FC<{ 
  user: any; 
  onPass: () => void; 
  onLike: () => void;
  currentMovie: any;
}> = React.memo(({ user, onPass, onLike, currentMovie }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'favorites' | 'watched'>('favorites');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;

  const getName = () => String(user?.firstName || user?.username || 'Kullanıcı');
  const getLastName = () => user?.lastName && typeof user.lastName === 'string' ? `, ${user.lastName}` : '';
  const getUsername = () => user?.username && typeof user.username === 'string' ? `@${user.username}` : null;
  const getBio = () => user?.bio && typeof user.bio === 'string' && user.bio !== 'Profil bilgileri henüz tamamlanmamış' ? user.bio : null;
  const getAge = () => user?.age && typeof user.age === 'number' && user.age > 0 ? user.age : null;

  const getFilteredMovies = (movies: any[]) => {
    if (!movies || !Array.isArray(movies)) return [];
    if (mediaType === 'all') return movies;
    return movies.filter((item) => {
      if (!item) return false;
      const type = item.type || item.media_type;
      if (mediaType === 'movie') return type === 'movie' || !type || type === 'film';
      if (mediaType === 'tv') return type === 'tv' || type === 'series';
      return true;
    });
  };

  const filteredFavorites = getFilteredMovies(user?.favorites || []);
  const filteredWatched = getFilteredMovies(user?.watchedContent || []);

  const handleMoviePress = (movie: any) => {
    setSelectedMovie(movie);
    setShowMovieModal(true);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start(),
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        const rotation = gestureState.dx / screenWidth * 15;
        rotate.setValue(rotation);
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
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        if (gestureState.dx > 120) {
          Animated.timing(pan, { toValue: { x: screenWidth + 100, y: gestureState.dy }, duration: 300, useNativeDriver: true }).start(onLike);
        } else if (gestureState.dx < -120) {
          Animated.timing(pan, { toValue: { x: -screenWidth - 100, y: gestureState.dy }, duration: 300, useNativeDriver: true }).start(onPass);
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const photos = user?.profilePhotos?.filter((p: any) => p && typeof p === 'string') || [];
  const hasPhotos = photos.length > 0;
  const nextPhoto = () => setCurrentPhotoIndex(prev => Math.min(prev + 1, photos.length - 1));
  const prevPhoto = () => setCurrentPhotoIndex(prev => Math.max(prev - 1, 0));
  const rotateValue = rotate.interpolate({ inputRange: [-15, 15], outputRange: ['-15deg', '15deg'] });

  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: rotateValue }, { scale }] }]} {...panResponder.panHandlers}>
      <Animated.View style={[styles.likeIndicator, { opacity: likeOpacity }]}><Text style={styles.likeText}>BEĞEN</Text></Animated.View>
      <Animated.View style={[styles.nopeIndicator, { opacity: nopeOpacity }]}><Text style={styles.nopeText}>GEÇ</Text></Animated.View>
      <View style={styles.photoSection}>
        {hasPhotos ? (
          <>
            <Image source={{ uri: photos[currentPhotoIndex] }} style={styles.photo} resizeMode="cover" />
            {photos.length > 1 && (
              <>
                <View style={styles.photoIndicators}>{photos.map((_, index) => <View key={`photo-indicator-${index}`} style={[styles.photoIndicator, index === currentPhotoIndex && styles.photoIndicatorActive]} />)}</View>
                <TouchableOpacity style={styles.leftPhotoButton} onPress={prevPhoto}><Text style={styles.photoButtonText}>‹</Text></TouchableOpacity>
                <TouchableOpacity style={styles.rightPhotoButton} onPress={nextPhoto}><Text style={styles.photoButtonText}>›</Text></TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={styles.noPhoto}><View style={styles.noPhotoIcon}><Text style={styles.noPhotoText}>{String(user.firstName?.[0] || '?').toUpperCase()}</Text></View></View>
        )}
        <View style={styles.photoGradient} />
      </View>
      <ScrollView style={styles.infoSection} showsVerticalScrollIndicator={false}>
        <View style={styles.basicInfo}>
          <View style={styles.nameRow}><Text style={styles.name}>{getName()}{getLastName()}</Text>{getAge() !== null && <View style={styles.ageBadge}><Text style={styles.ageText}>{String(getAge())}</Text></View>}</View>
          {getUsername() && <Text style={styles.username}>{getUsername()}</Text>}
          {getBio() && <Text style={styles.bio}>{getBio()}</Text>}
        </View>
        {user.interests?.length > 0 && <View style={styles.detailSection}><View style={styles.detailHeader}><Text style={styles.detailIcon}>🎯</Text><Text style={styles.detailTitle}>İlgi Alanları</Text></View><View style={styles.tagContainer}>{user.interests.map((interest: string, index: number) => <View key={`interest-${index}`} style={styles.tag}><Text style={styles.tagText}>{interest}</Text></View>)}</View></View>}
        {(user.favorites?.length > 0 || user.watchedContent?.length > 0) && (
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'favorites' && styles.tabButtonActive]} onPress={() => setActiveTab('favorites')}><Text style={[styles.tabButtonText, activeTab === 'favorites' && styles.tabButtonTextActive]}>⭐ Favoriler ({user.favorites?.length || 0})</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tabButton, activeTab === 'watched' && styles.tabButtonActive]} onPress={() => setActiveTab('watched')}><Text style={[styles.tabButtonText, activeTab === 'watched' && styles.tabButtonTextActive]}>👀 İzlenenler ({user.watchedContent?.length || 0})</Text></TouchableOpacity>
          </View>
        )}
        {(activeTab === 'favorites' && user.favorites?.length > 0) || (activeTab === 'watched' && user.watchedContent?.length > 0) ? (
          <View style={styles.filterContainer}>
            <TouchableOpacity style={[styles.filterButton, mediaType === 'all' && styles.filterButtonActive]} onPress={() => setMediaType('all')}><Text style={[styles.filterButtonText, mediaType === 'all' && styles.filterButtonTextActive]}>Tümü</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, mediaType === 'movie' && styles.filterButtonActive]} onPress={() => setMediaType('movie')}><Text style={[styles.filterButtonText, mediaType === 'movie' && styles.filterButtonTextActive]}>🎬 Filmler</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, mediaType === 'tv' && styles.filterButtonActive]} onPress={() => setMediaType('tv')}><Text style={[styles.filterButtonText, mediaType === 'tv' && styles.filterButtonTextActive]}>📺 Diziler</Text></TouchableOpacity>
          </View>
        ) : null}
        {activeTab === 'favorites' && (
          <View style={styles.detailSection}>
            {filteredFavorites.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} style={styles.horizontalScroll} nestedScrollEnabled={true}>
                {filteredFavorites.slice(0, 8).map((movie: any, index: number) => <TouchableOpacity key={`favorite-${movie.id || index}`} style={styles.horizontalMovieCard} activeOpacity={0.8} onPress={() => handleMoviePress(movie)}><Image source={{ uri: `https://image.tmdb.org/t/p/w342${movie.poster_path}` }} style={styles.horizontalMoviePoster} resizeMode="cover" /><View style={styles.horizontalMovieInfo}><Text style={styles.horizontalMovieTitle} numberOfLines={2}>{movie.title}</Text></View></TouchableOpacity>)}
              </ScrollView>
            ) : <View style={styles.emptyState}><Text style={styles.emptyStateText}>Favori içerik yok</Text></View>}
          </View>
        )}
        {activeTab === 'watched' && (
          <View style={styles.detailSection}>
            {filteredWatched.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent} style={styles.horizontalScroll} nestedScrollEnabled={true}>
                {filteredWatched.slice(0, 8).map((movie: any, index: number) => <TouchableOpacity key={`watched-${movie.id || index}`} style={styles.horizontalMovieCard} activeOpacity={0.8} onPress={() => handleMoviePress(movie)}><Image source={{ uri: `https://image.tmdb.org/t/p/w342${movie.poster_path}` }} style={styles.horizontalMoviePoster} resizeMode="cover" /><View style={styles.horizontalMovieInfo}><Text style={styles.horizontalMovieTitle} numberOfLines={2}>{movie.title}</Text></View></TouchableOpacity>)}
              </ScrollView>
            ) : <View style={styles.emptyState}><Text style={styles.emptyStateText}>İzlenen içerik yok</Text></View>}
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
      {selectedMovie && <MovieDetailModal visible={showMovieModal} movie={selectedMovie} onClose={() => setShowMovieModal(false)} />}
    </Animated.View>
  );
});

export const MatchScreen: React.FC = () => {
  const { authService, coreService, userDataManager } = useCoreEngine();
  const matchService = coreService?.matchService;
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentMovie, setCurrentMovie] = useState<any>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | 'other' | 'all'>('all');
  const [ageRangeFilter, setAgeRangeFilter] = useState<[number, number]>([18, 55]);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async (filters: any = {}) => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) return;
      if (!matchService) return;

      const currentUserMovies = await userDataManager.getUserCurrentlyWatchingWithLanguagePriority(user.uid);
      if (currentUserMovies.length > 0) {
        setCurrentMovie(currentUserMovies[0]);
      } else {
        setCurrentMovie(null);
      }

      const matches = await matchService.getCurrentlyWatchingMatches(user.uid, {
        gender: filters.gender || genderFilter,
        ageRange: filters.ageRange || ageRangeFilter,
      });
      
      setUsers(matches.filter(match => match && match.id !== user.uid));
      setCurrentUserIndex(0);
    } catch (error) {
      logger.error('Error loading matches:', 'MatchScreen', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePass = useCallback(async () => {
    const currentUser = users[currentUserIndex];
    if (!currentUser) return;
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        await firestoreService.addToSwipedList(user.uid, currentUser.id);
      }
    } catch (error) {
      logger.error('Error adding to swiped list:', 'MatchScreen', error);
    }
    setCurrentUserIndex(prev => prev + 1);
  }, [users, currentUserIndex, authService]);

  const handleLike = useCallback(async () => {
    const currentUser = users[currentUserIndex];
    if (!currentUser) return;
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      await firestoreService.addToLikedList(user.uid, currentUser.id);
      await firestoreService.addToSwipedList(user.uid, currentUser.id);
      const isMatch = await checkForMatch(user.uid, currentUser.id);
      if (isMatch) {
        Alert.alert('🎉 Eşleşme!', `${currentUser.username} ile eşleştiniz!`);
        await saveMatch(user.uid, currentUser);
      }
      setCurrentUserIndex(prev => prev + 1);
    } catch (error) {
      logger.error('Error liking user:', 'MatchScreen', error);
    }
  }, [users, currentUserIndex, authService, currentMovie]);

  const checkForMatch = async (currentUserId: string, targetUserId: string) => {
    const targetUser = await firestoreService.getUserDocument(targetUserId);
    return targetUser?.social?.likedUsers?.includes(currentUserId);
  };

  const saveMatch = async (currentUserId: string, matchedUser: any) => {
    await firestoreService.addMatch(currentUserId, {
      matchedUserId: matchedUser.id,
      matchedAt: Timestamp.now(),
      matchedMovie: currentMovie?.title
    });
  };

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    loadMatches({ gender: genderFilter, ageRange: ageRangeFilter });
  };

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#E50914" /><Text style={styles.loadingText}>Eşleşmeler yükleniyor...</Text></View></SafeAreaView>;
  if (users.length === 0 || !users[currentUserIndex]) return <SafeAreaView style={styles.container}><View style={styles.emptyContainer}><Text style={styles.emptyIcon}>🎬</Text><Text style={styles.emptyTitle}>Tüm eşleşmeleri gördünüz!</Text><TouchableOpacity style={styles.refreshButton} onPress={() => loadMatches()}><Text style={styles.refreshButtonText}>Yenile</Text></TouchableOpacity></View></SafeAreaView>;

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
                            <TouchableOpacity style={[styles.genderButton, genderFilter === 'all' && styles.genderButtonActive]} onPress={() => setGenderFilter('all')}><Text style={styles.genderButtonText}>Tümü</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.genderButton, genderFilter === 'male' && styles.genderButtonActive]} onPress={() => setGenderFilter('male')}><Text style={styles.genderButtonText}>Erkek</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.genderButton, genderFilter === 'female' && styles.genderButtonActive]} onPress={() => setGenderFilter('female')}><Text style={styles.genderButtonText}>Kadın</Text></TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.filterGroup}>
                        <Text style={styles.filterLabel}>Yaş Aralığı: {ageRangeFilter[0]} - {ageRangeFilter[1]}</Text>
                        <MultiSlider
                            values={[ageRangeFilter[0], ageRangeFilter[1]]}
                            onValuesChange={(values) => setAgeRangeFilter([values[0], values[1]])}
                            min={18}
                            max={55}
                            step={1}
                            sliderLength={screenWidth - 120}
                            selectedStyle={{ backgroundColor: '#E50914' }}
                            unselectedStyle={{ backgroundColor: '#333' }}
                            markerStyle={{ backgroundColor: '#E50914', height: 20, width: 20 }}
                        />
                    </View>
                    <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}><Text style={styles.applyButtonText}>Uygula</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
        <View style={styles.header}>
          <TouchableOpacity style={styles.filterButtonHeader} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      <View style={styles.cardSection}>
        <EnhancedMatchCard user={users[currentUserIndex]} onPass={handlePass} onLike={handleLike} currentMovie={currentMovie} />
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>{currentUserIndex + 1} / {users.length}</Text></View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    filterButtonHeader: { padding: 10 },
    cardSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 10 },
    cardContainer: { width: screenWidth * 0.95, height: screenHeight * 0.80, backgroundColor: '#1A1A1A', borderRadius: 16, overflow: 'hidden' },
    likeIndicator: { position: 'absolute', top: 20, left: 20, backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, zIndex: 1000, transform: [{ rotate: '-20deg' }], borderWidth: 3, borderColor: '#FFFFFF' },
    likeText: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
    nopeIndicator: { position: 'absolute', top: 20, right: 20, backgroundColor: '#F44336', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, zIndex: 1000, transform: [{ rotate: '20deg' }], borderWidth: 3, borderColor: '#FFFFFF' },
    nopeText: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
    photoSection: { height: '50%', position: 'relative' },
    photo: { width: '100%', height: '100%' },
    noPhoto: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' },
    noPhotoIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E50914', justifyContent: 'center', alignItems: 'center' },
    noPhotoText: { color: '#FFFFFF', fontSize: 48, fontWeight: 'bold' },
    photoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, backgroundColor: 'transparent' },
    photoIndicators: { position: 'absolute', top: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
    photoIndicator: { width: 30, height: 3, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 1.5, marginHorizontal: 2 },
    photoIndicatorActive: { backgroundColor: '#FFFFFF' },
    leftPhotoButton: { position: 'absolute', left: 8, top: '50%', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    rightPhotoButton: { position: 'absolute', right: 8, top: '50%', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    photoButtonText: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
    infoSection: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    basicInfo: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
    nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    name: { color: '#FFFFFF', fontSize: 26, fontWeight: 'bold', flex: 1 },
    ageBadge: { backgroundColor: '#E50914', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
    ageText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    username: { color: '#E50914', fontSize: 13, marginBottom: 6 },
    bio: { color: '#BBBBBB', fontSize: 13, lineHeight: 18 },
    tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
    tabButton: { flex: 1, paddingVertical: 12, backgroundColor: '#1A1A1A', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A', marginHorizontal: 4 },
    tabButtonActive: { backgroundColor: '#E50914', borderColor: '#E50914' },
    tabButtonText: { color: '#8C8C8C', fontSize: 14, fontWeight: '600' },
    tabButtonTextActive: { color: '#FFFFFF' },
    filterContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12 },
    filterButton: { flex: 1, paddingVertical: 8, backgroundColor: '#1A1A1A', borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A', marginHorizontal: 4 },
    filterButtonActive: { backgroundColor: '#2A2A2A', borderColor: '#E50914' },
    filterButtonText: { color: '#666', fontSize: 12 },
    filterButtonTextActive: { color: '#E50914' },
    detailSection: { marginBottom: 16 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    detailIcon: { fontSize: 16, marginRight: 6 },
    detailTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', flex: 1 },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    tag: { backgroundColor: '#2A2A2A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: '#3A3A3A', marginRight: 6, marginBottom: 6 },
    tagText: { color: '#E0E0E0', fontSize: 11 },
    horizontalScroll: { marginBottom: 8 },
    horizontalScrollContent: { paddingHorizontal: 16 },
    horizontalMovieCard: { width: HORIZONTAL_CARD_WIDTH, marginRight: 12 },
    horizontalMoviePoster: { width: HORIZONTAL_CARD_WIDTH, height: HORIZONTAL_CARD_HEIGHT, borderRadius: 8, backgroundColor: '#1A1A1A' },
    horizontalMovieInfo: { marginTop: 8 },
    horizontalMovieTitle: { color: '#FFFFFF', fontSize: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
    emptyStateText: { color: '#666', fontSize: 12 },
    bottomPadding: { height: 20 },
    footer: { paddingVertical: 8, alignItems: 'center', backgroundColor: '#0A0A0A' },
    footerText: { color: '#777', fontSize: 11 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    loadingText: { color: '#999', fontSize: 15, marginTop: 16 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, backgroundColor: '#000' },
    emptyIcon: { fontSize: 72, marginBottom: 20 },
    emptyTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    emptySubtitle: { color: '#999', fontSize: 14, textAlign: 'center', marginBottom: 30 },
    refreshButton: { backgroundColor: '#E50914', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25 },
    refreshButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.8)' },
    modalContent: { width: screenWidth * 0.9, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 20 },
    modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    filterGroup: { marginBottom: 20 },
    filterLabel: { color: '#FFFFFF', fontSize: 16, marginBottom: 10 },
    genderOptions: { flexDirection: 'row', justifyContent: 'space-between' },
    genderButton: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: '#333', alignItems: 'center', marginHorizontal: 5 },
    genderButtonActive: { backgroundColor: '#E50914' },
    genderButtonText: { color: '#FFFFFF' },
    applyButton: { backgroundColor: '#E50914', padding: 15, borderRadius: 10, alignItems: 'center' },
    applyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
