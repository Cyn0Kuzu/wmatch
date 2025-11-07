import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../../core/theme';

interface ValidationRule {
  isValid: boolean;
  message: string;
}

interface FormValidationProps {
  rules: ValidationRule[];
  showValidation?: boolean;
}

export const FormValidation: React.FC<FormValidationProps> = ({ 
  rules, 
  showValidation = true 
}) => {
  if (!showValidation || rules.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {rules.map((rule, index) => (
        <View key={index} style={styles.ruleContainer}>
          <Text style={[
            styles.ruleText,
            { color: rule.isValid ? '#4CAF50' : '#E50914' }
          ]}>
            {rule.isValid ? '✓' : '✗'} {rule.message}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  ruleContainer: {
    marginBottom: spacing.xs / 2,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
