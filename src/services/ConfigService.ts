import { asyncStorageManager } from '../utils/AsyncStorageManager';

export class ConfigService {
  private static instance: ConfigService;
  private config: Record<string, any> = {};
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize professional AsyncStorage
      await asyncStorageManager.initialize();
      
      // Load configuration from storage
      const storedConfig = await asyncStorageManager.getItem('app_config');
      if (storedConfig) {
        this.config = JSON.parse(storedConfig);
      }

      // Set default configuration
      this.setDefaults();

      this.isInitialized = true;
      console.log('Config Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Config Service:', error);
      this.isInitialized = true; // Allow app to continue
    }
  }

  private setDefaults(): void {
    const defaults: Record<string, any> = {
      dataSource: 'tmdb',
      theme: 'dark',
      language: 'en-US',
      region: 'US',
      adultContent: false,
      notifications: true,
      autoPlay: true,
      quality: 'high',
      cacheDuration: 3600000, // 1 hour
    };

    Object.keys(defaults).forEach(key => {
      if (this.config[key] === undefined) {
        this.config[key] = defaults[key];
      }
    });
  }

  public async get(key: string): Promise<any> {
    return this.config[key];
  }

  public async set(key: string, value: any): Promise<void> {
    this.config[key] = value;
    await asyncStorageManager.setItem('app_config', JSON.stringify(this.config));
  }

  public async getAll(): Promise<Record<string, any>> {
    return { ...this.config };
  }

  public async reset(): Promise<void> {
    this.config = {};
    this.setDefaults();
    await asyncStorageManager.setItem('app_config', JSON.stringify(this.config));
  }
}

export const configService = ConfigService.getInstance();
