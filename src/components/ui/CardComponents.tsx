import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  style?: ViewStyle;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </View>
  );
};

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  children,
  style,
}) => {
  return (
    <View style={[styles.infoContainer, style]}>
      <Text style={styles.infoTitle}>{title}</Text>
      {children}
    </View>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  onPress,
  style,
}) => {
  return (
    <View style={[styles.featureContainer, style]} onTouchEnd={onPress}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  value: {
    ...typography.h2,
    color: '#E50914',
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.body1,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body2,
    color: '#8C8C8C',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  infoContainer: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
  },
  infoTitle: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  featureContainer: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  featureTitle: {
    ...typography.h4,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  featureDescription: {
    ...typography.body2,
    color: '#8C8C8C',
    textAlign: 'center',
    lineHeight: 20,
  },
});
