import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

interface SwipeActionProps {
  type: 'like' | 'pass' | 'superlike';
  onPress: () => void;
  style?: ViewStyle;
}

export const SwipeAction: React.FC<SwipeActionProps> = ({
  type,
  onPress,
  style,
}) => {
  const getActionConfig = () => {
    switch (type) {
      case 'like':
        return {
          icon: '❤️',
          text: 'LIKE',
          color: '#00D4AA',
        };
      case 'pass':
        return {
          icon: '❌',
          text: 'PASS',
          color: '#E50914',
        };
      case 'superlike':
        return {
          icon: '⭐',
          text: 'SUPER LIKE',
          color: '#F5C518',
        };
      default:
        return {
          icon: '❤️',
          text: 'LIKE',
          color: '#00D4AA',
        };
    }
  };

  const config = getActionConfig();

  return (
    <View
      style={[styles.container, { borderColor: config.color }, style]}
      onTouchEnd={onPress}
    >
      <Text style={styles.icon}>{config.icon}</Text>
      <Text style={[styles.text, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
};

interface SwipeIndicatorProps {
  direction: 'left' | 'right' | 'up';
  visible: boolean;
  style?: ViewStyle;
}

export const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({
  direction,
  visible,
  style,
}) => {
  if (!visible) return null;

  const getIndicatorConfig = () => {
    switch (direction) {
      case 'left':
        return {
          text: 'PASS',
          color: '#E50914',
          icon: '←',
        };
      case 'right':
        return {
          text: 'LIKE',
          color: '#00D4AA',
          icon: '→',
        };
      case 'up':
        return {
          text: 'SUPER LIKE',
          color: '#F5C518',
          icon: '↑',
        };
      default:
        return {
          text: 'LIKE',
          color: '#00D4AA',
          icon: '→',
        };
    }
  };

  const config = getIndicatorConfig();

  return (
    <View style={[styles.indicator, style]}>
      <Text style={[styles.indicatorIcon, { color: config.color }]}>
        {config.icon}
      </Text>
      <Text style={[styles.indicatorText, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
};

interface SwipeCounterProps {
  current: number;
  total: number;
  style?: ViewStyle;
}

export const SwipeCounter: React.FC<SwipeCounterProps> = ({
  current,
  total,
  style,
}) => {
  return (
    <View style={[styles.counter, style]}>
      <Text style={styles.counterText}>
        {current} / {total}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  text: {
    ...typography.body1,
    fontWeight: 'bold',
  },
  indicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  indicatorIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  indicatorText: {
    ...typography.h4,
    fontWeight: 'bold',
  },
  counter: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  counterText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
