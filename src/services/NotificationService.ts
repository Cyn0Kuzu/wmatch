import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { firestoreService } from './FirestoreService';
import { authService } from './AuthService';
import { logger } from '../utils/Logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize() {
    await this.registerForPushNotificationsAsync();

    Notifications.addNotificationReceivedListener(notification => {
      logger.info('Notification received:', 'NotificationService', notification);
    });

    Notifications.addNotificationResponseReceivedListener(response => {
      logger.info('Notification response received:', 'NotificationService', response);
      // Handle notification tap
    });
  }

  public async registerForPushNotificationsAsync(): Promise<string | null> {
    let token;
    if (Device.isDevice) {
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

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  public async saveTokenToFirestore(token: string) {
    try {
      const user = authService.getCurrentUser();
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
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: { seconds: 2 },
    });
  }
}

export const notificationService = NotificationService.getInstance();
