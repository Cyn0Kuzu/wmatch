import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import { useCoreEngine } from '../core/CoreEngine';
import { AnimatedText } from '../components/ui/AnimatedText';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { BottomActionBar } from '../components/ui/BottomActionBar';
import { showToast } from '../components/ui/ToastComponents';
import { firestoreService } from '../services/FirestoreService';
import { spacing } from '../core/theme';
import { validateName, validateUsername, validateUrl } from '../utils/validation';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

// Interest categories from dataset (same as RegisterScreen)
const INTEREST_OPTIONS = [
  'Aksiyon', 'Macera', 'Animasyon', 'Komedi', 'Suç', 'Belgesel',
  'Dram', 'Aile', 'Fantastik', 'Tarih', 'Korku', 'Müzik',
  'Gizem', 'Romantik', 'Bilim Kurgu', 'Gerilim', 'Savaş', 'Western'
];

interface EditProfileScreenProps {
  section: 'name' | 'username' | 'bio' | 'gender' | 'interests';
  currentData: any;
  onSave: (data: any) => void;
}

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { section, currentData, onSave } = route.params as EditProfileScreenProps;
  const { authService } = useCoreEngine();
  
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(currentData?.firstName || '');
  const [lastName, setLastName] = useState(currentData?.lastName || '');
  const [username, setUsername] = useState(currentData?.username || '');
  const [bio, setBio] = useState(currentData?.bio || '');
  const [gender, setGender] = useState(currentData?.gender || 'prefer_not_to_say');
  const [interests, setInterests] = useState<string[]>(currentData?.interests || []);
  const [letterboxdLink, setLetterboxdLink] = useState(currentData?.letterboxdLink || '');

  const handleSave = async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        showToast('Kullanıcı oturumu bulunamadı', 'error');
        return;
      }

      let updateData: any = {};

      switch (section) {
        case 'name':
          const firstNameValidation = validateName(firstName, 'Ad');
          if (!firstNameValidation.isValid) {
            showToast(firstNameValidation.error!, 'error');
            return;
          }
          updateData = { firstName, lastName };
          break;

        case 'username':
          const usernameValidation = validateUsername(username);
          if (!usernameValidation.isValid) {
            showToast(usernameValidation.error!, 'error');
            return;
          }
          // Check username uniqueness
          const isUnique = await firestoreService.isUsernameUnique(username);
          if (!isUnique) {
            showToast('Bu kullanıcı adı zaten kullanılıyor', 'error');
            return;
          }
          updateData = { username };
          break;

        case 'bio':
          updateData = { profile: { bio: bio.trim() } };
          break;

        case 'gender':
          updateData = { profile: { gender } };
          break;

        case 'interests':
          if (interests.length < 3) {
            showToast('En az 3 ilgi alanı seçmelisiniz', 'error');
            return;
          }
          updateData = { profile: { interests } };
          break;
      }

      // Update in Firestore
      await firestoreService.updateUserProfile(currentUser.uid, updateData);
      
      showToast('Profil başarıyla güncellendi', 'success');
      onSave(updateData);
      navigation.goBack();
      
    } catch (error: any) {
      console.error('Profile update error:', error);
      showToast(error.message || 'Güncelleme sırasında hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderNameEdit = () => (
    <View style={styles.editContainer}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={200} style={styles.editTitle}>
        Ad ve Soyad Düzenle
      </AnimatedText>
      
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
    </View>
  );

  const renderUsernameEdit = () => (
    <View style={styles.editContainer}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={200} style={styles.editTitle}>
        Kullanıcı Adı Düzenle
      </AnimatedText>
      
      <TextInput
        label="Kullanıcı Adı"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        mode="outlined"
        textColor="#FFFFFF"
        outlineColor="#333333"
        activeOutlineColor="#E50914"
        autoCapitalize="none"
      />
      
      <Text style={styles.helpText}>
        Kullanıcı adınız benzersiz olmalıdır. Sadece harf, rakam ve alt çizgi kullanabilirsiniz.
      </Text>
    </View>
  );

  const renderBioEdit = () => (
    <View style={styles.editContainer}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={200} style={styles.editTitle}>
        Biyografi Düzenle
      </AnimatedText>
      
      <TextInput
        label="Biyografi"
        value={bio}
        onChangeText={setBio}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={6}
        textColor="#FFFFFF"
        outlineColor="#333333"
        activeOutlineColor="#E50914"
        maxLength={500}
        right={<TextInput.Affix text={`${bio.length}/500`} />}
      />
      
      <Text style={styles.helpText}>
        Kendinizi tanıtın. Maksimum 500 karakter.
      </Text>
    </View>
  );

  const renderGenderEdit = () => (
    <View style={styles.editContainer}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={200} style={styles.editTitle}>
        Cinsiyet Düzenle
      </AnimatedText>
      
      <View style={styles.genderContainer}>
        {[
          { value: 'male', label: 'Erkek' },
          { value: 'female', label: 'Kadın' },
          { value: 'other', label: 'Diğer' },
          { value: 'prefer_not_to_say', label: 'Belirtmek İstemiyorum' }
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.genderOption,
              gender === option.value && styles.genderOptionSelected
            ]}
            onPress={() => setGender(option.value)}
          >
            <Text style={[
              styles.genderOptionText,
              gender === option.value && styles.genderOptionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderInterestsEdit = () => (
    <View style={styles.editContainer}>
      <AnimatedText variant="h3" animation="fadeInUp" delay={200} style={styles.editTitle}>
        İlgi Alanları Düzenle
      </AnimatedText>
      
      <Text style={styles.helpText}>
        En az 3 ilgi alanı seçmelisiniz. İstediğiniz kadar seçebilirsiniz.
      </Text>
      
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
  );

  const renderCurrentEdit = () => {
    switch (section) {
      case 'name':
        return renderNameEdit();
      case 'username':
        return renderUsernameEdit();
      case 'bio':
        return renderBioEdit();
      case 'gender':
        return renderGenderEdit();
      case 'interests':
        return renderInterestsEdit();
      default:
        return renderNameEdit();
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
              {renderCurrentEdit()}
            </Animatable.View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      
      {/* Fixed bottom section with safe area handling */}
      <BottomActionBar
        actionButton={{
          title: 'Kaydet',
          onPress: handleSave,
          loading: loading,
          variant: 'primary'
        }}
        secondaryButton={{
          title: 'İptal',
          onPress: () => navigation.goBack(),
          variant: 'outline'
        }}
        showCopyright={false}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  editContainer: {
    flex: 1,
  },
  editTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: spacing.md,
  },
  helpText: {
    color: '#8C8C8C',
    fontSize: 14,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  genderContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  genderOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: '#E50914',
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
  },
  genderOptionText: {
    color: '#8C8C8C',
    fontSize: 16,
  },
  genderOptionTextSelected: {
    color: '#E50914',
    fontWeight: '600',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
    color: '#8C8C8C',
    fontSize: 14,
  },
  interestChipTextSelected: {
    color: '#E50914',
    fontWeight: '600',
  },
  interestsCount: {
    color: '#8C8C8C',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  interestsCountError: {
    color: '#E50914',
  },
});
