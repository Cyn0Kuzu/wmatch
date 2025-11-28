import React from 'react';
import { View, StyleSheet } from 'react-native';

interface EnterpriseGridProps {
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  style?: any;
}

export const EnterpriseGrid: React.FC<EnterpriseGridProps> = ({ 
  children, 
  columns = 2,
  spacing = 16,
  style 
}) => {
  const gridStyle = [
    styles.grid,
    {
      gap: spacing,
    },
    style
  ];

  return (
    <View style={gridStyle}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={[styles.gridItem, { width: `${100 / columns}%` }]}>
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  gridItem: {
    marginBottom: 16,
  },
});
