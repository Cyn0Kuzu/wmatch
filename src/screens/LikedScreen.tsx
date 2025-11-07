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
} from 'react-native';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { matchService } from '../services/MatchService';
import { Timestamp } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

// Liked User Card Component
const LikedUserCard: React.FC<{ 
  user: any; 
  onPress: () => void;
}> = ({ user, onPress }) => {
  const photo = user.profilePhotos?.[0] || user.photoURL || null;
  const userName = String(user.firstName || user.username || 'Kullanıcı');
  const userAge = user.age && user.age > 0 ? `${Number(user.age)} yaşında` : '';
  const userBio = String(user.bio || '');

  return (
    <TouchableOpacity style={styles.userCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.photoContainer}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.userPhoto} resizeMode="cover" />
        ) : (
          <View style={[styles.userPhoto, styles.noPhoto]}>
            <View style={styles.noPhotoIcon}>
              <Text style={styles.noPhotoText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {userName}
        </Text>
        {userAge ? (
          <Text style={styles.userAge}>{userAge}</Text>
        ) : null}
        {userBio ? (
          <Text style={styles.userBio} numberOfLines={2}>
            {userBio}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

// Swipeable Like Card Modal Component
const SwipeableLikeCard: React.FC<{
  user: any;
  visible: boolean;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}> = ({ user, visible, onClose, onLike, onPass }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos = user?.profilePhotos && Array.isArray(user.profilePhotos) && user.profilePhotos.length > 0 
    ? user.profilePhotos.filter((p: any) => p && typeof p === 'string')
    : [];
  const hasPhotos = photos.length > 0;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
        const rotation = gestureState.dx / width * 15;
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
          // Sağa kaydır - Like
          Animated.parallel([
            Animated.timing(pan, { toValue: { x: width + 100, y: 0 }, duration: 300, useNativeDriver: true }),
            Animated.timing(likeOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start(() => {
            onLike();
            resetCard();
          });
        } else if (gestureState.dx < -120) {
          // Sola kaydır - Pass
          Animated.parallel([
            Animated.timing(pan, { toValue: { x: -width - 100, y: 0 }, duration: 300, useNativeDriver: true }),
            Animated.timing(nopeOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start(() => {
            onPass();
            resetCard();
          });
        } else {
          // Geri dön
          Animated.parallel([
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(likeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(nopeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  const resetCard = () => {
    pan.setValue({ x: 0, y: 0 });
    rotate.setValue(0);
    likeOpacity.setValue(0);
    nopeOpacity.setValue(0);
    scale.setValue(1);
  };

  const rotateValue = rotate.interpolate({
    inputRange: [-15, 0, 15],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  if (!user) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.swipeCardContainer}>
          <Animated.View
            style={[
              styles.swipeCard,
              {
                transform: [
                  { translateX: pan.x },
                  { rotate: rotateValue },
                  { scale },
                ],
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Like/Nope Indicators */}
            <Animated.View style={[styles.likeIndicatorModal, { opacity: likeOpacity }]}>
              <Text style={styles.likeTextModal}>BEĞEN</Text>
            </Animated.View>
            <Animated.View style={[styles.nopeIndicatorModal, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeTextModal}>GEÇ</Text>
            </Animated.View>

            {/* Photo */}
            <View style={styles.swipePhotoSection}>
              {hasPhotos ? (
                <>
                  <Image 
                    source={{ uri: photos[currentPhotoIndex] }} 
                    style={styles.swipePhoto} 
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
                      <TouchableOpacity 
                        style={styles.leftPhotoButton} 
                        onPress={() => setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : prev)}
                      >
                        <Text style={styles.photoButtonText}>‹</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.rightPhotoButton} 
                        onPress={() => setCurrentPhotoIndex(prev => prev < photos.length - 1 ? prev + 1 : prev)}
                      >
                        <Text style={styles.photoButtonText}>›</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              ) : (
                <View style={styles.swipeNoPhoto}>
                  <View style={styles.swipeNoPhotoIcon}>
                    <Text style={styles.swipeNoPhotoText}>
                      {String((user.firstName?.[0] || user.username?.[0] || '?')).toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* User Info */}
            <View style={styles.swipeInfoSection}>
              <View style={styles.swipeBasicInfo}>
                <Text style={styles.swipeName}>
                  {user.firstName || user.username || 'Kullanıcı'}
                  {user.age && user.age > 0 ? `, ${user.age}` : ''}
                </Text>
                {user.username && (
                  <Text style={styles.swipeUsername}>@{user.username}</Text>
                )}
                {user.bio && user.bio.trim() && (
                  <Text style={styles.swipeBio}>{user.bio}</Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Swipe Instructions */}
        <View style={styles.swipeInstructions}>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionIcon}>👈</Text>
            <Text style={styles.instructionText}>Geç</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionIcon}>👉</Text>
            <Text style={styles.instructionText}>Beğen</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export const LikedScreen: React.FC = () => {
  const { authService } = useCoreEngine();
  const [likedByMe, setLikedByMe] = useState<any[]>([]);
  const [likedMe, setLikedMe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'liked' | 'likers'>('liked');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showSwipeModal, setShowSwipeModal] = useState(false);
  const [currentLikerIndex, setCurrentLikerIndex] = useState(0);

  useEffect(() => {
    loadLikedUsers();
  }, []);

  const loadLikedUsers = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const userDoc = await firestoreService.getUserDocument(user.uid);
      if (!userDoc) {
        setLoading(false);
        return;
      }

      const myLikedIds = userDoc.social?.likedUsers || [];
      const matchedIds = new Set<string>(userDoc.social?.matches?.map((m: any) => m.matchedUserId) || []);

      // 1. Fetch users I have liked
      const fetchedLikedByMe = await fetchUsersByIds(myLikedIds);
      const nonMatchedLikedByMe = fetchedLikedByMe.filter(u => !matchedIds.has(u.id));
      setLikedByMe(nonMatchedLikedByMe);

      // 2. Fetch users who liked me
      const usersWhoLikedMe = await matchService.getUsersWhoLikedMe(user.uid);
      const nonMatchedLikedMe = usersWhoLikedMe.filter(u => !matchedIds.has(u.id));
      setLikedMe(nonMatchedLikedMe);

    } catch (error) {
      logger.error('Error loading liked users:', 'LikedScreen', error);
      Alert.alert('Hata', 'Beğeniler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersByIds = async (userIds: string[]) => {
    const usersData = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const userDoc = await firestoreService.getUserDocument(userId);
          if (!userDoc) return null;

          return {
            id: userId,
            firstName: userDoc.firstName || userDoc.name || userDoc.username || 'Kullanıcı',
            lastName: userDoc.lastName || '',
            username: userDoc.username || '',
            age: userDoc.age || userDoc.profile?.age || 0,
            bio: userDoc.bio || userDoc.profile?.bio || '',
            profilePhotos: userDoc.profilePhotos || userDoc.photos || [],
            photoURL: userDoc.photoURL || '',
            interests: userDoc.interests || userDoc.profile?.interests || [],
          };
        } catch (error) {
          logger.error(`Error fetching user ${userId}:`, 'LikedScreen', error);
          return null;
        }
      })
    );

    return usersData.filter(u => u !== null);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLikedUsers();
    setRefreshing(false);
  }, []);

  const handleUserPress = async (user: any, index?: number) => {
    if (activeTab === 'likers') {
      setSelectedUser(user);
      setCurrentLikerIndex(index || 0);
      setShowSwipeModal(true);
    } else {
      Alert.alert(
        user.firstName || 'Kullanıcı',
        `${user.firstName} henüz sizi beğenmedi. Eğer sizi beğenirse eşleşeceksiniz!`,
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const handleSwipeLike = async () => {
    if (!selectedUser) return;

    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return;
      
      await firestoreService.addToLikedList(currentUser.uid, selectedUser.id);
      
      await firestoreService.addMatch(currentUser.uid, {
        matchedUserId: selectedUser.id,
        matchedAt: Timestamp.now(),
      });
      
      Alert.alert('🎉 Eşleşme!', `${selectedUser.firstName} ile eşleştiniz! Artık mesajlaşabilirsiniz.`);
      
      setShowSwipeModal(false);
      setSelectedUser(null);
      await loadLikedUsers();
      
      if (currentLikerIndex < likedMe.length - 1) {
        setTimeout(() => {
          const nextUser = likedMe[currentLikerIndex + 1];
          if (nextUser) {
            setSelectedUser(nextUser);
            setCurrentLikerIndex(currentLikerIndex + 1);
            setShowSwipeModal(true);
          }
        }, 1000);
      }
    } catch (error) {
      logger.error('Error creating match:', 'LikedScreen', error);
      Alert.alert('Hata', 'Eşleşme oluşturulurken bir hata oluştu');
    }
  };

  const handleSwipePass = async () => {
    if (!selectedUser) return;

    setShowSwipeModal(false);
    setSelectedUser(null);
    
    if (currentLikerIndex < likedMe.length - 1) {
      setTimeout(() => {
        const nextUser = likedMe[currentLikerIndex + 1];
        if (nextUser) {
          setSelectedUser(nextUser);
          setCurrentLikerIndex(currentLikerIndex + 1);
          setShowSwipeModal(true);
        }
      }, 300);
    }
  };

  const getCurrentUsers = () => {
    if (activeTab === 'liked') return likedByMe;
    return likedMe;
  };

  const currentUsers = getCurrentUsers();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Beğeniler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Beğeniler</Text>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'liked' 
            ? `${likedByMe.length} kullanıcı beğendiniz` 
            : `${likedMe.length} kullanıcı sizi beğendi`}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'liked' && styles.filterTabActive]}
          onPress={() => setActiveTab('liked')}
        >
          <Text style={[styles.filterTabText, activeTab === 'liked' && styles.filterTabTextActive]}>
            💝 Beğendiklerim
          </Text>
          <Text style={[styles.filterTabCount, activeTab === 'liked' && styles.filterTabCountActive]}>
            {likedByMe.length}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'likers' && styles.filterTabActive]}
          onPress={() => setActiveTab('likers')}
        >
          <Text style={[styles.filterTabText, activeTab === 'likers' && styles.filterTabTextActive]}>
            ❤️ Beni Beğenenler
          </Text>
          <Text style={[styles.filterTabCount, activeTab === 'likers' && styles.filterTabCountActive]}>
            {likedMe.length}
          </Text>
        </TouchableOpacity>
      </View>

      {currentUsers.length > 0 ? (
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
          <View style={styles.userGrid}>
            {currentUsers.map((user, index) => (
              <LikedUserCard
                key={user.id}
                user={user}
                onPress={() => handleUserPress(user, index)}
              />
            ))}
          </View>
          <View style={styles.bottomSpace} />
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {activeTab === 'liked' ? '💝' : '❤️'}
          </Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'liked' 
              ? 'Henüz Kimseyi Beğenmediniz' 
              : 'Henüz Kimse Sizi Beğenmedi'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'liked' 
              ? 'Match ekranından kullanıcıları sağa kaydırarak beğenin'
              : 'Profil bilgilerinizi tamamlayın ve filmlerinizi paylaşın'}
          </Text>
        </View>
      )}

      {selectedUser && (
        <SwipeableLikeCard
          user={selectedUser}
          visible={showSwipeModal}
          onClose={() => {
            setShowSwipeModal(false);
            setSelectedUser(null);
          }}
          onLike={handleSwipeLike}
          onPass={handleSwipePass}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: '#E50914',
  },
  filterTabText: {
    color: '#8C8C8C',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabCount: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterTabCountActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  userCard: {
    width: CARD_WIDTH,
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoContainer: {
    position: 'relative',
  },
  userPhoto: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
    backgroundColor: '#0A0A0A',
  },
  noPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  userInfo: {
    padding: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userAge: {
    color: '#8C8C8C',
    fontSize: 12,
    marginBottom: 4,
  },
  userBio: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 16,
  },
  bottomSpace: {
    height: 20,
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
  },
  // Swipeable Card Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  swipeCardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeCard: {
    width: width * 0.9,
    height: height * 0.75,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  likeIndicatorModal: {
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
  likeTextModal: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  nopeIndicatorModal: {
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
  nopeTextModal: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  swipePhotoSection: {
    height: '65%',
    position: 'relative',
  },
  swipePhoto: {
    width: '100%',
    height: '100%',
  },
  swipeNoPhoto: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  swipeNoPhotoIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeNoPhotoText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
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
  swipeInfoSection: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  swipeBasicInfo: {
    alignItems: 'center',
  },
  swipeName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  swipeUsername: {
    color: '#E50914',
    fontSize: 16,
    marginBottom: 12,
  },
  swipeBio: {
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  swipeInstructions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingVertical: 20,
  },
  instructionItem: {
    alignItems: 'center',
  },
  instructionIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  instructionText: {
    color: '#8C8C8C',
    fontSize: 14,
    fontWeight: '600',
  },
});
