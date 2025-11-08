import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  setDoc,
  Timestamp,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { FirebaseService } from './FirebaseService';
import { logger } from '../utils/Logger';

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  username: string;
  firstName: string;
  lastName?: string; // Opsiyonel
  profilePhotos: string[];
  selectedMovies: any[];
  letterboxdLink?: string;
  
  // Additional detailed information
  registrationStep: number;
  registrationCompleted: boolean;
  preferences: {
    favoriteGenres: string[];
    favoriteYears: string[];
    movieTypePreference: 'movie' | 'tv' | 'both';
  };
  profile: {
    bio?: string;
    location?: string;
    birthDate?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    interests: string[];
  };
  settings: {
    notifications: boolean;
    publicProfile: boolean;
    showEmail: boolean;
    language: string;
    theme: 'light' | 'dark' | 'auto';
  };
  statistics: {
    moviesWatched: number;
    moviesRated: number;
    averageRating: number;
    favoriteActors: string[];
    favoriteDirectors: string[];
  };
  social: {
    followers: number;
    following: number;
    isVerified: boolean;
    likedUsers?: string[]; // Beğenilen kullanıcılar
    likedByUsers?: string[]; // Seni beğenen kullanıcılar
    matches?: string[]; // Eşleşen kullanıcılar
    swipedUsers?: string[]; // Görülen kullanıcılar
    socialLinks: {
      instagram?: string;
      twitter?: string;
      facebook?: string;
      youtube?: string;
      linkedin?: string;
      letterboxd?: string;
    };
  };
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  pushToken?: string;
}

export class FirestoreService {
  private static instance: FirestoreService;
  private usersCollection = 'users';
  private firebaseService: FirebaseService;
  private isInitialized = false;
  private db: any;

