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
  Linking,
} from 'react-native';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { Timestamp } from 'firebase/firestore';
import { MovieDetailModal } from '../components/ui/MovieDetailModal';
import { ReportModal } from '../components/ui/ReportModal';
import { Icon, Icons } from '../components/ui/IconComponent';
import { authService } from '../services/AuthService';
import { swipeLimitService, SwipeLimits } from '../services/SwipeLimitService';
import { premiumService } from '../services/PremiumService';
import { purchaseService } from '../services/PurchaseService';
import { SwipeOnboardingModal } from '../components/ui/SwipeOnboardingModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const { width, height } = Dimensions.get('window');
// Horizontal scroll için kart boyutu
const HORIZONTAL_CARD_WIDTH = 120; // Sabit genişlik
const HORIZONTAL_CARD_HEIGHT = HORIZONTAL_CARD_WIDTH * 1.5; // Standart poster oranı

// Match Effect Modal Styles
const matchStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: width * 0.85,
    borderWidth: 2,
    borderColor: '#E50914',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  matchTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: 16,
    letterSpacing: 2,
  },
  sparkle: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  photosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'center',
  },
  photoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#E50914',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  heartIcon: {
    marginHorizontal: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 24,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#E50914',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 150,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// Match Effect Modal Component
const MatchEffectModal: React.FC<{
  visible: boolean;
  matchedUser: any;
  onClose: () => void;
  currentUserPhoto?: string;
}> = ({ visible, matchedUser, onClose, currentUserPhoto }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      sparkleAnim.setValue(0);

      // Start animations
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    }
  }, [visible]);

  if (!matchedUser) return null;

  const userPhoto = matchedUser.profilePhotos && matchedUser.profilePhotos.length > 0
    ? matchedUser.profilePhotos[0]
    : matchedUser.photoURL || 'https://via.placeholder.com/150/1a1a1a/666?text=No+Photo';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={matchStyles.container}>
        <Animated.View style={[matchStyles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={matchStyles.header}>
            <Text style={matchStyles.matchTitle}>EŞLEŞME!</Text>
            <Animated.View style={[matchStyles.sparkle, { opacity: sparkleAnim }]}>
              <Icon name={Icons.heart} size={40} color="#E50914" />
            </Animated.View>
          </View>

          <View style={matchStyles.photosContainer}>
            <View style={matchStyles.photoWrapper}>
              <Image
                source={{ uri: currentUserPhoto || userPhoto }}
                style={matchStyles.photo}
                resizeMode="cover"
              />
            </View>
            <View style={matchStyles.heartIcon}>
              <Icon name={Icons.heart} size={50} color="#E50914" />
            </View>
            <View style={matchStyles.photoWrapper}>
              <Image
                source={{ uri: userPhoto }}
                style={matchStyles.photo}
                resizeMode="cover"
              />
            </View>
          </View>

          <Text style={matchStyles.userName}>
            {matchedUser.firstName || matchedUser.username || 'Kullanıcı'} ile eşleştiniz!
          </Text>
          <Text style={matchStyles.subtitle}>
            Artık mesajlaşabilirsiniz
          </Text>

          <TouchableOpacity style={matchStyles.closeButton} onPress={onClose}>
            <Text style={matchStyles.closeButtonText}>Devam Et</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Enhanced Match Card Component
export const EnhancedMatchCard: React.FC<{ 
  user: any; 
  onPass: () => void; 
  onLike: () => void;
  onUndo?: () => void; // Geri alma için
  currentMovie?: any;
  allowSwipeRight?: boolean;
  swipeLeftText?: string;
  fullScreen?: boolean;
}> = ({ user, onPass, onLike, onUndo, currentMovie, allowSwipeRight = true, swipeLeftText = 'GEÇ', fullScreen = false }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  const handleImagePress = (imageUri: string) => {
    setPreviewImage(imageUri);
    setShowImagePreview(true);
  };
  const [currentSection, setCurrentSection] = useState(0);
  const [activeTab, setActiveTab] = useState<'favorites' | 'watched'>('favorites');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;
  const undoOpacity = useRef(new Animated.Value(0)).current; // Geri alma göstergesi

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
      // Show bio if it exists and is a valid string (not empty and not placeholder text)
      const bio = user?.bio || user?.biography;
      if (bio && typeof bio === 'string' && bio.trim() !== '' && 
          bio !== 'Profil bilgileri henüz tamamlanmamış' &&
          bio !== 'Profil tamamlanmamış') {
        return bio.trim();
      }
      return null;
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
      onStartShouldSetPanResponder: (evt) => {
        // Fotoğraf butonlarına tıklamayı engelleme
        const { locationX, locationY } = evt.nativeEvent;
        const photoSectionHeight = fullScreen ? screenHeight * 0.5 : screenHeight * 0.4;
        const buttonSize = 50;
        const buttonHitSlop = 15; // Buton etrafında ekstra alan
        const leftButtonX = 8;
        const rightButtonX = screenWidth - 8 - buttonSize;
        const buttonY = photoSectionHeight / 2;
        
        // Sol buton alanı (hitSlop ile genişletilmiş)
        if (locationX >= leftButtonX - buttonHitSlop && locationX <= leftButtonX + buttonSize + buttonHitSlop &&
            locationY >= buttonY - buttonSize/2 - buttonHitSlop && locationY <= buttonY + buttonSize/2 + buttonHitSlop) {
          return false;
        }
        
        // Sağ buton alanı (hitSlop ile genişletilmiş)
        if (locationX >= rightButtonX - buttonHitSlop && locationX <= rightButtonX + buttonSize + buttonHitSlop &&
            locationY >= buttonY - buttonSize/2 - buttonHitSlop && locationY <= buttonY + buttonSize/2 + buttonHitSlop) {
          return false;
        }
        
        // Herhangi bir boşluğa tıklandığında swipe aktif
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Fotoğraf butonlarına tıklamayı engelleme
        const { locationX, locationY } = evt.nativeEvent;
        const photoSectionHeight = fullScreen ? screenHeight * 0.5 : screenHeight * 0.4;
        const buttonSize = 50;
        const buttonHitSlop = 15; // Buton etrafında ekstra alan
        const leftButtonX = 8;
        const rightButtonX = screenWidth - 8 - buttonSize;
        const buttonY = photoSectionHeight / 2;
        
        // Sol buton alanı (hitSlop ile genişletilmiş)
        if (locationX >= leftButtonX - buttonHitSlop && locationX <= leftButtonX + buttonSize + buttonHitSlop &&
            locationY >= buttonY - buttonSize/2 - buttonHitSlop && locationY <= buttonY + buttonSize/2 + buttonHitSlop) {
          return false;
        }
        
        // Sağ buton alanı (hitSlop ile genişletilmiş)
        if (locationX >= rightButtonX - buttonHitSlop && locationX <= rightButtonX + buttonSize + buttonHitSlop &&
            locationY >= buttonY - buttonSize/2 - buttonHitSlop && locationY <= buttonY + buttonSize/2 + buttonHitSlop) {
          return false;
        }
        
        // Sağa kaydırmayı engelle (Beğendiklerim için)
        if (!allowSwipeRight && gestureState.dx > 0) return false;
        
        // Hareket yönünü kontrol et - sadece yatay hareket dominant ise swipe aktif
        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        const minSwipeDistance = 10; // Minimum swipe mesafesi
        
        // Eğer dikey hareket yatay hareketten daha fazla ise, swipe'ı devre dışı bırak
        if (absDy > absDx * 1.2) {
          return false; // Scroll yapılacak, swipe değil
        }
        
        // Yatay hareket dominant ise ve minimum mesafeyi aştıysa swipe aktif
        if (absDx > absDy && absDx > minSwipeDistance) {
          return true; // Swipe aktif
        }
        
        return false;
      },
      onPanResponderGrant: () => {
        // Swipe başladığında scroll'u devre dışı bırak
        setIsSwipeActive(false);
      },
      onPanResponderMove: (_, gestureState) => {
        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        
        // Aşağı kaydırma - Geri alma göstergesi
        if (gestureState.dy > 50 && absDy > absDx * 1.2 && onUndo) {
          setIsSwipeActive(true);
          // Kartı aşağı hareket ettir
          pan.setValue({ x: 0, y: gestureState.dy });
          // Geri alma göstergesini göster
          undoOpacity.setValue(Math.min(gestureState.dy / 150, 1));
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
          rotate.setValue(0);
          return;
        }
        
        // Eğer dikey hareket yatay hareketten daha fazla ise (yukarı scroll), swipe'ı iptal et
        if (absDy > absDx * 1.2 && gestureState.dy < 50) {
          // Scroll yapılacak, swipe animasyonunu uygulama
          setIsSwipeActive(false);
          pan.setValue({ x: 0, y: 0 });
          rotate.setValue(0);
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
          undoOpacity.setValue(0);
          return;
        }
        
        // Yatay hareket dominant ise swipe aktif
        if (absDx > absDy && absDx > 10) {
          setIsSwipeActive(true);
          
          // Sağa kaydırmayı engelle
          const dx = allowSwipeRight ? gestureState.dx : Math.min(gestureState.dx, 0);
          pan.setValue({ x: dx, y: 0 }); // Dikey hareketi sıfırla
          
          // Calculate rotation based on horizontal movement
          const rotation = dx / screenWidth * 15;
          rotate.setValue(rotation);
          
          // Show like/nope indicators
          if (allowSwipeRight && dx > 50) {
            likeOpacity.setValue(Math.min(dx / 100, 1));
            nopeOpacity.setValue(0);
            undoOpacity.setValue(0);
          } else if (dx < -50) {
            nopeOpacity.setValue(Math.min(Math.abs(dx) / 100, 1));
            likeOpacity.setValue(0);
            undoOpacity.setValue(0);
          } else {
            likeOpacity.setValue(0);
            nopeOpacity.setValue(0);
            undoOpacity.setValue(0);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        
        // Aşağı kaydırma - Geri alma
        if (gestureState.dy > 150 && absDy > absDx * 1.5 && onUndo) {
          // Aşağı kaydırıldı, geri alma işlemi
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: screenHeight }, // Kartı ekranın dışına taşı
              useNativeDriver: true,
            }),
            Animated.spring(rotate, {
              toValue: 0,
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
            Animated.timing(undoOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Animasyon bitince geri alma işlemini yap ve kartı sıfırla
            pan.setValue({ x: 0, y: 0 });
            onUndo();
          });
          return;
        }
        
        // Aşağı kaydırma yeterli değilse geri dön
        if (gestureState.dy > 50 && absDy > absDx * 1.2 && gestureState.dy <= 150) {
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }),
            Animated.timing(undoOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
          return;
        }
        
        // Eğer dikey hareket yatay hareketten daha fazla ise, swipe işlemi yapma
        if (absDy > absDx * 1.2 && gestureState.dy <= 150) {
          // Scroll yapıldı, swipe iptal
          setIsSwipeActive(false);
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: true,
            }),
            Animated.spring(rotate, {
              toValue: 0,
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
          return;
        }
        
        // Swipe işlemi yapılacak
        setIsSwipeActive(false);
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        
        const dx = allowSwipeRight ? gestureState.dx : Math.min(gestureState.dx, 0);
        
        if (allowSwipeRight && dx > 120) {
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
        } else if (dx < -120) {
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

  const normalizedLeftText = (swipeLeftText || '').toLocaleUpperCase('tr-TR');
  const isUndoLeftSwipe = normalizedLeftText.includes('GERİ') || normalizedLeftText.includes('GERI');

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        fullScreen && {
          width: screenWidth,
          height: screenHeight,
          borderRadius: 0,
        },
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
      {/* Like/Nope/Undo Indicators */}
      {allowSwipeRight && (
        <Animated.View style={[styles.likeIndicator, { opacity: likeOpacity }]}>
          <Text style={styles.likeText}>BEĞEN</Text>
        </Animated.View>
      )}
      {isUndoLeftSwipe ? (
        <Animated.View style={[styles.undoLeftIndicator, { opacity: nopeOpacity }]}>
          <Text style={styles.undoLeftText}>{swipeLeftText}</Text>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.nopeIndicator, { opacity: nopeOpacity }]}>
          <Text style={styles.nopeText}>{swipeLeftText}</Text>
        </Animated.View>
      )}
      {onUndo && (
        <Animated.View style={[styles.undoIndicator, { opacity: undoOpacity }]}>
          <Text style={styles.undoText}>GERİ AL</Text>
        </Animated.View>
      )}

      {/* Photo Section */}
      <View style={styles.photoSection}>
        {hasPhotos ? (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleImagePress(photos[currentPhotoIndex])}
            >
              <Image 
                source={{ uri: photos[currentPhotoIndex] }} 
                style={styles.photo} 
                resizeMode="cover"
              />
            </TouchableOpacity>
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
                <TouchableOpacity 
                  style={styles.leftPhotoButton} 
                  onPress={prevPhoto}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.photoButtonText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.rightPhotoButton} 
                  onPress={nextPhoto}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
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
        
        {/* Menu Button - Sol Üst */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(true)}
          activeOpacity={0.7}
        >
          <Icon name={Icons.moreVert} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <ScrollView 
        style={styles.infoSection} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSwipeActive}
        nestedScrollEnabled={true}
      >
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
          
          {/* Letterboxd Link */}
          {user.letterboxdLink && user.letterboxdLink.trim() ? (
            <TouchableOpacity 
              style={styles.letterboxdLinkContainer}
              onPress={() => {
                let url = user.letterboxdLink.trim();
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  url = `https://${url}`;
                }
                Linking.openURL(url).catch(err => {
                  console.error('Letterboxd URL açılamadı:', err);
                  Alert.alert('Hata', 'Letterboxd linki açılamadı');
                });
              }}
            >
              <Text style={styles.letterboxdIcon}>🎬</Text>
              <Text style={styles.letterboxdLink}>{user.letterboxdLink}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Interests */}
        {user.interests && Array.isArray(user.interests) && user.interests.length > 0 && !user.interests.includes('Profil tamamlanmamış') && (
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <Icon name={Icons.target} size={20} color="#E50914" />
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
              <View style={styles.filterButtonContent}>
                <Icon name={Icons.movie} size={16} color={mediaType === 'movie' ? '#E50914' : '#FFFFFF'} />
                <Text style={[styles.filterButtonText, { marginLeft: 6 }, mediaType === 'movie' && styles.filterButtonTextActive]}>
                  Filmler
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, mediaType === 'tv' && styles.filterButtonActive]}
              onPress={() => setMediaType('tv')}
            >
              <View style={styles.filterButtonContent}>
                <Icon name={Icons.tv} size={16} color={mediaType === 'tv' ? '#E50914' : '#FFFFFF'} />
                <Text style={[styles.filterButtonText, { marginLeft: 6 }, mediaType === 'tv' && styles.filterButtonTextActive]}>
                  Diziler
                </Text>
              </View>
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
                      // Fix poster URL - handle both poster_path and poster fields, and ensure proper URL
                      let posterUrl = '';
                      if (movie.poster_path) {
                        // Remove leading slash if present
                        const path = movie.poster_path.startsWith('/') ? movie.poster_path.substring(1) : movie.poster_path;
                        posterUrl = `https://image.tmdb.org/t/p/w342/${path}`;
                      } else if (movie.poster) {
                        // Handle poster field (might already be full URL or path)
                        if (movie.poster.startsWith('http')) {
                          posterUrl = movie.poster;
                        } else {
                          const path = movie.poster.startsWith('/') ? movie.poster.substring(1) : movie.poster;
                          posterUrl = `https://image.tmdb.org/t/p/w342/${path}`;
                        }
                      } else {
                        posterUrl = 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Image';
                      }
                      
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
                            onError={() => {
                              // Fallback to placeholder if image fails to load
                              console.log('Failed to load poster for:', title);
                            }}
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
                              <View style={styles.movieTypeContainer}>
                                <Icon name={type === 'tv' || type === 'series' ? Icons.tv : Icons.movie} size={14} color="#FFFFFF" />
                                <Text style={[styles.movieType, { marginLeft: 4 }]}>{type === 'tv' || type === 'series' ? 'Dizi' : 'Film'}</Text>
                              </View>
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
                      // Fix poster URL - handle both poster_path and poster fields, and ensure proper URL
                      let posterUrl = '';
                      if (movie.poster_path) {
                        // Remove leading slash if present
                        const path = movie.poster_path.startsWith('/') ? movie.poster_path.substring(1) : movie.poster_path;
                        posterUrl = `https://image.tmdb.org/t/p/w342/${path}`;
                      } else if (movie.poster) {
                        // Handle poster field (might already be full URL or path)
                        if (movie.poster.startsWith('http')) {
                          posterUrl = movie.poster;
                        } else {
                          const path = movie.poster.startsWith('/') ? movie.poster.substring(1) : movie.poster;
                          posterUrl = `https://image.tmdb.org/t/p/w342/${path}`;
                        }
                      } else {
                        posterUrl = 'https://via.placeholder.com/342x513/1a1a1a/666?text=No+Image';
                      }
                      
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
                            onError={() => {
                              // Fallback to placeholder if image fails to load
                              console.log('Failed to load poster for:', title);
                            }}
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
                            {genreText && genreText.trim() !== '' ? (
                              <Text style={styles.movieGenre} numberOfLines={1}>
                                {genreText}
                              </Text>
                            ) : null}
                            {type && (
                              <View style={styles.movieTypeContainer}>
                                <Icon name={type === 'tv' || type === 'series' ? Icons.tv : Icons.movie} size={14} color="#FFFFFF" />
                                <Text style={[styles.movieType, { marginLeft: 4 }]}>{type === 'tv' || type === 'series' ? 'Dizi' : 'Film'}</Text>
                              </View>
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

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContent}>
            {/* Bildir Butonu */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowReportModal(true);
              }}
            >
              <Icon name={Icons.warning} size={20} color="#FFA500" />
              <Text style={[styles.menuItemText, { color: '#FFA500' }]}>Bildir</Text>
            </TouchableOpacity>
            
            {/* Engelle Butonu */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setShowMenu(false);
                const currentUser = await authService.getCurrentUser();
                if (!currentUser) return;
                
                Alert.alert(
                  'Kullanıcıyı Engelle',
                  `${getName()} kullanıcısını engellemek istediğinize emin misiniz?`,
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Evet, Engelle',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await firestoreService.blockUser(currentUser.uid, user.uid || user.id);
                          Alert.alert('Başarılı', 'Kullanıcı engellendi');
                          onPass(); // Kartı geç
                        } catch (error) {
                          console.error('Error blocking user:', error);
                          Alert.alert('Hata', 'Kullanıcı engellenirken bir hata oluştu');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Icon name={Icons.block} size={20} color="#FF6B6B" />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Engelle</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedUserId={user.uid || user.id}
        reportedUserData={user}
      />

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
  
  // Monetization states
  const [swipeLimits, setSwipeLimits] = useState<SwipeLimits | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState<any[]>([]); // Geri alma için
  
  // Match effect states
  const [showMatchEffect, setShowMatchEffect] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);

  useEffect(() => {
    loadMatches();
    checkOnboarding();
    loadSwipeLimits();
  }, []);

  // Onboarding kontrolü
  const checkOnboarding = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      
      const dontShow = await AsyncStorage.getItem(`onboarding_swipe_${user.uid}`);
      if (!dontShow) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  // Swipe limitlerini yükle
  const loadSwipeLimits = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;
      
      const limits = await swipeLimitService.getSwipeLimits(user.uid);
      setSwipeLimits(limits);
    } catch (error) {
      console.error('Error loading swipe limits:', error);
    }
  };


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
        // Kullanıcı film izliyorsa ama eşleşme yoksa daha uygun mesaj göster
        if (currentUserMovies.length > 0) {
          const movieTitle = currentUserMovies[0].title || currentUserMovies[0].name || 'Bu film';
          Alert.alert(
            'Eşleşme Bulunamadı', 
            `${movieTitle} şu anda başka kimse tarafından izlenmiyor. Aynı filmi izleyen birini bulmak için biraz bekleyin veya başka bir film deneyin.`
          );
        } else {
          Alert.alert('Bilgi', 'Şu anda izlediğiniz bir film yok. Önce bir film izlemeye başlayın.');
        }
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
          // Get bio from multiple possible fields
          const bio = (match.bio && typeof match.bio === 'string' && match.bio.trim() !== '' && match.bio !== 'Profil bilgileri henüz tamamlanmamış')
            ? String(match.bio).trim()
            : (match.biography && typeof match.biography === 'string' && match.biography.trim() !== '' && match.biography !== 'Profil bilgileri henüz tamamlanmamış')
            ? String(match.biography).trim()
            : (match.profile?.bio && typeof match.profile.bio === 'string' && match.profile.bio.trim() !== '' && match.profile.bio !== 'Profil bilgileri henüz tamamlanmamış')
            ? String(match.profile.bio).trim()
            : '';
          
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
          
          // Get Letterboxd link
          const letterboxdLink = match.letterboxdLink || match.socialLinks?.letterboxd || match.social?.socialLinks?.letterboxd || '';
          
          return {
            ...match,
            id: userId,
            firstName,
            lastName,
            username,
            bio,
            biography: bio, // Also set biography field for compatibility
            age,
            gender,
            profilePhotos,
            interests,
            favorites,
            watchedContent,
            letterboxdLink,
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

  const handlePass = async () => {
    const currentUser = users[currentUserIndex];
    if (!currentUser) return;

    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Swipe limiti kontrolü
      const canSwipeResult = await swipeLimitService.canSwipe(user.uid);
      if (!canSwipeResult.canSwipe) {
        Alert.alert(
          'Swipe Hakkınız Doldu',
          canSwipeResult.message || 'Günlük swipe hakkınız doldu.',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Ekstra Swipe Al',
              onPress: () => purchaseService.showExtraSwipesModal(user.uid),
            },
            {
              text: 'Premium Al',
              onPress: () => purchaseService.showPremiumPurchaseModal(user.uid),
            },
          ]
        );
        return;
      }

      // Swipe kullan
      const swipeUsed = await swipeLimitService.useSwipe(
        user.uid,
        'pass',
        currentUser.id,
        currentMovieId || undefined
      );

      if (!swipeUsed) {
        Alert.alert('Hata', 'Swipe işlemi başarısız');
        return;
      }

      // Swipe geçmişine ekle (geri alma için) - Detaylı bilgi
      setSwipeHistory(prev => [
        {
          userId: currentUser.id,
          user: { ...currentUser }, // Kullanıcı objesinin tam kopyası
          action: 'pass',
          index: currentUserIndex,
          movieId: currentMovieId || null,
          movieTitle: currentMovie?.title || currentMovie?.name || null,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 9), // Son 10 swipe'ı tut
      ]);

      // Limitleri yenile
      await loadSwipeLimits();

      if (currentUser && currentMovieId) {
        const userKey = `${currentUser.id}_${currentMovieId}`;
        setSwipedUsers(prev => new Set([...prev, userKey]));
      }
      setCurrentUserIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error in handlePass:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    }
  };

  const handleLike = async () => {
    const currentUser = users[currentUserIndex];
    if (!currentUser) return;

    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Swipe limiti kontrolü
      const canSwipeResult = await swipeLimitService.canSwipe(user.uid);
      if (!canSwipeResult.canSwipe) {
        Alert.alert(
          'Swipe Hakkınız Doldu',
          canSwipeResult.message || 'Günlük swipe hakkınız doldu.',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Ekstra Swipe Al',
              onPress: () => purchaseService.showExtraSwipesModal(user.uid),
            },
            {
              text: 'Premium Al',
              onPress: () => purchaseService.showPremiumPurchaseModal(user.uid),
            },
          ]
        );
        return;
      }

      // Swipe kullan
      const swipeUsed = await swipeLimitService.useSwipe(
        user.uid,
        'like',
        currentUser.id,
        currentMovieId || undefined
      );

      if (!swipeUsed) {
        Alert.alert('Hata', 'Swipe işlemi başarısız');
        return;
      }

      // Şu anda izlenen film/dizi bilgisini al
      const currentMovieTitle = currentMovie?.title || currentMovie?.name || null;
      
      await firestoreService.addToLikedList(user.uid, currentUser.id, currentMovieTitle);
      
      if (currentMovieId) {
        const userKey = `${currentUser.id}_${currentMovieId}`;
        setSwipedUsers(prev => new Set([...prev, userKey]));
      }
      
      const isMatch = await checkForMatch(user.uid, currentUser.id);
      
      // Swipe geçmişine ekle (geri alma için) - Detaylı bilgi
      setSwipeHistory(prev => [
        {
          userId: currentUser.id,
          user: { ...currentUser }, // Kullanıcı objesinin tam kopyası
          action: 'like',
          index: currentUserIndex,
          movieId: currentMovieId || null,
          movieTitle: currentMovieTitle,
          isMatch: isMatch, // Match durumu
          timestamp: Date.now(),
        },
        ...prev.slice(0, 9), // Son 10 swipe'ı tut
      ]);
      
      if (isMatch) {
        // Match kaydet
        await saveMatch(user.uid, currentUser, currentMovieTitle);
        
        // Current user'ın fotoğrafını al
        const currentUserDoc = await firestoreService.getUserDocument(user.uid);
        const currentUserPhoto = currentUserDoc?.profilePhotos?.[0] || currentUserDoc?.photoURL || null;
        
        // Match efekti göster
        setMatchedUser({ ...currentUser, currentUserPhoto });
        setShowMatchEffect(true);
        
        // 3 saniye sonra match efektini kapat
        setTimeout(() => {
          setShowMatchEffect(false);
          setMatchedUser(null);
        }, 3000);
      }

      // Limitleri yenile
      await loadSwipeLimits();

      setCurrentUserIndex(prev => prev + 1);
    } catch (error) {
      console.error('Error liking user:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu');
    }
  };

  // Geri alma işlemi (aşağı kaydırma) - Güçlendirilmiş versiyon
  const handleUndo = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Geri alma hakkı kontrolü
      const canUndoResult = await swipeLimitService.canUndo(user.uid);
      if (!canUndoResult.canUndo) {
        Alert.alert(
          'Geri Alma Hakkınız Doldu',
          canUndoResult.message || 'Günlük geri alma hakkınız doldu.',
          [
            { text: 'Tamam', style: 'cancel' },
            {
              text: 'Premium Al',
              onPress: () => purchaseService.showPremiumPurchaseModal(user.uid),
            },
          ]
        );
        return;
      }

      // Swipe geçmişinden son swipe'ı al
      if (swipeHistory.length === 0) {
        Alert.alert('Bilgi', 'Geri alınacak swipe bulunamadı');
        return;
      }

      const lastSwipe = swipeHistory[0];
      
      if (!lastSwipe.user) {
        Alert.alert('Hata', 'Geri alınacak kullanıcı bilgisi bulunamadı');
        return;
      }

      // Geri alma kullan (useUndo zaten swipe limitini de geri alıyor)
      const undoUsed = await swipeLimitService.useUndo(user.uid);
      if (!undoUsed) {
        Alert.alert('Hata', 'Geri alma işlemi başarısız');
        return;
      }

      // Senaryo 1: LIKE işlemi geri alınıyor
      if (lastSwipe.action === 'like') {
        try {
          // 1. Beğendiklerim listesinden çıkar
          await firestoreService.removeFromLikedList(user.uid, lastSwipe.userId);
          
          // 2. Eğer match varsa, match'i de kaldır
          if (lastSwipe.isMatch) {
            await firestoreService.removeMatch(user.uid, lastSwipe.userId);
          }
          
          // 3. SwipedUsers'dan kaldır
          if (lastSwipe.movieId) {
            const userKey = `${lastSwipe.userId}_${lastSwipe.movieId}`;
            setSwipedUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(userKey);
              return newSet;
            });
          }
          
          // 4. Kullanıcıyı users listesine geri ekle (doğru pozisyona)
          const restoredUser = lastSwipe.user;
          setUsers(prev => {
            const newUsers = [...prev];
            // Index'e göre ekle (eğer index geçerliyse)
            if (lastSwipe.index >= 0 && lastSwipe.index < newUsers.length) {
              newUsers.splice(lastSwipe.index, 0, restoredUser);
            } else {
              // Index geçersizse başa ekle
              newUsers.unshift(restoredUser);
            }
            return newUsers;
          });
          
          // 5. Index'i geri al
          if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
          }
        } catch (error) {
          console.error('Error undoing like:', error);
          Alert.alert('Hata', 'Beğeni geri alınırken bir hata oluştu');
          return;
        }
      }
      
      // Senaryo 2: PASS işlemi geri alınıyor
      else if (lastSwipe.action === 'pass') {
        try {
          // 1. SwipedUsers'dan kaldır
          if (lastSwipe.movieId) {
            const userKey = `${lastSwipe.userId}_${lastSwipe.movieId}`;
            setSwipedUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(userKey);
              return newSet;
            });
          }
          
          // 2. Kullanıcıyı users listesine geri ekle (doğru pozisyona)
          const restoredUser = lastSwipe.user;
          setUsers(prev => {
            const newUsers = [...prev];
            // Index'e göre ekle (eğer index geçerliyse)
            if (lastSwipe.index >= 0 && lastSwipe.index < newUsers.length) {
              newUsers.splice(lastSwipe.index, 0, restoredUser);
            } else {
              // Index geçersizse başa ekle
              newUsers.unshift(restoredUser);
            }
            return newUsers;
          });
          
          // 3. Index'i geri al
          if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
          }
        } catch (error) {
          console.error('Error undoing pass:', error);
          Alert.alert('Hata', 'Geçme işlemi geri alınırken bir hata oluştu');
          return;
        }
      }

      // Swipe geçmişinden kaldır
      setSwipeHistory(prev => prev.slice(1));

      // Limitleri yenile
      await loadSwipeLimits();

      Alert.alert('Başarılı', 'Son swipe işlemi geri alındı');
    } catch (error) {
      console.error('Error in handleUndo:', error);
      Alert.alert('Hata', 'Geri alma işlemi sırasında bir hata oluştu');
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

  const saveMatch = async (currentUserId: string, matchedUser: any, matchedMovieTitle?: string | null) => {
    try {
      await firestoreService.saveMatch(currentUserId, matchedUser.id, {
        matchedAt: Timestamp.now(),
        matchedMovie: matchedMovieTitle || currentMovie?.title || currentMovie?.name || null
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
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
        >
          <View style={styles.emptyContainer}>
            <Icon name={Icons.watch} size={48} color="#8C8C8C" />
            <Text style={styles.emptyTitle}>Tüm eşleşmeleri gördünüz!</Text>
            <Text style={styles.emptySubtitle}>
              Daha fazla eşleşme için yeni filmler izlemeye başlayın
            </Text>
            <TouchableOpacity style={styles.emptyRefreshButton} onPress={loadMatches}>
              <Text style={styles.emptyRefreshButtonText}>Yenile</Text>
            </TouchableOpacity>
            {swipeHistory.length > 0 && (
              <TouchableOpacity style={styles.emptyUndoButton} onPress={handleUndo}>
                <Text style={styles.emptyUndoButtonText}>Geri Al</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
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
      <View style={styles.mainContent}>
        <View style={styles.cardSection}>
          {currentUser && currentUser.id ? (
            <EnhancedMatchCard
              user={currentUser}
              onPass={handlePass}
              onLike={handleLike}
              onUndo={handleUndo}
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
          {swipeLimits && (
            <View style={styles.swipeLimitContainer}>
              <Text style={styles.swipeLimitText}>
                {swipeLimits.isPremium ? (
                  '⭐ Premium - Sınırsız'
                ) : (
                  `Swipe: ${Math.max(0, (swipeLimits.dailySwipesLimit + swipeLimits.extraSwipesPurchased) - swipeLimits.dailySwipesUsed)}/${swipeLimits.dailySwipesLimit + swipeLimits.extraSwipesPurchased} | Geri Al: ${swipeLimits.undoCount}/${swipeLimits.undoLimit}`
                )}
              </Text>
              {!swipeLimits.isPremium && (
                <TouchableOpacity
                  style={styles.premiumButton}
                  onPress={async () => {
                    const user = await authService.getCurrentUser();
                    if (user) {
                      purchaseService.showPremiumPurchaseModal(user.uid);
                    }
                  }}
                >
                  <Text style={styles.premiumButtonText}>Premium Al</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Onboarding Modal */}
      <SwipeOnboardingModal
        visible={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onDontShowAgain={async () => {
          try {
            const user = await authService.getCurrentUser();
            if (user) {
              await AsyncStorage.setItem(`onboarding_swipe_${user.uid}`, 'true');
            }
            setShowOnboarding(false);
          } catch (error) {
            console.error('Error saving onboarding preference:', error);
            setShowOnboarding(false);
          }
        }}
      />

      {/* Match Effect Modal */}
      <MatchEffectModal
        visible={showMatchEffect}
        matchedUser={matchedUser}
        currentUserPhoto={matchedUser?.currentUserPhoto}
        onClose={() => {
          setShowMatchEffect(false);
          setMatchedUser(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
  undoLeftIndicator: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 1000,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  undoLeftText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  undoIndicator: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 1000,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  undoText: {
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rightPhotoButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
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
    marginBottom: 8,
  },
  letterboxdLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  letterboxdIcon: {
    fontSize: 14,
  },
  letterboxdLink: {
    color: '#00D735',
    fontSize: 12,
    textDecorationLine: 'underline',
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
    color: '#CCCCCC',
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333333',
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    borderColor: '#E50914',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#E50914',
    fontWeight: '700',
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#B3B3B3',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  movieTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  movieType: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    color: '#CCCCCC',
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
  menuButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    gap: 12,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemDanger: {
    color: '#FF6B6B',
  },
  moreText: {
    color: '#CCCCCC',
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  footerText: {
    color: '#CCCCCC',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  swipeLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  swipeLimitText: {
    color: '#CCCCCC',
    fontSize: 9,
    marginRight: 4,
  },
  premiumButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#B3B3B3',
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
    color: '#B3B3B3',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyRefreshButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyRefreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyUndoButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  emptyUndoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    width: screenWidth,
    height: screenHeight,
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
