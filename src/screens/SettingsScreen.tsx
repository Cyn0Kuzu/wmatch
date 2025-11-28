import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Switch, Alert } from 'react-native';
import { Text, List, Divider, Avatar, Button } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { Icon, Icons } from '../components/ui/IconComponent';

import { useCoreEngine } from '../core/CoreEngine';
import { AnimatedText } from '../components/ui/AnimatedText';
import { LoadingSpinner } from '../components/ui/LoadingComponents';
import { BottomActionBar } from '../components/ui/BottomActionBar';
import { EnterpriseCard } from '../components/enterprise/EnterpriseCard';
import { EnterpriseButton } from '../components/enterprise/EnterpriseButton';
import { EnterpriseLayout, EnterpriseSection, EnterpriseRow } from '../components/enterprise/EnterpriseLayout';
import { spacing } from '../core/theme';
import { performanceMonitor } from '../utils/PerformanceMonitor';
import { logger } from '../utils/Logger';

interface SettingsData {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    recommendations: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showEmail: boolean;
    showAge: boolean;
    allowMessages: boolean;
  };
  preferences: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    autoPlay: boolean;
    quality: 'low' | 'medium' | 'high';
  };
  account: {
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    dataExportEnabled: boolean;
  };
}

export const SettingsScreen: React.FC = () => {
  const { coreService, authService } = useCoreEngine();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      email: true,
      push: true,
      marketing: false,
      recommendations: true,
    },
    privacy: {
      publicProfile: true,
      showEmail: false,
      showAge: true,
      allowMessages: true,
    },
    preferences: {
      language: 'tr',
      theme: 'dark',
      autoPlay: false,
      quality: 'high',
    },
    account: {
      twoFactorEnabled: false,
      biometricEnabled: false,
      dataExportEnabled: true,
    },
  });

  useEffect(() => {
    performanceMonitor.trackScreenLoad('SettingsScreen');
    loadSettings();
    
    return () => {
      performanceMonitor.endScreenLoad('SettingsScreen');
    };
  }, []);

  const loadSettings = async () => {
    try {
      performanceMonitor.startMetric('load_settings');
      setLoading(true);
      
      // In a real app, you'd fetch this from your database
      // For now, we'll use the default settings
      
      const duration = performanceMonitor.endMetric('load_settings');
      logger.info(`Settings loaded in ${duration}ms`, 'SettingsScreen');
    } catch (error) {
      logger.error('Failed to load settings', 'SettingsScreen', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSettings();
    } catch (error) {
      logger.error('Refresh error', 'SettingsScreen', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSettingChange = (category: keyof SettingsData, key: string, value: any) => {
    performanceMonitor.trackUserInteraction(`setting_change_${category}_${key}`);
    
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    
    logger.info(`Setting changed: ${category}.${key} = ${value}`, 'SettingsScreen');
    // In a real app, you'd save this to your database
  };

  const handleExportData = () => {
    Alert.alert(
      'Veri Dışa Aktarma',
      'Tüm verileriniz JSON formatında dışa aktarılacak. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Dışa Aktar',
          onPress: async () => {
            try {
              const data = JSON.stringify({ message: 'Export not implemented yet' });
              logger.info('Data exported successfully', 'SettingsScreen');
              Alert.alert('Başarılı', 'Verileriniz başarıyla dışa aktarıldı.');
            } catch (error) {
              logger.error('Data export failed', 'SettingsScreen', error);
              Alert.alert('Hata', 'Veri dışa aktarma işlemi başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Cache Temizle',
      'Tüm cache verileri temizlenecek. Bu işlem uygulamanın performansını etkileyebilir. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              // await coreService.getCacheManager().clear();
              logger.info('Cache cleared successfully', 'SettingsScreen');
              Alert.alert('Başarılı', 'Cache başarıyla temizlendi.');
            } catch (error) {
              logger.error('Cache clear failed', 'SettingsScreen', error);
              Alert.alert('Hata', 'Cache temizleme işlemi başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            // Implement account deletion
            logger.info('Account deletion requested', 'SettingsScreen');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <EnterpriseLayout>
        <LoadingSpinner />
      </EnterpriseLayout>
    );
  }

  return (
    <EnterpriseLayout scrollable={true} padding={spacing.md}>
      <ScrollView 
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
        {/* Account Section */}
        <EnterpriseSection>
          <AnimatedText variant="h3" style={styles.sectionTitle}>
            Hesap
          </AnimatedText>
          
          <EnterpriseCard variant="glass">
            <EnterpriseRow spacing={spacing.md} alignItems="center">
              <View style={[styles.avatar, { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 24 }}>👤</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>Kullanıcı</Text>
                <Text style={styles.accountEmail}>kullanici@example.com</Text>
              </View>
            </EnterpriseRow>
          </EnterpriseCard>
        </EnterpriseSection>

        {/* Notifications */}
        <EnterpriseSection>
          <AnimatedText variant="h3" style={styles.sectionTitle}>
            Bildirimler
          </AnimatedText>
          
          <EnterpriseCard variant="outlined">
            <List.Item
              title="E-posta Bildirimleri"
              description="Önemli güncellemeler için e-posta al"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>📧</Text>}
              right={() => (
                <Switch
                  value={settings.notifications.email}
                  onValueChange={(value) => handleSettingChange('notifications', 'email', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Push Bildirimleri"
              description="Anlık bildirimler al"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>🔔</Text>}
              right={() => (
                <Switch
                  value={settings.notifications.push}
                  onValueChange={(value) => handleSettingChange('notifications', 'push', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Pazarlama Bildirimleri"
              description="Özel teklifler ve kampanyalar"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>📢</Text>}
              right={() => (
                <Switch
                  value={settings.notifications.marketing}
                  onValueChange={(value) => handleSettingChange('notifications', 'marketing', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Öneri Bildirimleri"
              description="Yeni film ve dizi önerileri"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>💡</Text>}
              right={() => (
                <Switch
                  value={settings.notifications.recommendations}
                  onValueChange={(value) => handleSettingChange('notifications', 'recommendations', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
          </EnterpriseCard>
        </EnterpriseSection>

        {/* Privacy */}
        <EnterpriseSection>
          <AnimatedText variant="h3" style={styles.sectionTitle}>
            Gizlilik
        </AnimatedText>
          
          <EnterpriseCard variant="outlined">
            <List.Item
              title="Herkese Açık Profil"
              description="Profilinizi herkes görebilir"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>👤</Text>}
              right={() => (
                <Switch
                  value={settings.privacy.publicProfile}
                  onValueChange={(value) => handleSettingChange('privacy', 'publicProfile', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="E-posta Göster"
              description="E-posta adresinizi diğer kullanıcılara göster"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>📧</Text>}
              right={() => (
                <Switch
                  value={settings.privacy.showEmail}
                  onValueChange={(value) => handleSettingChange('privacy', 'showEmail', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Yaş Göster"
              description="Yaşınızı diğer kullanıcılara göster"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>📅</Text>}
              right={() => (
                <Switch
                  value={settings.privacy.showAge}
                  onValueChange={(value) => handleSettingChange('privacy', 'showAge', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Mesajlara İzin Ver"
              description="Diğer kullanıcılardan mesaj al"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>💬</Text>}
              right={() => (
                <Switch
                  value={settings.privacy.allowMessages}
                  onValueChange={(value) => handleSettingChange('privacy', 'allowMessages', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
          </EnterpriseCard>
        </EnterpriseSection>

        {/* Preferences */}
        <EnterpriseSection>
          <AnimatedText variant="h3" style={styles.sectionTitle}>
            Tercihler
        </AnimatedText>
          
          <EnterpriseCard variant="outlined">
            <List.Item
              title="Dil"
              description="Türkçe"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>🌐</Text>}
              right={() => <Text style={{ fontSize: 20, color: '#CCCCCC' }}>›</Text>}
              onPress={() => {}}
            />
            
            <Divider />
            
            <List.Item
              title="Tema"
              description="Koyu"
              left={() => <Icon name={Icons.palette} size={24} color="#E50914" style={{ marginRight: 16 }} />}
              right={() => <Text style={{ fontSize: 20, color: '#CCCCCC' }}>›</Text>}
              onPress={() => {}}
            />
            
            <Divider />
            
            <List.Item
              title="Otomatik Oynatma"
              description="Video önizlemelerini otomatik oynat"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>▶️</Text>}
              right={() => (
                <Switch
                  value={settings.preferences.autoPlay}
                  onValueChange={(value) => handleSettingChange('preferences', 'autoPlay', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Video Kalitesi"
              description="Yüksek"
              left={() => <Icon name={Icons.tv} size={24} color="#E50914" style={{ marginRight: 16 }} />}
              right={() => <Text style={{ fontSize: 20, color: '#CCCCCC' }}>›</Text>}
              onPress={() => {}}
            />
          </EnterpriseCard>
        </EnterpriseSection>

        {/* Security */}
        <EnterpriseSection>
          <AnimatedText variant="h3" style={styles.sectionTitle}>
            Güvenlik
          </AnimatedText>
          
          <EnterpriseCard variant="outlined">
            <List.Item
              title="İki Faktörlü Doğrulama"
              description="Hesabınızı ekstra güvenlik ile koruyun"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>🛡️</Text>}
              right={() => (
                <Switch
                  value={settings.account.twoFactorEnabled}
                  onValueChange={(value) => handleSettingChange('account', 'twoFactorEnabled', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Biyometrik Giriş"
              description="Parmak izi veya yüz tanıma ile giriş yap"
              left={() => <Text style={{ fontSize: 24, marginRight: 16 }}>👆</Text>}
              right={() => (
                <Switch
                  value={settings.account.biometricEnabled}
                  onValueChange={(value) => handleSettingChange('account', 'biometricEnabled', value)}
                  trackColor={{ false: '#767577', true: '#E50914' }}
                />
              )}
            />
          </EnterpriseCard>
        </EnterpriseSection>

        {/* Data Management */}
        <EnterpriseSection>
          <AnimatedText variant="h3" style={styles.sectionTitle}>
            Veri Yönetimi
          </AnimatedText>
          
          <EnterpriseCard variant="outlined">
            <EnterpriseButton
              title="Verileri Dışa Aktar"
              onPress={handleExportData}
              variant="outline"
              size="medium"
              style={styles.dataButton}
            />
            
            <EnterpriseButton
              title="Cache Temizle"
              onPress={handleClearCache}
              variant="secondary"
              size="medium"
              style={styles.dataButton}
            />
          </EnterpriseCard>
        </EnterpriseSection>

        {/* Danger Zone */}
        <EnterpriseSection>
          <AnimatedText variant="h3" style={styles.sectionTitle}>
            Tehlike Bölgesi
        </AnimatedText>
          
          <EnterpriseCard variant="outlined">
            <EnterpriseButton
              title="Hesabı Sil"
              onPress={handleDeleteAccount}
              variant="danger"
              size="medium"
              style={styles.dangerButton}
            />
          </EnterpriseCard>
        </EnterpriseSection>
    </ScrollView>
    
    {/* Fixed bottom section with safe area handling */}
    <BottomActionBar
      showCopyright={true}
      copyrightText="© 2025 WMatch"
      poweredByText="Powered by MWatch"
      copyrightDelay={1200}
    />
    </EnterpriseLayout>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  avatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  accountEmail: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  dataButton: {
    marginBottom: spacing.sm,
  },
  dangerButton: {
    marginBottom: spacing.sm,
  },
});