  private constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      await this.firebaseService.initialize();
      this.db = this.firebaseService.getFirestore();
      this.isInitialized = true;
      logger.info('FirestoreService initialized', 'FirestoreService');
    } catch (error) {
      logger.error('Failed to initialize FirestoreService', 'FirestoreService', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private getDb() {
    const db = this.firebaseService.getFirestore();
    if (!db) {
      console.error('Firestore database is not initialized');
    }
    return db;
  }

  public getDatabase() {
    return this.getDb();
  }

  /**
   * E-posta adresinin benzersiz olup olmadığını kontrol eder
   */
  async isEmailUnique(email: string): Promise<boolean> {
    try {
      // Email undefined veya boş ise benzersiz kabul et
      if (!email || typeof email !== 'string' || email.trim() === '') {
        console.warn('Email is undefined or empty, assuming unique');
        return true;
      }

      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        console.warn('Firestore not initialized, assuming email is unique');
        return true; // Assume unique if Firestore is not available
      }

      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.empty;
    } catch (error: any) {
      console.warn('E-posta benzersizlik kontrolü hatası:', error.message);
      
      // If it's a permission error, assume the email is unique to allow registration
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        return true;
      }
      
      // For other errors, also assume unique to not block registration
      return true;
    }
  }

  /**
   * Kullanıcı adının benzersiz olup olmadığını kontrol eder
   */
  async isUsernameUnique(username: string): Promise<boolean> {
    try {
      // Username undefined veya boş ise benzersiz kabul et
      if (!username || typeof username !== 'string' || username.trim() === '') {
        console.warn('Username is undefined or empty, assuming unique');
        return true;
      }

      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        console.warn('Firestore not initialized, assuming username is unique');
        return true; // Assume unique if Firestore is not available
      }

      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.empty;
    } catch (error: any) {
      console.warn('Kullanıcı adı benzersizlik kontrolü hatası:', error.message);
      
      // If it's a permission error, assume the username is unique to allow registration
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        return true;
      }
      
      // For other errors, also assume unique to not block registration
      return true;
    }
  }

  /**
   * Kullanıcı profilini oluşturur
   */
  async createUserProfile(userId: string, userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        console.error('FirestoreService: Firestore not initialized');
        throw new Error('Firestore bağlantısı kurulamadı');
      }

      // E-posta benzersizlik kontrolü (graceful handling)
      try {
        if (userData.email && userData.email.trim() !== '') {
          const isEmailUnique = await this.isEmailUnique(userData.email);
          if (!isEmailUnique) {
            throw new Error('Bu e-posta adresi zaten kullanılıyor');
          }
        } else {
        }
      } catch (error: any) {
        if (error.message?.includes('zaten kullanılıyor')) {
          throw error; // Re-throw duplicate email error
        }
        console.warn('Email uniqueness check failed, proceeding with registration');
      }

      // Kullanıcı adı benzersizlik kontrolü (graceful handling)
      try {
        if (userData.username && userData.username.trim() !== '') {
          const isUsernameUnique = await this.isUsernameUnique(userData.username);
          if (!isUsernameUnique) {
            throw new Error('Bu kullanıcı adı zaten kullanılıyor');
          }
        } else {
        }
      } catch (error: any) {
        if (error.message?.includes('zaten kullanılıyor')) {
          throw error; // Re-throw duplicate username error
        }
        console.warn('Username uniqueness check failed, proceeding with registration');
      }

      const now = Timestamp.now();
      
      // Deep clean undefined values from userData
      const deepCleanUndefined = (obj: any): any => {
        if (obj === null) return null;
        if (obj === undefined) return undefined;
        if (typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
          return obj
            .filter(item => item !== undefined && item !== null)
            .map(item => deepCleanUndefined(item));
        }
        
        const cleaned: any = {};
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              const cleanedValue = deepCleanUndefined(value);
              if (cleanedValue !== undefined && cleanedValue !== null) {
                // For objects, check if it has any keys
                if (!Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0) {
                  // Skip empty objects
                  return;
                }
                cleaned[key] = cleanedValue;
              }
            } else {
              cleaned[key] = value;
            }
          }
        });
        return cleaned;
      };

      const cleanUserData = deepCleanUndefined(userData);

      const userProfile: Omit<UserProfile, 'id'> = {
        // Default values first
        registrationStep: 4,
        registrationCompleted: true,
        preferences: {
          favoriteGenres: [],
          favoriteYears: [],
          movieTypePreference: 'both'
        },
        profile: {
          bio: '',
          location: '',
          birthDate: '',
          gender: 'prefer_not_to_say',
          interests: []
        },
        settings: {
          notifications: true,
          publicProfile: true,
          showEmail: false,
          language: 'tr',
          theme: 'dark'
        },
        statistics: {
          moviesWatched: 0,
          moviesRated: 0,
          averageRating: 0,
          favoriteActors: [],
          favoriteDirectors: []
        },
        social: {
          followers: 0,
          following: 0,
          isVerified: false,
          likedUsers: [],
          likedByUsers: [],
          matches: [],
          socialLinks: userData.social?.socialLinks || {}
        },
        createdAt: now,
        updatedAt: now,
        // Override with actual user data
        ...cleanUserData
      };

      // Debug: Log the final user profile data
      
      // Kullanıcı profilini oluştur
      
      // Final deep clean to ensure no undefined values
      const finalCleanedProfile = deepCleanUndefined(userProfile);
      
      const docRef = await setDoc(doc(db, this.usersCollection, userId), finalCleanedProfile);
      
      // Username is already stored in the users collection, no need for separate collection

      return userId;
    } catch (error) {
      console.error('FirestoreService: Kullanıcı profili oluşturma hatası:', error);
      console.error('FirestoreService: Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Kullanıcı profilini günceller
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Kullanıcı profili bulunamadı');
      }

      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Kullanıcı profili güncelleme hatası:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı profilini getirir
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as UserProfile;
    } catch (error) {
      console.error('Kullanıcı profili getirme hatası:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı profilini siler
   */
  async deleteUserProfile(uid: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await deleteDoc(docRef);
      }

      // Username is stored in users collection, no need to delete from separate collection
    } catch (error) {
      console.error('Kullanıcı profili silme hatası:', error);
      throw error;
    }
  }

  /**
   * Kullanıcı document'ini siler (alias for deleteUserProfile)
   */
  async deleteUserDocument(userId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      await deleteDoc(doc(db, this.usersCollection, userId));
      logger.info(`User document deleted: ${userId}`, 'FirestoreService');
    } catch (error) {
      console.error('Error deleting user document:', error);
      throw error;
    }
  }

  // Film eşleştirme fonksiyonları
  async getCurrentlyWatchingMovies(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.currentlyWatchingMovies || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting currently watching movies:', error);
      return [];
    }
  }

  async getCurrentWatchingMovie(userId: string): Promise<any | null> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentlyWatching = userData.currentlyWatchingMovies || [];
        return currentlyWatching.length > 0 ? currentlyWatching[0] : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting current watching movie:', error);
      return null;
    }
  }

  async addCurrentlyWatchingMovie(userId: string, movie: any): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentlyWatching = userData.currentlyWatchingMovies || [];
        
        // Aynı filmi tekrar eklememek için kontrol et
        const existingIndex = currentlyWatching.findIndex((m: any) => m.id === movie.id);
        if (existingIndex === -1) {
          currentlyWatching.push({
            ...movie,
            addedAt: Timestamp.now(),
            progress: 0
          });
          
          await updateDoc(userRef, {
            currentlyWatchingMovies: currentlyWatching
          });
        }
      }
    } catch (error) {
      console.error('Error adding currently watching movie:', error);
      throw error;
    }
  }

  async markMovieAsWatched(userId: string, movie: any): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentlyWatching = userData.currentlyWatchingMovies || [];
        const watchedMovies = userData.watchedMovies || [];
        
        // Şu anda izlenenlerden kaldır
        const filteredCurrentlyWatching = currentlyWatching.filter((m: any) => m.id !== movie.id);
        
        // İzlenmişler listesine ekle
        watchedMovies.push({
          ...movie,
          watchedAt: Timestamp.now(),
          progress: 100
        });
        
        await updateDoc(userRef, {
          currentlyWatchingMovies: filteredCurrentlyWatching,
          watchedMovies: watchedMovies
        });
      }
    } catch (error) {
      console.error('Error marking movie as watched:', error);
      throw error;
    }
  }

  async getRecommendedMovies(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const preferences = userData.preferences || {};
        const favoriteGenres = preferences.favoriteGenres || [];
        
        // Burada TMDB API'den öneriler çekilebilir
        // Şimdilik boş döndürüyoruz
        return [];
      }
      return [];
    } catch (error) {
      console.error('Error getting recommended movies:', error);
      return [];
    }
  }

  async getRecommendedProfiles(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const watchedMovies = userData.watchedMovies || [];
        const favoriteGenres = userData.preferences?.favoriteGenres || [];
        
        // Benzer film zevklerine sahip kullanıcıları bul
        const usersQuery = query(collection(db, this.usersCollection));
        const querySnapshot = await getDocs(usersQuery);
        const profiles: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const otherUserData = doc.data();
          if (doc.id !== userId) { // Kendi profilini hariç tut
            const otherWatchedMovies = otherUserData.watchedMovies || [];
            const otherFavoriteGenres = otherUserData.preferences?.favoriteGenres || [];
            
            // Ortak filmleri hesapla
            const commonMovies = watchedMovies.filter((movie: any) =>
              otherWatchedMovies.some((otherMovie: any) => otherMovie.id === movie.id)
            );
            
            // Ortak türleri hesapla
            const commonGenres = favoriteGenres.filter((genre: string) =>
              otherFavoriteGenres.includes(genre)
            );
            
            // En az 1 ortak film veya tür varsa öner
            if (commonMovies.length > 0 || commonGenres.length > 0) {
              profiles.push({
                id: doc.id,
                ...otherUserData,
                commonMovies: commonMovies.length,
                commonGenres: commonGenres.length,
                previouslyWatched: otherWatchedMovies.slice(0, 3) // İlk 3 filmi göster
              });
            }
          }
        });
        
        // Ortak film sayısına göre sırala
        return profiles.sort((a, b) => b.commonMovies - a.commonMovies);
      }
      return [];
    } catch (error) {
      console.error('Error getting recommended profiles:', error);
      return [];
    }
  }

  async getLikedByUsers(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      
      // Bu kullanıcıyı beğenenleri bul
      const likesQuery = query(
        collection(db, 'likes'),
        where('likedUserId', '==', userId)
      );
      
      const querySnapshot = await getDocs(likesQuery);
      const likedByUsers: any[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const likeData = docSnapshot.data();
        const userDoc = await getDoc(doc(db, 'users', likeData.likedByUserId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          likedByUsers.push({
            id: userDoc.id,
            ...userData,
            likedAt: likeData.createdAt?.toDate?.() || new Date()
          });
        }
      }
      
      return likedByUsers;
    } catch (error) {
      console.error('Error getting liked by users:', error);
      return [];
    }
  }

  async getLikedUsers(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      
      // Bu kullanıcının beğendiklerini bul
      const likesQuery = query(
        collection(db, 'likes'),
        where('likedByUserId', '==', userId)
      );
      
      const querySnapshot = await getDocs(likesQuery);
      const likedUsers: any[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const likeData = docSnapshot.data();
        const userDoc = await getDoc(doc(db, 'users', likeData.likedUserId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          likedUsers.push({
            id: userDoc.id,
            ...userData,
            likedAt: likeData.createdAt?.toDate?.() || new Date()
          });
        }
      }
      
      return likedUsers;
    } catch (error) {
      console.error('Error getting liked users:', error);
      return [];
    }
  }

  // Kullanıcının favori filmlerini ve dizilerini getir
  async getUserFavorites(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.favoriteMovies || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user favorites:', error);
      return [];
    }
  }

  // Kullanıcının izlediği filmleri ve dizileri getir
  async getUserWatchedContent(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.watchedMovies || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user watched content:', error);
      return [];
    }
  }

  // Kullanıcının izleme listesindeki içerikleri getir
  async getUserWatchlist(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.watchlist || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user watchlist:', error);
      return [];
    }
  }

  // ===== PROFESSIONAL USER DATA MANAGEMENT =====
  
  // Kullanıcı lookup index oluştur (userId -> username mapping)
  async createUserLookupIndex(): Promise<Map<string, string>> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      
      const usersSnapshot = await getDocs(collection(db, this.usersCollection));
      const lookupIndex = new Map<string, string>();
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile;
        const userId = doc.id;
        const username = userData.username || `user_${userId.substring(0, 8)}`;
        
        // Map userId to username
        lookupIndex.set(userId, username);
        
        // Also map uid to username if different
        if (userData.uid && userData.uid !== userId) {
          lookupIndex.set(userData.uid, username);
        }
      });
      
      return lookupIndex;
    } catch (error) {
      console.error('Error creating user lookup index:', error);
      return new Map();
    }
  }
  
  // Kullanıcıyı username ile bul
  async getUserByUsername(username: string): Promise<UserProfile | null> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      
      const usersQuery = query(
        collection(db, this.usersCollection),
        where('username', '==', username)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data() as UserProfile;
        return {
          ...userData,
          id: usersSnapshot.docs[0].id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }
  
  // Kullanıcıyı uid ile bul
  async getUserByUid(uid: string): Promise<UserProfile | null> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      
      const usersQuery = query(
        collection(db, this.usersCollection),
        where('uid', '==', uid)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data() as UserProfile;
        return {
          ...userData,
          id: usersSnapshot.docs[0].id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by uid:', error);
      return null;
    }
  }
  
  // Kullanıcı dökümanını getir
  async getUserDocument(userId: string): Promise<any> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      
      // First, try to get user by userId (document ID)
      let userDoc = await getDoc(doc(db, this.usersCollection, userId));
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      
      // If not found by userId, try to find by username
      // This handles cases where userId might be a username
      const usersQuery = query(
        collection(db, this.usersCollection),
        where('username', '==', userId)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      if (!usersSnapshot.empty) {
        const userData = usersSnapshot.docs[0].data();
        return {
          ...userData,
          id: usersSnapshot.docs[0].id
        };
      }
      
      // If still not found, try to find by uid field
      const uidQuery = query(
        collection(db, this.usersCollection),
        where('uid', '==', userId)
      );
      const uidSnapshot = await getDocs(uidQuery);
      
      if (!uidSnapshot.empty) {
        const userData = uidSnapshot.docs[0].data();
        return {
          ...userData,
          id: uidSnapshot.docs[0].id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user document:', error);
      return null;
    }
  }

  // Kullanıcı dökümanını güncelle
  async updateUserDocument(userId: string, updateData: any): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating user document:', error);
      throw error;
    }
  }

  // Kullanıcının tüm film verilerini getir (favoriler, izlenenler, izleme listesi)
  async getUserMovieData(userId: string): Promise<{
    favorites: any[];
    watchedContent: any[];
    watchlist: any[];
    currentlyWatching: any[];
  }> {
    try {
      const userDoc = await this.getUserDocument(userId);
      if (!userDoc) {
        return {
          favorites: [],
          watchedContent: [],
          watchlist: [],
          currentlyWatching: []
        };
      }

      return {
        favorites: userDoc.favorites || [],
        watchedContent: userDoc.watchedContent || [],
        watchlist: userDoc.watchlist || [],
        currentlyWatching: userDoc.currentlyWatching || []
      };
    } catch (error) {
      console.error('Error getting user movie data:', error);
      return {
        favorites: [],
        watchedContent: [],
        watchlist: [],
        currentlyWatching: []
      };
    }
  }

  public async addMatch(userId: string, matchData: any): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }
      
      await addDoc(collection(db, 'matches'), {
        ...matchData,
        userId
      });
    } catch (error) {
      console.error('Error adding match:', error);
      throw error;
    }
  }

  public async getUserMatches(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }
      
      const matchesSnapshot = await getDocs(
        query(collection(db, 'matches'), where('userId', '==', userId))
      );
      
      const matches: any[] = [];
      matchesSnapshot.forEach((doc) => {
        matches.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return matches;
    } catch (error) {
      console.error('Error getting user matches:', error);
      return [];
    }
  }

  public async getAllUsersOld(): Promise<UserProfile[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }
      
      const usersSnapshot = await getDocs(collection(db, this.usersCollection));
      const users: UserProfile[] = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile;
        
        // Ensure all required fields are present with proper defaults
        const completeUserData: UserProfile = {
          id: doc.id,
          uid: userData.uid || doc.id,
          email: userData.email || '',
          username: userData.username || `user_${doc.id.substring(0, 8)}`,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          profilePhotos: userData.profilePhotos || [],
          selectedMovies: userData.selectedMovies || [],
          letterboxdLink: userData.letterboxdLink || '',
          registrationStep: userData.registrationStep || 0,
          registrationCompleted: userData.registrationCompleted || false,
          preferences: userData.preferences || {
            favoriteGenres: [],
            favoriteYears: [],
            movieTypePreference: 'both'
          },
          profile: userData.profile || {
            bio: '',
            location: '',
            birthDate: '',
            gender: 'prefer_not_to_say',
            interests: []
          },
          settings: userData.settings || {
            notifications: true,
            publicProfile: true,
            showEmail: false,
            language: 'tr',
            theme: 'dark'
          },
          statistics: userData.statistics || {
            moviesWatched: 0,
            moviesRated: 0,
            averageRating: 0,
            favoriteActors: [],
            favoriteDirectors: []
          },
          social: userData.social || {
            followers: 0,
            following: 0,
            isVerified: false,
            socialLinks: {}
          },
          createdAt: userData.createdAt || Timestamp.now(),
          updatedAt: userData.updatedAt || Timestamp.now()
        };
        
        users.push(completeUserData);
      });
      
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // ===== REAL-TIME MATCHING INFRASTRUCTURE =====
  
  // Kullanıcının şu anda izlediği filmleri güncelle
  async updateCurrentlyWatching(userId: string, movieData: any): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      await updateDoc(userRef, {
        currentlyWatching: [movieData],
        lastActivity: Timestamp.now(),
        isOnline: true,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating currently watching:', error);
      throw error;
    }
  }

  // Kullanıcının izleme durumunu güncelle
  async updateWatchingProgress(userId: string, movieId: number, progress: number): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentlyWatching = userData.currentlyWatching || [];
        
        const updatedWatching = currentlyWatching.map((movie: any) => 
          movie.movieId === movieId 
            ? { ...movie, progress, lastUpdated: Timestamp.now() }
            : movie
        );

        await updateDoc(userRef, {
          currentlyWatching: updatedWatching,
          lastActivity: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error updating watching progress:', error);
      throw error;
    }
  }

  // Aynı filmi izleyen aktif kullanıcıları bul
  async getUsersWatchingSameMovie(movieId: number, excludeUserId?: string): Promise<UserProfile[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Şu anda izlenen filmleri kontrol et
      const usersQuery = query(
        collection(db, this.usersCollection),
        where('currentlyWatching', 'array-contains', { movieId })
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const users: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        if (doc.id !== excludeUserId) {
          const userData = doc.data() as UserProfile;
          users.push({
            ...userData,
            id: doc.id
          });
        }
      });
      
      return users;
    } catch (error) {
      console.error('Error getting users watching same movie:', error);
      return [];
    }
  }

  // Aktif kullanıcıları getir (son 5 dakika içinde aktif olanlar)
  async getActiveUsers(excludeUserId?: string): Promise<UserProfile[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
      
      const usersQuery = query(
        collection(db, this.usersCollection),
        where('lastActivity', '>=', fiveMinutesAgo),
        where('isOnline', '==', true)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      const users: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        if (doc.id !== excludeUserId) {
          const userData = doc.data() as UserProfile;
          users.push({
            ...userData,
            id: doc.id
          });
        }
      });
      
      return users;
    } catch (error) {
      console.error('Error getting active users:', error);
      return [];
    }
  }

  // Kullanıcının online durumunu güncelle
  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      await updateDoc(userRef, {
        isOnline,
        lastActivity: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating user online status:', error);
      throw error;
    }
  }

  // Eşleşme kaydet
  async saveMatch(userId: string, matchedUserId: string, matchData: any): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Eşleşme kaydını oluştur
      await addDoc(collection(db, 'matches'), {
        userId,
        matchedUserId,
        ...matchData,
        createdAt: Timestamp.now()
      });

      // Her iki kullanıcının da eşleşme listesini güncelle
      const userRef = doc(db, this.usersCollection, userId);
      const matchedUserRef = doc(db, this.usersCollection, matchedUserId);
      
      const userDoc = await getDoc(userRef);
      const matchedUserDoc = await getDoc(matchedUserRef);
      
      if (userDoc.exists() && matchedUserDoc.exists()) {
        const userData = userDoc.data();
        const matchedUserData = matchedUserDoc.data();
        
        const userMatches = userData.social?.matches || [];
        const matchedUserMatches = matchedUserData.social?.matches || [];
        
        if (!userMatches.includes(matchedUserId)) {
          userMatches.push(matchedUserId);
        }
        
        if (!matchedUserMatches.includes(userId)) {
          matchedUserMatches.push(userId);
        }
        
        await updateDoc(userRef, {
          'social.matches': userMatches,
          updatedAt: Timestamp.now()
        });
        
        await updateDoc(matchedUserRef, {
          'social.matches': matchedUserMatches,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error saving match:', error);
      throw error;
    }
  }

  public async addToLikedList(userId: string, likedUserId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);

      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;

        // Add to my likedUsers
        const likedUsers = userData.social?.likedUsers || [];
        if (!likedUsers.includes(likedUserId)) {
          likedUsers.push(likedUserId);
          await updateDoc(userRef, { 'social.likedUsers': likedUsers });
        }
      }
    } catch (error) {
      console.error('Error adding to liked list:', error);
      throw error;
    }
  }

  public async addToSwipedList(userId: string, swipedUserId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        const swipedUsers = userData.social?.swipedUsers || [];

        if (!swipedUsers.includes(swipedUserId)) {
          swipedUsers.push(swipedUserId);
          await updateDoc(userRef, { 'social.swipedUsers': swipedUsers });
        }
      }
    } catch (error) {
      console.error('Error adding to swiped list:', error);
      throw error;
    }
  }

  public async getUsersWhoLiked(userId: string): Promise<UserProfile[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const q = query(collection(db, this.usersCollection), where('social.likedUsers', 'array-contains', userId));
      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      return users;
    } catch (error) {
      console.error('Error getting users who liked:', error);
      throw error;
    }
  }

  // ===== GERÇEK ZAMANLI İZLEME SERVİSLERİ =====

  /**
   * Update last message for a match
   */
  public async updateLastMessage(senderId: string, receiverId: string, lastMessage: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const now = Timestamp.now();
      const senderRef = doc(db, this.usersCollection, senderId);
      const receiverRef = doc(db, this.usersCollection, receiverId);

      const senderDoc = await getDoc(senderRef);
      const receiverDoc = await getDoc(receiverRef);

      if (senderDoc.exists() && receiverDoc.exists()) {
        const senderData = senderDoc.data();
        const receiverData = receiverDoc.data();

        const updateMatch = (matches: any[], targetId: string) => {
          if (!Array.isArray(matches)) return [];
          return matches.map((match: any) => {
            if (match.matchedUserId === targetId) {
              return {
                ...match,
                lastMessage,
                lastMessageAt: now,
              };
            }
            return match;
          });
        };

        if (senderData.social?.matches) {
            const newSenderMatches = updateMatch(senderData.social.matches, receiverId);
            await updateDoc(senderRef, {
              'social.matches': newSenderMatches,
              updatedAt: now,
            });
        }

        if (receiverData.social?.matches) {
            const newReceiverMatches = updateMatch(receiverData.social.matches, senderId);
            await updateDoc(receiverRef, {
              'social.matches': newReceiverMatches,
              updatedAt: now,
            });
        }
      }
    } catch (error) {
      logger.error('Error updating last message', 'FirestoreService', error);
      throw error;
    }
  }

  /**
   * Şu anda izlenen tüm içerikleri getir
   */
  public async getCurrentlyWatchingContent(): Promise<any> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const watchingRef = collection(db, 'currentlyWatching');
      const q = query(watchingRef, orderBy('viewersCount', 'desc'), limit(50));
      return await getDocs(q);
    } catch (error) {
      console.error('Error getting currently watching content:', error);
      throw error;
    }
  }

  /**
   * Şu anda izlenen içerikler için gerçek zamanlı dinleyici
   */
  public onCurrentlyWatchingChange(callback: (snapshot: any) => void): () => void {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const watchingRef = collection(db, 'currentlyWatching');
      const q = query(watchingRef, orderBy('viewersCount', 'desc'), limit(50));
      
      return onSnapshot(q, callback, (error) => {
        console.error('Error in currently watching listener:', error);
      });
    } catch (error) {
      console.error('Error setting up currently watching listener:', error);
      return () => {}; // Boş unsubscribe fonksiyonu
    }
  }

  /**
   * Kullanıcı profilleri için gerçek zamanlı dinleyici
   */
  public onUsersChange(callback: (snapshot: any) => void): () => void {
    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, where('isOnline', '==', true), limit(100));
      
      return onSnapshot(q, callback, (error) => {
        console.error('Error in users listener:', error);
      });
    } catch (error) {
      console.error('Error setting up users listener:', error);
      return () => {}; // Boş unsubscribe fonksiyonu
    }
  }

  /**
   * Tüm kullanıcıları getir
   */
  public async getAllUsers(): Promise<any> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const usersRef = collection(db, this.usersCollection);
      const q = query(usersRef, limit(100));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  /**
   * TMDB içerik arama - Gerçek TMDB API entegrasyonu
   */
  public async searchTMDBContent(query: string, type: 'movies' | 'tv'): Promise<any[]> {
    try {
      const { tmdbService } = await import('./TMDBService');
      
      let results: any[] = [];
      
      if (type === 'movies') {
        const movieResults = await tmdbService.searchMovies(query);
        results = movieResults.results || [];
      } else if (type === 'tv') {
        const tvResults = await tmdbService.searchTVShows(query);
        results = tvResults.results || [];
      }
      
      // Sonuçları normalize et
      return results.map(item => ({
        id: item.id,
        title: item.title || item.name,
        name: item.name,
        poster_path: item.poster_path,
        overview: item.overview || '',
        vote_average: item.vote_average || 0,
        release_date: item.release_date,
        first_air_date: item.first_air_date,
        media_type: type,
        popularity: item.popularity || 0
      }));
    } catch (error) {
      console.error('Error searching TMDB content:', error);
      return [];
    }
  }

  /**
   * Kullanıcıyı izlenen içeriğe ekle
   */
  public async addUserToWatchingContent(movieId: number, userId: string, currentTime: number): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const watchingRef = collection(db, 'currentlyWatching');
      const movieDocRef = doc(watchingRef, movieId.toString());
      const movieDoc = await getDoc(movieDocRef);

      if (movieDoc.exists()) {
        // Mevcut içeriği güncelle
        const data = movieDoc.data();
        const viewers = data.viewers || [];
        
        if (!viewers.includes(userId)) {
          viewers.push(userId);
          
          await updateDoc(movieDocRef, {
            viewers: viewers,
            viewersCount: viewers.length,
            lastUpdated: Timestamp.now()
          });
        }
      } else {
        // Yeni içerik oluştur
        await setDoc(movieDocRef, {
          movieId: movieId,
          viewers: [userId],
          viewersCount: 1,
          currentTime: currentTime,
          startedAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error adding user to watching content:', error);
      throw error;
    }
  }

  /**
   * Kullanıcıyı izlenen içerikten çıkar
   */
  public async removeUserFromWatchingContent(movieId: number, userId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const watchingRef = collection(db, 'currentlyWatching');
      const movieDocRef = doc(watchingRef, movieId.toString());
      const movieDoc = await getDoc(movieDocRef);

      if (movieDoc.exists()) {
        const data = movieDoc.data();
        const viewers = data.viewers || [];
        const updatedViewers = viewers.filter((id: string) => id !== userId);
        
        if (updatedViewers.length === 0) {
          // Hiç izleyici kalmadıysa dokümanı sil
          await deleteDoc(movieDocRef);
        } else {
          // İzleyici listesini güncelle
          await updateDoc(movieDocRef, {
            viewers: updatedViewers,
            viewersCount: updatedViewers.length,
            lastUpdated: Timestamp.now()
          });
        }
      }
    } catch (error) {
      console.error('Error removing user from watching content:', error);
      throw error;
    }
  }

  /**
   * Tüm kullanıcıların currentlyWatching verilerini getir
   */
  public async getAllUsersCurrentlyWatching(): Promise<any[]> {
    try {
      const usersCollection = collection(this.db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      const allUsersWatching = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.currentlyWatching && userData.currentlyWatching.length > 0) {
          allUsersWatching.push({
            userId: userDoc.id,
            currentlyWatching: userData.currentlyWatching
          });
        }
      }
      
      return allUsersWatching;
    } catch (error) {
      console.error('Error getting all users currently watching:', error);
      throw error;
    }
  }
}

// Export the singleton instance
export const firestoreService = FirestoreService.getInstance();
