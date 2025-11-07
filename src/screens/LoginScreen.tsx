import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, SafeAreaView, Dimensions, TouchableOpacity, Text, Alert } from 'react-native';
import { TextInput, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import { useCoreEngine } from '../core/CoreEngine';
import { AnimatedText } from '../components/ui/AnimatedText';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { showToast } from '../components/ui/ToastComponents';
import { BottomActionBar } from '../components/ui/BottomActionBar';
import { spacing } from '../core/theme';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;
const isMediumScreen = height >= 700 && height < 800;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { authService } = useCoreEngine();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const completePendingProfile = async (user: any) => {
    try {
      console.log('🔍 Checking for pending profile data...');
      
      // AsyncStorage'dan pending data'yı al
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const pendingDataStr = await AsyncStorage.getItem(`pending_profile_${user.uid}`);
      
      if (!pendingDataStr) {
        console.log('ℹ️ No pending profile data found');
        return;
      }

      console.log('📦 Pending profile data found, completing registration...');
      showToast('Profil bilgileriniz kaydediliyor...', 'info');
      
      const pendingData = JSON.parse(pendingDataStr);
      const uploadedPhotos: string[] = [];

      // Fotoğrafları yükle
      if (pendingData.profilePhotos && pendingData.profilePhotos.length > 0) {
        console.log(`📸 Uploading ${pendingData.profilePhotos.length} photos...`);
        
        const { firestoreService } = await import('../services/FirestoreService');
        const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const { firebaseService } = await import('../services/FirebaseService');
        const storage = firebaseService.getStorage();
        
        for (let i = 0; i < pendingData.profilePhotos.length; i++) {
          try {
            const photoUri = pendingData.profilePhotos[i];
            const response = await fetch(photoUri);
            const blob = await response.blob();
            
            const fileName = `photo_${i}_${Date.now()}.jpg`;
            const filePath = `users/${user.uid}/photos/${fileName}`;
            const storageRef = ref(storage, filePath);
            
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const url = await getDownloadURL(storageRef);
            uploadedPhotos.push(url);
            console.log(`✅ Photo ${i + 1} uploaded`);
          } catch (photoError) {
            console.error(`❌ Photo ${i + 1} upload failed:`, photoError);
          }
        }
      }

      // Seçilen filmleri favorilere dönüştür - undefined değerleri temizle
      const favorites = (pendingData.selectedMovies || []).map((movie: any) => {
        const favorite: any = {
          id: movie.id,
          title: movie.title || movie.name || '',
          media_type: movie.first_air_date ? 'tv' : 'movie',
          type: movie.first_air_date ? 'tv' : 'movie',
          addedAt: new Date(),
          isFavorite: true,
        };
        
        // Only add defined values
        if (movie.name) favorite.name = movie.name;
        if (movie.poster_path) favorite.poster_path = movie.poster_path;
        if (movie.backdrop_path) favorite.backdrop_path = movie.backdrop_path;
        if (movie.release_date) favorite.release_date = movie.release_date;
        if (movie.first_air_date) favorite.first_air_date = movie.first_air_date;
        if (movie.vote_average !== undefined) favorite.vote_average = movie.vote_average;
        if (movie.vote_count !== undefined) favorite.vote_count = movie.vote_count;
        if (movie.genre_ids) favorite.genre_ids = movie.genre_ids;
        
        return favorite;
      });

      // Firestore profile oluştur - undefined değerleri temizle
      const { firestoreService } = await import('../services/FirestoreService');
      
      const profileData: any = {
        uid: user.uid,
        email: pendingData.email || user.email || '',
        username: pendingData.username || '',
        firstName: pendingData.firstName || '',
        profilePhotos: uploadedPhotos,
        selectedMovies: pendingData.selectedMovies || [],
        favorites: favorites,
        profile: {
          bio: pendingData.bio || '',
          birthDate: pendingData.birthDate || '',
          gender: pendingData.gender || 'prefer_not_to_say',
          interests: pendingData.interests || [],
          location: '',
        },
      };
      
      // Add optional fields only if they exist
      if (pendingData.lastName) profileData.lastName = pendingData.lastName;
      if (pendingData.letterboxdLink) profileData.letterboxdLink = pendingData.letterboxdLink;
      
      await firestoreService.createUserProfile(user.uid, profileData);
      
      console.log(`✅ ${favorites.length} favorite movies added automatically`);

      // Wait for Firestore to sync (important!)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify profile was created
      const verifyProfile = await firestoreService.getUserDocument(user.uid);
      if (!verifyProfile) {
        throw new Error('Profile creation verification failed');
      }
      console.log('✅ Profile verified in Firestore');

      // AsyncStorage'dan sil
      await AsyncStorage.removeItem(`pending_profile_${user.uid}`);
      console.log('✅ Profile completed and pending data removed');
      showToast(`Profil tamamlandı! ${uploadedPhotos.length} fotoğraf yüklendi.`, 'success');
      
    } catch (error) {
      console.error('❌ Error completing pending profile:', error);
      // Hata olsa bile devam et (profil sonra tamamlanabilir)
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await authService.signIn(email, password);
      const user = userCredential.user;
      
      console.log('✅ Login successful:', user.uid);
      
      // Email doğrulandıysa pending profile data kontrolü yap
      if (user.emailVerified) {
        await completePendingProfile(user);
      }
      
      showToast('Tekrar hoş geldiniz!', 'success');
      console.log('Login successful, navigation will be handled by AppNavigator');
      
      // Navigation will be handled automatically by AppNavigator
      // based on authentication state change
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Email doğrulama kontrolü
      if (error.message === 'EMAIL_NOT_VERIFIED') {
        Alert.alert(
          '📧 Email Doğrulaması Gerekli',
          'Giriş yapabilmek için email adresinizi doğrulamanız gerekiyor.\n\n' +
          '✅ Email adresinize gönderilen doğrulama linkine tıklayın\n' +
          '📁 Spam/Junk klasörünü kontrol etmeyi unutmayın\n' +
          '🔄 Doğrulama linkini alamadıysanız yeniden gönderebilirsiniz',
          [
            {
              text: 'İptal',
              style: 'cancel',
            },
            {
              text: 'Doğrulandı mı Kontrol Et',
              onPress: async () => {
                try {
                  const isVerified = await authService.checkEmailVerification();
                  if (isVerified) {
                    showToast('Email doğrulandı! Giriş yapabilirsiniz.', 'success');
                    // Otomatik giriş yap
                    await handleLogin();
                  } else {
                    showToast('Email henüz doğrulanmamış. Lütfen emailinizdeki linke tıklayın.', 'info');
                  }
                } catch (checkError) {
                  console.error('Check error:', checkError);
                  showToast('Doğrulama kontrolü yapılamadı', 'error');
                }
              },
            },
            {
              text: 'Yeniden Gönder',
              onPress: async () => {
                try {
                  await authService.resendVerificationEmail(error.user);
                  showToast('Doğrulama linki yeniden gönderildi!', 'success');
                  Alert.alert(
                    '📧 Email Gönderildi',
                    `Doğrulama linki ${email} adresine gönderildi.\n\n` +
                    'Lütfen email kutunuzu kontrol edin ve linke tıklayın.\n' +
                    'Spam klasörünü de kontrol etmeyi unutmayın.',
                    [{ text: 'Tamam' }]
                  );
                } catch (resendError: any) {
                  console.error('Resend error:', resendError);
                  showToast('Doğrulama linki gönderilemedi', 'error');
                }
              },
            },
          ]
        );
      } else {
        showToast(error.message || 'Giriş işlemi başarısız', 'error');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleGoToRegister = () => navigation.navigate('Register' as never);
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Welcome' as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.gradient}>
          <Animatable.View animation="fadeInUp" duration={800} style={styles.content}>
              <View style={styles.header}>
                <AnimatedText variant="h2" animation="fadeInUp" delay={200} style={styles.title}>
                  Giriş Yap
                </AnimatedText>
                <AnimatedText variant="body1" animation="fadeInUp" delay={400} style={styles.subtitle}>
                  Hesabınıza giriş yapın
                </AnimatedText>
              </View>

            <Card style={styles.formCard}>
              <Card.Content style={styles.formContent}>
                <TextInput
                  label="E-posta"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={styles.input}
                  textColor="#FFFFFF"
                  outlineColor="#333333"
                  activeOutlineColor="#E50914"
                  theme={{ colors: { primary: '#E50914', surface: '#141414', text: '#FFFFFF' } }}
                  textAlign="center"
                />

                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    label="Şifre"
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    style={styles.passwordInput}
                    textColor="#FFFFFF"
                    outlineColor="#333333"
                    activeOutlineColor="#E50914"
                    theme={{ colors: { primary: '#E50914', surface: '#141414', text: '#FFFFFF' } }}
                    textAlign="center"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconButton}
                  >
                    <Text style={styles.eyeIconText}>
                      {showPassword ? "●" : "○"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <AnimatedButton
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  animation="pulse"
                  delay={600}
                  style={styles.loginButton}
                  buttonColor="#E50914"
                  labelStyle={styles.buttonLabel}
                >
                  Giriş Yap
                </AnimatedButton>

              </Card.Content>
            </Card>

              <View style={styles.footer}>
                <AnimatedText variant="body2" animation="fadeInUp" delay={800} style={styles.footerText}>
                  Hesabınız yok mu?{' '}
                  <AnimatedText variant="body2" style={styles.linkText} onPress={handleGoToRegister}>
                    Kayıt Ol
                  </AnimatedText>
                </AnimatedText>
              </View>
          </Animatable.View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Fixed bottom section with safe area handling */}
      <BottomActionBar
        secondaryButton={{
          title: 'Ana Sayfaya Dön',
          onPress: handleGoBack,
          variant: 'outline'
        }}
        showCopyright={true}
        copyrightText="© 2025 WMatch"
        poweredByText="Powered by MeMoDe"
        buttonDelay={1000}
        copyrightDelay={1200}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  keyboardView: {
    flex: 1,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: height,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  title: { 
    color: '#FFFFFF', 
    marginBottom: spacing.xs,
    fontSize: isSmallScreen ? 24 : isMediumScreen ? 28 : 32,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: { 
    color: '#8C8C8C',
    fontSize: isSmallScreen ? 14 : 16,
    textAlign: 'center',
    marginBottom: 0,
  },
  formCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    marginBottom: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formContent: { 
    padding: spacing.lg 
  },
  input: { 
    marginBottom: spacing.md, 
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  passwordInputWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  passwordInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingRight: 50, // Space for eye icon
  },
  eyeIconButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
    padding: 8,
  },
  eyeIconText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loginButton: { 
    marginTop: spacing.md, 
    paddingVertical: spacing.md,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#E50914',
  },
  footer: { 
    alignItems: 'center',
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  footerText: { 
    color: '#8C8C8C', 
    marginBottom: 0,
    fontSize: 10,
    textAlign: 'center',
  },
  linkText: { 
    color: '#E50914', 
    fontWeight: '600' 
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  iconText: {
    fontSize: 20,
    color: '#8C8C8C',
  },
});
