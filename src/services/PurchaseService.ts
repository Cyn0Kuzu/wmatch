import { Platform, Alert } from 'react-native';
import { logger } from '../utils/Logger';
import { premiumService, PURCHASE_PRODUCTS } from './PremiumService';
import { swipeLimitService } from './SwipeLimitService';

// Not: react-native-iap paketi eklenecek
// Şimdilik mock implementasyon yapıyoruz

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  error?: string;
}

export class PurchaseService {
  private static instance: PurchaseService;
  private isInitialized: boolean = false;

  private constructor() {
    // react-native-iap başlatılacak
  }

  public static getInstance(): PurchaseService {
    if (!PurchaseService.instance) {
      PurchaseService.instance = new PurchaseService();
    }
    return PurchaseService.instance;
  }

  /**
   * In-app purchase'ı başlatır
   */
  async initialize(): Promise<boolean> {
    try {
      // TODO: react-native-iap ile gerçek implementasyon
      // const RNIap = require('react-native-iap');
      // await RNIap.initConnection();
      // await RNIap.getProducts(PURCHASE_PRODUCTS.map(p => p.id));
      
      this.isInitialized = true;
      logger.info('Purchase service initialized', 'PurchaseService');
      return true;
    } catch (error) {
      logger.error('Error initializing purchase service', 'PurchaseService', error);
      return false;
    }
  }

  /**
   * Ürün satın alır
   * DEMO MODU: Gerçek ödeme yapmadan test eder
   */
  async purchaseProduct(userId: string, productId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const product = premiumService.getProduct(productId);
      if (!product) {
        return {
          success: false,
          error: 'Ürün bulunamadı',
        };
      }

      // DEMO MODU: Gerçek ödeme yapmadan test et
      // Production'da burada gerçek ödeme işlemi yapılacak
      // const RNIap = require('react-native-iap');
      // const purchase = await RNIap.requestPurchase(productId);
      // Backend'de doğrula (Firebase Functions)
      
      logger.info(`DEMO: Purchase attempt - User: ${userId}, Product: ${productId}`, 'PurchaseService');

      // Demo modunda direkt başarılı döndür ve özelliği aktif et
      if (product.type === 'premium') {
        const success = await premiumService.purchasePremium(userId, 1);
        if (success) {
          logger.info(`DEMO: Premium activated for user ${userId}`, 'PurchaseService');
          return {
            success: true,
            productId,
          };
        }
      } else if (product.type === 'extra_swipes' && product.amount) {
        const success = await swipeLimitService.addExtraSwipes(userId, product.amount);
        if (success) {
          logger.info(`DEMO: ${product.amount} extra swipes added for user ${userId}`, 'PurchaseService');
          return {
            success: true,
            productId,
          };
        }
      }

      return {
        success: false,
        error: 'Satın alma işlemi başarısız',
      };
    } catch (error: any) {
      logger.error('Error purchasing product', 'PurchaseService', error);
      return {
        success: false,
        error: error.message || 'Satın alma işlemi sırasında bir hata oluştu',
      };
    }
  }

  /**
   * Satın alma modal'ı gösterir
   */
  async showPurchaseModal(userId: string, productId: string): Promise<PurchaseResult> {
    const product = premiumService.getProduct(productId);
    if (!product) {
      Alert.alert('Hata', 'Ürün bulunamadı');
      return { success: false, error: 'Ürün bulunamadı' };
    }

    return new Promise((resolve) => {
      Alert.alert(
        product.name,
        `${product.description}\n\nFiyat: ${product.price} TL`,
        [
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'İptal edildi' }),
          },
          {
            text: 'Satın Al',
            onPress: async () => {
              const result = await this.purchaseProduct(userId, productId);
              if (result.success) {
                Alert.alert('Başarılı', 'Satın alma işlemi tamamlandı!');
              } else {
                Alert.alert('Hata', result.error || 'Satın alma işlemi başarısız');
              }
              resolve(result);
            },
          },
        ]
      );
    });
  }

  /**
   * Premium satın alma modal'ı
   */
  async showPremiumPurchaseModal(userId: string): Promise<PurchaseResult> {
    return this.showPurchaseModal(userId, 'premium_monthly');
  }

  /**
   * Ekstra swipe satın alma modal'ı
   */
  async showExtraSwipesModal(userId: string): Promise<PurchaseResult> {
    return new Promise((resolve) => {
      Alert.alert(
        'Ekstra Swipe Paketleri',
        'Hangi paketi satın almak istersiniz?',
        [
          {
            text: '1 Swipe - 1 TL',
            onPress: async () => {
              const result = await this.purchaseProduct(userId, 'extra_swipes_1');
              resolve(result);
            },
          },
          {
            text: '2 Swipe - 2 TL',
            onPress: async () => {
              const result = await this.purchaseProduct(userId, 'extra_swipes_2');
              resolve(result);
            },
          },
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => resolve({ success: false, error: 'İptal edildi' }),
          },
        ]
      );
    });
  }
}

export const purchaseService = PurchaseService.getInstance();

