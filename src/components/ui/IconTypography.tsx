import React, { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ADVANCED_ICONS } from './AdvancedIconComponent';

// Typography scale for icons
const ICON_TYPOGRAPHY = {
  display: {
    size: 64,
    weight: 'bold' as const,
    lineHeight: 72,
  },
  h1: {
    size: 48,
    weight: 'bold' as const,
    lineHeight: 56,
  },
  h2: {
    size: 40,
    weight: 'bold' as const,
    lineHeight: 48,
  },
  h3: {
    size: 32,
    weight: 'semibold' as const,
    lineHeight: 40,
  },
  h4: {
    size: 24,
    weight: 'semibold' as const,
    lineHeight: 32,
  },
  h5: {
    size: 20,
    weight: 'medium' as const,
    lineHeight: 28,
  },
  h6: {
    size: 18,
    weight: 'medium' as const,
    lineHeight: 24,
  },
  body1: {
    size: 16,
    weight: 'normal' as const,
    lineHeight: 24,
  },
  body2: {
    size: 14,
    weight: 'normal' as const,
    lineHeight: 20,
  },
  caption: {
    size: 12,
    weight: 'normal' as const,
    lineHeight: 16,
  },
  overline: {
    size: 10,
    weight: 'normal' as const,
    lineHeight: 16,
  },
} as const;

// Color system for icons
const ICON_COLORS = {
  light: {
    primary: '#E50914',
    primaryVariant: '#B8070F',
    secondary: '#8C8C8C',
    secondaryVariant: '#6B6B6B',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#FFFFFF',
    error: '#B00020',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#000000',
    onBackground: '#000000',
    onError: '#FFFFFF',
    outline: '#E0E0E0',
    shadow: '#000000',
  },
  dark: {
    primary: '#E50914',
    primaryVariant: '#FF4444',
    secondary: '#8C8C8C',
    secondaryVariant: '#B3B3B3',
    surface: '#1A1A1A',
    surfaceVariant: '#2A2A2A',
    background: '#000000',
    error: '#CF6679',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onSurface: '#FFFFFF',
    onBackground: '#FFFFFF',
    onError: '#000000',
    outline: '#404040',
    shadow: '#000000',
  },
} as const;

// Semantic color mappings
const SEMANTIC_COLORS = {
  success: 'primary',
  warning: 'secondary',
  error: 'error',
  info: 'primary',
  neutral: 'onSurface',
} as const;

type TypographyVariant = keyof typeof ICON_TYPOGRAPHY;
type ColorToken = keyof typeof ICON_COLORS.light;
type SemanticColor = keyof typeof SEMANTIC_COLORS;

interface IconTypographyProps {
  config: any;
  variant?: TypographyVariant;
  color?: ColorToken | SemanticColor | string;
  style?: ViewStyle | TextStyle;
  animated?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const IconTypography: React.FC<IconTypographyProps> = ({
  config,
  variant = 'body1',
  color = 'onSurface',
  style,
  animated = false,
  onPress,
  disabled = false,
  loading = false,
}) => {
  const systemTheme = useColorScheme();
  const appTheme = useAppStore(state => state.settings.preferences.theme);
  
  // Determine current theme
  const currentTheme = appTheme === 'auto' ? systemTheme || 'dark' : appTheme;
  const themeColors = ICON_COLORS[currentTheme as keyof typeof ICON_COLORS] || ICON_COLORS.dark;
  
  // Get typography settings
  const typography = ICON_TYPOGRAPHY[variant];
  
  // Resolve color
  const resolvedColor = useMemo(() => {
    if (typeof color === 'string' && color.startsWith('#')) {
      return color; // Direct hex color
    }
    
    if (color in SEMANTIC_COLORS) {
      const semanticKey = SEMANTIC_COLORS[color as SemanticColor];
      return themeColors[semanticKey as ColorToken];
    }
    
    return themeColors[color as ColorToken] || themeColors.onSurface;
  }, [color, themeColors]);

  // Create typography-based styles
  const typographyStyle = useMemo(() => {
    return {
      fontSize: typography.size,
      fontWeight: typography.weight,
      lineHeight: typography.lineHeight,
      color: resolvedColor,
    };
  }, [typography, resolvedColor]);

  return (
    <View style={style as any}>
      {/* Icon typography placeholder */}
    </View>
  );
};

// Predefined typography icon components
export const DisplayIcon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="display" />
);

export const H1Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="h1" />
);

export const H2Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="h2" />
);

export const H3Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="h3" />
);

export const H4Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="h4" />
);

export const H5Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="h5" />
);

export const H6Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="h6" />
);

export const Body1Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="body1" />
);

export const Body2Icon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="body2" />
);

export const CaptionIcon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="caption" />
);

export const OverlineIcon: React.FC<Omit<IconTypographyProps, 'variant'>> = (props) => (
  <IconTypography {...props} variant="overline" />
);

// Utility functions
export const getIconSize = (variant: TypographyVariant): number => {
  return ICON_TYPOGRAPHY[variant].size;
};

export const getIconColor = (color: ColorToken | SemanticColor, theme: 'light' | 'dark' = 'dark'): string => {
  const themeColors = ICON_COLORS[theme];
  
  if (color in SEMANTIC_COLORS) {
    const semanticKey = SEMANTIC_COLORS[color as SemanticColor];
    return themeColors[semanticKey as ColorToken];
  }
  
  return themeColors[color as ColorToken] || themeColors.onSurface;
};

export const createIconStyle = (
  variant: TypographyVariant,
  color?: ColorToken | SemanticColor | string,
  theme: 'light' | 'dark' = 'dark'
): ViewStyle | TextStyle => {
  const typography = ICON_TYPOGRAPHY[variant];
  const resolvedColor = color ? getIconColor(color as ColorToken | SemanticColor, theme) : undefined;
  
  return {
    fontSize: typography.size,
    fontWeight: typography.weight as any,
    lineHeight: typography.lineHeight,
    ...(resolvedColor && { color: resolvedColor }),
  };
};

// Export types and constants
export type { TypographyVariant, ColorToken, SemanticColor };
export { ICON_TYPOGRAPHY, ICON_COLORS, SEMANTIC_COLORS };

export default IconTypography;
