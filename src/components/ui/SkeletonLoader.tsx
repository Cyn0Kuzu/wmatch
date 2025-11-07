import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
  animationDuration?: number;
  backgroundColor?: string;
  highlightColor?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animationDuration = 1500,
  backgroundColor = '#E0E0E0',
  highlightColor = '#F5F5F5',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue, animationDuration]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.highlight,
          {
            backgroundColor: highlightColor,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
  },
  movieCardContainer: {},
  movieCardContent: {},
  profileContainer: {},
  profileContent: {},
  listItemContainer: {},
  listItemContent: {},
  matchCardContainer: {},
  matchCardHeader: {},
  matchCardInfo: {},
  matchCardActions: {},
});

// Predefined skeleton components
export const MovieCardSkeleton: React.FC = () => (
  <View style={styles.movieCardContainer}>
    <SkeletonLoader width={120} height={180} borderRadius={8} />
    <View style={styles.movieCardContent}>
      <SkeletonLoader width="80%" height={16} borderRadius={4} />
      <SkeletonLoader width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      <SkeletonLoader width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profileContainer}>
    <SkeletonLoader width={80} height={80} borderRadius={40} />
    <View style={styles.profileContent}>
      <SkeletonLoader width="70%" height={20} borderRadius={4} />
      <SkeletonLoader width="50%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
      <SkeletonLoader width="60%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const ListItemSkeleton: React.FC = () => (
  <View style={styles.listItemContainer}>
    <SkeletonLoader width={40} height={40} borderRadius={20} />
    <View style={styles.listItemContent}>
      <SkeletonLoader width="60%" height={16} borderRadius={4} />
      <SkeletonLoader width="40%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
    </View>
    <SkeletonLoader width={24} height={24} borderRadius={12} />
  </View>
);

export const MatchCardSkeleton: React.FC = () => (
  <View style={styles.matchCardContainer}>
    <View style={styles.matchCardHeader}>
      <SkeletonLoader width={80} height={80} borderRadius={40} />
      <View style={styles.matchCardInfo}>
        <SkeletonLoader width="70%" height={18} borderRadius={4} />
        <SkeletonLoader width="50%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
        <SkeletonLoader width="60%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>
    </View>
    <View style={styles.matchCardActions}>
      <SkeletonLoader width={100} height={40} borderRadius={20} />
      <SkeletonLoader width={100} height={40} borderRadius={20} />
    </View>
  </View>
);

const additionalStyles = StyleSheet.create({
  movieCardContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  movieCardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  profileContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  profileContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 16,
  },
  matchCardContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  matchCardHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  matchCardInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  matchCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});


