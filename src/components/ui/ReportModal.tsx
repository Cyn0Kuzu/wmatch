import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Icon, Icons } from './IconComponent';
import { firestoreService } from '../../services/FirestoreService';
import { authService } from '../../services/AuthService';
import { FirebaseService } from '../../services/FirebaseService';
import { emailService } from '../../services/EmailService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserData: any;
}

const REPORT_CATEGORIES = [
  { id: 'spam', label: 'Spam veya Sahte Hesap' },
  { id: 'harassment', label: 'Taciz veya Zorbalık' },
  { id: 'inappropriate', label: 'Uygunsuz İçerik' },
  { id: 'fake', label: 'Sahte Bilgiler' },
  { id: 'scam', label: 'Dolandırıcılık' },
  { id: 'other', label: 'Diğer' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  reportedUserId,
  reportedUserData,
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const pickImages = async () => {
    try {
      // İzin kontrolü
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişim için izin gereklidir.');
        return;
      }

      // Galeriden çoklu seçim
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - screenshots.length, // Kalan slot sayısı
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        const totalImages = screenshots.length + newImages.length;
        
        if (totalImages > 5) {
          Alert.alert('Uyarı', 'En fazla 5 ekran görüntüsü ekleyebilirsiniz.');
          const remaining = 5 - screenshots.length;
          setScreenshots([...screenshots, ...newImages.slice(0, remaining)]);
        } else {
          setScreenshots([...screenshots, ...newImages]);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu.');
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const uploadScreenshots = async (): Promise<string[]> => {
    if (screenshots.length === 0) return [];

    const user = await authService.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const firebaseService = FirebaseService.getInstance();
    const storage = firebaseService.getStorage();
    if (!storage) throw new Error('Storage not initialized');

    const uploadedUrls: string[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < screenshots.length; i++) {
      try {
        const imageUri = screenshots[i];
        
        // Fetch image as blob
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();

        // Upload to Firebase Storage
        const imageRef = ref(
          storage,
          `reports/${user.uid}/${reportedUserId}/${timestamp}_${i}.jpg`
        );

        await uploadBytes(imageRef, blob);
        const downloadURL = await getDownloadURL(imageRef);
        uploadedUrls.push(downloadURL);
      } catch (error: any) {
        console.error(`Error uploading screenshot ${i + 1}:`, error);
        // Check if it's a permission error
        if (error?.code === 'storage/unauthorized' || 
            error?.message?.includes('permission') ||
            error?.message?.includes('unauthorized')) {
          throw new Error('Storage izni yok. Lütfen Firebase Storage kurallarını kontrol edin veya daha sonra tekrar deneyin.');
        }
        // Re-throw other errors
        throw error;
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    // Validasyon
    if (selectedCategories.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir kategori seçin.');
      return;
    }

    // Screenshots are optional but recommended
    // if (screenshots.length === 0) {
    //   Alert.alert('Uyarı', 'Lütfen en az bir ekran görüntüsü ekleyin.');
    //   return;
    // }

    if (!description.trim()) {
      Alert.alert('Uyarı', 'Lütfen açıklama girin.');
      return;
    }

    try {
      setLoading(true);

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
        setLoading(false);
        return;
      }

      // Ekran görüntülerini yükle (optional - report can be submitted without screenshots)
      let screenshotUrls: string[] = [];
      if (screenshots.length > 0) {
        try {
          screenshotUrls = await uploadScreenshots();
        } catch (uploadError: any) {
          console.error('Error uploading screenshots:', uploadError);
          // If upload fails, continue without screenshots but warn the user
          const errorMsg = uploadError?.message || 'Ekran görüntüleri yüklenemedi';
          if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
            Alert.alert(
              'Yükleme Hatası',
              'Ekran görüntüleri yüklenemedi (izin hatası). Bildirim ekran görüntüsü olmadan gönderilecek.',
              [{ text: 'Tamam' }]
            );
          } else {
            Alert.alert(
              'Yükleme Hatası',
              'Ekran görüntüleri yüklenemedi. Bildirim ekran görüntüsü olmadan gönderilecek.',
              [{ text: 'Tamam' }]
            );
          }
          // Continue with empty screenshots array
        }
      }

      // Bildiren kullanıcı bilgilerini al
      const reporterDoc = await firestoreService.getUserDocument(currentUser.uid);
      
      // Bildirilen kullanıcı bilgilerini al
      const reportedDoc = await firestoreService.getUserDocument(reportedUserId);

      // Bildirim verisini oluştur - Tüm detaylı bilgiler
      const reportData = {
        reporterId: currentUser.uid,
        reportedUserId: reportedUserId,
        categories: selectedCategories,
        description: description.trim(),
        screenshots: screenshotUrls,
        reporterInfo: {
          // Temel Bilgiler
          uid: currentUser.uid,
          email: currentUser.email || reporterDoc?.email || '',
          firstName: reporterDoc?.firstName || '',
          lastName: reporterDoc?.lastName || '',
          username: reporterDoc?.username || '',
          displayName: reporterDoc?.displayName || `${reporterDoc?.firstName || ''} ${reporterDoc?.lastName || ''}`.trim(),
          
          // Profil Bilgileri
          bio: reporterDoc?.bio || reporterDoc?.biography || reporterDoc?.profile?.bio || '',
          profilePhotos: reporterDoc?.profilePhotos || [],
          interests: reporterDoc?.interests || reporterDoc?.profile?.interests || [],
          location: reporterDoc?.location || reporterDoc?.profile?.location || '',
          birthDate: reporterDoc?.birthDate || reporterDoc?.profile?.birthDate || '',
          gender: reporterDoc?.gender || reporterDoc?.profile?.gender || '',
          
          // Sosyal Bilgiler
          followers: reporterDoc?.social?.followers || reporterDoc?.followers || 0,
          following: reporterDoc?.social?.following || reporterDoc?.following || 0,
          matches: reporterDoc?.social?.matches?.length || reporterDoc?.matches?.length || 0,
          isVerified: reporterDoc?.social?.isVerified || reporterDoc?.isVerified || false,
          
          // İstatistikler
          moviesWatched: reporterDoc?.statistics?.moviesWatched || reporterDoc?.watched?.length || 0,
          moviesRated: reporterDoc?.statistics?.moviesRated || 0,
          averageRating: reporterDoc?.statistics?.averageRating || 0,
          
          // Timestamps
          createdAt: reporterDoc?.createdAt || null,
          lastActive: reporterDoc?.lastActive || reporterDoc?.lastActivity || null,
        },
        reportedInfo: {
          // Temel Bilgiler
          uid: reportedUserId,
          email: reportedDoc?.email || '',
          firstName: reportedDoc?.firstName || '',
          lastName: reportedDoc?.lastName || '',
          username: reportedDoc?.username || '',
          displayName: reportedDoc?.displayName || `${reportedDoc?.firstName || ''} ${reportedDoc?.lastName || ''}`.trim(),
          
          // Profil Bilgileri
          bio: reportedDoc?.bio || reportedDoc?.biography || reportedDoc?.profile?.bio || '',
          profilePhotos: reportedDoc?.profilePhotos || [],
          interests: reportedDoc?.interests || reportedDoc?.profile?.interests || [],
          location: reportedDoc?.location || reportedDoc?.profile?.location || '',
          birthDate: reportedDoc?.birthDate || reportedDoc?.profile?.birthDate || '',
          gender: reportedDoc?.gender || reportedDoc?.profile?.gender || '',
          
          // Sosyal Bilgiler
          followers: reportedDoc?.social?.followers || reportedDoc?.followers || 0,
          following: reportedDoc?.social?.following || reportedDoc?.following || 0,
          matches: reportedDoc?.social?.matches?.length || reportedDoc?.matches?.length || 0,
          isVerified: reportedDoc?.social?.isVerified || reportedDoc?.isVerified || false,
          
          // İstatistikler
          moviesWatched: reportedDoc?.statistics?.moviesWatched || reportedDoc?.watched?.length || 0,
          moviesRated: reportedDoc?.statistics?.moviesRated || 0,
          averageRating: reportedDoc?.statistics?.averageRating || 0,
          
          // Timestamps
          createdAt: reportedDoc?.createdAt || null,
          lastActive: reportedDoc?.lastActive || reportedDoc?.lastActivity || null,
        },
        createdAt: new Date(),
        status: 'pending',
      };

      // Firestore'a kaydet
      const reportId = await firestoreService.submitReport(reportData);

      // Email bildirimi gönder (async, hata olsa bile devam et)
      try {
        await emailService.sendReportNotification({
          reportId,
          ...reportData,
        });
      } catch (emailError) {
        // Email gönderilemese bile bildirim kaydedildi, sadece log yaz
        console.error('Email gönderilemedi (bildirim kaydedildi):', emailError);
      }

      Alert.alert('Başarılı', 'Bildiriminiz alındı. İnceleme sürecine alınacaktır.', [
        { text: 'Tamam', onPress: () => {
          // Formu temizle
          setSelectedCategories([]);
          setDescription('');
          setScreenshots([]);
          onClose();
        }}
      ]);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      const errorMessage = error?.message || 'Bildirim gönderilirken bir hata oluştu.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Kullanıcıyı Bildir</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name={Icons.close} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Kategoriler */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Kategori * (Birden fazla seçebilirsiniz)
              </Text>
              <View style={styles.categoryContainer}>
                {REPORT_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategories.includes(category.id) && styles.categoryChipActive,
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategories.includes(category.id) && styles.categoryTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                    {selectedCategories.includes(category.id) && (
                      <Icon name={Icons.check} size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {selectedCategories.length > 0 && (
                <Text style={styles.selectedInfo}>
                  {selectedCategories.length} kategori seçildi
                </Text>
              )}
            </View>

            {/* Açıklama */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Açıklama *</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Bildirim nedeninizi detaylı olarak açıklayın..."
                placeholderTextColor="#666"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Ekran Görüntüleri */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Ekran Görüntüleri * (En az 1, en fazla 5)
              </Text>
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImages}
                disabled={screenshots.length >= 5}
              >
                <Icon name={Icons.camera} size={20} color="#E50914" />
                <Text style={styles.addImageText}>
                  {screenshots.length >= 5 ? 'Maksimum 5 görsel eklenebilir' : 'Galeriden Görsel Seç'}
                </Text>
              </TouchableOpacity>

              {screenshots.length > 0 && (
                <View style={styles.screenshotsContainer}>
                  {screenshots.map((uri, index) => (
                    <View key={index} style={styles.screenshotWrapper}>
                      <Image source={{ uri }} style={styles.screenshot} />
                      <TouchableOpacity
                        style={styles.removeScreenshotButton}
                        onPress={() => removeScreenshot(index)}
                      >
                        <Icon name={Icons.close} size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.imageInfo}>
                {screenshots.length} / 5 görsel eklendi
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Bildir</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: '70%',
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#404040',
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  categoryText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedInfo: {
    color: '#8C8C8C',
    fontSize: 12,
    marginTop: 8,
  },
  descriptionInput: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E50914',
    borderStyle: 'dashed',
    gap: 8,
  },
  addImageText: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '600',
  },
  screenshotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  screenshotWrapper: {
    position: 'relative',
    width: 100,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
  },
  screenshot: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeScreenshotButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageInfo: {
    color: '#8C8C8C',
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  submitButton: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

