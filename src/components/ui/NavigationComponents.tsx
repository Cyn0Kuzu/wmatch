import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '../../core/theme';
import { Icon, Icons } from './IconComponent';

interface TabBarProps {
  tabs: string[];
  activeTab: number;
  onTabPress: (index: number) => void;
  style?: ViewStyle;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab, index) => (
        <View
          key={index}
          style={[
            styles.tab,
            activeTab === index && styles.activeTab,
          ]}
          onTouchEnd={() => onTabPress(index)}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === index && styles.activeTabText,
            ]}
          >
            {tab}
          </Text>
        </View>
      ))}
    </View>
  );
};

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: () => void;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search...',
  value,
  onChangeText,
  onSearch,
  style,
}) => {
  return (
    <View style={[styles.searchContainer, style]}>
      <Icon name={Icons.search} size={16} color="#8C8C8C" style={styles.searchIcon} />
      <Text
        style={styles.searchInput}
        onPress={onSearch}
      >
        {value || placeholder}
      </Text>
    </View>
  );
};

interface FilterChipsProps {
  filters: string[];
  activeFilters: string[];
  onFilterPress: (filter: string) => void;
  style?: ViewStyle;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  activeFilters,
  onFilterPress,
  style,
}) => {
  return (
    <View style={[styles.chipsContainer, style]}>
      {filters.map((filter, index) => (
        <View
          key={index}
          style={[
            styles.chip,
            activeFilters.includes(filter) && styles.activeChip,
          ]}
          onTouchEnd={() => onFilterPress(filter)}
        >
          <Text
            style={[
              styles.chipText,
              activeFilters.includes(filter) && styles.activeChipText,
            ]}
          >
            {filter}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#141414',
    borderRadius: 8,
    padding: spacing.xs,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#E50914',
  },
  tabText: {
    ...typography.body2,
    color: '#8C8C8C',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    ...typography.body1,
    color: '#8C8C8C',
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  chip: {
    backgroundColor: '#141414',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  activeChip: {
    backgroundColor: '#E50914',
  },
  chipText: {
    ...typography.body2,
    color: '#8C8C8C',
    fontWeight: '500',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
