import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Switch, List } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';

interface SettingItemProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: string;
  style?: ViewStyle;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  value,
  onValueChange,
  icon = 'cog',
  style,
}) => {
  return (
    <List.Item
      title={title}
      description={description}
      left={(props) => <List.Icon {...props} icon={icon} color="#E50914" />}
      right={() => (
        <Switch
          value={value}
          onValueChange={onValueChange}
          color="#E50914"
        />
      )}
      style={[styles.container, style]}
      titleStyle={styles.title}
      descriptionStyle={styles.description}
    />
  );
};

interface InfoItemProps {
  title: string;
  value: string;
  icon?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const InfoItem: React.FC<InfoItemProps> = ({
  title,
  value,
  icon = 'information',
  onPress,
  style,
}) => {
  return (
    <List.Item
      title={title}
      description={value}
      left={(props) => <List.Icon {...props} icon={icon} color="#E50914" />}
      right={onPress ? (props) => <List.Icon {...props} icon="chevron-right" /> : undefined}
      onPress={onPress}
      style={[styles.container, style]}
      titleStyle={styles.title}
      descriptionStyle={styles.description}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141414',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: 8,
  },
  title: {
    ...typography.body1,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  description: {
    ...typography.body2,
    color: '#8C8C8C',
  },
});
