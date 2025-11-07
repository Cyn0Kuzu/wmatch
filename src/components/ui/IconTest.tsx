import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Icon, Icons } from './IconComponent';

export const IconTest: React.FC = () => {
  const testIcons = [
    { name: Icons.home, label: 'Home' },
    { name: Icons.search, label: 'Search' },
    { name: Icons.person, label: 'Person' },
    { name: Icons.like, label: 'Like' },
    { name: Icons.settings, label: 'Settings' },
    { name: Icons.email, label: 'Email' },
    { name: Icons.notifications, label: 'Notifications' },
    { name: Icons.verified, label: 'Verified' },
    { name: Icons.location, label: 'Location' },
    { name: Icons.playCircle, label: 'Play Circle' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Icon Test - MWatch</Text>
      <Text style={styles.subtitle}>Tüm icon'lar düzgün yüklenmiş mi kontrol edin</Text>
      
      <View style={styles.iconGrid}>
        {testIcons.map((icon, index) => (
          <View key={index} style={styles.iconItem}>
            <Icon 
              name={icon.name} 
              size={32} 
              color="#E50914" 
            />
            <Text style={styles.iconLabel}>{icon.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Test Sonuçları:</Text>
        <Text style={styles.statusText}>
          ✅ Eğer yukarıdaki icon'lar görünüyorsa → Font'lar düzgün yüklendi
        </Text>
        <Text style={styles.statusText}>
          ❌ Eğer icon'lar görünmüyorsa → Font yükleme sorunu var
        </Text>
        <Text style={styles.statusText}>
          🔄 Eğer kare simgeler görünüyorsa → Icon isimleri yanlış
        </Text>
      </View>

      <View style={styles.troubleshootingContainer}>
        <Text style={styles.troubleshootingTitle}>Sorun Giderme:</Text>
        <Text style={styles.troubleshootingText}>
          1. expo start -c (cache temizle)
        </Text>
        <Text style={styles.troubleshootingText}>
          2. npm install @expo/vector-icons
        </Text>
        <Text style={styles.troubleshootingText}>
          3. Uygulamayı yeniden başlat
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8C8C8C',
    textAlign: 'center',
    marginBottom: 30,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  iconItem: {
    alignItems: 'center',
    margin: 10,
    padding: 15,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    minWidth: 80,
  },
  iconLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 5,
    lineHeight: 20,
  },
  troubleshootingContainer: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
  },
  troubleshootingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: 10,
  },
  troubleshootingText: {
    fontSize: 14,
    color: '#8C8C8C',
    marginBottom: 5,
    lineHeight: 20,
  },
});


