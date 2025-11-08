import { Platform } from 'react-native';
import { firestoreService } from './FirestoreService';
import { authService } from './AuthService';
import { logger } from '../utils/Logger';

// Optional imports for Expo Go compatibility
let Notifications: any = null;
let Device: any = null;
let isAvailable = false;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  isAvailable = true;
  
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  logger.warn('expo-notifications or expo-device not available (Expo Go limitation)', 'NotificationService');
  isAvailable = false;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public isAvailable(): boolean {
    return isAvailable && Notifications !== null && Device !== null;
  }

  public async initialize() {
    if (!this.isAvailable()) {
      logger.warn('NotificationService not available, skipping initialization', 'NotificationService');
      return;
    }

    try {
      await this.registerForPushNotificationsAsync();

      if (Notifications && Notifications.addNotificationReceivedListener) {
        Notifications.addNotificationReceivedListener(notification => {
          logger.info('Notification received:', 'NotificationService', notification);
        });
      }

      if (Notifications && Notifications.addNotificationResponseReceivedListener) {
        Notifications.addNotificationResponseReceivedListener(response => {
          logger.info('Notification response received:', 'NotificationService', response);
          // Handle notification tap
        });
      }
    } catch (error) {
      logger.error('Failed to initialize notifications', 'NotificationService', error);
    }
  }

  public async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!this.isAvailable()) {
      logger.warn('NotificationService not available', 'NotificationService');
      return null;
    }

    try {
      let token;
      if (Device && Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          logger.warn('Failed to get push token for push notification!', 'NotificationService');
          return null;
        }
        token = (await Notifications.getExpoPushTokenAsync()).data;
        logger.info('Expo push token:', 'NotificationService', token);
      } else {
        logger.warn('Must use physical device for Push Notifications', 'NotificationService');
        return null;
      }

      if (Platform.OS === 'android' && Notifications && Notifications.setNotificationChannelAsync) {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      logger.error('Failed to register for push notifications', 'NotificationService', error);
      return null;
    }
  }

  public async saveTokenToFirestore(token: string) {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        await firestoreService.updateUserProfile(user.uid, {
          pushToken: token,
        } as any);
        logger.info('Push token saved to Firestore', 'NotificationService');
      }
    } catch (error) {
      logger.error('Error saving push token to Firestore', 'NotificationService', error);
    }
  }

  public async schedulePushNotification(title: string, body: string, data: any) {
    if (!this.isAvailable()) {
      logger.warn('NotificationService not available, cannot schedule notification', 'NotificationService');
      return;
    }

    try {
      if (Notifications && Notifications.scheduleNotificationAsync) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
          },
          trigger: { seconds: 2 },
        });
      }
    } catch (error) {
      logger.error('Failed to schedule notification', 'NotificationService', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();
