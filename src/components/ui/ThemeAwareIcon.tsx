import React, { useMemo } from 'react';
import { useColorScheme, View } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ADVANCED_ICONS } from './AdvancedIconComponent';

interface ThemeAwareIconProps {
  lightConfig: any;
  darkConfig: any;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | number;
  color?: string;
  style?: any;
  animated?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const ThemeAwareIcon: React.FC<ThemeAwareIconProps> = ({
  lightConfig,
  darkConfig,
  size = 'md',
  color,
  style,
  animated = false,
  onPress,
  disabled = false,
  loading = false,
}) => {
  const systemTheme = useColorScheme();
  const appTheme = useAppStore(state => state.settings.preferences.theme);

  // Determine which config to use based on theme
  const iconConfig = useMemo(() => {
    const currentTheme = appTheme === 'auto' ? systemTheme || 'dark' : appTheme;
    return currentTheme === 'light' ? lightConfig : darkConfig;
  }, [lightConfig, darkConfig, appTheme, systemTheme]);

  return (
    <View style={style}>
      {/* Theme aware icon placeholder */}
    </View>
  );
};

// Predefined theme-aware icons
export const THEME_AWARE_ICONS = {
  // Navigation icons - different styles for light/dark themes
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
  
  // Action icons - different weights for themes
  like: {
    light: { name: 'favorite-border', set: 'MaterialIcons' as const },
    dark: { name: 'heart', set: 'Feather' as const },
  },
  share: {
    light: { name: 'share', set: 'MaterialIcons' as const },
    dark: { name: 'share-alt', set: 'AntDesign' as const },
  },
  play: {
    light: { name: 'play-circle-filled', set: 'MaterialIcons' as const },
    dark: { name: 'play-circle', set: 'Feather' as const },
  },
  
  // Status icons - different styles
  verified: {
    light: { name: 'verified', set: 'MaterialIcons' as const },
    dark: { name: 'shield', set: 'Feather' as const },
  },
  notification: {
    light: { name: 'notifications', set: 'MaterialIcons' as const },
    dark: { name: 'bell', set: 'Feather' as const },
  },
} as const;

// Convenience component for theme-aware icons
export const SmartIcon: React.FC<{
  icon: keyof typeof THEME_AWARE_ICONS;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | number;
  color?: string;
  style?: any;
  animated?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}> = ({ icon, ...props }) => {
  const iconConfig = THEME_AWARE_ICONS[icon];
  
  return (
    <ThemeAwareIcon
      lightConfig={iconConfig.light}
      darkConfig={iconConfig.dark}
      {...props}
    />
  );
};

export default ThemeAwareIcon;


