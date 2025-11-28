import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SwipeOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
  onDontShowAgain?: () => void;
}

const { width } = Dimensions.get('window');

export const SwipeOnboardingModal: React.FC<SwipeOnboardingModalProps> = ({
  visible,
  onClose,
  onDontShowAgain,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <Text style={styles.title}>🎬 Swipe Nasıl Kullanılır?</Text>
              
              <View style={styles.instructionCard}>
                <Text style={styles.instructionTitle}>👉 Sağa Kaydır = Beğen</Text>
                <Text style={styles.instructionText}>
                  Kullanıcıyı beğendiyseniz kartı sağa kaydırın veya sağdaki kalp butonuna basın.
                </Text>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionTitle}>👈 Sola Kaydır = Geç</Text>
                <Text style={styles.instructionText}>
                  Kullanıcıyı beğenmediyseniz kartı sola kaydırın veya soldaki X butonuna basın.
                </Text>
              </View>

              <View style={styles.instructionCard}>
                <Text style={styles.instructionTitle}>⬇️ Aşağı Kaydır = Geri Al</Text>
                <Text style={styles.instructionText}>
                  Son yaptığınız swipe işlemini geri almak için kartı aşağı kaydırın.
                  {'\n'}Ücretsiz kullanıcılar için günlük 5 geri alma hakkı vardır.
                </Text>
              </View>

              <View style={styles.limitCard}>
                <Text style={styles.limitTitle}>📊 Günlük Limitler</Text>
                <Text style={styles.limitText}>
                  • Ücretsiz: 2 swipe/gün (Demo){'\n'}
                  • Geri alma: 5 hak/gün{'\n'}
                  • Premium: Sınırsız swipe ve geri alma
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Tamam, Anladım</Text>
                </TouchableOpacity>

                {onDontShowAgain && (
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={onDontShowAgain}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.secondaryButtonText}>Bir Daha Gösterme</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  instructionCard: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#E50914',
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  limitCard: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  limitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  limitText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#E50914',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  secondaryButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
});

