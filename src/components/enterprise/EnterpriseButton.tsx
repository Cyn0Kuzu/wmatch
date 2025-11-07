import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { spacing } from '../../core/theme';

interface EnterpriseButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  animation?: string;
  delay?: number;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const EnterpriseButton: React.FC<EnterpriseButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  animation = 'fadeInUp',
  delay = 0,
  fullWidth = false,
  leftIcon,
  rightIcon
}) => {
  const theme = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (size) {
      case 'small':
        return {
          ...baseStyle,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          minHeight: 36,
        };
      case 'large':
        return {
          ...baseStyle,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          minHeight: 56,
        };
      default:
        return {
          ...baseStyle,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          minHeight: 48,
        };
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: '#E50914',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: '#DC2626',
        };
      default:
        return {
          backgroundColor: '#E50914',
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    switch (size) {
      case 'small':
        return { ...baseStyle, fontSize: 14 };
      case 'large':
        return { ...baseStyle, fontSize: 18 };
      default:
        return { ...baseStyle, fontSize: 16 };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return '#E50914';
      case 'secondary':
        return '#FFFFFF';
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const buttonContent = (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        getVariantStyle(),
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <Text style={[getTextStyle(), { color: getTextColor() }, textStyle]}>
          Yükleniyor...
        </Text>
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[getTextStyle(), { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <Animatable.View animation={animation} delay={delay}>
      {buttonContent}
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: spacing.sm,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});


