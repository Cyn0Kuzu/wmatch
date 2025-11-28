import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { BlurView } from '@react-native-community/blur';
import { spacing, typography } from '../../core/theme';

interface MovieCardProps {
  title: string;
  overview: string;
  posterPath: string;
  rating: number;
  year: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  title,
  overview,
  posterPath,
  rating,
  year,
  onPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]} onTouchEnd={onPress}>
      <Image
        source={{ uri: posterPath }}
        style={styles.poster}
        resizeMode="cover"
      />
      
      <BlurView
        style={styles.overlay}
        blurType="dark"
        blurAmount={10}
      >
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          
          <Text style={styles.overview} numberOfLines={3}>
            {overview}
          </Text>
          
          <View style={styles.info}>
            <Text style={styles.rating}>
              ⭐ {rating.toFixed(1)}
            </Text>
            <Text style={styles.year}>{year}</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#141414',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  title: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  overview: {
    ...typography.body2,
    color: '#CCCCCC',
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    ...typography.body2,
    color: '#F5C518',
    fontWeight: '600',
  },
  year: {
    ...typography.body2,
    color: '#8C8C8C',
  },
});
