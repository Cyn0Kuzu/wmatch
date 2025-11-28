import { doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { FirebaseService } from './FirebaseService';
import { logger } from '../utils/Logger';

export interface SwipeLimits {
  dailySwipesUsed: number;
  dailySwipesLimit: number; // 2 for free (demo), -1 for premium (unlimited)
  lastResetDate: string; // YYYY-MM-DD format
  undoCount: number; // 5 for free, -1 for premium (unlimited)
  undoLimit: number; // 5 for free, -1 for premium (unlimited)
  extraSwipesPurchased: number; // Ekstra satın alınan swipe'lar
  premiumExpiresAt?: Timestamp | null;
  isPremium: boolean;
}

export interface SwipeHistory {
  userId: string;
  action: 'like' | 'pass';
  timestamp: Timestamp;
  movieId?: string;
}

export class SwipeLimitService {
  private static instance: SwipeLimitService;
  private firebaseService: FirebaseService;

  private constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  public static getInstance(): SwipeLimitService {
    if (!SwipeLimitService.instance) {
      SwipeLimitService.instance = new SwipeLimitService();
    }
    return SwipeLimitService.instance;
  }

  /**
   * Kullanıcının swipe limitlerini getirir
   */
  async getSwipeLimits(userId: string): Promise<SwipeLimits> {
    try {
      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      const limitsSnap = await getDoc(limitsRef);

      if (limitsSnap.exists()) {
        const data = limitsSnap.data();
      const limits: SwipeLimits = {
        dailySwipesUsed: data.dailySwipesUsed || 0,
        dailySwipesLimit: data.dailySwipesLimit || 2, // Demo için 2 swipe
        lastResetDate: data.lastResetDate || this.getTodayDate(),
        undoCount: data.undoCount || 5,
        undoLimit: data.undoLimit || 5,
        extraSwipesPurchased: data.extraSwipesPurchased || 0,
        premiumExpiresAt: data.premiumExpiresAt || null,
        isPremium: data.isPremium || false,
      };

        // Günlük reset kontrolü
        if (limits.lastResetDate !== this.getTodayDate()) {
          return await this.resetDailyLimits(userId, limits);
        }

        return limits;
      } else {
        // İlk kez oluştur
        return await this.initializeSwipeLimits(userId);
      }
    } catch (error) {
      logger.error('Error getting swipe limits', 'SwipeLimitService', error);
      // Hata durumunda varsayılan değerler döndür
      return {
        dailySwipesUsed: 0,
        dailySwipesLimit: 2, // Demo için 2 swipe
        lastResetDate: this.getTodayDate(),
        undoCount: 5,
        undoLimit: 5,
        extraSwipesPurchased: 0,
        isPremium: false,
      };
    }
  }

  /**
   * Swipe limitlerini başlatır
   */
  async initializeSwipeLimits(userId: string): Promise<SwipeLimits> {
    try {
      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      
      const limits: SwipeLimits = {
        dailySwipesUsed: 0,
        dailySwipesLimit: 2, // Demo için 2 swipe
        lastResetDate: this.getTodayDate(),
        undoCount: 5,
        undoLimit: 5,
        extraSwipesPurchased: 0,
        isPremium: false,
      };

      await setDoc(limitsRef, limits);
      logger.info(`Swipe limits initialized for user ${userId}`, 'SwipeLimitService');
      return limits;
    } catch (error) {
      logger.error('Error initializing swipe limits', 'SwipeLimitService', error);
      throw error;
    }
  }

  /**
   * Günlük limitleri sıfırlar
   */
  async resetDailyLimits(userId: string, currentLimits?: SwipeLimits): Promise<SwipeLimits> {
    try {
      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      
      const limits = currentLimits || await this.getSwipeLimits(userId);
      
      const updatedLimits: SwipeLimits = {
        ...limits,
        dailySwipesUsed: 0,
        lastResetDate: this.getTodayDate(),
        undoCount: limits.isPremium ? -1 : limits.undoLimit, // Premium ise sınırsız
      };

      await updateDoc(limitsRef, updatedLimits);
      logger.info(`Daily limits reset for user ${userId}`, 'SwipeLimitService');
      return updatedLimits;
    } catch (error) {
      logger.error('Error resetting daily limits', 'SwipeLimitService', error);
      throw error;
    }
  }

  /**
   * Swipe yapılabilir mi kontrol eder
   */
  async canSwipe(userId: string): Promise<{ canSwipe: boolean; remainingSwipes: number; message?: string }> {
    try {
      const limits = await this.getSwipeLimits(userId);
      
      // Premium kullanıcılar sınırsız
      if (limits.isPremium && limits.dailySwipesLimit === -1) {
        return { canSwipe: true, remainingSwipes: -1 };
      }

      const totalAvailable = limits.dailySwipesLimit + limits.extraSwipesPurchased;
      const remaining = totalAvailable - limits.dailySwipesUsed;

      if (remaining <= 0) {
        return {
          canSwipe: false,
          remainingSwipes: 0,
          message: 'Günlük swipe hakkınız doldu. Premium üyelik veya ekstra swipe paketi satın alabilirsiniz.',
        };
      }

      return { canSwipe: true, remainingSwipes: remaining };
    } catch (error) {
      logger.error('Error checking swipe availability', 'SwipeLimitService', error);
      return { canSwipe: false, remainingSwipes: 0, message: 'Bir hata oluştu' };
    }
  }

  /**
   * Swipe kullanır
   */
  async useSwipe(userId: string, action: 'like' | 'pass', targetUserId: string, movieId?: string): Promise<boolean> {
    try {
      const canSwipeResult = await this.canSwipe(userId);
      if (!canSwipeResult.canSwipe) {
        return false;
      }

      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      const limitsSnap = await getDoc(limitsRef);
      const limits = limitsSnap.data() as SwipeLimits;

      // Swipe geçmişine ekle
      const historyRef = doc(db, 'swipeHistory', `${userId}_${Date.now()}`);
      await setDoc(historyRef, {
        userId,
        targetUserId,
        action,
        movieId: movieId || null,
        timestamp: Timestamp.now(),
      });

      // Limit güncelle
      const updatedSwipesUsed = limits.dailySwipesUsed + 1;
      await updateDoc(limitsRef, {
        dailySwipesUsed: updatedSwipesUsed,
      });

      logger.info(`Swipe used by user ${userId}. Remaining: ${canSwipeResult.remainingSwipes - 1}`, 'SwipeLimitService');
      return true;
    } catch (error) {
      logger.error('Error using swipe', 'SwipeLimitService', error);
      return false;
    }
  }

  /**
   * Geri alma yapılabilir mi kontrol eder
   */
  async canUndo(userId: string): Promise<{ canUndo: boolean; remainingUndos: number; message?: string }> {
    try {
      const limits = await this.getSwipeLimits(userId);
      
      // Premium kullanıcılar sınırsız
      if (limits.isPremium && limits.undoLimit === -1) {
        return { canUndo: true, remainingUndos: -1 };
      }

      if (limits.undoCount <= 0) {
        return {
          canUndo: false,
          remainingUndos: 0,
          message: 'Geri alma hakkınız doldu. Premium üyelik ile sınırsız geri alma özelliğine sahip olabilirsiniz.',
        };
      }

      return { canUndo: true, remainingUndos: limits.undoCount };
    } catch (error) {
      logger.error('Error checking undo availability', 'SwipeLimitService', error);
      return { canUndo: false, remainingUndos: 0, message: 'Bir hata oluştu' };
    }
  }

  /**
   * Swipe limitini geri alır (geri alma işlemi için)
   */
  async refundSwipe(userId: string): Promise<boolean> {
    try {
      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      const limitsSnap = await getDoc(limitsRef);
      
      if (!limitsSnap.exists()) {
        return false;
      }
      
      const limits = limitsSnap.data() as SwipeLimits;
      
      // Swipe sayısını geri al (minimum 0)
      const updatedSwipesUsed = Math.max(0, limits.dailySwipesUsed - 1);
      
      await updateDoc(limitsRef, {
        dailySwipesUsed: updatedSwipesUsed,
      });
      
      logger.info(`Swipe refunded for user ${userId}. Swipes used: ${updatedSwipesUsed}`, 'SwipeLimitService');
      return true;
    } catch (error) {
      logger.error('Error refunding swipe', 'SwipeLimitService', error);
      return false;
    }
  }

  /**
   * Geri alma kullanır
   */
  async useUndo(userId: string): Promise<boolean> {
    try {
      const canUndoResult = await this.canUndo(userId);
      if (!canUndoResult.canUndo) {
        return false;
      }

      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      const limitsSnap = await getDoc(limitsRef);
      const limits = limitsSnap.data() as SwipeLimits;

      // Premium değilse geri alma sayısını azalt
      if (!limits.isPremium) {
        await updateDoc(limitsRef, {
          undoCount: limits.undoCount - 1,
        });
      }

      // Swipe sayısını da geri al (eğer kullanılmışsa)
      if (limits.dailySwipesUsed > 0) {
        await updateDoc(limitsRef, {
          dailySwipesUsed: Math.max(0, limits.dailySwipesUsed - 1),
        });
      }

      logger.info(`Undo used by user ${userId}`, 'SwipeLimitService');
      return true;
    } catch (error) {
      logger.error('Error using undo', 'SwipeLimitService', error);
      return false;
    }
  }

  /**
   * Ekstra swipe paketi ekler
   */
  async addExtraSwipes(userId: string, amount: number): Promise<boolean> {
    try {
      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      const limitsSnap = await getDoc(limitsRef);
      const limits = limitsSnap.data() as SwipeLimits;

      await updateDoc(limitsRef, {
        extraSwipesPurchased: (limits.extraSwipesPurchased || 0) + amount,
      });

      logger.info(`Added ${amount} extra swipes to user ${userId}`, 'SwipeLimitService');
      return true;
    } catch (error) {
      logger.error('Error adding extra swipes', 'SwipeLimitService', error);
      return false;
    }
  }

  /**
   * Premium üyelik ayarlar
   */
  async setPremium(userId: string, expiresAt: Timestamp): Promise<boolean> {
    try {
      const db = this.firebaseService.getFirestore();
      const limitsRef = doc(db, 'swipeLimits', userId);
      const userRef = doc(db, 'users', userId);

      // Swipe limitlerini güncelle
      await updateDoc(limitsRef, {
        isPremium: true,
        premiumExpiresAt: expiresAt,
        dailySwipesLimit: -1, // Sınırsız
        undoLimit: -1, // Sınırsız
        undoCount: -1,
      });

      // User document'ini güncelle
      await updateDoc(userRef, {
        'social.isPremium': true,
      });

      logger.info(`Premium set for user ${userId}`, 'SwipeLimitService');
      return true;
    } catch (error) {
      logger.error('Error setting premium', 'SwipeLimitService', error);
      return false;
    }
  }

  /**
   * Son swipe geçmişini getirir (geri alma için)
   */
  async getLastSwipeHistory(userId: string, limit: number = 10): Promise<SwipeHistory[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const { collection, query, where, orderBy, getDocs, limit: limitQuery } = await import('firebase/firestore');
      
      const historyRef = collection(db, 'swipeHistory');
      const q = query(
        historyRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limitQuery(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        userId: doc.data().userId,
        action: doc.data().action,
        timestamp: doc.data().timestamp,
        movieId: doc.data().movieId,
      })) as SwipeHistory[];
    } catch (error) {
      logger.error('Error getting swipe history', 'SwipeLimitService', error);
      return [];
    }
  }

  /**
   * Bugünün tarihini YYYY-MM-DD formatında döndürür
   */
  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const swipeLimitService = SwipeLimitService.getInstance();

