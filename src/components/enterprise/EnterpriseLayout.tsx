import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, SafeAreaView, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { spacing } from '../../core/theme';

interface EnterpriseLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  padding?: number;
  safeArea?: boolean;
  statusBarStyle?: 'light' | 'dark';
  style?: ViewStyle;
}

export const EnterpriseLayout: React.FC<EnterpriseLayoutProps> = ({
  children,
  header,
  footer,
  scrollable = true,
  backgroundColor = '#000000',
  padding = spacing.lg,
  safeArea = true,
  statusBarStyle = 'light',
  style
}) => {
  const content = (
    <View style={[styles.container, { backgroundColor, padding }, style]}>
      {header && (
        <View style={styles.header}>
          {header}
        </View>
      )}
      
      <View style={styles.content}>
        {children}
      </View>
      
      {footer && (
        <View style={styles.footer}>
          {footer}
        </View>
      )}
    </View>
  );

  const wrappedContent = safeArea ? (
    <SafeAreaView style={styles.safeArea}>
      {content}
    </SafeAreaView>
  ) : content;

  return (
    <>
      <StatusBar style={statusBarStyle} backgroundColor={backgroundColor} />
      {scrollable ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {wrappedContent}
        </ScrollView>
      ) : (
        wrappedContent
      )}
    </>
  );
};

interface EnterpriseSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  padding?: number;
}

export const EnterpriseSection: React.FC<EnterpriseSectionProps> = ({
  children,
  title,
  subtitle,
  style,
  padding = spacing.lg
}) => {
  return (
    <View style={[styles.section, { padding }, style]}>
      {(title || subtitle) && (
        <View style={styles.sectionHeader}>
          {title && (
            <View style={styles.sectionTitle}>
              <Text style={styles.titleText}>{title}</Text>
            </View>
          )}
          {subtitle && (
            <View style={styles.sectionSubtitle}>
              <Text style={styles.subtitleText}>{subtitle}</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

interface EnterpriseGridProps {
  children: React.ReactNode;
  columns?: number;
  spacing?: number;
  style?: ViewStyle;
}

export const EnterpriseGrid: React.FC<EnterpriseGridProps> = ({
  children,
  columns = 2,
  spacing = 16,
  style
}) => {
  return (
    <View style={[styles.grid, { gap: spacing }, style]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={[styles.gridItem, { flex: 1 / columns }]}>
          {child}
        </View>
      ))}
    </View>
  );
};

interface EnterpriseRowProps {
  children: React.ReactNode;
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  spacing?: number;
  style?: ViewStyle;
}

export const EnterpriseRow: React.FC<EnterpriseRowProps> = ({
  children,
  justifyContent = 'flex-start',
  alignItems = 'center',
  spacing = 16,
  style
}) => {
  return (
    <View style={[
      styles.row,
      { justifyContent, alignItems, gap: spacing },
      style
    ]}>
      {children}
    </View>
  );
};

interface EnterpriseColumnProps {
  children: React.ReactNode;
  flex?: number;
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  spacing?: number;
  style?: ViewStyle;
}

export const EnterpriseColumn: React.FC<EnterpriseColumnProps> = ({
  children,
  flex = 1,
  alignItems = 'stretch',
  spacing = 16,
  style
}) => {
  return (
    <View style={[
      styles.column,
      { flex, alignItems, gap: spacing },
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    marginBottom: spacing.xs,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitleText: {
    color: '#8C8C8C',
    fontSize: 16,
  },
  sectionContent: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
});
