import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { FirebaseService } from './FirebaseService';
import { logger } from '../utils/Logger';
import { swipeLimitService } from './SwipeLimitService';

export interface PremiumStatus {
  isPremium: boolean;
  premiumExpiresAt: Timestamp | null;
  premiumType: 'monthly' | 'yearly' | null;
}

export interface PurchaseProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  type: 'extra_swipes' | 'premium';
  amount?: number; // Extra swipes için
}

export const PURCHASE_PRODUCTS: PurchaseProduct[] = [
  {
    id: 'extra_swipes_1',
    name: '1 Ekstra Swipe',
    price: 1,
    description: '1 ekstra swipe hakkı',
    type: 'extra_swipes',
    amount: 1,
  },
  {
    id: 'extra_swipes_2',
    name: '2 Ekstra Swipe',
    price: 2,
    description: '2 ekstra swipe hakkı',
    type: 'extra_swipes',
    amount: 2,
  },
  {
    id: 'premium_monthly',
    name: 'Premium Üyelik',
    price: 3,
    description: 'Sınırsız swipe, tüm filtreler ve özellikler',
    type: 'premium',
  },
];

export class PremiumService {
  private static instance: PremiumService;
  private firebaseService: FirebaseService;

  private constructor() {
    this.firebaseService = FirebaseService.getInstance();
  }

  public static getInstance(): PremiumService {
    if (!PremiumService.instance) {
      PremiumService.instance = new PremiumService();
    }
    return PremiumService.instance;
  }

  /**
   * Kullanıcının premium durumunu kontrol eder
   */
  async checkPremiumStatus(userId: string): Promise<PremiumStatus> {
    try {
      const db = this.firebaseService.getFirestore();
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const isPremium = userData?.social?.isPremium || false;
        const premiumExpiresAt = userData?.social?.premiumExpiresAt || null;

        // Premium süresi dolmuş mu kontrol et
        if (isPremium && premiumExpiresAt) {
          const expiresAt = premiumExpiresAt.toDate();
          const now = new Date();
          
          if (expiresAt < now) {
            // Premium süresi dolmuş, kaldır
            await this.removePremium(userId);
            return {
              isPremium: false,
              premiumExpiresAt: null,
              premiumType: null,
            };
          }
        }

        return {
          isPremium,
          premiumExpiresAt,
          premiumType: userData?.social?.premiumType || null,
        };
      }

      return {
        isPremium: false,
        premiumExpiresAt: null,
        premiumType: null,
      };
    } catch (error) {
      logger.error('Error checking premium status', 'PremiumService', error);
      return {
        isPremium: false,
        premiumExpiresAt: null,
        premiumType: null,
      };
    }
  }

  /**
   * Premium üyelik satın alır
   */
  async purchasePremium(userId: string, months: number = 1): Promise<boolean> {
    try {
      const db = this.firebaseService.getFirestore();
      const userRef = doc(db, 'users', userId);
      
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + months);

      const premiumExpiresAt = Timestamp.fromDate(expiresAt);

      // User document'ini güncelle
      await updateDoc(userRef, {
        'social.isPremium': true,
        'social.premiumExpiresAt': premiumExpiresAt,
        'social.premiumType': months === 12 ? 'yearly' : 'monthly',
      });

      // Swipe limitlerini güncelle
      await swipeLimitService.setPremium(userId, premiumExpiresAt);

      logger.info(`Premium purchased for user ${userId}`, 'PremiumService');
      return true;
    } catch (error) {
      logger.error('Error purchasing premium', 'PremiumService', error);
      return false;
    }
  }

  /**
   * Premium üyeliği kaldırır
   */
  async removePremium(userId: string): Promise<boolean> {
    try {
      const db = this.firebaseService.getFirestore();
      const userRef = doc(db, 'users', userId);
      const limitsRef = doc(db, 'swipeLimits', userId);

      // User document'ini güncelle
      await updateDoc(userRef, {
        'social.isPremium': false,
        'social.premiumExpiresAt': null,
        'social.premiumType': null,
      });

      // Swipe limitlerini güncelle (ücretsiz limitlere dön)
      await updateDoc(limitsRef, {
        isPremium: false,
        dailySwipesLimit: 2, // Demo için 2 swipe
        undoLimit: 5,
        undoCount: 5,
      });

      logger.info(`Premium removed for user ${userId}`, 'PremiumService');
      return true;
    } catch (error) {
      logger.error('Error removing premium', 'PremiumService', error);
      return false;
    }
  }

  /**
   * Filtre erişim kontrolü
   */
  async canAccessFilter(userId: string, filterType: 'gender' | 'age' | 'distance'): Promise<boolean> {
    try {
      const premiumStatus = await this.checkPremiumStatus(userId);
      return premiumStatus.isPremium;
    } catch (error) {
      logger.error('Error checking filter access', 'PremiumService', error);
      return false;
    }
  }

  /**
   * Ürün bilgilerini getirir
   */
  getProduct(productId: string): PurchaseProduct | undefined {
    return PURCHASE_PRODUCTS.find(p => p.id === productId);
  }

  /**
   * Tüm ürünleri getirir
   */
  getAllProducts(): PurchaseProduct[] {
    return PURCHASE_PRODUCTS;
  }
}

export const premiumService = PremiumService.getInstance();

