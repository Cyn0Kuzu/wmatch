import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'danger':
        return styles.dangerButton;
      default:
        return styles.primaryButton;
    }
  };

  const getButtonColor = () => {
    switch (variant) {
      case 'primary':
        return '#E50914';
      case 'secondary':
        return 'transparent';
      case 'danger':
        return '#FF4444';
      default:
        return '#E50914';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return '#E50914';
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Button
      mode={variant === 'secondary' ? 'outlined' : 'contained'}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={icon}
      style={[getButtonStyle(), style]}
      buttonColor={getButtonColor()}
      textColor={getTextColor()}
      labelStyle={styles.buttonLabel}
    >
      {title}
    </Button>
  );
};

interface FloatingActionButtonProps {
  onPress: () => void;
  icon: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  style,
  children,
}) => {
  return (
    <View style={[styles.fabContainer, style]}>
      <Button
        mode="contained"
        onPress={onPress}
        icon={icon}
        style={styles.fab}
        buttonColor="#E50914"
        contentStyle={styles.fabContent}
      >
        {children}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
    borderColor: '#E50914',
  },
  dangerButton: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
  },
  fab: {
    borderRadius: 28,
    width: 56,
    height: 56,
  },
  fabContent: {
    width: 56,
    height: 56,
  },
});
