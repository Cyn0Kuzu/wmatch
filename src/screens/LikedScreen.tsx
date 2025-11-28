import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
} from 'react-native';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { Timestamp } from 'firebase/firestore';
import { MovieDetailModal } from '../components/ui/MovieDetailModal';
import { Icon, Icons } from '../components/ui/IconComponent';
import { EnhancedMatchCard } from './MatchScreen';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

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

// Liked Screen Modal Wrapper - Uses EnhancedMatchCard from MatchScreen
const LikedCardModal: React.FC<{
  user: any;
  visible: boolean;
  activeTab: 'liked' | 'likers';
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
}> = ({ user, visible, activeTab: screenTab, onClose, onLike, onPass }) => {
  if (!user) return null;

  const allowSwipeRight = screenTab === 'likers';
  const swipeLeftText = screenTab === 'liked' ? 'GERİ AL' : 'GEÇ';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.swipeCardContainer}>
          <EnhancedMatchCard
            user={user}
            onPass={onPass}
            onLike={onLike}
            currentMovie={null}
            allowSwipeRight={allowSwipeRight}
            swipeLeftText={swipeLeftText}
            fullScreen={true}
          />
        </View>
      </View>
    </Modal>
  );
};

export const LikedScreen: React.FC = () => {
  const { authService, coreService } = useCoreEngine();
  const userDataManager = coreService?.userDataManager;
  const [likedByMe, setLikedByMe] = useState<any[]>([]); // Benim beğendiklerim (henüz match olmamış)
  const [likedMe, setLikedMe] = useState<any[]>([]); // Beni beğenenler (henüz match olmamış)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'liked' | 'likers'>('liked');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showSwipeModal, setShowSwipeModal] = useState(false);
  const [currentLikerIndex, setCurrentLikerIndex] = useState(0);
  const [showMatchEffect, setShowMatchEffect] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);

  useEffect(() => {
    loadLikedUsers();
  }, []);

  // Ekran focus olduğunda verileri yenile
  useFocusEffect(
    useCallback(() => {
      loadLikedUsers();
    }, [])
  );

  const fetchUsersByIds = async (
    userIds: string[], 
    matchedIds: Set<string>, 
    matchMap: Map<string, string | null> = new Map(),
    likedMovieMap: Map<string, string | null> = new Map()
  ) => {
    const usersData = await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const userDoc = await firestoreService.getUserDocument(userId);
          if (!userDoc) return null;

          // Favoriler ve izlenenleri yükle
          let favorites: any[] = [];
          let watchedContent: any[] = [];
          
          if (userDataManager) {
            try {
              favorites = await userDataManager.getUserFavorites(userId) || [];
              watchedContent = await userDataManager.getUserWatchedContent(userId) || [];
            } catch (error) {
              console.error(`Error loading user data for ${userId}:`, error);
            }
          }

          // Match bilgisini al (eğer match olmuşsa)
          const matchedMovie = matchMap.get(userId) || null;
          // Beğenme bilgisini al (hangi film/dizi üzerinden beğenildi)
          const likedMovie = likedMovieMap.get(userId) || null;

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
            favorites: favorites,
            watchedContent: watchedContent,
            isMatched: matchedIds.has(userId),
            matchedMovie: matchedMovie,
            likedMovie: likedMovie, // Hangi film/dizi üzerinden beğenildi
          };
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          return null;
        }
      })
    );

    return usersData.filter(u => u !== null);
  };

  const loadLikedUsers = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get current user's data
      const userDoc = await firestoreService.getUserDocument(user.uid);
      if (!userDoc) {
        setLoading(false);
        return;
      }

      const myLikedUsers = userDoc.social?.likedUsers || [];
      // likedUsers string[] veya {userId, likedMovie}[] olabilir
      const myLikedIds = myLikedUsers.map((item: any) => 
        typeof item === 'string' ? item : item.userId || item
      );
      const likedMovieMap = new Map<string, string | null>();
      myLikedUsers.forEach((item: any) => {
        if (typeof item === 'object' && item.userId) {
          likedMovieMap.set(item.userId, item.likedMovie || null);
        }
      });
      
      const matches = userDoc.social?.matches || [];
      const matchedIds = new Set<string>(matches.map((m: any) => 
        typeof m === 'string' ? m : m.matchedUserId
      ));
      
      // Match bilgilerini map'e çevir (matchedUserId -> matchedMovie)
      const matchMap = new Map<string, string | null>();
      matches.forEach((m: any) => {
        if (typeof m === 'object' && m.matchedUserId) {
          matchMap.set(m.matchedUserId, m.matchedMovie || null);
        }
      });

      // 1. Benim beğendiklerim - SADECE henüz match olmamışlar
      const fetchedLikedByMe = await fetchUsersByIds(myLikedIds, matchedIds, matchMap, likedMovieMap);
      const nonMatchedLikedByMe = fetchedLikedByMe.filter(u => !u.isMatched);
      
      // 2. Beni beğenenler - SADECE henüz match olmamışlar
      const allUsers = await firestoreService.getAllUsers();
      const usersWhoLikedMe = allUsers.filter(u => {
        if (u.id === user.uid || matchedIds.has(u.id)) return false;
        const theirLikedUsers = u.social?.likedUsers || [];
        // Hem string hem obje formatını kontrol et
        return theirLikedUsers.some((item: any) => {
          const userId = typeof item === 'string' ? item : item.userId || item;
          return userId === user.uid;
        });
      });
      
      // Beni beğenenlerin hangi film/dizi üzerinden beğendiğini al
      const likedMeMovieMap = new Map<string, string | null>();
      usersWhoLikedMe.forEach(u => {
        const theirLikedUsers = u.social?.likedUsers || [];
        const likeItem = theirLikedUsers.find((item: any) => {
          const userId = typeof item === 'string' ? item : item.userId || item;
          return userId === user.uid;
        });
        if (likeItem && typeof likeItem === 'object' && likeItem.likedMovie) {
          likedMeMovieMap.set(u.id, likeItem.likedMovie);
        }
      });
      
      const likedMeIds = usersWhoLikedMe.map(u => u.id);
      const fetchedLikedMe = await fetchUsersByIds(likedMeIds, matchedIds, matchMap, likedMeMovieMap);
      
      // 3. MATCH KONTROLÜ: Eğer bir kullanıcı hem beğendiklerim hem de beni beğenenler listesindeyse, bu bir match demektir
      const likedByMeIds = new Set(nonMatchedLikedByMe.map(u => u.id));
      const likedMeIdsSet = new Set(fetchedLikedMe.map(u => u.id));
      
      // Match olan kullanıcıları bul
      const matchedUserIds = new Set<string>();
      nonMatchedLikedByMe.forEach(u => {
        if (likedMeIdsSet.has(u.id)) {
          matchedUserIds.add(u.id);
        }
      });
      
      // Match olan kullanıcıları her iki listeden de çıkar ve match olarak kaydet
      if (matchedUserIds.size > 0) {
        for (const matchedUserId of matchedUserIds) {
          try {
            const matchedUser = nonMatchedLikedByMe.find(u => u.id === matchedUserId) || 
                               fetchedLikedMe.find(u => u.id === matchedUserId);
            
            if (matchedUser) {
              // Match olarak kaydet
              const matchedMovie = likedMovieMap.get(matchedUserId) || likedMeMovieMap.get(matchedUserId) || null;
              await firestoreService.saveMatch(user.uid, matchedUserId, {
                matchedAt: Timestamp.now(),
                matchedMovie: matchedMovie
              });
            }
          } catch (error) {
            console.error(`Error saving match for user ${matchedUserId}:`, error);
          }
        }
        
        // Match olan kullanıcıları listeden çıkar
        const filteredLikedByMe = nonMatchedLikedByMe.filter(u => !matchedUserIds.has(u.id));
        const filteredLikedMe = fetchedLikedMe.filter(u => !matchedUserIds.has(u.id));
        
        setLikedByMe(filteredLikedByMe);
        setLikedMe(filteredLikedMe);
      } else {
        // Match yoksa normal şekilde ayarla
        setLikedByMe(nonMatchedLikedByMe);
        setLikedMe(fetchedLikedMe);
      }

    } catch (error) {
      console.error('Error loading liked users:', error);
      Alert.alert('Hata', 'Beğeniler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLikedUsers();
    setRefreshing(false);
  }, []);

  const handleUserPress = async (user: any, index?: number) => {
    // Her iki durumda da detaylı profil modal'ı aç
    setSelectedUser(user);
    setCurrentLikerIndex(index || 0);
    setShowSwipeModal(true);
  };

  const handleSwipeLike = async () => {
    if (!selectedUser) return;

    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return;
      
      // Şu anda izlenen film/dizi bilgisini al
      let currentMovieTitle: string | null = null;
      if (userDataManager) {
        try {
          const currentlyWatching = await userDataManager.getCurrentlyWatching(currentUser.uid);
          if (currentlyWatching && currentlyWatching.length > 0) {
            const movie = currentlyWatching[0];
            currentMovieTitle = movie.title || movie.name || movie.movieTitle || null;
          }
        } catch (error) {
          console.error('Error getting current movie:', error);
        }
      }
      
      // Like ekle (film/dizi bilgisi ile)
      await firestoreService.addToLikedList(currentUser.uid, selectedUser.id, currentMovieTitle);
      
      // Karşılıklı beğeni kontrolü
      const selectedUserDoc = await firestoreService.getUserDocument(selectedUser.id);
      const theirLikedUsers = selectedUserDoc?.social?.likedUsers || [];
      // Hem string hem obje formatını kontrol et
      const theyLikedMe = theirLikedUsers.some((item: any) => {
        const userId = typeof item === 'string' ? item : item.userId || item;
        return userId === currentUser.uid;
      });
      
      // Eğer karşılıklı beğeni varsa match oluştur
      if (theyLikedMe) {
        await firestoreService.saveMatch(currentUser.uid, selectedUser.id, {
          matchedAt: Timestamp.now(),
          matchedMovie: currentMovieTitle
        });
        
        // Current user'ın fotoğrafını al
        const currentUserDoc = await firestoreService.getUserDocument(currentUser.uid);
        const currentUserPhoto = currentUserDoc?.profilePhotos?.[0] || currentUserDoc?.photoURL || null;
        
        // Match efekti göster
        setMatchedUser({ ...selectedUser, currentUserPhoto });
        setShowMatchEffect(true);
        
        // Modal kapat
        setShowSwipeModal(false);
        setSelectedUser(null);
        
        // 3 saniye sonra match efektini kapat ve listeyi yenile
        setTimeout(async () => {
          setShowMatchEffect(false);
          setMatchedUser(null);
          await loadLikedUsers();
        }, 3000);
      } else {
        // Match yoksa sadece modal kapat ve listeyi yenile
        setShowSwipeModal(false);
        setSelectedUser(null);
        await loadLikedUsers();
      }
    } catch (error) {
      console.error('Error handling swipe like:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    }
  };

  const handleSwipePass = async () => {
    if (!selectedUser) return;

    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) return;

      // Mevcut durumu kontrol et
      const currentUserDoc = await firestoreService.getUserDocument(currentUser.uid);
      const selectedUserDoc = await firestoreService.getUserDocument(selectedUser.id);
      
      const iLikedThem = currentUserDoc?.social?.likedUsers?.includes(selectedUser.id) || false;
      const theyLikedMe = selectedUserDoc?.social?.likedUsers?.includes(currentUser.uid) || false;

      // Eğer ben onu beğendimse, beğeniyi geri al
      if (iLikedThem) {
        await firestoreService.removeFromLikedList(currentUser.uid, selectedUser.id);
      }
      
      // Eğer o beni beğendiyse, onun beğenisini geri al (sadece Beni Beğenenler ekranında)
      if (activeTab === 'likers' && theyLikedMe) {
        await firestoreService.removeFromLikedList(selectedUser.id, currentUser.uid);
      }

      // Modal kapat ve listeyi yenile
      setShowSwipeModal(false);
      setSelectedUser(null);
      await loadLikedUsers();
    } catch (error) {
      console.error('Error handling swipe pass:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    }
  };

  const renderUserCard = (user: any, index: number) => {
    const photoUrl = user.profilePhotos && user.profilePhotos.length > 0 
      ? user.profilePhotos[0] 
      : user.photoURL || 'https://via.placeholder.com/150/1a1a1a/666?text=No+Photo';

    return (
      <TouchableOpacity
        key={user.id || `user-${index}`}
        style={styles.userCard}
        onPress={() => handleUserPress(user, index)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: photoUrl }}
          style={styles.userCardImage}
          resizeMode="cover"
        />
        <View style={styles.userCardInfo}>
          <Text style={styles.userCardName} numberOfLines={1}>
            {user.firstName || user.username || 'Kullanıcı'}
          </Text>
          {user.username && (
            <Text style={styles.userCardUsername} numberOfLines={1}>
              @{user.username}
            </Text>
          )}
          {(user.matchedMovie || user.likedMovie) && (
            <View style={styles.matchedMovieContainer}>
              <Icon name={Icons.movie} size={12} color="#E50914" />
              <Text style={styles.matchedMovieText} numberOfLines={1}>
                {user.matchedMovie || user.likedMovie}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentList = activeTab === 'liked' ? likedByMe : likedMe;

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'liked' && styles.filterTabActive]}
          onPress={() => setActiveTab('liked')}
        >
          <View style={styles.filterTabContent}>
            <Icon name={Icons.heart} size={20} color={activeTab === 'liked' ? '#E50914' : '#CCCCCC'} />
            <Text style={[styles.filterTabText, activeTab === 'liked' && styles.filterTabTextActive]}>
              Beğendiklerim
            </Text>
            {likedByMe.length > 0 && (
              <View style={styles.filterTabCount}>
                <Text style={[styles.filterTabCountText, activeTab === 'liked' && styles.filterTabCountTextActive]}>
                  {String(likedByMe.length)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeTab === 'likers' && styles.filterTabActive]}
          onPress={() => setActiveTab('likers')}
        >
          <View style={styles.filterTabContent}>
            <Icon name={Icons.heart} size={20} color={activeTab === 'likers' ? '#E50914' : '#CCCCCC'} />
            <Text style={[styles.filterTabText, activeTab === 'likers' && styles.filterTabTextActive]}>
              Beni Beğenenler
            </Text>
            {likedMe.length > 0 && (
              <View style={styles.filterTabCount}>
                <Text style={[styles.filterTabCountText, activeTab === 'likers' && styles.filterTabCountTextActive]}>
                  {String(likedMe.length)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* User Cards Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          currentList.length === 0 && styles.emptyScrollContent
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#E50914']}
            tintColor="#E50914" 
          />
        }
      >
        {currentList.length > 0 ? (
          <View style={styles.cardsGrid}>
            {currentList.map((user, index) => renderUserCard(user, index))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💔</Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'liked' ? 'Henüz kimseyi beğenmediniz' : 'Henüz kimse sizi beğenmedi'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'liked' 
                ? 'Keşfet ekranında insanları beğenerek başlayın' 
                : 'Profilinizi güncelleyerek daha fazla eşleşme şansı yakalayın'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Liked Card Modal - Uses EnhancedMatchCard */}
      {selectedUser && (
        <LikedCardModal
          user={selectedUser}
          visible={showSwipeModal}
          activeTab={activeTab}
          onClose={() => {
            setShowSwipeModal(false);
            setSelectedUser(null);
          }}
          onLike={handleSwipeLike}
          onPass={handleSwipePass}
        />
      )}

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
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  filterTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#E50914',
  },
  filterTabText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterTabCount: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterTabCountText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabCountTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  userCard: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  userCardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.4,
    backgroundColor: '#2A2A2A',
  },
  userCardInfo: {
    padding: 12,
  },
  userCardName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userCardUsername: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  matchedMovieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  matchedMovieText: {
    color: '#E50914',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
  emptySubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  closeButton: {
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
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  swipeCardContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

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
