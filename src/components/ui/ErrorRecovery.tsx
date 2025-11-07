import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CacheCleanupUtil } from '../../utils/CacheCleanupUtil';
import { logger } from '../../utils/Logger';

interface ErrorRecoveryProps {
  onRetry?: () => void;
  error?: Error;
  context?: string;
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({ 
  onRetry, 
  error, 
  context = 'Unknown' 
}) => {
  const [isRecovering, setIsRecovering] = useState(false);

  const handleCacheCleanup = async () => {
    try {
      setIsRecovering(true);
      await CacheCleanupUtil.clearAllCache();
      Alert.alert(
        'Cache Temizlendi',
        'Uygulama önbelleği başarıyla temizlendi. Uygulamayı yeniden başlatın.',
        [{ text: 'Tamam', onPress: () => onRetry?.() }]
      );
    } catch (error) {
      logger.error('Cache cleanup failed', 'ErrorRecovery', error);
      Alert.alert('Hata', 'Önbellek temizlenirken bir hata oluştu.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRetry = () => {
    onRetry?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
        <Text style={styles.errorMessage}>
          Uygulamada beklenmeyen bir hata meydana geldi. Aşağıdaki seçenekleri deneyebilirsiniz:
        </Text>
        
        {error && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsTitle}>Hata Detayları:</Text>
            <Text style={styles.errorDetailsText}>
              {error.message || 'Bilinmeyen hata'}
            </Text>
            <Text style={styles.errorContextText}>
              Konum: {context}
            </Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.retryButton]} 
            onPress={handleRetry}
          >
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.cleanupButton]} 
            onPress={handleCacheCleanup}
            disabled={isRecovering}
          >
            <Text style={styles.buttonText}>
              {isRecovering ? 'Temizleniyor...' : 'Önbelleği Temizle'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.helpText}>
          Sorun devam ederse, uygulamayı kapatıp yeniden açmayı deneyin.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#8C8C8C',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorDetails: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  errorDetailsTitle: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetailsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorContextText: {
    color: '#8C8C8C',
    fontSize: 12,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#E50914',
  },
  cleanupButton: {
    backgroundColor: '#666666',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    color: '#8C8C8C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

