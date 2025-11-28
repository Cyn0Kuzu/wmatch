import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image, Text, SafeAreaView, Dimensions, Alert, Vibration, Linking } from 'react-native';
import { TextInput, Card, Button, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useCoreEngine } from '../core/CoreEngine';
import { AnimatedText } from '../components/ui/AnimatedText';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { showToast } from '../components/ui/ToastComponents';
import { MovieSearchComponent } from '../components/ui/MovieSearchComponent';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { PasswordStrengthIndicator } from '../components/ui/PasswordStrengthIndicator';
import { BottomActionBar } from '../components/ui/BottomActionBar';
import { spacing } from '../core/theme';
import { firestoreService, UserProfile as FirestoreUserProfile } from '../services/FirestoreService';
import { FirebaseService } from '../services/FirebaseService';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validateOptionalName,
  validateUsername, 
  validatePasswordMatch,
  validateUrl,
  validateMovieSelection 
} from '../utils/validation';
import { debounce } from '../utils/performance';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

const INTEREST_OPTIONS = [
  'Aksiyon', 'Macera', 'Animasyon', 'Komedi', 'Suç', 'Belgesel',
  'Dram', 'Aile', 'Fantastik', 'Tarih', 'Korku', 'Müzik',
  'Gizem', 'Romantik', 'Bilim Kurgu', 'Gerilim', 'Savaş', 'Western'
];
const isMediumScreen = height >= 700 && height < 800;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation();
  const { authService, tmdbService } = useCoreEngine();
  const firebaseService = FirebaseService.getInstance();
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const [selectedMovies, setSelectedMovies] = useState<any[]>([]);
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [interests, setInterests] = useState<string[]>([]);
  const [letterboxdLink, setLetterboxdLink] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  
  // Uniqueness validation states
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    message: string;
  }>({ isValid: true, isChecking: false, message: '' });
  
  const [usernameValidation, setUsernameValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    message: string;
  }>({ isValid: true, isChecking: false, message: '' });

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Email uniqueness check with debouncing
  const checkEmailUniqueness = debounce(async (email: string) => {
    if (!email) {
      setEmailValidation({ isValid: true, isChecking: false, message: '' });
      return;
    }

    // Basic email format validation first
    const emailValidationResult = validateEmail(email);
    if (!emailValidationResult.isValid) {
      setEmailValidation({ isValid: false, isChecking: false, message: emailValidationResult.error! });
      return;
    }

    setEmailValidation({ isValid: true, isChecking: true, message: 'Kontrol ediliyor...' });
    
    try {
      const isUnique = await firestoreService.isEmailUnique(email);
      if (isUnique) {
        setEmailValidation({ isValid: true, isChecking: false, message: 'E-posta kullanılabilir' });
      } else {
        setEmailValidation({ isValid: false, isChecking: false, message: 'Bu e-posta adresi zaten kullanılıyor' });
      }
    } catch (error: any) {
      console.warn('E-posta benzersizlik kontrolü hatası:', error);
      // If it's a permission error or network error, assume it's unique but warn user
      if (error.message?.includes('permission') || error.message?.includes('network') || error.message?.includes('unavailable')) {
        setEmailValidation({ isValid: true, isChecking: false, message: 'E-posta kontrol edilemedi, kayıt sırasında kontrol edilecek' });
      } else {
        setEmailValidation({ isValid: false, isChecking: false, message: error.message || 'E-posta kontrolü başarısız' });
      }
    }
  }, 500);

  // Username uniqueness check with debouncing
  const checkUsernameUniqueness = debounce(async (username: string) => {
    if (!username) {
      setUsernameValidation({ isValid: true, isChecking: false, message: '' });
      return;
    }

    // Basic username format validation first
    const usernameValidationResult = validateUsername(username);
    if (!usernameValidationResult.isValid) {
      setUsernameValidation({ isValid: false, isChecking: false, message: usernameValidationResult.error! });
      return;
    }

    setUsernameValidation({ isValid: true, isChecking: true, message: 'Kontrol ediliyor...' });
    
    try {
      const isUnique = await firestoreService.isUsernameUnique(username);
      if (isUnique) {
        setUsernameValidation({ isValid: true, isChecking: false, message: 'Kullanıcı adı kullanılabilir' });
      } else {
        setUsernameValidation({ isValid: false, isChecking: false, message: 'Bu kullanıcı adı zaten kullanılıyor' });
      }
    } catch (error: any) {
      console.warn('Kullanıcı adı benzersizlik kontrolü hatası:', error);
      // If it's a permission error or network error, assume it's unique but warn user
      if (error.message?.includes('permission') || error.message?.includes('network') || error.message?.includes('unavailable')) {
        setUsernameValidation({ isValid: true, isChecking: false, message: 'Kullanıcı adı kontrol edilemedi, kayıt sırasında kontrol edilecek' });
      } else {
        setUsernameValidation({ isValid: false, isChecking: false, message: error.message || 'Kullanıcı adı kontrolü başarısız' });
      }
    }
  }, 500);

  const pickImage = async () => {
    try {
      if (profilePhotos.length >= 7) {
        showToast('Maksimum 7 fotoğraf yükleyebilirsiniz', 'error');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Dating app standard ratio
        quality: 0.95, // Higher quality for better photos
        allowsMultipleSelection: false,
        exif: true, // Keep EXIF data for better quality
      });

      // Use only 'canceled' as 'cancelled' is deprecated
      const isCanceled = result.canceled;
      
      if (!isCanceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setProfilePhotos(prev => [...prev, imageUri]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showToast('Fotoğraf seçimi sırasında hata oluştu', 'error');
    }
  };

  const removePhoto = (index: number) => {
    setProfilePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const reorderPhotos = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...profilePhotos];
    const [removed] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, removed);
    
    setProfilePhotos(newPhotos);
    
    // Haptic feedback for successful reorder
    if (Platform.OS === 'ios') {
      Vibration.vibrate(20);
    }
    
    // Yer değiştirme sonrası seçim kapanmamalı - selectedIndex güncelle
    setSelectedIndex(toIndex);
  };

  // Fotoğraf seçme/yer değiştirme handler
  const handlePhotoTap = (index: number) => {
    if (selectedIndex === null) {
      // Hiçbir fotoğraf seçili değil - bu fotoğrafı seç
      setSelectedIndex(index);
            if (Platform.OS === 'ios') {
              Vibration.vibrate(10);
            }
    } else if (selectedIndex === index) {
      // Aynı fotoğrafa tekrar tıklandı - seçimi kaldır
      setSelectedIndex(null);
              if (Platform.OS === 'ios') {
                Vibration.vibrate(10);
              }
        } else {
      // Başka bir fotoğrafa tıklandı - yer değiştir
      reorderPhotos(selectedIndex, index);
    }
  };


  const uploadImageToStorage = async (imageUri: string, userId: string, index: number): Promise<string | null> => {
    try {
      console.log(`Starting upload for photo ${index + 1}:`, imageUri);
      
      // Convert image URI to blob with better quality
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log(`Blob created for photo ${index + 1}, size:`, blob.size);
      
      // Create file path with better naming
      const fileName = `photo_${index}_${Date.now()}_high_quality.jpg`;
      const filePath = `users/${userId}/photos/${fileName}`;
      console.log(`Uploading to path:`, filePath);
      
      // Upload to Firebase Storage
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = (await import('../services/FirebaseService')).firebaseService.getStorage();
      
      if (!storage) {
        throw new Error('Firebase Storage not available');
      }

      const storageRef = ref(storage, filePath);
      
      // Upload blob to Firebase Storage
      const uploadResult = await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          userId: userId,
          photoIndex: index.toString(),
        }
      });
      
      console.log(`Upload completed for photo ${index + 1}`);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log(`Photo ${index + 1} uploaded successfully:`, downloadURL);
      
      return downloadURL;
    } catch (error: any) {
      console.error(`Error uploading photo ${index + 1}:`, error);
      showToast(`Fotoğraf ${index + 1} yüklenirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`, 'error');
      return null;
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const validateStep1 = () => {
    const firstNameValidation = validateName(firstName, 'Ad');
    if (!firstNameValidation.isValid) {
      showToast(firstNameValidation.error!, 'error');
      return false;
    }

    const lastNameValidation = validateOptionalName(lastName, 'Soyad');
    if (!lastNameValidation.isValid) {
      showToast(lastNameValidation.error!, 'error');
      return false;
    }

    const usernameValidationResult = validateUsername(username);
    if (!usernameValidationResult.isValid) {
      showToast(usernameValidationResult.error!, 'error');
      return false;
    }

    // Check username uniqueness
    if (!usernameValidation.isValid || usernameValidation.isChecking) {
      showToast('Lütfen kullanıcı adının benzersiz olduğunu kontrol edin', 'error');
      return false;
    }

    const emailValidationResult = validateEmail(email);
    if (!emailValidationResult.isValid) {
      showToast(emailValidationResult.error!, 'error');
      return false;
    }

    // Check email uniqueness
    if (!emailValidation.isValid || emailValidation.isChecking) {
      showToast('Lütfen e-posta adresinin benzersiz olduğunu kontrol edin', 'error');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (profilePhotos.length < 3) {
      showToast('En az 3 fotoğraf yüklemeniz gerekiyor', 'error');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      showToast(passwordValidation.error!, 'error');
      return false;
    }

    const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
    if (!passwordMatchValidation.isValid) {
      showToast(passwordMatchValidation.error!, 'error');
      return false;
    }

    return true;
  };

  const validateStep4 = () => {
    // Check if birth date is selected
    if (!birthDate) {
      showToast('Doğum tarihi seçmelisiniz', 'error');
      return false;
    }

    // Validate birth date
    const age = getAge(birthDate);
    if (age < 18) {
      showToast('18 yaşından küçükler kayıt olamaz', 'error');
      return false;
    }
    if (age > 120) {
      showToast('Geçerli bir doğum tarihi girin', 'error');
      return false;
    }

    // Check if gender is selected
    if (!gender || gender === 'prefer_not_to_say') {
      showToast('Cinsiyet seçmelisiniz', 'error');
      return false;
    }

    // Check if at least 3 interests are selected
    if (interests.length < 3) {
      showToast('Lütfen en az 3 ilgi alanı seçin', 'error');
      return false;
    }

    // Validate Letterboxd link if provided
    if (letterboxdLink.trim()) {
      const letterboxdRegex = /^https?:\/\/(www\.)?letterboxd\.com\/[a-zA-Z0-9_-]+\/?$/;
      if (!letterboxdRegex.test(letterboxdLink.trim())) {
        showToast('Geçerli bir Letterboxd profil linki girin', 'error');
        return false;
      }
    }

    return true;
  };

  const validateStep5 = () => {
    const movieValidation = validateMovieSelection(selectedMovies, 5);
    if (!movieValidation.isValid) {
      showToast(movieValidation.error!, 'error');
      return false;
    }

    return true;
  };

  const nextStep = () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      case 4:
        isValid = validateStep4();
        break;
      case 5:
        isValid = validateStep5();
        break;
    }

    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRegister = async () => {
    if (!validateStep5()) return;

    if (!privacyAccepted) {
      Alert.alert('Onay Gerekli', 'Kayıt olmak için Gizlilik Politikası ve Kullanım Şartları\'nı kabul etmelisiniz.');
      return;
    }

    // Final uniqueness checks before registration
    if (!emailValidation.isValid || emailValidation.isChecking) {
      showToast('Lütfen e-posta adresinin benzersiz olduğunu kontrol edin', 'error');
      return;
    }

    if (!usernameValidation.isValid || usernameValidation.isChecking) {
      showToast('Lütfen kullanıcı adının benzersiz olduğunu kontrol edin', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Starting registration process...');
      
      // 1. SADECE Auth user oluştur
      const userCredential = await authService.signUp(email, password);
      const user = userCredential.user;

      console.log('✅ Auth user created:', user.uid);
      console.log('📧 User email:', user.email);

      // 2. HEMEN email verification gönder
      console.log('📧 Sending email verification FIRST...');
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(user, {
        url: 'https://mwatch-69a6f.firebaseapp.com',
        handleCodeInApp: false,
      });
      console.log('✅ Email verification sent to:', email);

      // 3. Temel profil bilgilerini AsyncStorage'a kaydet (email onaylandıktan sonra kullanılacak)
      const pendingProfileData: any = {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        firstName: firstName || '',
        bio: bio.trim() || '',
        birthDate: birthDate ? birthDate.toISOString().split('T')[0] : '',
        gender: gender || 'prefer_not_to_say',
        interests: interests || [],
        selectedMovies: selectedMovies || [],
        profilePhotos: profilePhotos || [],
      };
      
      // Add optional fields only if they have values
      if (lastName && lastName.trim()) pendingProfileData.lastName = lastName.trim();
      if (letterboxdLink && letterboxdLink.trim()) pendingProfileData.letterboxdLink = letterboxdLink.trim();
      
      // AsyncStorage'a kaydet
      await import('@react-native-async-storage/async-storage').then(async (AsyncStorage) => {
        await AsyncStorage.default.setItem(
          `pending_profile_${user.uid}`,
          JSON.stringify(pendingProfileData)
        );
        console.log('💾 Profile data saved to AsyncStorage for later completion');
      });

      // 4. Kullanıcıyı HEMEN çıkış yaptır
      console.log('🚪 Signing out user - profile will be completed after email verification');
      await authService.signOut();

      // NOT: Fotoğraflar ve database kayıt email onaylandıktan sonra yapılacak
      
      // Başarı mesajı göster
      Alert.alert(
        'Hesap Oluşturuldu!',
        '📧 Email Doğrulama Linki Gönderildi!\n\n' +
        `Email adresinize (${email}) bir doğrulama linki gönderdik.\n\n` +
        '✅ Lütfen email kutunuzu kontrol edin\n' +
        '📁 Spam/Junk klasörünü de kontrol edin\n' +
        '🔗 Doğrulama linkine tıklayın\n\n' +
        '⚠️ Email doğrulaması yaptıktan sonra giriş yapın!\n\n' +
        'İlk girişinizde profil bilgileriniz ve fotoğraflarınız kaydedilecektir.',
        [
          {
            text: 'Giriş Yap',
            onPress: () => {
              showToast('Email doğrulama linki gönderildi! Doğruladıktan sonra giriş yapın.', 'success');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as never }],
              });
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      // Handle specific error types
      if (error.message?.includes('zaten kayıtlı') || error.message?.includes('email-already-in-use')) {
        showToast('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.', 'error');
        // Navigate to login screen
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' as never }],
          });
        }, 2000);
      } else if (error.message?.includes('zayıf') || error.message?.includes('weak-password')) {
        showToast('Şifre çok zayıf. Daha güçlü bir şifre seçin.', 'error');
      } else if (error.message?.includes('Geçersiz e-posta') || error.message?.includes('invalid-email')) {
        showToast('Geçersiz e-posta adresi formatı.', 'error');
      } else if (error.message?.includes('İnternet') || error.message?.includes('network')) {
        showToast('İnternet bağlantınızı kontrol edin ve tekrar deneyin.', 'error');
      } else if (error.message?.includes('zaten kullanılıyor') || error.message?.includes('username-already-exists')) {
        showToast('Bu bilgiler zaten kullanılıyor. Farklı bilgiler deneyin.', 'error');
      } else if (error.message?.includes('too-many-requests')) {
        showToast('Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.', 'error');
      } else {
        showToast(error.message || 'Kayıt sırasında bir hata oluştu', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            index + 1 <= currentStep ? styles.stepDotActive : styles.stepDotInactive
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.stepContent}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={600} style={styles.stepTitle}>
        Kişisel Bilgiler
              </AnimatedText>
      
      <View style={styles.inputContainer}>
        <TextInput
          label="Ad"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
          mode="outlined"
          textColor="#FFFFFF"
          outlineColor="#333333"
          activeOutlineColor="#E50914"
        />
        
                <TextInput
          label="Soyad (Opsiyonel)"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
                  mode="outlined"
          textColor="#FFFFFF"
          outlineColor="#333333"
          activeOutlineColor="#E50914"
        />
        
        <TextInput
          label="Kullanıcı Adı"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            checkUsernameUniqueness(text);
          }}
          style={styles.input}
          mode="outlined"
          textColor="#FFFFFF"
          outlineColor={usernameValidation.isValid ? "#333333" : "#FF4444"}
          activeOutlineColor={usernameValidation.isValid ? "#E50914" : "#FF4444"}
        />
        {usernameValidation.message && (
          <Text style={[styles.validationMessage, { color: usernameValidation.isValid ? '#4CAF50' : '#FF4444' }]}>
            {usernameValidation.isChecking ? '⏳' : usernameValidation.isValid ? '✅' : '❌'} {usernameValidation.message}
          </Text>
        )}

        <TextInput
          label="E-posta"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            checkEmailUniqueness(text);
          }}
          style={styles.input}
          mode="outlined"
          textColor="#FFFFFF"
          outlineColor={emailValidation.isValid ? "#333333" : "#FF4444"}
          activeOutlineColor={emailValidation.isValid ? "#E50914" : "#FF4444"}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {emailValidation.message && (
          <Text style={[styles.validationMessage, { color: emailValidation.isValid ? '#4CAF50' : '#FF4444' }]}>
            {emailValidation.isChecking ? '⏳' : emailValidation.isValid ? '✅' : '❌'} {emailValidation.message}
          </Text>
        )}
      </View>
    </Animatable.View>
  );

  const renderStep2 = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.stepContent}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={600} style={styles.stepTitle}>
        Profil Fotoğrafları
      </AnimatedText>
      
      
      <View style={styles.photoUploadSection}>
        <View style={styles.photoUploadHeader}>
          <Text style={styles.photoUploadTitle}>Fotoğraflarınız</Text>
          <Text style={styles.photoUploadSubtitle}>
            En az 3, en fazla 7 fotoğraf yükleyin ({profilePhotos.length}/7)
          </Text>
          </View>
      
      <View style={styles.photoGrid}>
          {profilePhotos.map((photo, index) => {
            const isSelected = selectedIndex === index;
            
            return (
              <TouchableOpacity
              key={index} 
                activeOpacity={0.8}
                onPress={() => handlePhotoTap(index)}
              style={[
                styles.photoItem,
                  // Seçili fotoğraf yeşil, seçilmeyenler kırmızı
                  isSelected ? styles.photoItemSelected : styles.photoItemUnselected
                ]}
            >
              <Image source={{ uri: photo }} style={styles.uploadedPhoto} />
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={() => removePhoto(index)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.photoIndex}>
                <Text style={styles.photoIndexText}>{index + 1}</Text>
          </View>
                {isSelected && (
                  <View style={styles.photoSelectedIndicator}>
                    <Text style={styles.photoSelectedText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          
          {profilePhotos.length < 7 && (
            <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
              <View style={styles.addPhotoPlaceholder}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
              </View>
          </TouchableOpacity>
          )}
        </View>
        
        {profilePhotos.length < 3 && (
          <Text style={styles.photoWarning}>
            En az 3 fotoğraf yüklemeniz gerekiyor
          </Text>
            )}
      </View>
      
    </Animatable.View>
  );

  const renderStep3 = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.stepContent}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={600} style={styles.stepTitle}>
        Güvenlik
      </AnimatedText>
      
      <View style={styles.inputContainer}>
        <View style={styles.passwordContainer}>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
              mode="outlined"
              textColor="#FFFFFF"
              outlineColor="#333333"
              activeOutlineColor="#E50914"
              secureTextEntry={!showPassword}
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
          <PasswordStrengthIndicator password={password} />
        </View>

        <View style={styles.passwordContainer}>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              label="Şifre Tekrarı"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.passwordInput}
              mode="outlined"
              textColor="#FFFFFF"
              outlineColor="#333333"
              activeOutlineColor="#E50914"
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIconButton}
            >
              <Text style={styles.eyeIconText}>
                {showConfirmPassword ? "●" : "○"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animatable.View>
  );

  const renderStep4 = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.stepContent}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={600} style={styles.stepTitle}>
        Profil Bilgileri
      </AnimatedText>
      
      <AnimatedText variant="body1" animation="fadeInUp" delay={800} style={styles.stepDescription}>
        Profilinizi kişiselleştirin
      </AnimatedText>

      <View style={styles.formContainer}>
        {/* Biography */}
        <View style={styles.inputContainer}>
          <TextInput
            label="Biyografi"
            value={bio}
            onChangeText={setBio}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.textInput}
            textColor="#FFFFFF"
            placeholder="Kendinizi tanıtın..."
            maxLength={500}
            right={<TextInput.Affix text={`${bio.length}/500`} />}
          />
        </View>

        {/* Birth Date */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Doğum Tarihi</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[
              styles.datePickerText,
              !birthDate && styles.datePickerPlaceholder
            ]}>
              {birthDate ? formatDate(birthDate) : 'Doğum tarihinizi seçin'}
            </Text>
            <Text style={styles.datePickerIcon}>📅</Text>
          </TouchableOpacity>
          {birthDate && (
            <Text style={[
              styles.ageText,
              getAge(birthDate) >= 18 ? styles.ageTextValid : styles.ageTextInvalid
            ]}>
              Yaş: {getAge(birthDate)}
            </Text>
          )}
        </View>

        {/* Gender */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cinsiyet</Text>
          <View style={styles.genderContainer}>
            {['male', 'female', 'other'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderOption,
                  gender === option && styles.genderOptionSelected
                ]}
                onPress={() => setGender(option)}
              >
                <Text style={[
                  styles.genderOptionText,
                  gender === option && styles.genderOptionTextSelected
                ]}>
                  {option === 'male' ? 'Erkek' :
                   option === 'female' ? 'Kadın' : 'Diğer'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Interests */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>İlgi Alanları</Text>
          <View style={styles.interestsContainer}>
            {INTEREST_OPTIONS.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestChip,
                  interests.includes(interest) && styles.interestChipSelected
                ]}
                onPress={() => {
                  if (interests.includes(interest)) {
                    setInterests(interests.filter(i => i !== interest));
                  } else {
                    setInterests([...interests, interest]);
                  }
                }}
              >
                <Text style={[
                  styles.interestChipText,
                  interests.includes(interest) && styles.interestChipTextSelected
                ]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[
            styles.interestsCount,
            interests.length < 3 && styles.interestsCountError
          ]}>
            {interests.length} seçildi {interests.length < 3 && '(Minimum 3 seçin)'}
          </Text>
        </View>

        {/* Letterboxd Link */}
        <View style={styles.inputContainer}>
          <TextInput
            label="Letterboxd Profil Linki (Opsiyonel)"
            value={letterboxdLink}
            onChangeText={setLetterboxdLink}
            mode="outlined"
            style={styles.textInput}
            textColor="#FFFFFF"
            placeholder="Örnek: https://letterboxd.com/kullanici-adi"
            maxLength={200}
          />
        </View>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={birthDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </Animatable.View>
  );

  const renderStep5 = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.stepContent}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={600} style={styles.stepTitle}>
        Film Tercihleri
      </AnimatedText>
      
      <MovieSearchComponent
        selectedMovies={selectedMovies}
        onMoviesSelected={setSelectedMovies}
        tmdbService={tmdbService}
      />

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
            <Text style={styles.privacyLinkText} onPress={() => {
              const privacyUrl = 'https://cyn0kuzu.github.io/wmatch/';
              Linking.openURL(privacyUrl).catch(err => {
                console.error('URL açılamadı:', err);
                Alert.alert('Hata', 'Gizlilik politikası sayfası açılamadı.');
              });
            }}>
              Gizlilik Politikası
            </Text>
            {' '}ve{' '}
            <Text style={styles.privacyLinkText} onPress={() => {
              const privacyUrl = 'https://cyn0kuzu.github.io/wmatch/';
              Linking.openURL(privacyUrl).catch(err => {
                console.error('URL açılamadı:', err);
                Alert.alert('Hata', 'Gizlilik politikası sayfası açılamadı.');
              });
            }}>
              Kullanım Şartları
            </Text>
            'nı okudum ve kabul ediyorum.
          </Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep1();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.gradient}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animatable.View animation="fadeInUp" duration={800} style={styles.content}>
              <View style={styles.header}>
                <AnimatedText variant="h2" animation="fadeInUp" delay={200} style={styles.title}>
                  Hesap Oluştur
                </AnimatedText>
                <AnimatedText variant="body1" animation="fadeInUp" delay={400} style={styles.subtitle}>
                  Adım {currentStep}/{totalSteps}
                </AnimatedText>
              </View>

              {renderStepIndicator()}
              {renderCurrentStep()}
              
              {/* Spacer to push buttons to bottom */}
              <View style={styles.spacer} />
            </Animatable.View>
          </ScrollView>

          {/* Fixed bottom section with safe area handling */}
          <BottomActionBar
            actionButton={
              currentStep < totalSteps
                ? {
                    title: 'İleri',
                    onPress: nextStep,
                    variant: 'primary'
                  }
                : {
                    title: 'Kayıt Ol',
                    onPress: handleRegister,
                    loading: loading,
                    disabled: !privacyAccepted,
                    variant: 'primary'
                  }
            }
            showCopyright={true}
            copyrightText="© 2025 WMatch"
            poweredByText="Powered by MWatch"
            buttonDelay={1000}
            copyrightDelay={1200}
          />
        </View>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradient: { 
    flex: 1, 
    backgroundColor: '#000000',
    minHeight: height,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: height,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.sm,
    justifyContent: 'center',
    flex: 0.15,
  },
  logoContainer: {
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  logo: { 
    width: isSmallScreen ? 140 : isMediumScreen ? 160 : 180, 
    height: isSmallScreen ? 56 : isMediumScreen ? 64 : 72,
  },
  title: { 
    color: '#FFFFFF', 
    marginBottom: spacing.xs,
    fontSize: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: { 
    color: '#CCCCCC', 
    textAlign: 'center', 
    marginBottom: spacing.xs,
    fontSize: isSmallScreen ? 10 : 12,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    backgroundColor: '#E50914',
  },
  stepDotInactive: {
    backgroundColor: '#333333',
  },
  stepContent: {
    width: '100%',
    marginBottom: spacing.sm,
    flex: 0.6,
    justifyContent: 'flex-start',
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 14 : isMediumScreen ? 16 : 18,
    textAlign: 'center',
    marginBottom: 0,
    fontWeight: 'bold',
  },
  stepSubtitle: {
    color: '#CCCCCC',
    fontSize: isSmallScreen ? 9 : 10,
    textAlign: 'center',
    marginBottom: 0,
  },
  inputContainer: {
    width: '100%',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'transparent',
  },
  passwordContainer: {
    width: '100%',
  },
  passwordInputWrapper: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    backgroundColor: 'transparent',
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
  photoUploadSection: {
    width: '100%',
    marginTop: spacing.sm,
  },
  photoUploadHeader: {
    marginBottom: spacing.md,
  },
  photoUploadTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  photoUploadSubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoItem: {
    position: 'relative',
    width: (width - spacing.lg * 2 - spacing.sm * 2) / 3,
    height: ((width - spacing.lg * 2 - spacing.sm * 2) / 3) * 1.33, // 3:4 ratio for dating app
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E50914',
  },
  photoItemDragging: {
    borderColor: '#FFC107',
    borderWidth: 3,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#FFC107',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  photoItemDropZone: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  photoItemSelected: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    borderStyle: 'solid',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  photoItemUnselected: {
    borderColor: '#E50914',
    borderWidth: 2,
    borderStyle: 'solid',
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
  },
  photoSelectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  photoSelectedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  floatingPhoto: {
    position: 'absolute',
    width: (width - spacing.lg * 2 - spacing.sm * 2) / 3,
    height: ((width - spacing.lg * 2 - spacing.sm * 2) / 3) * 1.33,
    borderRadius: 12,
    zIndex: 2000,
    elevation: 20,
    // Grid ortasında başlaması için
    left: 0,
    top: 0,
  },
  floatingPhotoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  floatingPhotoShadow: {
    position: 'absolute',
    bottom: -8,
    left: 8,
    right: -8,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    zIndex: -1,
  },
  uploadedPhoto: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: (width - spacing.lg * 2 - spacing.sm * 2) / 3,
    height: ((width - spacing.lg * 2 - spacing.sm * 2) / 3) * 1.33, // 3:4 ratio for dating app
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E50914',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  addPhotoText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '600',
  },
  photoWarning: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  photoIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  photoCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: '#333333',
  },
  photoCardHeader: {
    marginBottom: 0,
  },
  photoCardTitle: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    marginBottom: 0,
  },
  photoCardSubtitle: {
    color: '#CCCCCC',
    fontSize: isSmallScreen ? 8 : 10,
    fontStyle: 'italic',
  },
  profilePhotoContainer: {
    width: isSmallScreen ? 100 : isMediumScreen ? 110 : 120,
    height: isSmallScreen ? 100 : isMediumScreen ? 110 : 120,
    borderRadius: isSmallScreen ? 50 : isMediumScreen ? 55 : 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E50914',
    alignSelf: 'center',
    position: 'relative',
  },
  coverPhotoContainer: {
    width: '100%',
    height: isSmallScreen ? 80 : isMediumScreen ? 90 : 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E50914',
    position: 'relative',
  },
  profilePhotoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    padding: spacing.xs,
  },
  coverPhotoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    padding: spacing.sm,
  },
  photoIcon: {
    marginBottom: 0,
  },
  photoIconText: {
    fontSize: isSmallScreen ? 20 : 24,
  },
  photoPlaceholderText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 10 : 12,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 0,
  },
  photoPlaceholderSubtext: {
    color: '#CCCCCC',
    fontSize: isSmallScreen ? 8 : 10,
    textAlign: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlayText: {
    fontSize: 14,
  },
  selectedProfileImage: { 
    width: '100%', 
    height: '100%',
  },
  selectedCoverImage: { 
    width: '100%', 
    height: '100%',
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: 0,
  },
  movieCard: {
    width: '30%',
    padding: spacing.xs,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  movieCardSelected: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  movieCardText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 8 : 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  movieCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  selectionCount: {
    color: '#CCCCCC',
    fontSize: isSmallScreen ? 10 : 12,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  letterboxdContainer: {
    width: '100%',
    marginTop: spacing.md,
  },
  letterboxdLabel: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 12 : 14,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  letterboxdInput: {
    backgroundColor: 'transparent',
    marginBottom: spacing.xs,
  },
  letterboxdHint: {
    color: '#CCCCCC',
    fontSize: isSmallScreen ? 9 : 10,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genderOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
  },
  genderOptionSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
  },
  genderOptionText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  genderOptionTextSelected: {
    color: '#E50914',
    fontWeight: '600',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
  },
  interestChipSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
  },
  interestChipText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  interestChipTextSelected: {
    color: '#E50914',
    fontWeight: '600',
  },
  interestsCount: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
  },
  interestsCountError: {
    color: '#E50914',
  },
  stepDescription: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  formContainer: {
    gap: spacing.md,
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    textColor: '#FFFFFF',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
    minHeight: 56,
  },
  datePickerText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  datePickerPlaceholder: {
    color: '#CCCCCC',
  },
  datePickerIcon: {
    fontSize: 20,
    marginLeft: spacing.sm,
  },
  ageText: {
    color: '#E50914',
    fontSize: 14,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  spacer: {
    height: spacing.xl,
  },
  ageTextValid: {
    color: '#10B981',
  },
  ageTextInvalid: {
    color: '#E50914',
  },
  privacyContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
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
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  validationMessage: {
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textAlign: 'left',
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: '#CCCCCC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: isSmallScreen ? 12 : 14,
    textAlign: 'center',
  },
});