import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: number;
  style?: ViewStyle;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 16,
  style,
}) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < fullStars; i++) {
    stars.push('⭐');
  }

  if (hasHalfStar) {
    stars.push('⭐');
  }

  const emptyStars = maxRating - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push('☆');
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.stars, { fontSize: size }]}>
        {stars.join('')}
      </Text>
      <Text style={styles.ratingText}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
};

interface GenreTagsProps {
  genres: string[];
  style?: ViewStyle;
}

export const GenreTags: React.FC<GenreTagsProps> = ({
  genres,
  style,
}) => {
  return (
    <View style={[styles.genresContainer, style]}>
      {genres.map((genre, index) => (
        <View key={index} style={styles.genreTag}>
          <Text style={styles.genreText}>{genre}</Text>
        </View>
      ))}
    </View>
  );
};

interface DurationBadgeProps {
  duration: number;
  style?: ViewStyle;
}

export const DurationBadge: React.FC<DurationBadgeProps> = ({
  duration,
  style,
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={[styles.durationBadge, style]}>
      <Text style={styles.durationText}>
        {formatDuration(duration)}
      </Text>
    </View>
  );
};

interface YearBadgeProps {
  year: number;
  style?: ViewStyle;
}

export const YearBadge: React.FC<YearBadgeProps> = ({
  year,
  style,
}) => {
  return (
    <View style={[styles.yearBadge, style]}>
      <Text style={styles.yearText}>{year}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    marginRight: spacing.sm,
  },
  ratingText: {
    ...typography.body2,
    color: '#F5C518',
    fontWeight: '600',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  genreTag: {
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  genreText: {
    ...typography.caption,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  durationBadge: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  durationText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  yearBadge: {
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  yearText: {
    ...typography.caption,
    color: '#CCCCCC',
    fontWeight: '600',
  },
});
