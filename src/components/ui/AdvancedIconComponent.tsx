import React, { useMemo, lazy, Suspense } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../../store/useAppStore';

// Dynamic imports for bundle optimization
const IconSets = {
  MaterialIcons: lazy(() => import('@expo/vector-icons').then(module => ({ default: module.MaterialIcons }))),
  MaterialCommunityIcons: lazy(() => import('@expo/vector-icons').then(module => ({ default: module.MaterialCommunityIcons }))),
  Ionicons: lazy(() => import('@expo/vector-icons').then(module => ({ default: module.Ionicons }))),
  Feather: lazy(() => import('@expo/vector-icons').then(module => ({ default: module.Feather }))),
  AntDesign: lazy(() => import('@expo/vector-icons').then(module => ({ default: module.AntDesign }))),
  FontAwesome: lazy(() => import('@expo/vector-icons').then(module => ({ default: module.FontAwesome }))),
};

// Theme-based icon mappings
const THEME_ICON_MAPPINGS = {
  light: {
    primary: '#E50914',
    secondary: '#8C8C8C',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
  },
  dark: {
    primary: '#E50914',
    secondary: '#8C8C8C',
    background: '#000000',
    surface: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
  },
} as const;

// Icon size presets
const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Typography-based icon mappings
const TYPOGRAPHY_ICONS = {
  h1: { size: 'xxl' as const, weight: 'bold' as const },
  h2: { size: 'xl' as const, weight: 'bold' as const },
  h3: { size: 'lg' as const, weight: 'semibold' as const },
  h4: { size: 'md' as const, weight: 'semibold' as const },
  body1: { size: 'md' as const, weight: 'normal' as const },
  body2: { size: 'sm' as const, weight: 'normal' as const },
  caption: { size: 'xs' as const, weight: 'normal' as const },
} as const;

// Icon type definitions
type IconSet = keyof typeof IconSets;
type IconSize = keyof typeof ICON_SIZES;
type TypographyVariant = keyof typeof TYPOGRAPHY_ICONS;
type ThemeMode = 'light' | 'dark' | 'auto';

interface IconConfig {
  name: string;
  set: IconSet;
  fallback?: IconConfig;
}

