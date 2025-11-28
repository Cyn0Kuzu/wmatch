import { DefaultTheme } from 'react-native-paper';

// Modern, Professional Color System
export const colors = {
  // Primary Colors
  primary: '#E50914', // Netflix red
  primaryDark: '#B8070F',
  primaryLight: '#FF4444',
  
  // Background Colors
  background: '#000000', // Black
  backgroundSecondary: '#0A0A0A', // Very dark gray
  surface: '#1A1A1A', // Dark surface
  surfaceSecondary: '#2A2A2A', // Lighter dark surface
  surfaceTertiary: '#333333', // Even lighter
  
  // Text Colors - All visible and readable
  textPrimary: '#FFFFFF', // White - Main text
  textSecondary: '#CCCCCC', // Light gray - Secondary text (more visible than #8C8C8C)
  textTertiary: '#B3B3B3', // Medium gray - Tertiary text
  textPlaceholder: '#8C8C8C', // Gray - Placeholder text
  textDisabled: '#666666', // Dark gray - Disabled text
  
  // Accent Colors
  accent: '#F5C518', // Gold
  success: '#00D4AA', // Green
  warning: '#FFA500', // Orange
  error: '#E50914', // Red
  info: '#00A8E8', // Blue
  
  // Border Colors
  border: '#333333', // Dark border
  borderLight: '#404040', // Lighter border
  borderActive: '#E50914', // Active border
  
  // Button Colors
  buttonPrimary: '#E50914',
  buttonPrimaryPressed: '#B8070F',
  buttonSecondary: '#1A1A1A',
  buttonSecondaryBorder: '#333333',
  buttonDisabled: '#333333',
  buttonText: '#FFFFFF',
  buttonTextSecondary: '#CCCCCC',
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.8)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.9)',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    secondary: colors.surface,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    text: colors.textPrimary,
    placeholder: colors.textPlaceholder,
    backdrop: colors.backdrop,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100' as const,
    },
  },
  roundness: 8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};
