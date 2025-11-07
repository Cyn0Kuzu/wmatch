import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedText } from './AnimatedText';
import { AnimatedButton } from './AnimatedButton';
import { spacing } from '../../core/theme';

const { height } = Dimensions.get('window');
const isSmallScreen = height < 700;

interface BottomActionBarProps {
  /** The main action button */
  actionButton?: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  /** Secondary action button (optional) */
  secondaryButton?: {
    title: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  /** Show copyright and powered by text */
  showCopyright?: boolean;
  /** Custom copyright text */
  copyrightText?: string;
  /** Custom powered by text */
  poweredByText?: string;
  /** Additional content to render above buttons */
  children?: React.ReactNode;
  /** Custom styling */
  style?: any;
  /** Animation delay for buttons */
  buttonDelay?: number;
  /** Animation delay for copyright */
  copyrightDelay?: number;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  actionButton,
  secondaryButton,
  showCopyright = true,
  copyrightText = '© 2025 WMatch',
  poweredByText = 'Powered by MWatch',
  children,
  style,
  buttonDelay = 1000,
  copyrightDelay = 1200,
}) => {
  const insets = useSafeAreaInsets();
  
  // Calculate safe bottom padding
  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === 'ios' ? 20 : 16 // Minimum padding for iOS/Android
  );

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }, style]}>
      {children && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}
      
      {/* Action Buttons */}
      {(actionButton || secondaryButton) && (
        <View style={styles.buttonContainer}>
          {secondaryButton && (
            <AnimatedButton
              mode={secondaryButton.variant === 'outline' ? 'outlined' : 'contained'}
              onPress={secondaryButton.onPress}
              loading={secondaryButton.loading}
              disabled={secondaryButton.disabled}
              animation="fadeInUp"
              delay={buttonDelay}
              style={[
                styles.secondaryButton,
                secondaryButton.variant === 'outline' && styles.outlineButton
              ] as any}
              buttonColor={secondaryButton.variant === 'primary' ? '#E50914' : 'transparent'}
              textColor={secondaryButton.variant === 'outline' ? '#FFFFFF' : '#FFFFFF'}
            >
              {secondaryButton.title}
            </AnimatedButton>
          )}
          
          {actionButton && (
            <AnimatedButton
              mode="contained"
              onPress={actionButton.onPress}
              loading={actionButton.loading}
              disabled={actionButton.disabled}
              animation="fadeInUp"
              delay={buttonDelay + 100}
              style={[
                styles.primaryButton,
                secondaryButton && styles.primaryButtonWithSecondary
              ] as any}
              buttonColor="#E50914"
            >
              {actionButton.title}
            </AnimatedButton>
          )}
        </View>
      )}
      
      {/* Copyright Section */}
      {showCopyright && (
        <View style={styles.copyrightSection}>
          <AnimatedText 
            variant="body2" 
            animation="fadeInUp" 
            delay={copyrightDelay} 
            style={styles.copyright}
          >
            {copyrightText}
          </AnimatedText>
          <AnimatedText 
            variant="body2" 
            animation="fadeInUp" 
            delay={copyrightDelay + 200} 
            style={styles.poweredBy}
          >
            {poweredByText}
          </AnimatedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  childrenContainer: {
    marginBottom: spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    minHeight: 48,
    backgroundColor: '#E50914',
  },
  primaryButtonWithSecondary: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    minHeight: 48,
    backgroundColor: 'transparent',
  },
  outlineButton: {
    borderColor: '#FFFFFF',
    borderWidth: 1,
  },
  copyrightSection: {
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginTop: spacing.sm,
  },
  copyright: {
    color: '#8C8C8C',
    fontSize: isSmallScreen ? 12 : 14,
    marginBottom: spacing.xs,
  },
  poweredBy: {
    color: '#8C8C8C',
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '500',
  },
});
