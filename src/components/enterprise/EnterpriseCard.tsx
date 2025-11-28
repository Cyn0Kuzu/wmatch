import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';

interface EnterpriseCardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled' | 'glass';
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: any;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const EnterpriseCard: React.FC<EnterpriseCardProps> = ({ 
  children, 
  variant = 'elevated',
  size = 'medium',
  onPress,
  style 
}) => {
  const cardStyle = [
    styles.card,
    styles[variant],
    styles[size],
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    marginBottom: 8,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#333',
  },
  filled: {
    backgroundColor: '#2A2A2A',
  },
  small: {
    padding: 8,
  },
  medium: {
    padding: 12,
  },
  large: {
    padding: 16,
  },
});
