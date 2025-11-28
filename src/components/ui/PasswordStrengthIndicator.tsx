import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../core/theme';
import { FormValidation } from './FormValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '#333333', rules: [] };
    
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    
    const rules = [
      { isValid: checks.length, message: 'En az 8 karakter' },
      { isValid: checks.uppercase, message: 'Büyük harf' },
      { isValid: checks.lowercase, message: 'Küçük harf' },
      { isValid: checks.numbers, message: 'Rakam' },
      { isValid: checks.special, message: 'Özel karakter' },
    ];
    
    let label = '';
    let color = '#333333';
    
    if (score <= 2) {
      label = 'Zayıf';
      color = '#E50914';
    } else if (score <= 3) {
      label = 'Orta';
      color = '#FF9800';
    } else if (score <= 4) {
      label = 'İyi';
      color = '#4CAF50';
    } else {
      label = 'Güçlü';
      color = '#2196F3';
    }
    
    return { strength: score, label, color, rules };
  };

  const { strength, label, color, rules } = getPasswordStrength(password);

  return (
    <View style={styles.container}>
      <View style={styles.strengthBar}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={[
              styles.bar,
              {
                backgroundColor: level <= strength ? color : '#333333',
              },
            ]}
          />
        ))}
      </View>
      {password.length > 0 && (
        <Text style={[styles.label, { color }]}>
          Şifre Gücü: {label}
        </Text>
      )}
      <FormValidation rules={rules} showValidation={password.length > 0} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
