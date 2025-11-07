import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { spacing } from '../../core/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#E50914',
  text,
  overlay = false,
}) => {
  const containerStyle = overlay ? styles.overlayContainer : styles.container;

  return (
    <View style={containerStyle}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size={size} color={color} />
        {text && <Text style={styles.text}>{text}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  spinnerContainer: {
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: spacing.lg,
    borderRadius: 12,
    minWidth: 120,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
