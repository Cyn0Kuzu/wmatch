import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { spacing } from '../../core/theme';

interface LoadingSkeletonProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = 200,
  height = 20,
  borderRadius = 4,
  style,
}) => {
  return (
    <SkeletonPlaceholder>
      <SkeletonPlaceholder.Item
        width={width}
        height={height}
        borderRadius={borderRadius}
        style={style}
      />
    </SkeletonPlaceholder>
  );
};

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#E50914',
  style,
}) => {
  return (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
});
