import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { spacing, typography } from '../../core/theme';

interface ToastProps {
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const showToast = (title: string, type: 'success' | 'error' | 'info' = 'error', message?: string, duration = 4000) => {
  (Toast.show as any)({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration,
    position: 'top',
    topOffset: 60,
    text1Style: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    text2Style: {
      fontSize: 14,
      color: '#FFFFFF',
    },
    style: {
      backgroundColor: type === 'error' ? '#E50914' : '#4CAF50',
      borderRadius: 8,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
    },
  });
};

export const showFlashMessage = (title: string, type: 'success' | 'error' | 'info' = 'error', message?: string, duration = 4000) => {
  showMessage({
    message: title,
    description: message,
    type: type as any,
    duration,
    floating: true,
    position: 'top',
    style: {
      backgroundColor: type === 'error' ? '#E50914' : type === 'success' ? '#4CAF50' : '#2196F3',
      borderRadius: 8,
    },
    titleStyle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    textStyle: {
      fontSize: 14,
      color: '#FFFFFF',
    },
  });
};

export const ToastContainer: React.FC = () => {
  return (
    <>
      <Toast 
        config={{
          success: (props) => (
            <View style={styles.toastContainer}>
              <Text style={styles.toastText}>{props.text1}</Text>
              {props.text2 && <Text style={styles.toastSubtext}>{props.text2}</Text>}
            </View>
          ),
          error: (props) => (
            <View style={[styles.toastContainer, styles.errorToast]}>
              <Text style={styles.toastText}>{props.text1}</Text>
              {props.text2 && <Text style={styles.toastSubtext}>{props.text2}</Text>}
            </View>
          ),
        }}
      />
      <FlashMessage position="top" />
    </>
  );
};

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: string;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = '😔',
  style,
}) => {
  return (
    <View style={[styles.emptyContainer, style]}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorToast: {
    backgroundColor: '#E50914',
  },
  toastText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  toastSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.body2,
    color: '#8C8C8C',
    textAlign: 'center',
  },
});
