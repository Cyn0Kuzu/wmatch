import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, Image, SafeAreaView, ScrollView, TouchableOpacity, Text, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import { AnimatedText } from '../components/ui/AnimatedText';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { BottomActionBar } from '../components/ui/BottomActionBar';
import { spacing } from '../core/theme';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const isMediumScreen = height >= 700 && height < 800;

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const handleGetStarted = () => {
    if (!privacyAccepted) {
      Alert.alert('Onay Gerekli', 'Devam etmek için Gizlilik Politikası ve Kullanım Şartları\'nı kabul etmelisiniz.');
      return;
    }
    navigation.navigate('Register' as never);
  };

  const handleSignIn = () => {
    if (!privacyAccepted) {
      Alert.alert('Onay Gerekli', 'Devam etmek için Gizlilik Politikası ve Kullanım Şartları\'nı kabul etmelisiniz.');
      return;
    }
    navigation.navigate('Login' as never);
  };

  const handlePrivacyLink = () => {
    const privacyUrl = 'https://[KULLANICI_ADI].github.io/[REPO_ADI]/';
    Linking.openURL(privacyUrl).catch(err => {
      console.error('URL açılamadı:', err);
      Alert.alert('Hata', 'Gizlilik politikası sayfası açılamadı. Lütfen daha sonra tekrar deneyin.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.gradient}>
          <Animatable.View animation="fadeIn" duration={1000} style={styles.content}>
            <Animatable.View animation="fadeInUp" delay={600} style={styles.titleContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.titleLogo}
                resizeMode="contain"
              />
            </Animatable.View>
            
            <AnimatedText variant="h3" animation="fadeInUp" delay={800} style={styles.subtitle}>
              Film zevkine göre eşleş
            </AnimatedText>
            
            <AnimatedText variant="body1" animation="fadeInUp" delay={1000} style={styles.description}>
              Binlerce film ve dizi arasından geçin. 
              Mükemmel eşleşmenizi bulun.
            </AnimatedText>

            {/* Gizlilik Politikası Onay Kutucuğu */}
            <View style={styles.privacyContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                  {privacyAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.privacyText}>
                  <Text style={styles.privacyLinkText} onPress={handlePrivacyLink}>
                    Gizlilik Politikası
                  </Text>
                  {' '}ve{' '}
                  <Text style={styles.privacyLinkText} onPress={handlePrivacyLink}>
                    Kullanım Şartları
                  </Text>
                  'nı okudum ve kabul ediyorum.
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <AnimatedButton
                mode="contained"
                onPress={handleGetStarted}
                animation="pulse"
                delay={1200}
                style={[styles.primaryButton, !privacyAccepted && styles.buttonDisabled]}
                buttonColor="#E50914"
                disabled={!privacyAccepted}
              >
                Hesap Oluştur
              </AnimatedButton>

              <AnimatedButton
                mode="outlined"
                onPress={handleSignIn}
                animation="pulse"
                delay={1400}
                style={[styles.secondaryButton, !privacyAccepted && styles.buttonDisabled]}
                textColor="#FFFFFF"
                disabled={!privacyAccepted}
              >
                Giriş Yap
              </AnimatedButton>
            </View>
          </Animatable.View>
        </View>
      </ScrollView>
      
      {/* Fixed bottom section with safe area handling */}
      <BottomActionBar
        showCopyright={true}
        copyrightText="© 2025 WMatch"
        poweredByText="Powered by MeMoDe"
        copyrightDelay={1600}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: height,
  },
  gradient: { 
    flex: 1, 
    backgroundColor: '#000000',
    minHeight: height,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: height - 50,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleLogo: {
    width: isSmallScreen ? 450 : isMediumScreen ? 550 : 250,
    height: isSmallScreen ? 200 : isMediumScreen ? 250 : 250,
  },
  subtitle: { 
    color: '#FFFFFF', 
    textAlign: 'center', 
    marginBottom: spacing.md,
    fontSize: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
  },
  description: { 
    color: '#8C8C8C', 
    textAlign: 'center', 
    marginBottom: spacing.xxl, 
    lineHeight: 24,
    fontSize: isSmallScreen ? 14 : 16,
    paddingHorizontal: spacing.sm,
  },
  buttonContainer: { 
    width: '100%', 
    gap: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  primaryButton: { 
    paddingVertical: spacing.sm, 
    borderRadius: 8,
    minHeight: 48,
  },
  secondaryButton: { 
    paddingVertical: spacing.sm, 
    borderRadius: 8, 
    borderColor: '#FFFFFF',
    minHeight: 48,
  },
  privacyContainer: {
    width: '100%',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#8C8C8C',
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  privacyText: {
    color: '#8C8C8C',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  privacyLinkText: {
    color: '#E50914',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
