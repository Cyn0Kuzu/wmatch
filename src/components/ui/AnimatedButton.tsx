import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { spacing } from '../../core/theme';

interface AnimatedButtonProps extends ButtonProps {
  animation?: string;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  animation = 'pulse',
  duration = 1000,
  delay = 0,
  style,
  ...buttonProps
}) => {
  return (
    <Animatable.View
      animation={animation}
      duration={duration}
      delay={delay}
      style={style}
    >
      <Button
        style={[styles.button]}
        labelStyle={[styles.buttonLabel]}
        {...buttonProps}
      />
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