interface AdvancedIconProps {
  config: IconConfig;
  size?: IconSize | number;
  color?: string;
  variant?: TypographyVariant;
  theme?: ThemeMode;
  style?: any;
  animated?: boolean;
  animationType?: 'pulse' | 'bounce' | 'rotate' | 'fade' | 'scale';
  animationDuration?: number;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

// Predefined icon configurations with theme-aware mappings
export const ADVANCED_ICONS = {
  // Navigation - Theme aware
  home: {
    light: { name: 'home', set: 'MaterialIcons' as const },
    dark: { name: 'home-outline', set: 'Ionicons' as const },
  },
  search: {
    light: { name: 'search', set: 'MaterialIcons' as const },
    dark: { name: 'search', set: 'Feather' as const },
  },
  person: {
    light: { name: 'person', set: 'MaterialIcons' as const },
    dark: { name: 'user', set: 'Feather' as const },
  },
  settings: {
    light: { name: 'settings', set: 'MaterialIcons' as const },
    dark: { name: 'settings', set: 'Feather' as const },
  },
  
  // Actions - Context aware
  like: {
    default: { name: 'favorite', set: 'MaterialIcons' as const },
    active: { name: 'favorite', set: 'MaterialIcons' as const },
    inactive: { name: 'favorite-border', set: 'MaterialIcons' as const },
  },
  share: {
    default: { name: 'share', set: 'MaterialIcons' as const },
    social: { name: 'share-alt', set: 'AntDesign' as const },
  },
  play: {
    default: { name: 'play-circle-filled', set: 'MaterialIcons' as const },
    outline: { name: 'play-circle-outline', set: 'MaterialIcons' as const },
  },
  
  // Status - State aware
  verified: {
    default: { name: 'verified', set: 'MaterialIcons' as const },
    premium: { name: 'verified-user', set: 'MaterialIcons' as const },
  },
  notification: {
    default: { name: 'notifications', set: 'MaterialIcons' as const },
    active: { name: 'notifications-active', set: 'MaterialIcons' as const },
    muted: { name: 'notifications-off', set: 'MaterialIcons' as const },
  },
} as const;

// Icon cache for performance
const iconCache = new Map<string, React.ComponentType<any>>();

const AdvancedIcon: React.FC<AdvancedIconProps> = ({
  config,
  size = 'md',
  color,
  variant,
  theme = 'auto',
  style,
  animated = false,
  animationType = 'fade',
  animationDuration = 300,
  onPress,
  disabled = false,
  loading = false,
}) => {
  const systemTheme = useColorScheme();
  const appTheme = useAppStore(state => state.settings.preferences.theme);
  
  // Determine actual theme
  const actualTheme = useMemo(() => {
    if (theme === 'auto') {
      return appTheme === 'auto' ? systemTheme || 'dark' : appTheme;
    }
    return theme;
  }, [theme, appTheme, systemTheme]);

  // Get theme colors
  const themeColors = useMemo(() => {
    return THEME_ICON_MAPPINGS[actualTheme as keyof typeof THEME_ICON_MAPPINGS] || THEME_ICON_MAPPINGS.dark;
  }, [actualTheme]);

  // Get icon size
  const iconSize = useMemo(() => {
    if (typeof size === 'number') return size;
    if (variant) return ICON_SIZES[TYPOGRAPHY_ICONS[variant].size];
    return ICON_SIZES[size];
  }, [size, variant]);

  // Get icon color
  const iconColor = useMemo(() => {
    if (color) return color;
    if (disabled) return themeColors.textSecondary;
    return themeColors.text;
  }, [color, disabled, themeColors]);

  // Get icon configuration based on theme/state
  const iconConfig = useMemo(() => {
    // Handle theme-aware icons
    if ('light' in config && 'dark' in config) {
      return actualTheme === 'light' ? config.light : config.dark;
    }
    
    // Handle state-aware icons
    if ('default' in config) {
      return config.default;
    }
    
    // Handle simple config
    return config;
  }, [config, actualTheme]);

  // Get cached or load icon component
  const IconComponent = useMemo(() => {
    const cacheKey = `${(iconConfig as any).set}-${(iconConfig as any).name}`;
    
    if (iconCache.has(cacheKey)) {
      return iconCache.get(cacheKey)!;
    }

    const IconSet = IconSets[(iconConfig as any).set];
    iconCache.set(cacheKey, IconSet);
    return IconSet;
  }, [(iconConfig as any).set, (iconConfig as any).name]);

  // Handle press with haptic feedback
  const handlePress = () => {
    if (disabled || loading) return;
    
    // Add haptic feedback here if needed
    onPress?.();
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { width: iconSize, height: iconSize }, style]}>
        <ActivityIndicator size="small" color={iconColor} />
      </View>
    );
  }

  // Render icon with fallback
  const renderIcon = () => (
    <Suspense fallback={
      <View style={[styles.container, { width: iconSize, height: iconSize }]}>
        <ActivityIndicator size="small" color={iconColor} />
      </View>
    }>
      <IconComponent
        name={(iconConfig as any).name}
        size={iconSize}
        color={iconColor}
        style={style}
      />
    </Suspense>
  );

  // Animated version
  if (animated) {
    const AnimatedIcon = React.lazy(() => import('./AnimatedIcon').then(m => ({ default: m.AnimatedIcon })));
    return (
      <Suspense fallback={renderIcon()}>
        <AnimatedIcon
          name={iconConfig as any}
          size={iconSize}
          color={iconColor}
          style={style}
          animation={animationType}
          duration={animationDuration}
        />
      </Suspense>
    );
  }

  // Pressable version
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.pressable,
          { opacity: disabled ? 0.5 : 1 },
          style
        ]}
        activeOpacity={0.7}
      >
        {renderIcon()}
      </TouchableOpacity>
    );
  }

  return renderIcon();
};

// Utility functions
export const createIconConfig = (
  name: string,
  set: IconSet,
  fallback?: IconConfig
): IconConfig => ({
  name,
  set,
  fallback,
});

export const createThemeAwareIcon = (
  lightConfig: IconConfig,
  darkConfig: IconConfig
) => ({
  light: lightConfig,
  dark: darkConfig,
});

export const createStateAwareIcon = (
  defaultConfig: IconConfig,
  activeConfig?: IconConfig,
  inactiveConfig?: IconConfig
) => ({
  default: defaultConfig,
  ...(activeConfig && { active: activeConfig }),
  ...(inactiveConfig && { inactive: inactiveConfig }),
});

// Export main component
export { AdvancedIcon as Icon };
export default AdvancedIcon;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
