import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Icon, IconProps } from './IconComponent';

interface AnimatedIconProps extends IconProps {
  animation?: 'pulse' | 'bounce' | 'rotate' | 'fade' | 'scale';
  duration?: number;
  delay?: number;
  loop?: boolean;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  animation = 'fade',
  duration = 1000,
  delay = 0,
  loop = false,
  ...iconProps
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      let animationConfig: any = {};

      switch (animation) {
        case 'pulse':
          animationConfig = {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          };
          break;
        case 'bounce':
          animationConfig = {
            toValue: 1,
            duration: duration,
            easing: Easing.bounce,
            useNativeDriver: true,
          };
          break;
        case 'rotate':
          animationConfig = {
            toValue: 1,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          };
          break;
        case 'fade':
          animationConfig = {
            toValue: 1,
            duration: duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          };
          break;
        case 'scale':
          animationConfig = {
            toValue: 1,
            duration: duration,
            easing: Easing.out(Easing.back(1.7)),
            useNativeDriver: true,
          };
          break;
      }

      const anim = Animated.timing(animatedValue, animationConfig);

      if (loop) {
        Animated.loop(anim).start();
      } else {
        anim.start();
      }
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, [animation, duration, delay, loop, animatedValue]);

  const getAnimatedStyle = () => {
    switch (animation) {
      case 'pulse':
        return {
          opacity: animatedValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 0.3, 1],
          }),
        };
      case 'bounce':
        return {
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, -10, 0],
              }),
            },
          ],
        };
      case 'rotate':
        return {
          transform: [
            {
              rotate: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        };
      case 'fade':
        return {
          opacity: animatedValue,
        };
      case 'scale':
        return {
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ],
        };
      default:
        return {};
    }
  };

  return (
    <Animated.View style={getAnimatedStyle()}>
      <Icon {...iconProps} name={iconProps.name || ''} />
    </Animated.View>
  );
};


