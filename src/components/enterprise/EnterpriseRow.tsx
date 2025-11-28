import React from 'react';
import { View, StyleSheet } from 'react-native';

interface EnterpriseRowProps {
  children: React.ReactNode;
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  style?: any;
}

export const EnterpriseRow: React.FC<EnterpriseRowProps> = ({ 
  children, 
  justifyContent = 'flex-start', 
  alignItems = 'center',
  style 
}) => {
  return (
    <View style={[styles.row, { justifyContent, alignItems }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});




