import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card, CardProps } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { spacing } from '../../core/theme';

interface AnimatedCardProps extends CardProps {
  animation?: string;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  animation = 'fadeInUp',
  duration = 600,
  delay = 0,
  children,
  style,
  ...cardProps
}) => {
  return (
    <Animatable.View
      animation={animation}
      duration={duration}
      delay={delay}
      style={style}
    >
      <Card style={[styles.card]} mode="outlined">
        {children}
      </Card>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141414',
    borderRadius: 16,
    elevation: 8,
    marginVertical: spacing.sm,
  },
});
