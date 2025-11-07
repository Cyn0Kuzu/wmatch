import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { ProgressBar } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

interface ProgressCardProps {
  title: string;
  progress: number;
  total: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  progress,
  total,
  onPress,
  style,
}) => {
  const percentage = (progress / total) * 100;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={percentage / 100}
          color="#E50914"
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>
          {progress} / {total}
        </Text>
      </View>
      
      {onPress && (
        <Button
          mode="outlined"
          onPress={onPress}
          style={styles.button}
          textColor="#E50914"
        >
          View Details
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: '#FFFFFF',
    marginBottom: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  progressText: {
    ...typography.body2,
    color: '#8C8C8C',
    textAlign: 'center',
  },
  button: {
    borderColor: '#E50914',
  },
});
