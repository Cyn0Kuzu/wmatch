import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { spacing } from '../../core/theme';

interface EnterpriseInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  animation?: string;
  delay?: number;
  required?: boolean;
  maxLength?: number;
}

export const EnterpriseInput: React.FC<EnterpriseInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  disabled = false,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  animation = 'fadeInUp',
  delay = 0,
  required = false,
  maxLength
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const getContainerStyle = (): ViewStyle => {
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: error 
        ? '#DC2626' 
        : isFocused 
          ? '#E50914' 
          : 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      minHeight: multiline ? 80 : 48,
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      color: '#FFFFFF',
      fontSize: 16,
      paddingVertical: spacing.xs,
      textAlignVertical: multiline ? 'top' : 'center',
    };
  };

  return (
    <Animatable.View animation={animation} delay={delay} style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={getContainerStyle()}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[getInputStyle(), inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#8C8C8C"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={!disabled}
          maxLength={maxLength}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={handleTogglePassword}
            activeOpacity={0.7}
          >
            <Text style={styles.eyeIcon}>
              {showPassword ? '●' : '○'}
            </Text>
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            activeOpacity={0.7}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <View style={styles.helperContainer}>
          <Text style={[styles.helperText, error && styles.errorText]}>
            {error || helperText}
          </Text>
        </View>
      )}
      
      {maxLength && (
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {value.length}/{maxLength}
          </Text>
        </View>
      )}
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelContainer: {
    marginBottom: spacing.sm,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  required: {
    color: '#DC2626',
  },
  leftIcon: {
    marginRight: spacing.sm,
    justifyContent: 'center',
  },
  rightIcon: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xs,
  },
  eyeIcon: {
    color: '#8C8C8C',
    fontSize: 16,
  },
  helperContainer: {
    marginTop: spacing.xs,
  },
  helperText: {
    color: '#8C8C8C',
    fontSize: 12,
  },
  errorText: {
    color: '#DC2626',
  },
  counterContainer: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  counterText: {
    color: '#8C8C8C',
    fontSize: 12,
  },
});


