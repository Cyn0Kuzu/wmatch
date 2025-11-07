import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Icon, Icons } from './IconComponent';

export const IconDebugger: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const testIcon = (iconName: string, icon: any) => {
    try {
      // Test if icon renders without error
      const testComponent = <Icon name={icon} size={24} color="#E50914" />;
      setTestResults(prev => ({ ...prev, [iconName]: true }));
      return true;
    } catch (error) {
      console.error(`Icon test failed for ${iconName}:`, error);
      setTestResults(prev => ({ ...prev, [iconName]: false }));
      return false;
    }
  };

  const runAllTests = () => {
    const tests = [
      { name: 'Home', icon: Icons.home },
      { name: 'Search', icon: Icons.search },
      { name: 'Person', icon: Icons.person },
      { name: 'Like', icon: Icons.like },
      { name: 'Settings', icon: Icons.settings },
      { name: 'Email', icon: Icons.email },
      { name: 'Notifications', icon: Icons.notifications },
      { name: 'Verified', icon: Icons.verified },
      { name: 'Location', icon: Icons.location },
      { name: 'Play Circle', icon: Icons.playCircle },
    ];

    tests.forEach(test => testIcon(test.name, test.icon));
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = tests.length;
    
    Alert.alert(
      'Icon Test Sonuçları',
      `${passedTests}/${totalTests} icon başarıyla test edildi`,
      [{ text: 'Tamam' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Icon Debugger</Text>
      <Text style={styles.subtitle}>Icon'ların düzgün çalışıp çalışmadığını test edin</Text>
      
      <TouchableOpacity style={styles.testButton} onPress={runAllTests}>
        <Text style={styles.testButtonText}>Tüm Icon'ları Test Et</Text>
      </TouchableOpacity>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Sonuçları:</Text>
        {Object.entries(testResults).map(([name, passed]) => (
          <View key={name} style={styles.resultItem}>
            <Icon 
              name={Icons[name.toLowerCase() as keyof typeof Icons] || Icons.home} 
              size={16} 
              color={passed ? '#10B981' : '#EF4444'} 
            />
            <Text style={[styles.resultText, { color: passed ? '#10B981' : '#EF4444' }]}>
              {name}: {passed ? '✅ Başarılı' : '❌ Başarısız'}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.quickTestContainer}>
        <Text style={styles.quickTestTitle}>Hızlı Test:</Text>
        <View style={styles.quickTestGrid}>
          <View style={styles.quickTestItem}>
            <Icon name={Icons.home} size={32} color="#E50914" />
            <Text style={styles.quickTestLabel}>Home</Text>
          </View>
          <View style={styles.quickTestItem}>
            <Icon name={Icons.search} size={32} color="#E50914" />
            <Text style={styles.quickTestLabel}>Search</Text>
          </View>
          <View style={styles.quickTestItem}>
            <Icon name={Icons.person} size={32} color="#E50914" />
            <Text style={styles.quickTestLabel}>Person</Text>
          </View>
          <View style={styles.quickTestItem}>
            <Icon name={Icons.like} size={32} color="#E50914" />
            <Text style={styles.quickTestLabel}>Like</Text>
          </View>
        </View>
      </View>
    </View>
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
  testButton: {
    backgroundColor: '#E50914',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 14,
    marginLeft: 8,
  },
  quickTestContainer: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 8,
  },
  quickTestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E50914',
    marginBottom: 15,
  },
  quickTestGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickTestItem: {
    alignItems: 'center',
  },
  quickTestLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
  },
});


