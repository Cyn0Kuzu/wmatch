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
import { emailService } from './EmailService';

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
        console.log('Permission denied for email check, assuming unique');
        return true;
      }
      
      // For other errors, also assume unique to not block registration
      console.log('Email uniqueness check failed, assuming unique');
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
        console.log('Permission denied for username check, assuming unique');
        return true;
      }
      
      // For other errors, also assume unique to not block registration
      console.log('Username uniqueness check failed, assuming unique');
      return true;
    }
  }

  /**
   * Kullanıcı profilini oluşturur
   */
  async createUserProfile(userId: string, userData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('FirestoreService: Starting user profile creation...');
      console.log('FirestoreService: User data:', {
        email: userData.email,
        username: userData.username,
        profilePhotos: userData.profilePhotos?.length || 0
      });
      
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
          console.log('Email is empty or undefined, skipping uniqueness check');
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
          console.log('Username is empty or undefined, skipping uniqueness check');
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
          socialLinks: userData.social?.socialLinks || {}
        },
        createdAt: now,
        updatedAt: now,
        // Override with actual user data
        ...cleanUserData
      };

      // Debug: Log the final user profile data
      console.log('FirestoreService: Saving user profile:', userProfile);
      console.log('FirestoreService: Profile bio:', userProfile.profile?.bio);
      console.log('FirestoreService: Profile gender:', userProfile.profile?.gender);
      console.log('FirestoreService: Profile interests:', userProfile.profile?.interests);
      console.log('FirestoreService: Profile photos:', userProfile.profilePhotos);
      
      // Kullanıcı profilini oluştur
      console.log('FirestoreService: Creating user profile document...');
      
      // Final deep clean to ensure no undefined values
      const finalCleanedProfile = deepCleanUndefined(userProfile);
      
      const docRef = await setDoc(doc(db, this.usersCollection, userId), finalCleanedProfile);
      console.log('FirestoreService: User profile created with ID:', userId);
      
      // Username is already stored in the users collection, no need for separate collection

      console.log('FirestoreService: User profile creation completed successfully');
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

      // Her iki kullanıcının da eşleşme listesini güncelle (match objesi olarak)
      const userRef = doc(db, this.usersCollection, userId);
      const matchedUserRef = doc(db, this.usersCollection, matchedUserId);
      
      const userDoc = await getDoc(userRef);
      const matchedUserDoc = await getDoc(matchedUserRef);
      
      if (userDoc.exists() && matchedUserDoc.exists()) {
        const userData = userDoc.data();
        const matchedUserData = matchedUserDoc.data();
        
        // Engellenmiş kullanıcılarla match olmamalı
        const userBlockedUsers = userData.blockedUsers || [];
        const matchedUserBlockedUsers = matchedUserData.blockedUsers || [];
        
        // Eğer herhangi bir kullanıcı diğerini engellemişse, match olmamalı
        if (userBlockedUsers.includes(matchedUserId) || matchedUserBlockedUsers.includes(userId)) {
          console.log('Match prevented: One or both users are blocked');
          return; // Match olmamalı, fonksiyondan çık
        }
        
        const userMatches = userData.social?.matches || [];
        const matchedUserMatches = matchedUserData.social?.matches || [];
        
        // Match objesi oluştur
        const matchObj = {
          matchedUserId: matchedUserId,
          matchedAt: matchData.matchedAt || Timestamp.now(),
          matchedMovie: matchData.matchedMovie || null
        };
        
        const reverseMatchObj = {
          matchedUserId: userId,
          matchedAt: matchData.matchedAt || Timestamp.now(),
          matchedMovie: matchData.matchedMovie || null
        };
        
        // Eğer zaten match yoksa ekle
        const existingMatchIndex = userMatches.findIndex((m: any) => 
          (typeof m === 'string' ? m === matchedUserId : m.matchedUserId === matchedUserId)
        );
        if (existingMatchIndex === -1) {
          userMatches.push(matchObj);
        } else {
          userMatches[existingMatchIndex] = matchObj;
        }
        
        const existingMatchedMatchIndex = matchedUserMatches.findIndex((m: any) => 
          (typeof m === 'string' ? m === userId : m.matchedUserId === userId)
        );
        if (existingMatchedMatchIndex === -1) {
          matchedUserMatches.push(reverseMatchObj);
        } else {
          matchedUserMatches[existingMatchedMatchIndex] = reverseMatchObj;
        }
        
        // Match olduğunda, eğer kullanıcı unmatchedUsers veya blockedUsers listesindeyse kaldır
        const userUnmatched = (userData.unmatchedUsers || []).filter((id: string) => id !== matchedUserId);
        const userBlocked = (userData.blockedUsers || []).filter((id: string) => id !== matchedUserId);
        
        const matchedUserUnmatched = (matchedUserData.unmatchedUsers || []).filter((id: string) => id !== userId);
        const matchedUserBlocked = (matchedUserData.blockedUsers || []).filter((id: string) => id !== userId);
        
        await updateDoc(userRef, {
          'social.matches': userMatches,
          unmatchedUsers: userUnmatched,
          blockedUsers: userBlocked,
          updatedAt: Timestamp.now()
        });
        
        await updateDoc(matchedUserRef, {
          'social.matches': matchedUserMatches,
          unmatchedUsers: matchedUserUnmatched,
          blockedUsers: matchedUserBlocked,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error saving match:', error);
      throw error;
    }
  }

  public async addToLikedList(userId: string, likedUserId: string, likedMovie?: string | null): Promise<void> {
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
        const likedUsers = userData.social?.likedUsers || [];
        
        // Mevcut formatı kontrol et (string[] veya object[])
        const isStringArray = likedUsers.length > 0 && typeof likedUsers[0] === 'string';
        const existingLike = likedUsers.find((item: any) => {
          if (isStringArray) {
            return item === likedUserId;
          } else {
            return item.userId === likedUserId || item === likedUserId;
          }
        });
        
        if (!existingLike) {
          // Yeni beğeni ekle
          if (likedMovie) {
            // Obje formatında ekle
            likedUsers.push({ userId: likedUserId, likedMovie: likedMovie });
          } else {
            // Geriye uyumluluk için string olarak ekle
            likedUsers.push(likedUserId);
          }
          
          await updateDoc(userRef, {
            'social.likedUsers': likedUsers,
            updatedAt: Timestamp.now()
          });
        } else if (!isStringArray && existingLike.userId === likedUserId && likedMovie) {
          // Mevcut beğeniyi güncelle (film/dizi bilgisi ekle)
          const index = likedUsers.findIndex((item: any) => item.userId === likedUserId);
          if (index !== -1) {
            likedUsers[index] = { userId: likedUserId, likedMovie: likedMovie };
            await updateDoc(userRef, {
              'social.likedUsers': likedUsers,
              updatedAt: Timestamp.now()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error adding to liked list:', error);
      throw error;
    }
  }

  public async removeFromLikedList(userId: string, likedUserId: string): Promise<void> {
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
        const likedUsers = userData.social?.likedUsers || [];
        
        // Mevcut formatı kontrol et (string[] veya object[])
        const isStringArray = likedUsers.length > 0 && typeof likedUsers[0] === 'string';
        
        let updatedLikedUsers: any[];
        if (isStringArray) {
          // String array formatı
          updatedLikedUsers = likedUsers.filter((id: string) => id !== likedUserId);
        } else {
          // Object array formatı {userId, likedMovie}
          updatedLikedUsers = likedUsers.filter((item: any) => {
            const id = typeof item === 'string' ? item : (item.userId || item);
            return id !== likedUserId;
          });
        }
        
        await updateDoc(userRef, {
          'social.likedUsers': updatedLikedUsers,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error removing from liked list:', error);
      throw error;
    }
  }

  // ===== GERÇEK ZAMANLI İZLEME SERVİSLERİ =====

  // ===== MESAJLAŞMA SERVİSLERİ =====

  /**
   * Chat ID oluştur (iki kullanıcı ID'sini sıralayarak)
   */
  public getChatId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Mesaj gönder
   */
  public async sendMessage(senderId: string, receiverId: string, text: string): Promise<string> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const chatId = this.getChatId(senderId, receiverId);
      const messagesRef = collection(db, 'chats', chatId, 'messages');

      const messageData = {
        text: text.trim(),
        senderId,
        receiverId,
        timestamp: Timestamp.now(),
        read: false,
        readAt: null,
        delivered: false,
        deliveredAt: null,
      };

      const docRef = await addDoc(messagesRef, messageData);

      // Mark message as delivered after a short delay (simulating network delivery)
      setTimeout(async () => {
        try {
          await this.markMessageAsDelivered(docRef.id, chatId);
        } catch (error) {
          console.error('Error marking message as delivered:', error);
        }
      }, 500);

      // Chat metadata güncelle
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        await updateDoc(chatRef, {
          lastMessage: text.trim(),
          lastMessageAt: Timestamp.now(),
          lastMessageSenderId: senderId,
          updatedAt: Timestamp.now(),
        });
      } else {
        await setDoc(chatRef, {
          participants: [senderId, receiverId],
          lastMessage: text.trim(),
          lastMessageAt: Timestamp.now(),
          lastMessageSenderId: senderId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      // Unread count güncelle
      const unreadRef = doc(db, 'chats', chatId, 'unread', receiverId);
      const unreadDoc = await getDoc(unreadRef);
      const currentCount = unreadDoc.exists() ? (unreadDoc.data().count || 0) : 0;
      await setDoc(unreadRef, {
        count: currentCount + 1,
        updatedAt: Timestamp.now(),
      }, { merge: true });

      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Mesajları getir
   */
  public async getMessages(userId1: string, userId2: string, limitCount: number = 50): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const chatId = this.getChatId(userId1, userId2);
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Mark as delivered if message is older than 1 second (simulating delivery)
          delivered: data.delivered || (Date.now() - (data.timestamp?.toMillis?.() || Date.now()) > 1000),
        };
      });

      return messages.reverse(); // Eski mesajlar önce
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Real-time mesaj dinleme
   */
  public listenToMessages(
    userId1: string,
    userId2: string,
    callback: (messages: any[]) => void
  ): () => void {
    try {
      const db = this.getDb();
      if (!db) {
        console.error('Firestore database is not initialized');
        return () => {};
      }

      const chatId = this.getChatId(userId1, userId2);
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Mark as delivered if message is older than 1 second
            delivered: data.delivered || (Date.now() - (data.timestamp?.toMillis?.() || Date.now()) > 1000),
          };
        });
        callback(messages.reverse());
      }, (error) => {
        console.error('Error listening to messages:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up message listener:', error);
      return () => {};
    }
  }

  /**
   * Mesajları okundu olarak işaretle
   */
  public async markMessagesAsRead(userId: string, otherUserId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const chatId = this.getChatId(userId, otherUserId);
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const unreadQuery = query(
        messagesRef,
        where('receiverId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(unreadQuery);
      const batch = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          read: true,
          readAt: Timestamp.now(),
        })
      );

      await Promise.all(batch);

      // Unread count sıfırla
      const unreadRef = doc(db, 'chats', chatId, 'unread', userId);
      await setDoc(unreadRef, {
        count: 0,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Typing durumu ayarla
   */
  public async setTypingStatus(userId: string, otherUserId: string, isTyping: boolean): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const chatId = this.getChatId(userId, otherUserId);
      const typingRef = doc(db, 'chats', chatId, 'typing', userId);
      
      if (isTyping) {
        await setDoc(typingRef, {
          isTyping: true,
          timestamp: Timestamp.now(),
        }, { merge: true });
      } else {
        await deleteDoc(typingRef);
      }
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }

  /**
   * Typing durumunu dinle
   */
  public listenToTypingStatus(
    userId: string,
    otherUserId: string,
    callback: (isTyping: boolean) => void
  ): () => void {
    try {
      const db = this.getDb();
      if (!db) {
        console.error('Firestore database is not initialized');
        return () => {};
      }

      const chatId = this.getChatId(userId, otherUserId);
      const typingRef = doc(db, 'chats', chatId, 'typing', otherUserId);

      const unsubscribe = onSnapshot(typingRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const isTyping = data?.isTyping || false;
          const timestamp = data?.timestamp?.toMillis() || 0;
          const now = Date.now();
          
          // 3 saniye içinde typing varsa göster
          if (isTyping && (now - timestamp) < 3000) {
            callback(true);
          } else {
            callback(false);
          }
        } else {
          callback(false);
        }
      }, (error) => {
        console.error('Error listening to typing status:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up typing listener:', error);
      return () => {};
    }
  }

  /**
   * Chat listesi için match bilgilerini getir (son mesaj, okunmamış sayısı ile)
   */
  public async getChatList(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Kullanıcının match'lerini al
      const userDoc = await this.getUserDocument(userId);
      if (!userDoc || !userDoc.social?.matches) {
        return [];
      }

      // unmatchedUsers ve blockedUsers listesini al (bunları filtrelemek için)
      const unmatchedUsers = userDoc.unmatchedUsers || [];
      const blockedUsers = userDoc.blockedUsers || [];

      const matches = userDoc.social.matches || [];
      const chatList = await Promise.all(
        matches.map(async (match: any) => {
          try {
            const matchedUserId = typeof match === 'string' ? match : match.matchedUserId;
            if (!matchedUserId) return null;

            // Eğer kullanıcı unmatchedUsers veya blockedUsers listesindeyse, chat listesine ekleme
            if (unmatchedUsers.includes(matchedUserId) || blockedUsers.includes(matchedUserId)) {
              return null;
            }

            const chatId = this.getChatId(userId, matchedUserId);
            
            // Chat metadata al
            const chatRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);
            
            // Unread count al
            const unreadRef = doc(db, 'chats', chatId, 'unread', userId);
            const unreadDoc = await getDoc(unreadRef);
            const unreadCount = unreadDoc.exists() ? (unreadDoc.data().count || 0) : 0;

            // Matched user bilgilerini al
            const matchedUser = await this.getUserDocument(matchedUserId);
            if (!matchedUser) return null;

            // Check if other user is typing
            const typingRef = doc(db, 'chats', chatId, 'typing', matchedUserId);
            const typingDoc = await getDoc(typingRef);
            const isTyping = typingDoc.exists() ? (typingDoc.data().isTyping || false) : false;

            // Get chat settings for both users
            const mySettingsRef = doc(db, 'chats', chatId, 'settings', userId);
            const otherSettingsRef = doc(db, 'chats', chatId, 'settings', matchedUserId);
            const mySettingsDoc = await getDoc(mySettingsRef);
            const otherSettingsDoc = await getDoc(otherSettingsRef);
            
            const mySettings = mySettingsDoc.exists() 
              ? mySettingsDoc.data() 
              : {
                  showReadReceipts: true,
                  showOnlineStatus: true,
                  showTypingIndicator: true,
                  notifications: true,
                };
            
            const otherSettings = otherSettingsDoc.exists()
              ? otherSettingsDoc.data()
              : {
                  showReadReceipts: true,
                  showOnlineStatus: true,
                  showTypingIndicator: true,
                  notifications: true,
                };

            return {
              id: matchedUserId,
              userName: matchedUser.firstName || matchedUser.username || 'Kullanıcı',
              userPhoto: matchedUser.profilePhotos?.[0] || matchedUser.photoURL || '',
              matchedAt: typeof match === 'object' ? match.matchedAt : null,
              matchedMovie: typeof match === 'object' ? match.matchedMovie : null,
              lastMessage: chatDoc.exists() ? (chatDoc.data().lastMessage || '') : '',
              lastMessageAt: chatDoc.exists() ? (chatDoc.data().lastMessageAt || null) : (typeof match === 'object' ? match.matchedAt : null),
              isOnline: matchedUser.isOnline || false,
              isTyping,
              unreadCount,
              // Settings for checking visibility
              showOnlineStatus: mySettings.showOnlineStatus && otherSettings.showOnlineStatus,
              showTypingIndicator: mySettings.showTypingIndicator && otherSettings.showTypingIndicator,
              showReadReceipts: mySettings.showReadReceipts && otherSettings.showReadReceipts,
            };
          } catch (error) {
            console.error(`Error fetching chat for match:`, error);
            return null;
          }
        })
      );

      return chatList.filter(chat => chat !== null);
    } catch (error) {
      console.error('Error getting chat list:', error);
      return [];
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

  // ===== ENGELLEME VE EŞLEŞME YÖNETİMİ =====

  /**
   * Kullanıcıyı engelle
   * Karşılıklı engelleme: Her iki kullanıcı da birbirlerini engeller
   */
  public async blockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      const blockedUserRef = doc(db, this.usersCollection, blockedUserId);
      const userDoc = await getDoc(userRef);
      const blockedUserDoc = await getDoc(blockedUserRef);
      
      if (userDoc.exists() && blockedUserDoc.exists()) {
        const userData = userDoc.data();
        const blockedUserData = blockedUserDoc.data();
        
        // Current user blocks the other user
        const userBlockedUsers = userData.blockedUsers || [];
        if (!userBlockedUsers.includes(blockedUserId)) {
          userBlockedUsers.push(blockedUserId);
        }
        
        // Other user also blocks current user (mutual blocking)
        const blockedUserBlockedUsers = blockedUserData.blockedUsers || [];
        if (!blockedUserBlockedUsers.includes(userId)) {
          blockedUserBlockedUsers.push(userId);
        }
        
        // Remove from matches for both users
        const userMatches = (userData.social?.matches || []).filter((m: any) => {
          const id = typeof m === 'string' ? m : m.matchedUserId;
          return id !== blockedUserId;
        });
        
        const blockedUserMatches = (blockedUserData.social?.matches || []).filter((m: any) => {
          const id = typeof m === 'string' ? m : m.matchedUserId;
          return id !== userId;
        });
        
        // Remove from unmatchedUsers list for both users (if exists)
        const userUnmatched = (userData.unmatchedUsers || []).filter((id: string) => id !== blockedUserId);
        const blockedUserUnmatched = (blockedUserData.unmatchedUsers || []).filter((id: string) => id !== userId);
        
        // Update both users
        await updateDoc(userRef, {
          blockedUsers: userBlockedUsers,
          'social.matches': userMatches,
          unmatchedUsers: userUnmatched,
          updatedAt: Timestamp.now()
        });
        
        await updateDoc(blockedUserRef, {
          blockedUsers: blockedUserBlockedUsers,
          'social.matches': blockedUserMatches,
          unmatchedUsers: blockedUserUnmatched,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Kullanıcının engelini kaldır
   * Sadece bir kullanıcı engeli kaldırır - eğer diğer kullanıcı hala engelliyorsa engel durumu kalkmaz
   * Sadece her iki kullanıcı da engeli kaldırdığında engel durumu kalkar
   */
  public async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      const blockedUserRef = doc(db, this.usersCollection, blockedUserId);
      const userDoc = await getDoc(userRef);
      const blockedUserDoc = await getDoc(blockedUserRef);
      
      if (userDoc.exists() && blockedUserDoc.exists()) {
        const userData = userDoc.data();
        const blockedUserData = blockedUserDoc.data();
        
        // Sadece current user'ın engelini kaldır (diğer kullanıcı hala engelliyorsa engel durumu kalkmaz)
        const userBlockedUsers = (userData.blockedUsers || []).filter((id: string) => id !== blockedUserId);
        const blockedUserBlockedUsers = blockedUserData.blockedUsers || []; // Diğer kullanıcının engel listesini değiştirme
        
        // Eğer her iki kullanıcı da engeli kaldırdıysa (yani her iki listede de yoksa)
        // match'i kaldır ve unmatchedUsers listesine ekle
        // userBlockedUsers zaten filtrelenmiş (blockedUserId yok)
        // blockedUserBlockedUsers henüz filtrelenmemiş, bu yüzden userId içerip içermediğini kontrol ediyoruz
        // Eğer blockedUserBlockedUsers userId içermiyorsa, her iki kullanıcı da engeli kaldırmış demektir
        const isFullyUnblocked = !blockedUserBlockedUsers.includes(userId);
        
        if (isFullyUnblocked) {
          // Her iki kullanıcı da engeli kaldırdı - match'i kaldır ve unmatchedUsers listesine ekle
          const userMatches = (userData.social?.matches || []).filter((m: any) => {
            const id = typeof m === 'string' ? m : m.matchedUserId;
            return id !== blockedUserId;
          });
          
          const blockedUserMatches = (blockedUserData.social?.matches || []).filter((m: any) => {
            const id = typeof m === 'string' ? m : m.matchedUserId;
            return id !== userId;
          });
          
          // unmatchedUsers listesine ekle (eğer yoksa)
          const userUnmatched = userData.unmatchedUsers || [];
          if (!userUnmatched.includes(blockedUserId)) {
            userUnmatched.push(blockedUserId);
          }
          
          const blockedUserUnmatched = blockedUserData.unmatchedUsers || [];
          if (!blockedUserUnmatched.includes(userId)) {
            blockedUserUnmatched.push(userId);
          }
          
          // Her iki kullanıcıyı da güncelle
          await updateDoc(userRef, {
            blockedUsers: userBlockedUsers,
            'social.matches': userMatches,
            unmatchedUsers: userUnmatched,
            updatedAt: Timestamp.now()
          });
          
          // Diğer kullanıcının engel listesini de güncelle (eğer varsa)
          const blockedUserBlockedUsersFiltered = blockedUserBlockedUsers.filter((id: string) => id !== userId);
          
          await updateDoc(blockedUserRef, {
            blockedUsers: blockedUserBlockedUsersFiltered,
            'social.matches': blockedUserMatches,
            unmatchedUsers: blockedUserUnmatched,
            updatedAt: Timestamp.now()
          });
        } else {
          // Sadece bir kullanıcı engeli kaldırdı - sadece current user'ı güncelle
          // Diğer kullanıcı hala engelliyorsa, diğer kullanıcının engel listesini değiştirme
          await updateDoc(userRef, {
            blockedUsers: userBlockedUsers,
            updatedAt: Timestamp.now()
          });
        }
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Eşleşmeyi bitir (match'i kaldır)
   */
  public async removeMatch(userId: string, matchedUserId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      const matchedUserRef = doc(db, this.usersCollection, matchedUserId);
      
      const userDoc = await getDoc(userRef);
      const matchedUserDoc = await getDoc(matchedUserRef);
      
      if (userDoc.exists() && matchedUserDoc.exists()) {
        const userData = userDoc.data();
        const matchedUserData = matchedUserDoc.data();
        
        const userMatches = (userData.social?.matches || []).filter((m: any) => {
          const id = typeof m === 'string' ? m : m.matchedUserId;
          return id !== matchedUserId;
        });
        
        const matchedUserMatches = (matchedUserData.social?.matches || []).filter((m: any) => {
          const id = typeof m === 'string' ? m : m.matchedUserId;
          return id !== userId;
        });
        
        // Add to unmatched list
        const userUnmatched = userData.unmatchedUsers || [];
        if (!userUnmatched.includes(matchedUserId)) {
          userUnmatched.push(matchedUserId);
        }
        
        const matchedUserUnmatched = matchedUserData.unmatchedUsers || [];
        if (!matchedUserUnmatched.includes(userId)) {
          matchedUserUnmatched.push(userId);
        }
        
        await updateDoc(userRef, {
          'social.matches': userMatches,
          unmatchedUsers: userUnmatched,
          updatedAt: Timestamp.now()
        });
        
        await updateDoc(matchedUserRef, {
          'social.matches': matchedUserMatches,
          unmatchedUsers: matchedUserUnmatched,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error removing match:', error);
      throw error;
    }
  }

  /**
   * Eşleşmeyi tekrar aktif et (unmatched listesinden kaldır ve matches'e ekle)
   */
  public async restoreMatch(userId: string, matchedUserId: string, matchedMovie?: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      const matchedUserRef = doc(db, this.usersCollection, matchedUserId);
      
      const userDoc = await getDoc(userRef);
      const matchedUserDoc = await getDoc(matchedUserRef);
      
      if (userDoc.exists() && matchedUserDoc.exists()) {
        const userData = userDoc.data();
        const matchedUserData = matchedUserDoc.data();
        
        // Remove from unmatched list
        const userUnmatched = (userData.unmatchedUsers || []).filter((id: string) => id !== matchedUserId);
        const matchedUserUnmatched = (matchedUserData.unmatchedUsers || []).filter((id: string) => id !== userId);
        
        // Add back to matches
        const userMatches = userData.social?.matches || [];
        const matchedUserMatches = matchedUserData.social?.matches || [];
        
        const matchExists = userMatches.some((m: any) => {
          const id = typeof m === 'string' ? m : m.matchedUserId;
          return id === matchedUserId;
        });
        
        if (!matchExists) {
          userMatches.push({
            matchedUserId,
            matchedAt: Timestamp.now(),
            matchedMovie: matchedMovie || null
          });
        }
        
        const matchedUserMatchExists = matchedUserMatches.some((m: any) => {
          const id = typeof m === 'string' ? m : m.matchedUserId;
          return id === userId;
        });
        
        if (!matchedUserMatchExists) {
          matchedUserMatches.push({
            matchedUserId: userId,
            matchedAt: Timestamp.now(),
            matchedMovie: matchedMovie || null
          });
        }
        
        await updateDoc(userRef, {
          'social.matches': userMatches,
          unmatchedUsers: userUnmatched,
          updatedAt: Timestamp.now()
        });
        
        await updateDoc(matchedUserRef, {
          'social.matches': matchedUserMatches,
          unmatchedUsers: matchedUserUnmatched,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('Error restoring match:', error);
      throw error;
    }
  }

  /**
   * Eşleşmeyi bitirdiklerim listesini getir
   */
  public async getUnmatchedUsers(userId: string): Promise<any[]> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      const unmatchedUserIds = userData.unmatchedUsers || [];
      
      if (unmatchedUserIds.length === 0) {
        return [];
      }

      // Get user details for unmatched users
      const unmatchedUsers = await Promise.all(
        unmatchedUserIds.map(async (unmatchedUserId: string) => {
          try {
            const unmatchedUserDoc = await this.getUserDocument(unmatchedUserId);
            if (!unmatchedUserDoc) return null;

            const chatId = this.getChatId(userId, unmatchedUserId);
            const chatRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);
            
            const unreadRef = doc(db, 'chats', chatId, 'unread', userId);
            const unreadDoc = await getDoc(unreadRef);
            const unreadCount = unreadDoc.exists() ? (unreadDoc.data().count || 0) : 0;

            // Don't check typing/online status for unmatched users (should not be shown)
            // Return without status indicators
            return {
              id: unmatchedUserId,
              userName: unmatchedUserDoc.firstName || unmatchedUserDoc.username || 'Kullanıcı',
              userPhoto: unmatchedUserDoc.profilePhotos?.[0] || unmatchedUserDoc.photoURL || '',
              lastMessage: chatDoc.exists() ? (chatDoc.data().lastMessage || '') : '',
              lastMessageAt: chatDoc.exists() ? (chatDoc.data().lastMessageAt || null) : null,
              // Don't show online/typing status for unmatched users
              isOnline: false,
              isTyping: false,
              unreadCount,
              isUnmatched: true,
              // Settings should not be used for status indicators
              showOnlineStatus: false,
              showTypingIndicator: false,
              showReadReceipts: false,
            };
          } catch (error) {
            console.error(`Error fetching unmatched user:`, error);
            return null;
          }
        })
      );

      return unmatchedUsers.filter(user => user !== null);
    } catch (error) {
      console.error('Error getting unmatched users:', error);
      return [];
    }
  }

  /**
   * Sohbet ayarlarını getir
   */
  public async getChatSettings(userId: string, otherUserId: string): Promise<any> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const chatId = this.getChatId(userId, otherUserId);
      const settingsRef = doc(db, 'chats', chatId, 'settings', userId);
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        return settingsDoc.data();
      }
      
      // Default settings
      return {
        showReadReceipts: true,
        showOnlineStatus: true,
        showTypingIndicator: true,
        notifications: true,
      };
    } catch (error) {
      console.error('Error getting chat settings:', error);
      return {
        showReadReceipts: true,
        showOnlineStatus: true,
        showTypingIndicator: true,
        notifications: true,
      };
    }
  }

  /**
   * Sohbet ayarlarını güncelle
   * İki taraflı ayarlar (showReadReceipts, showOnlineStatus, showTypingIndicator) için
   * her iki kullanıcının ayarlarını da günceller
   */
  public async updateChatSettings(
    userId: string,
    otherUserId: string,
    settings: {
      showReadReceipts?: boolean;
      showOnlineStatus?: boolean;
      showTypingIndicator?: boolean;
      notifications?: boolean;
    }
  ): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const chatId = this.getChatId(userId, otherUserId);
      
      // Kullanıcının kendi ayarlarını güncelle
      const settingsRef = doc(db, 'chats', chatId, 'settings', userId);
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now()
      }, { merge: true });

      // İki taraflı ayarlar için diğer kullanıcının ayarlarını da güncelle
      // Bu ayarlar her iki taraf için de aynı olmalı
      if (settings.showReadReceipts !== undefined || 
          settings.showOnlineStatus !== undefined || 
          settings.showTypingIndicator !== undefined) {
        
        // Diğer kullanıcının mevcut ayarlarını al
        const otherUserSettingsRef = doc(db, 'chats', chatId, 'settings', otherUserId);
        const otherUserSettingsDoc = await getDoc(otherUserSettingsRef);
        const otherUserCurrentSettings = otherUserSettingsDoc.exists() 
          ? otherUserSettingsDoc.data() 
          : {
              showReadReceipts: true,
              showOnlineStatus: true,
              showTypingIndicator: true,
              notifications: true,
            };

        // İki taraflı ayarları güncelle (her iki taraf için aynı değer)
        const bidirectionalSettings: any = {};
        if (settings.showReadReceipts !== undefined) {
          bidirectionalSettings.showReadReceipts = settings.showReadReceipts;
        }
        if (settings.showOnlineStatus !== undefined) {
          bidirectionalSettings.showOnlineStatus = settings.showOnlineStatus;
        }
        if (settings.showTypingIndicator !== undefined) {
          bidirectionalSettings.showTypingIndicator = settings.showTypingIndicator;
        }

        // Diğer kullanıcının ayarlarını güncelle (bildirimler hariç, sadece iki taraflı ayarlar)
        await setDoc(otherUserSettingsRef, {
          ...otherUserCurrentSettings,
          ...bidirectionalSettings,
          updatedAt: Timestamp.now()
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error updating chat settings:', error);
      throw error;
    }
  }

  /**
   * Kullanıcının çevrimiçi durumunu dinle
   */
  public listenToUserOnlineStatus(
    userId: string,
    callback: (isOnline: boolean) => void
  ): () => void {
    try {
      const db = this.getDb();
      if (!db) {
        console.error('Firestore database is not initialized');
        return () => {};
      }

      const userRef = doc(db, this.usersCollection, userId);
      
      const unsubscribe = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback(data.isOnline || false);
        }
      }, (error) => {
        console.error('Error listening to online status:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up online status listener:', error);
      return () => {};
    }
  }

  /**
   * Chat listesini real-time dinle
   */
  public listenToChatList(
    userId: string,
    callback: (chats: any[]) => void
  ): () => void {
    try {
      const db = this.getDb();
      if (!db) {
        console.error('Firestore database is not initialized');
        return () => {};
      }

      const userRef = doc(db, this.usersCollection, userId);
      
      const unsubscribe = onSnapshot(userRef, async (snapshot) => {
        if (snapshot.exists()) {
          // Get both active matches and unmatched users
          const chatList = await this.getChatList(userId);
          callback(chatList);
        }
      }, (error) => {
        console.error('Error listening to chat list:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up chat list listener:', error);
      return () => {};
    }
  }

  /**
   * Kullanıcının çevrimiçi durumunu güncelle
   */
  public async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const userRef = doc(db, this.usersCollection, userId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  }

  /**
   * Mesajın teslim edildiğini işaretle
   */
  public async markMessageAsDelivered(messageId: string, chatId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        delivered: true,
        deliveredAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error marking message as delivered:', error);
      throw error;
    }
  }

  /**
   * Engellenen kullanıcıları getir
   * Hem engelleyen hem engellenen kullanıcıları getirir
   */
  public async getBlockedUsers(userId: string): Promise<any[]> {
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
        const blockedUserIds = userData.blockedUsers || []; // Kullanıcının engellediği kullanıcılar
        
        // Tüm kullanıcıları kontrol et - hangi kullanıcılar bu kullanıcıyı engellemiş?
        // Not: blockUser fonksiyonu zaten karşılıklı engelleme yapıyor, ama yine de kontrol edelim
        const allUsersRef = collection(db, this.usersCollection);
        const allUsersQuery = query(allUsersRef, where('blockedUsers', 'array-contains', userId));
        const usersWhoBlockedMeSnapshot = await getDocs(allUsersQuery);
        const usersWhoBlockedMe: string[] = [];
        
        usersWhoBlockedMeSnapshot.forEach((doc) => {
          usersWhoBlockedMe.push(doc.id);
        });
        
        // Hem engelleyen hem engellenen kullanıcıları birleştir (duplicate'leri kaldır)
        const allBlockedUserIds = [...new Set([...blockedUserIds, ...usersWhoBlockedMe])];
        
        if (allBlockedUserIds.length === 0) {
          return [];
        }
        
        // Blocked user details'ları getir (mesaj listesi formatında)
        const blockedUsers = await Promise.all(
          allBlockedUserIds.map(async (blockedId: string) => {
            try {
              const blockedUserDoc = await this.getUserDocument(blockedId);
              if (!blockedUserDoc) return null;

              const chatId = this.getChatId(userId, blockedId);
              const chatRef = doc(db, 'chats', chatId);
              const chatDoc = await getDoc(chatRef);
              
              const unreadRef = doc(db, 'chats', chatId, 'unread', userId);
              const unreadDoc = await getDoc(unreadRef);
              const unreadCount = unreadDoc.exists() ? (unreadDoc.data().count || 0) : 0;

              // Check if I blocked them or they blocked me
              const iBlockedThem = blockedUserIds.includes(blockedId);
              const theyBlockedMe = usersWhoBlockedMe.includes(blockedId);

              return {
                id: blockedId,
                userName: blockedUserDoc.firstName || blockedUserDoc.username || 'Kullanıcı',
                userPhoto: blockedUserDoc.profilePhotos?.[0] || blockedUserDoc.photoURL || '',
                lastMessage: chatDoc.exists() ? (chatDoc.data().lastMessage || '') : '',
                lastMessageAt: chatDoc.exists() ? (chatDoc.data().lastMessageAt || null) : null,
                // Don't show online/typing status for blocked users
                isOnline: false,
                isTyping: false,
                unreadCount,
                isBlocked: true,
                iBlockedThem,
                theyBlockedMe,
                blockedAt: userData.blockedAt?.[blockedId] || null,
                // Settings should not be used for status indicators
                showOnlineStatus: false,
                showTypingIndicator: false,
                showReadReceipts: false,
              };
            } catch (error) {
              console.error(`Error fetching blocked user ${blockedId}:`, error);
              return null;
            }
          })
        );
        
        return blockedUsers.filter(user => user !== null);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting blocked users:', error);
      return [];
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

  /**
   * Kullanıcı bildirimi gönder
   */
  async submitReport(reportData: any): Promise<string> {
    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      const reportsRef = collection(db, 'reports');
      const reportDoc = {
        ...reportData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(reportsRef, reportDoc);
      logger.info(`Report submitted: ${docRef.id}`, 'FirestoreService');
      
      // Email bildirimi gönder (async, hata olsa bile devam et)
      try {
        await emailService.sendReportNotification({
          reportId: docRef.id,
          ...reportData,
        });
      } catch (emailError) {
        // Email gönderilemese bile bildirim kaydedildi, sadece log yaz
        logger.warn('Email notification failed (report was saved)', 'FirestoreService', emailError);
      }
      
      return docRef.id;
    } catch (error) {
      logger.error('Error submitting report', 'FirestoreService', error);
      throw error;
    }
  }
}

// Export the singleton instance
export const firestoreService = FirestoreService.getInstance();
