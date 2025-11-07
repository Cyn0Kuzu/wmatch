import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { TextProps } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { typography } from '../../core/theme';

interface AnimatedTextProps {
  animation?: string;
  duration?: number;
  delay?: number;
  style?: TextStyle;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body1' | 'body2' | 'caption';
  children?: React.ReactNode;
  onPress?: () => void;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  animation = 'fadeIn',
  duration = 800,
  delay = 0,
  variant = 'body1',
  style,
  ...textProps
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'h1': return typography.h1;
      case 'h2': return typography.h2;
      case 'h3': return typography.h3;
      case 'h4': return typography.h4;
      case 'body1': return typography.body1;
      case 'body2': return typography.body2;
      case 'caption': return typography.caption;
      default: return typography.body1;
    }
  };

  return (
    <Animatable.Text
      animation={animation}
      duration={duration}
      delay={delay}
      style={[getVariantStyle(), style]}
      {...textProps}
    />
  );
};

const styles = StyleSheet.create({
  // Additional styles if needed
});
