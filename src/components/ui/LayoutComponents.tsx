import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

interface DividerProps {
  style?: ViewStyle;
  color?: string;
  thickness?: number;
}

export const CustomDivider: React.FC<DividerProps> = ({
  style,
  color = '#333333',
  thickness = 1,
}) => {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: color, height: thickness },
        style,
      ]}
    />
  );
};

interface BadgeProps {
  text: string;
  color?: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  color = '#E50914',
  style,
}) => {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  subtitle: {
    ...typography.body2,
    color: '#8C8C8C',
    marginTop: spacing.xs,
  },
  actionContainer: {
    marginLeft: spacing.md,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
