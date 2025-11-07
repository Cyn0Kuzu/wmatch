import React from 'react';
import { View, StyleSheet } from 'react-native';

interface EnterpriseSectionProps {
  children: React.ReactNode;
  style?: any;
}

export const EnterpriseSection: React.FC<EnterpriseSectionProps> = ({ children, style }) => {
  return (
    <View style={[styles.section, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
});




