import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

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
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

interface MovieCardSkeletonProps {
  style?: ViewStyle;
}

export const MovieCardSkeleton: React.FC<MovieCardSkeletonProps> = ({
  style,
}) => {
  return (
    <View style={[styles.cardSkeleton, style]}>
      <LoadingSkeleton
        width={300}
        height={200}
        borderRadius={12}
        style={styles.posterSkeleton}
      />
      <View style={styles.contentSkeleton}>
        <LoadingSkeleton
          width={240}
          height={20}
          borderRadius={4}
          style={styles.titleSkeleton}
        />
        <LoadingSkeleton
          width={300}
          height={16}
          borderRadius={4}
          style={styles.overviewSkeleton}
        />
        <LoadingSkeleton
          width={300}
          height={16}
          borderRadius={4}
          style={styles.overviewSkeleton}
        />
        <LoadingSkeleton
          width={180}
          height={16}
          borderRadius={4}
          style={styles.overviewSkeleton}
        />
        <View style={styles.infoSkeleton}>
          <LoadingSkeleton
            width={60}
            height={16}
            borderRadius={4}
          />
          <LoadingSkeleton
            width={40}
            height={16}
            borderRadius={4}
          />
        </View>
      </View>
    </View>
  );
};

interface ListSkeletonProps {
  items?: number;
  style?: ViewStyle;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  style,
}) => {
  return (
    <View style={[styles.listSkeleton, style]}>
      {Array.from({ length: items }, (_, index) => (
        <View key={index} style={styles.listItemSkeleton}>
          <LoadingSkeleton
            width={50}
            height={50}
            borderRadius={25}
            style={styles.avatarSkeleton}
          />
          <View style={styles.listContentSkeleton}>
            <LoadingSkeleton
              width={210}
              height={16}
              borderRadius={4}
              style={styles.listTitleSkeleton}
            />
            <LoadingSkeleton
              width={150}
              height={14}
              borderRadius={4}
              style={styles.listSubtitleSkeleton}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#333333',
    opacity: 0.3,
  },
  cardSkeleton: {
    backgroundColor: '#141414',
    borderRadius: 16,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  posterSkeleton: {
    marginBottom: spacing.md,
  },
  contentSkeleton: {
    padding: spacing.lg,
  },
  titleSkeleton: {
    marginBottom: spacing.sm,
  },
  overviewSkeleton: {
    marginBottom: spacing.xs,
  },
  infoSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  listSkeleton: {
    padding: spacing.lg,
  },
  listItemSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarSkeleton: {
    marginRight: spacing.md,
  },
  listContentSkeleton: {
    flex: 1,
  },
  listTitleSkeleton: {
    marginBottom: spacing.sm,
  },
  listSubtitleSkeleton: {
    // Additional styles if needed
  },
});