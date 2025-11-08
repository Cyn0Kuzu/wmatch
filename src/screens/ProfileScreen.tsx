import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  PanResponder,
  TextInput,
  Vibration,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { userDataManager } from '../services/UserDataManager';
import { eventService } from '../services/EventService';
import { realTimeWatchingService } from '../services/RealTimeWatchingService';
import { MovieDetailModal } from '../components/ui/MovieDetailModal';
import { logger } from '../utils/Logger';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.5;
const PHOTO_HEIGHT = height * 0.55; // Tinder tarzı büyük fotoğraf

export const ProfileScreen: React.FC = () => {
  const { authService, tmdbService } = useCoreEngine();
  const [profile, setProfile] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [watched, setWatched] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'favorites' | 'watched'>('favorites');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showGalleryEditor, setShowGalleryEditor] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState<'name' | 'username' | 'bio' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [usernameValidation, setUsernameValidation] = useState({
    isValid: false,
    isChecking: false,
    message: '',
  });
  
  // Drag and drop states for photo gallery
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Advanced animation values for photos
  const [dragAnimations] = useState(() => 
    Array.from({ length: 7 }, () => ({
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }))
  );
  
  // Floating photo animation
  const [floatingPhoto] = useState({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    rotate: new Animated.Value(0),
  });

  useEffect(() => {
    loadProfile();
  }, []);

  // Kullanıcı adı real-time validation
  useEffect(() => {
    if (editField !== 'username' || !profile) return;

    const checkUsername = async () => {
      const trimmedValue = editValue.trim().toLowerCase();

      // 3 karakter kontrolü
      if (trimmedValue.length === 0) {
        setUsernameValidation({ isValid: false, isChecking: false, message: '' });
        return;
      }

      if (trimmedValue.length < 3) {
        setUsernameValidation({
          isValid: false,
          isChecking: false,
          message: '❌ En az 3 karakter gerekli',
        });
        return;
      }

      // Eğer değişmemişse kontrol etme
      if (trimmedValue === profile.username) {
        setUsernameValidation({ isValid: true, isChecking: false, message: '✅ Mevcut kullanıcı adınız' });
        return;
      }

      // Benzersizlik kontrolü
      setUsernameValidation({ isValid: false, isChecking: true, message: '⏳ Kontrol ediliyor...' });

      try {
        const allUsers = await firestoreService.getAllUsers();
        const exists = allUsers.some(u =>
          u.username?.toLowerCase() === trimmedValue && u.id !== profile.id
        );

        if (exists) {
          setUsernameValidation({
            isValid: false,
            isChecking: false,
            message: '❌ Bu kullanıcı adı zaten kullanılıyor',
          });
        } else {
          setUsernameValidation({
            isValid: true,
            isChecking: false,
            message: '✅ Kullanılabilir',
          });
        }
      } catch (error) {
        logger.error('Username check error:', 'ProfileScreen', error);
        setUsernameValidation({
          isValid: false,
          isChecking: false,
          message: '❌ Kontrol edilemedi',
        });
      }
    };

    const timeoutId = setTimeout(checkUsername, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [editValue, editField, profile]);

  const loadProfile = async (retryCount = 0) => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Database'den GERÇEK kullanıcı verisini çek
      let userDoc = await firestoreService.getUserDocument(user.uid);
      
      // Retry mechanism for newly created profiles
      if (!userDoc && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await loadProfile(retryCount + 1);
        return;
      }
      
      if (!userDoc) {
        logger.error('❌ Profile not found after retries', 'ProfileScreen');
        setLoading(false);
        return;
      }
      


      // Database'deki TÜM bilgileri kullan - hiçbir şey atlama
      setProfile({
        id: user.uid,
        email: userDoc.email || user.email || '',
        
        // İsim bilgileri - database'deki GERÇEK değerler
        firstName: userDoc.firstName || '',
        lastName: userDoc.lastName || '',
        name: userDoc.name || '',
        username: userDoc.username || '',
        displayName: userDoc.displayName || '',
        
        // Profil detayları - database'deki GERÇEK değerler
        bio: userDoc.bio || userDoc.profile?.bio || '',
        age: userDoc.age || userDoc.birthDate || null,
        gender: userDoc.gender || '',
        location: userDoc.location || '',
        city: userDoc.city || '',
        country: userDoc.country || '',
        
        // Fotoğraflar - database'deki GERÇEK değerler
        profilePhotos: userDoc.profilePhotos || userDoc.photos || [],
        photoURL: userDoc.photoURL || user.photoURL || '',
        
        // İlgi alanları ve tercihler
        interests: userDoc.interests || [],
        preferences: userDoc.preferences || {},
        
        // Sosyal bilgiler
        followers: userDoc.followers || [],
        following: userDoc.following || [],
        
        // Timestamps
        createdAt: userDoc.createdAt || null,
        updatedAt: userDoc.updatedAt || null,
        lastSeen: userDoc.lastSeen || null,
        
        // Diğer database alanları
        phone: userDoc.phone || '',
        status: userDoc.status || 'active',
        isOnline: userDoc.isOnline || false,
      });

      // Get real favorites and watched content with full details
      await Promise.all([
        loadFavorites(user.uid),
        loadWatched(user.uid),
      ]);
    } catch (error) {
      logger.error('❌ Error loading profile:', 'ProfileScreen', error);
      Alert.alert('Hata', 'Profil yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async (userId: string) => {
    try {
      const favoritesData = await userDataManager.getFavorites(userId);
      if (favoritesData && Array.isArray(favoritesData)) {
        setFavorites(favoritesData);
      }
    } catch (error) {
      logger.error('Error loading favorites:', 'ProfileScreen', error);
    }
  };

  const loadWatched = async (userId: string) => {
    try {
      const watchedData = await userDataManager.getWatchedContent(userId);
      if (watchedData && Array.isArray(watchedData)) {
        setWatched(watchedData);
      }
    } catch (error) {
      logger.error('Error loading watched:', 'ProfileScreen', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, []);

  const handleEditField = (field: 'name' | 'username' | 'bio') => {
    if (!profile) return;
    
    setEditField(field);
    
    if (field === 'name') {
      setEditValue(profile.firstName || '');
    } else if (field === 'username') {
      setEditValue(profile.username || '');
    } else if (field === 'bio') {
      setEditValue(profile.bio || '');
    }
    
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user || !editField) return;

      // Username için real-time validation zaten yapıldı
      if (editField === 'username' && !usernameValidation.isValid) {
        return; // Disabled zaten ama double check
      }

      const updateData: any = {};
      
      if (editField === 'name') {
        const trimmedName = editValue.trim();
        if (trimmedName.length < 2) {
          Alert.alert('Hata', 'İsim en az 2 karakter olmalıdır.');
          return;
        }
        updateData.firstName = trimmedName;
      } else if (editField === 'username') {
        updateData.username = editValue.trim().toLowerCase();
      } else if (editField === 'bio') {
        updateData.bio = editValue.trim();
      }

      await firestoreService.updateUserDocument(user.uid, updateData);
      await loadProfile();
      setShowEditModal(false);
      Alert.alert('✅ Başarılı', 'Bilgileriniz güncellendi!');
    } catch (error) {
      logger.error('Error saving edit:', 'ProfileScreen', error);
      Alert.alert('Hata', 'Güncelleme başarısız oldu');
    }
  };

  // Photo reordering function
  const reorderPhotos = async (fromIndex: number, toIndex: number) => {
    if (!profile || !profile.profilePhotos) return;
    
    const photos = [...profile.profilePhotos];
    const [movedPhoto] = photos.splice(fromIndex, 1);
    photos.splice(toIndex, 0, movedPhoto);
    
    setProfile({
      ...profile,
      profilePhotos: photos,
    });
    
    // Save to database
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        await firestoreService.updateUserDocument(user.uid, {
          profilePhotos: photos,
        });
      }
    } catch (error) {
      logger.error('Error updating photo order:', 'ProfileScreen', error);
    }
  };

  // Drag and drop handlers for gallery editor
  const handleDragStart = (index: number, gestureState: any) => {
    setDraggedIndex(index);
    setIsDragging(true);
    setDragPosition({ x: gestureState.x0, y: gestureState.y0 });
    
    // Vibration feedback
    Vibration.vibrate(50);
    
    // Animate floating photo in
    Animated.parallel([
      Animated.spring(floatingPhoto.scale, {
        toValue: 1.15,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(floatingPhoto.opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(floatingPhoto.rotate, {
        toValue: 0.05,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Fade out original photo
    Animated.parallel([
      Animated.spring(dragAnimations[index].scale, {
        toValue: 0.8,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(dragAnimations[index].opacity, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      // Hide floating photo
      Animated.parallel([
        Animated.spring(floatingPhoto.scale, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(floatingPhoto.opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(floatingPhoto.rotate, {
          toValue: 0,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Restore original photo
      Animated.parallel([
        Animated.spring(dragAnimations[draggedIndex].scale, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(dragAnimations[draggedIndex].opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    setDraggedIndex(null);
    setIsDragging(false);
    setDropZoneIndex(null);
    setHoveredIndex(null);
    setDragPosition({ x: 0, y: 0 });
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderPhotos(draggedIndex, dropIndex);
    }
    handleDragEnd();
  };

  // Create PanResponder for each photo
  const createPanResponder = (index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        handleDragStart(index, gestureState);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isDragging) {
          setDragPosition({ x: gestureState.moveX, y: gestureState.moveY });
          
          // Update floating photo position
          floatingPhoto.translateX.setValue(gestureState.dx);
          floatingPhoto.translateY.setValue(gestureState.dy);
          
          // Calculate which photo we're hovering over
          const itemWidth = (width - 40) / 3;
          const itemHeight = itemWidth * 1.4;
          const gridPadding = 10;
          const gapSize = 10;
          
          const col = Math.floor((gestureState.moveX - gridPadding) / (itemWidth + gapSize));
          const row = Math.floor((gestureState.moveY - 200) / (itemHeight + gapSize));
          const hoverIndex = row * 3 + col;
          
          const photoCount = profile?.profilePhotos?.length || 0;
          if (hoverIndex >= 0 && hoverIndex < photoCount && hoverIndex !== index) {
            setHoveredIndex(hoverIndex);
            setDropZoneIndex(hoverIndex);
          } else {
            setHoveredIndex(null);
            setDropZoneIndex(null);
          }
        }
      },
      onPanResponderRelease: () => {
        if (dropZoneIndex !== null) {
          handleDrop(dropZoneIndex);
        } else {
          handleDragEnd();
        }
      },
    });
  };

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const user = await authService.getCurrentUser();
        if (!user) return;

        const newPhotos = [...(profile?.profilePhotos || []), result.assets[0].uri];
        
        if (newPhotos.length > 6) {
          Alert.alert('Bilgi', 'Maksimum 6 fotoğraf ekleyebilirsiniz.');
          return;
        }

        setProfile({
          ...profile,
          profilePhotos: newPhotos,
        });

        await firestoreService.updateUserDocument(user.uid, {
          profilePhotos: newPhotos,
        });
        
        Alert.alert('✅ Başarılı', 'Fotoğraf eklendi!');
      }
    } catch (error) {
      logger.error('Error adding photo:', 'ProfileScreen', error);
      Alert.alert('Hata', 'Fotoğraf eklenirken bir hata oluştu');
    }
  };

  const handleDeletePhoto = async (index: number) => {
    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await authService.getCurrentUser();
              if (!user || !profile) return;

              const newPhotos = profile.profilePhotos.filter((_: any, i: number) => i !== index);
              
              setProfile({
                ...profile,
                profilePhotos: newPhotos,
              });

              await firestoreService.updateUserDocument(user.uid, {
                profilePhotos: newPhotos,
              });
              
              Alert.alert('✅ Başarılı', 'Fotoğraf silindi!');
            } catch (error) {
              logger.error('Error deleting photo:', 'ProfileScreen', error);
              Alert.alert('Hata', 'Fotoğraf silinirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              logger.error('Error signing out:', 'ProfileScreen', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      '⚠️ Hesabı Sil',
      'Hesabınızı silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!\n\n' +
      '• Tüm profil bilgileriniz silinecek\n' +
      '• Tüm fotoğraflarınız silinecek\n' +
      '• Tüm beğeni ve eşleşmeleriniz silinecek\n' +
      '• Favori ve izleme listeniz silinecek',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hesabı Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await authService.getCurrentUser();
              if (!user) return;

              // 1. Fotoğrafları sil
              if (profile.profilePhotos && profile.profilePhotos.length > 0) {
                const { ref, deleteObject } = await import('firebase/storage');
                const storage = (await import('../services/FirebaseService')).firebaseService.getStorage();
                
                for (const photoUrl of profile.profilePhotos) {
                  try {
                    const photoRef = ref(storage, photoUrl);
                    await deleteObject(photoRef);
                  } catch (photoError) {
                    logger.error('Photo delete error:', 'ProfileScreen', photoError);
                  }
                }
              }

              // 2. Firestore document sil
              await firestoreService.deleteUserDocument(user.uid);

              // 3. Auth user sil
              const { deleteUser } = await import('firebase/auth');
              const auth = (await import('../services/FirebaseService')).firebaseService.getAuth();
              await deleteUser(auth.currentUser!);

              Alert.alert('Hesap Silindi', 'Hesabınız başarıyla silindi.');
            } catch (error) {
              logger.error('Error deleting account:', 'ProfileScreen', error);
              Alert.alert('Hata', 'Hesap silinirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleOpenGalleryEditor = () => {
    setShowGalleryEditor(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>😔</Text>
          <Text style={styles.emptyTitle}>Profil Bulunamadı</Text>
          <Text style={styles.emptySubtitle}>Profil bilgileri yüklenemedi</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadProfile()}
          >
            <Text style={styles.retryButtonText}>🔄 Tekrar Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutButtonAlt}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonAltText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasPhoto = profile.profilePhotos && profile.profilePhotos.length > 0;

  // Filter movies by type
  const getFilteredMovies = (movies: any[]) => {
    if (mediaType === 'all') return movies;
    return movies.filter((item) => {
      const type = item.type || item.media_type;
      if (mediaType === 'movie') {
        return type === 'movie' || !type || type === 'film';
      } else if (mediaType === 'tv') {
        return type === 'tv' || type === 'series';
      }
      return true;
    });
  };

  const filteredFavorites = getFilteredMovies(favorites);
  const filteredWatched = getFilteredMovies(watched);

  const handleMoviePress = async (movie: any) => {
    setSelectedMovie(movie);
    setShowMovieModal(true);
  };

  const handleModalStatusChange = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      await Promise.all([
        loadFavorites(user.uid),
        loadWatched(user.uid),
      ]);
    }
  };

  const renderMovieCard = (movie: any) => {
    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
      : movie.poster
      ? `https://image.tmdb.org/t/p/w342${movie.poster}`
      : 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Image';

    const title = movie.title || movie.name || 'İsimsiz';
    const year = movie.release_date?.substring(0, 4) || 
                 movie.first_air_date?.substring(0, 4) || 
                 movie.year || 
                 '';
    const rating = movie.vote_average?.toFixed(1) || movie.rating || '';
    const type = movie.type || movie.media_type || 'movie';
    
    // Get genre information
    let genreText = '';
    if (movie.genre && typeof movie.genre === 'string') {
      genreText = movie.genre;
    } else if (movie.genre_ids && Array.isArray(movie.genre_ids) && movie.genre_ids.length > 0) {
      // Convert genre IDs to names using TMDBService
      const genreNames = tmdbService.getGenreNames(movie.genre_ids, type === 'tv' || type === 'series' ? 'tv' : 'movie');
      genreText = genreNames.slice(0, 2).join(', '); // Show max 2 genres
    } else if (movie.genres && Array.isArray(movie.genres) && movie.genres.length > 0) {
      // If genres array exists with objects
      genreText = movie.genres.slice(0, 2).map((g: any) => g.name).join(', ');
    }

    return (
      <TouchableOpacity
        style={styles.movieCard}
        activeOpacity={0.8}
        onPress={() => handleMoviePress(movie)}
      >
        <Image
          source={{ uri: posterUrl }}
          style={styles.moviePoster}
          resizeMode="cover"
        />
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.movieMeta}>
            {year && <Text style={styles.movieYear}>{year}</Text>}
            {rating && (
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
          <Text style={styles.movieType}>
            {type === 'tv' || type === 'series' ? '📺 Dizi' : '🎬 Film'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {/* Tinder-Style Photo Gallery */}
        <View style={styles.photoGalleryContainer}>
          {hasPhoto || profile.photoURL ? (
            <>
              <Image
                source={{
                  uri: profile.profilePhotos?.[currentPhotoIndex] || profile.photoURL || 'https://via.placeholder.com/400x600/333/fff?text=?',
                }}
                style={styles.largePhoto}
                resizeMode="cover"
              />
              
              {/* Photo Navigation Dots */}
              {profile.profilePhotos && profile.profilePhotos.length > 1 && (
                <View style={styles.photoDotsContainer}>
                  {profile.profilePhotos.map((_: any, index: number) => (
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
              
              {/* Left/Right Tap Areas */}
              {profile.profilePhotos && profile.profilePhotos.length > 1 && (
                <>
                  <TouchableOpacity
                    style={styles.photoTapLeft}
                    onPress={() => setCurrentPhotoIndex(prev => 
                      prev > 0 ? prev - 1 : profile.profilePhotos.length - 1
                    )}
                  />
                  <TouchableOpacity
                    style={styles.photoTapRight}
                    onPress={() => setCurrentPhotoIndex(prev => 
                      prev < profile.profilePhotos.length - 1 ? prev + 1 : 0
                    )}
                  />
                </>
              )}
              
              {/* Edit Gallery Button */}
              <TouchableOpacity style={styles.editPhotoButton} onPress={handleOpenGalleryEditor}>
                <Text style={styles.editPhotoText}>✎</Text>
              </TouchableOpacity>
              
              {/* Gradient Overlay */}
              <View style={styles.photoGradient} />
            </>
          ) : (
            <View style={[styles.largePhoto, styles.noPhoto]}>
              <View style={styles.noPhotoIcon}>
                <Text style={styles.noPhotoText}>
                  {String((
                    profile.firstName?.[0] ||
                    profile.name?.[0] ||
                    profile.username?.[0] ||
                    profile.email?.[0] ||
                    '?'
                  )).toUpperCase()}
          </Text>
              </View>
            <TouchableOpacity style={styles.editPhotoButton} onPress={handleOpenGalleryEditor}>
              <Text style={styles.editPhotoText}>✎</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

        {/* User Info Section */}
        <View style={styles.userInfoSection}>

          {/* İsim - Database'den gerçek veri */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {(profile.firstName && profile.firstName.trim()) ? 
                (profile.lastName && profile.lastName.trim() ? 
                  `${profile.firstName} ${profile.lastName}` : 
                  profile.firstName
                ) :
                profile.name || 
                profile.displayName ||
                profile.username || 
                'Kullanıcı'}
            </Text>
            {profile.age && profile.age > 0 ? (
              <Text style={styles.nameAge}>, {profile.age}</Text>
            ) : null}
            <TouchableOpacity style={styles.editIcon} onPress={() => handleEditField('name')}>
              <Text style={styles.editIconText}>✎</Text>
            </TouchableOpacity>
          </View>
          
          {/* Kullanıcı adı - Database'den gerçek veri */}
          <View style={styles.usernameRow}>
            {profile.username ? (
              <Text style={styles.username}>{`@${profile.username}`}</Text>
            ) : (
              <Text style={styles.username}>@kullanıcıadı</Text>
            )}
            <TouchableOpacity style={styles.editIconSmall} onPress={() => handleEditField('username')}>
              <Text style={styles.editIconText}>✎</Text>
            </TouchableOpacity>
          </View>
          
          {/* Biyografi - Database'den gerçek veri */}
          <View style={styles.bioRow}>
            <Text style={styles.bio}>
              {profile.bio && profile.bio.trim() ? String(profile.bio) : 'Biyografi ekle...'}
            </Text>
            <TouchableOpacity style={styles.editIconSmall} onPress={() => handleEditField('bio')}>
              <Text style={styles.editIconText}>✎</Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'favorites' && styles.tabButtonActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'favorites' && styles.tabButtonTextActive]}>
              ⭐ Favoriler ({favorites.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'watched' && styles.tabButtonActive]}
            onPress={() => setActiveTab('watched')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'watched' && styles.tabButtonTextActive]}>
              👀 İzlenenler ({watched.length})
            </Text>
          </TouchableOpacity>
          </View>

        {/* Media Type Filter */}
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

        {/* Movies Grid */}
        <View style={styles.moviesSection}>
          {activeTab === 'favorites' ? (
            filteredFavorites.length > 0 ? (
              <View style={styles.moviesGrid}>
                {filteredFavorites.map((item) => (
                  <View key={`fav-${item.id}`}>
                    {renderMovieCard(item)}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>⭐</Text>
                <Text style={styles.emptyStateText}>
                  {mediaType === 'movie' ? 'Henüz favori film eklemediniz' : 
                   mediaType === 'tv' ? 'Henüz favori dizi eklemediniz' : 
                   'Henüz favori eklemediniz'}
                </Text>
              </View>
            )
          ) : filteredWatched.length > 0 ? (
            <View style={styles.moviesGrid}>
              {filteredWatched.map((item) => (
                <View key={`watched-${item.id}`}>
                  {renderMovieCard(item)}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>👀</Text>
              <Text style={styles.emptyStateText}>
                {mediaType === 'movie' ? 'Henüz film izlemediniz' : 
                 mediaType === 'tv' ? 'Henüz dizi izlemediniz' : 
                 'Henüz film/dizi izlemediniz'}
              </Text>
          </View>
        )}
        </View>

        {/* Action Buttons - Hesap Sil ve Çıkış Yap */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteAccountBtn]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.actionButtonIcon}>🗑️</Text>
            <Text style={styles.deleteAccountBtnText}>Hesabı Sil</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutBtn]}
            onPress={handleLogout}
          >
            <Text style={styles.actionButtonIcon}>🚪</Text>
            <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <TouchableOpacity
            style={styles.editModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.editModalTitle}>
              {editField === 'name' ? 'İsim Düzenle' : 
               editField === 'username' ? 'Kullanıcı Adı Düzenle' : 
               'Biyografi Düzenle'}
            </Text>
            
            <TextInput
              style={[
                styles.editInput,
                editField === 'bio' && styles.editInputMultiline,
              ]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={
                editField === 'name' ? 'Adınız' :
                editField === 'username' ? 'Kullanıcı adınız' :
                'Kendinizi tanıtın...'
              }
              placeholderTextColor="#666"
              multiline={editField === 'bio'}
              numberOfLines={editField === 'bio' ? 4 : 1}
              autoCapitalize={editField === 'username' ? 'none' : 'words'}
            />
            
            {/* Username validation message */}
            {editField === 'username' && usernameValidation.message ? (
              <Text style={[
                styles.validationMessage,
                usernameValidation.isValid ? styles.validationSuccess : styles.validationError
              ]}>
                {usernameValidation.message}
              </Text>
            ) : null}
            
            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, styles.editModalButtonCancel]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.editModalButtonTextCancel}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editModalButton,
                  styles.editModalButtonSave,
                  (editField === 'username' && !usernameValidation.isValid) && styles.editModalButtonDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={editField === 'username' && !usernameValidation.isValid}
              >
                <Text style={styles.editModalButtonTextSave}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Gallery Editor Modal */}
      <Modal
        visible={showGalleryEditor}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowGalleryEditor(false)}
      >
        <SafeAreaView style={styles.galleryEditorContainer}>
          <View style={styles.galleryEditorHeader}>
            <Text style={styles.galleryEditorTitle}>Fotoğrafları Düzenle</Text>
            <TouchableOpacity onPress={() => setShowGalleryEditor(false)}>
              <Text style={styles.galleryEditorClose}>✕</Text>
            </TouchableOpacity>
            </View>
          
          <ScrollView style={styles.galleryEditorScroll}>
            <Text style={styles.galleryEditorInfo}>
              ✨ Fotoğrafları basılı tutup sürükleyerek sıralayabilir, yeni ekleyebilir veya silebilirsiniz.
            </Text>
            
            <View style={styles.galleryGrid}>
              {profile?.profilePhotos?.map((photo: string, index: number) => {
                const panResponder = createPanResponder(index);
                const isDragged = draggedIndex === index;
                const isDropZone = dropZoneIndex === index;
                const isHovered = hoveredIndex === index;
                
                return (
                  <Animated.View
                    key={index}
                    {...panResponder.panHandlers}
                    style={[
                      styles.galleryItem,
                      isDragged && styles.galleryItemDragging,
                      isDropZone && styles.galleryItemDropZone,
                      isHovered && styles.galleryItemHovered,
                      {
                        transform: [
                          { scale: dragAnimations[index].scale },
                        ],
                        opacity: dragAnimations[index].opacity,
                      },
                    ]}
                  >
                    <Image source={{ uri: photo }} style={styles.galleryItemImage} />
                    <TouchableOpacity
                      style={styles.galleryItemDelete}
                      onPress={() => handleDeletePhoto(index)}
                    >
                      <Text style={styles.galleryItemDeleteText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.galleryItemNumberContainer}>
                      <Text style={styles.galleryItemNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.galleryItemDragIndicator}>
                      <Text style={styles.galleryItemDragIcon}>⋮⋮</Text>
                    </View>
                  </Animated.View>
                );
              })}
              
              {(profile?.profilePhotos?.length || 0) < 6 && (
                <TouchableOpacity style={styles.galleryItemAdd} onPress={handleAddPhoto}>
                  <Text style={styles.galleryItemAddText}>+</Text>
                  <Text style={styles.galleryItemAddLabel}>Ekle</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Floating dragged photo */}
            {draggedIndex !== null && profile?.profilePhotos?.[draggedIndex] && (
              <Animated.View
                style={[
                  styles.floatingPhoto,
                  {
                    left: dragPosition.x - ((width - 40) / 3) / 2,
                    top: dragPosition.y - (((width - 40) / 3) * 1.4) / 2,
                    width: (width - 40) / 3,
                    height: ((width - 40) / 3) * 1.4,
                    transform: [
                      { translateX: floatingPhoto.translateX },
                      { translateY: floatingPhoto.translateY },
                      { scale: floatingPhoto.scale },
                      {
                        rotate: floatingPhoto.rotate.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                    opacity: floatingPhoto.opacity,
                  },
                ]}
                pointerEvents="none"
              >
                <Image
                  source={{ uri: profile.profilePhotos[draggedIndex] }}
                  style={styles.floatingPhotoImage}
                />
              </Animated.View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        visible={showMovieModal}
        movie={selectedMovie}
        onClose={() => setShowMovieModal(false)}
        onStatusChange={handleModalStatusChange}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  },
  emptySubtitle: {
    color: '#8C8C8C',
    fontSize: 14,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonAlt: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
  },
  logoutButtonAltText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  photoGalleryContainer: {
    width: '100%',
    height: PHOTO_HEIGHT,
    backgroundColor: '#0A0A0A',
    position: 'relative',
  },
  largePhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A',
  },
  noPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: 'bold',
  },
  photoDotsContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  photoTapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    zIndex: 5,
  },
  photoTapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    zIndex: 5,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.8))',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  editPhotoButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  editPhotoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  nameAge: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  username: {
    color: '#E50914',
    fontSize: 17,
    marginTop: 6,
    fontWeight: '600',
  },
  bio: {
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    color: '#8C8C8C',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderColor: '#E50914',
  },
  tabButtonText: {
    color: '#8C8C8C',
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#E50914',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: '#E50914',
  },
  filterButtonText: {
    color: '#8C8C8C',
    fontSize: 13,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#E50914',
  },
  moviesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  moviesGrid: {
    paddingBottom: 10,
  },
  movieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  movieCard: {
    width: CARD_WIDTH,
    marginBottom: 4,
  },
  moviePoster: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  movieInfo: {
    marginTop: 6,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  movieMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  movieYear: {
    color: '#8C8C8C',
    fontSize: 10,
  },
  ratingBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#E50914',
    fontSize: 10,
    fontWeight: '600',
  },
  movieGenre: {
    color: '#999',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '500',
  },
  movieType: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#8C8C8C',
    fontSize: 16,
    textAlign: 'center',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },
  editIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconText: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  deleteAccountBtn: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  logoutBtn: {
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#666',
  },
  deleteAccountBtnText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editModalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  editModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  editInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  editInputMultiline: {
    height: 120,
    textAlignVertical: 'top',
  },
  validationMessage: {
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
    fontWeight: '600',
  },
  validationSuccess: {
    color: '#4CAF50',
  },
  validationError: {
    color: '#F44336',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editModalButtonCancel: {
    backgroundColor: '#2A2A2A',
  },
  editModalButtonSave: {
    backgroundColor: '#E50914',
  },
  editModalButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  editModalButtonTextCancel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editModalButtonTextSave: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryEditorContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  galleryEditorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  galleryEditorClose: {
    color: '#E50914',
    fontSize: 28,
    fontWeight: 'bold',
  },
  galleryEditorScroll: {
    flex: 1,
  },
  galleryEditorInfo: {
    color: '#8C8C8C',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  galleryItem: {
    width: (width - 40) / 3,
    height: (width - 40) / 3 * 1.4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#333',
  },
  galleryItemDragging: {
    borderColor: '#FFC107',
    borderWidth: 3,
    opacity: 0.5,
    elevation: 10,
    shadowColor: '#FFC107',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  galleryItemDropZone: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  galleryItemHovered: {
    borderColor: '#FFC107',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  galleryItemImage: {
    width: '100%',
    height: '100%',
  },
  galleryItemDelete: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  galleryItemDeleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  galleryItemNumberContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  galleryItemNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  galleryItemDragIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  galleryItemDragIcon: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: -2,
  },
  galleryItemAdd: {
    width: (width - 40) / 3,
    height: (width - 40) / 3 * 1.4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E50914',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  galleryItemAddText: {
    color: '#E50914',
    fontSize: 48,
    fontWeight: 'bold',
  },
  galleryItemAddLabel: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  floatingPhoto: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFC107',
    elevation: 20,
    shadowColor: '#FFC107',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    zIndex: 9999,
  },
  floatingPhotoImage: {
    width: '100%',
    height: '100%',
  },
  bottomSpace: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
});
