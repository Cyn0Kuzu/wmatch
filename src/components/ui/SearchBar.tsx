import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import { Icon, Icons } from './IconComponent';
import { AnimatedIcon } from './AnimatedIcon';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  debounceMs?: number;
  showClearButton?: boolean;
  showSearchButton?: boolean;
  autoFocus?: boolean;
  style?: any;
  inputStyle?: any;
  containerStyle?: any;
}

const { width: screenWidth } = Dimensions.get('window');

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Ara...',
  value = '',
  onChangeText,
  onSearch,
  onClear,
  onFocus,
  onBlur,
  debounceMs = 300,
  showClearButton = true,
  showSearchButton = true,
  autoFocus = false,
  style,
  inputStyle,
  containerStyle,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (isFocused) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [isFocused, animatedValue]);

  const handleTextChange = (text: string) => {
    setInternalValue(text);
    onChangeText?.(text);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch?.(text);
    }, debounceMs);
  };

  const handleClear = () => {
    setInternalValue('');
    onChangeText?.('');
    onClear?.();
    onSearch?.('');
  };

  const handleSearch = () => {
    onSearch?.(internalValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E0E0E0', '#E50914'],
  });

  const shadowOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.1],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
          shadowOpacity,
        },
        containerStyle,
        style,
      ]}
    >
      <View style={styles.searchIconContainer}>
        <AnimatedIcon
          name={Icons.search}
          size={20}
          color={isFocused ? '#E50914' : '#8C8C8C'}
          animation="pulse"
          duration={2000}
          loop={isFocused}
        />
      </View>

      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#8C8C8C"
        value={internalValue}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={handleSearch}
        clearButtonMode="never"
      />

      {showClearButton && internalValue.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <AnimatedIcon
            name={Icons.close}
            size={18}
            color="#8C8C8C"
            animation="scale"
            duration={150}
          />
        </TouchableOpacity>
      )}

      {showSearchButton && (
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <AnimatedIcon
            name={Icons.search}
            size={20}
            color="#E50914"
            animation="bounce"
            duration={300}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchButton: {
    padding: 4,
    marginLeft: 8,
  },
  advancedContainer: {},
  filterButton: {},
  filterPanel: {},
  filterRow: {},
  filterLabel: {},
});

// Advanced SearchBar with filters
interface AdvancedSearchBarProps extends SearchBarProps {
  filters?: {
    type: 'movie' | 'tv' | 'all';
    genre: string;
    year: string;
    rating: string;
  };
  onFilterChange?: (filters: any) => void;
  showFilters?: boolean;
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  filters = { type: 'all', genre: '', year: '', rating: '' },
  onFilterChange,
  showFilters = false,
  ...searchBarProps
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentFilters, setCurrentFilters] = useState(filters);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...currentFilters, [key]: value };
    setCurrentFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  return (
    <View>
      <View style={styles.advancedContainer}>
        <SearchBar {...searchBarProps} style={{ flex: 1, marginRight: 8 }} />
        <TouchableOpacity
          onPress={() => setShowFilterPanel(!showFilterPanel)}
          style={styles.filterButton}
        >
          <AnimatedIcon
            name={Icons.filter}
            size={24}
            color={showFilterPanel ? '#E50914' : '#8C8C8C'}
            animation="rotate"
            duration={300}
          />
        </TouchableOpacity>
      </View>

      {showFilterPanel && showFilters && (
        <View style={styles.filterPanel}>
          {/* Filter options would go here */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Tür:</Text>
            {/* Filter buttons for type, genre, year, rating */}
          </View>
        </View>
      )}
    </View>
  );
};

const advancedStyles = StyleSheet.create({
  advancedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  filterButton: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterPanel: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginRight: 12,
  },
});


