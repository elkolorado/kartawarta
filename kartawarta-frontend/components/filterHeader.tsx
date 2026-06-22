// @/components/FilterHeader.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/themeColors';

const inputNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

export interface FilterOption {
  id: string;
  label: string;
}

interface FilterHeaderProps {
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  // Sorting
  currentSort: string;
  sortDir: 'asc' | 'desc';
  sortOptions: Record<string, string>;
  onSortPress: (id: string) => void;
  // Primary Filter (screen-defined)
  filterMode: string;
  filterOptions: FilterOption[];
  onFilterPress: (id: string) => void;
  filterLabel?: string;
  // Secondary Filter (screen-defined)
  secondaryFilterMode?: string;
  secondaryFilterOptions?: FilterOption[];
  onSecondaryFilterPress?: (id: string) => void;
  secondaryFilterLabel?: string;
  // Tertiary Filter (screen-defined)
  tertiaryFilterMode?: string;
  tertiaryFilterOptions?: FilterOption[];
  onTertiaryFilterPress?: (id: string) => void;
  tertiaryFilterLabel?: string;
  // Metadata
  statsText?: string;
}

const FilterHeader: React.FC<FilterHeaderProps> = ({
  searchQuery, setSearchQuery,
  currentSort, sortDir, sortOptions, onSortPress,
  filterMode, filterOptions, onFilterPress,
  filterLabel = 'Card Status',
  secondaryFilterMode, secondaryFilterOptions, onSecondaryFilterPress,
  secondaryFilterLabel = 'Expansions',
  tertiaryFilterMode, tertiaryFilterOptions, onTertiaryFilterPress,
  tertiaryFilterLabel = 'Rarities',
  statsText
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'sort' | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'primary' | 'secondary' | 'tertiary' | null>(null);
  const [primarySearch, setPrimarySearch] = useState('');
  const [secondarySearch, setSecondarySearch] = useState('');
  const [tertiarySearch, setTertiarySearch] = useState('');

  // Helper to check if any non-default filters are active
  const hasActiveFilters = filterMode !== 'all' && filterMode !== 'All'
    || (secondaryFilterMode && secondaryFilterMode !== 'All')
    || (tertiaryFilterMode && tertiaryFilterMode !== 'All');

  const isSearchableFilter = (label: string) => ['expansions', 'rarities'].includes(label.toLowerCase());

  const getOptionLabel = (options: FilterOption[] | undefined, id: string | undefined, fallback: string) => {
    if (!id) return fallback;
    return options?.find(opt => opt.id === id)?.label ?? fallback;
  };

  const filterDropdownOptions = (options: FilterOption[], query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter(opt => opt.label.toLowerCase().includes(normalizedQuery));
  };

  const renderSearchableDropdown = (
    dropdownKey: 'primary' | 'secondary' | 'tertiary',
    label: string,
    selectedId: string | undefined,
    options: FilterOption[],
    onSelect: ((id: string) => void) | undefined,
    search: string,
    setSearch: (value: string) => void,
  ) => {
    const isOpen = openDropdown === dropdownKey;
    const selectedLabel = getOptionLabel(options, selectedId, label);
    const visibleOptions = filterDropdownOptions(options, search);

    return (
      <View style={styles.dropdownField}>
        <Text style={styles.menuLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.selectButton, isOpen && styles.selectButtonOpen]}
          onPress={() => setOpenDropdown(prev => prev === dropdownKey ? null : dropdownKey)}
        >
          <Text style={styles.selectButtonText} numberOfLines={1}>{selectedLabel}</Text>
          <FontAwesome6 name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color={colors.mutedForeground} />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.selectMenu}>
            <View style={styles.dropdownSearchWrapper}>
              <FontAwesome6 name="magnifying-glass" size={12} color={colors.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={styles.dropdownSearchInput}
                placeholder={`Search ${label.toLowerCase()}...`}
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <ScrollView style={styles.selectOptionsList} keyboardShouldPersistTaps="handled">
              {visibleOptions.length > 0 ? visibleOptions.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.selectOption, selectedId === opt.id && styles.selectOptionActive]}
                  onPress={() => {
                    onSelect?.(opt.id);
                    setOpenDropdown(null);
                  }}
                >
                  <Text style={[styles.optionText, selectedId === opt.id && styles.textActive]} numberOfLines={1}>{opt.label}</Text>
                </TouchableOpacity>
              )) : (
                <Text style={styles.emptyOptionsText}>No options found</Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerControls}>
        <View style={styles.searchWrapper}>
          <FontAwesome6 name="magnifying-glass" size={14} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, inputNoOutline]}
            placeholder="Search cards..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.mutedForeground}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity accessibilityLabel="Clear search" activeOpacity={0.75} style={styles.clearSearchButton} onPress={() => setSearchQuery('')}>
              <FontAwesome6 name="xmark" size={12} color={colors.background} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.buttonGroup}>
          {/* Unified Filter Button */}
          <TouchableOpacity
            style={[
              styles.actionButton, 
              activeTab === 'filters' && styles.buttonOpen,
              hasActiveFilters && !activeTab && styles.buttonActiveHighlight
            ]}
            onPress={() => setActiveTab(prev => prev === 'filters' ? null : 'filters')}
          >
            <MaterialCommunityIcons 
              name={hasActiveFilters ? "filter" : "filter-outline"} 
              size={18} 
              color={activeTab === 'filters' ? "#000" : colors.foreground} 
            />
            <Text style={[styles.actionButtonText, activeTab === 'filters' && styles.textActive]}>
              Filters
            </Text>
          </TouchableOpacity>

          {/* Sort Button */}
          <TouchableOpacity
            style={[styles.actionButton, activeTab === 'sort' && styles.buttonOpen]}
            onPress={() => setActiveTab(prev => prev === 'sort' ? null : 'sort')}
          >
            <MaterialCommunityIcons name="sort-variant" size={18} color={activeTab === 'sort' ? "#000" : colors.foreground} />
            <Text style={[styles.actionButtonText, activeTab === 'sort' && styles.textActive]}>
              {sortOptions[currentSort]} {activeTab !== 'sort' && (sortDir === 'asc' ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Multi-Category Filter Dropdown */}
      {activeTab === 'filters' && (
        <View style={styles.dropdownMenu}>
          {isSearchableFilter(filterLabel) ? (
            renderSearchableDropdown(
              'primary',
              filterLabel,
              filterMode,
              filterOptions,
              onFilterPress,
              primarySearch,
              setPrimarySearch,
            )
          ) : (
            <>
              <Text style={styles.menuLabel}>{filterLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                {filterOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.menuOption, filterMode === opt.id && styles.menuOptionActive]}
                    onPress={() => onFilterPress(opt.id)}
                  >
                    <Text style={[styles.optionText, filterMode === opt.id && styles.textActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Category 2: Sets (Expansions) */}
          {secondaryFilterOptions && (
            renderSearchableDropdown(
              'secondary',
              secondaryFilterLabel,
              secondaryFilterMode,
              secondaryFilterOptions,
              onSecondaryFilterPress,
              secondarySearch,
              setSecondarySearch,
            )
          )}

          {tertiaryFilterOptions && (
            renderSearchableDropdown(
              'tertiary',
              tertiaryFilterLabel,
              tertiaryFilterMode,
              tertiaryFilterOptions,
              onTertiaryFilterPress,
              tertiarySearch,
              setTertiarySearch,
            )
          )}
        </View>
      )}

      {/* Sort Dropdown */}
      {activeTab === 'sort' && (
        <View style={styles.dropdownMenu}>
          <Text style={styles.menuLabel}>Sort Order</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
            {Object.entries(sortOptions).map(([id, label]) => (
              <TouchableOpacity
                key={id}
                style={[styles.menuOption, currentSort === id && styles.menuOptionActive]}
                onPress={() => onSortPress(id)}
              >
                <Text style={[styles.optionText, currentSort === id && styles.textActive]}>
                  {label} {currentSort === id ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {statsText && (
        <View style={styles.statsBar}>
          <Text style={styles.statsMainText}>{statsText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { zIndex: 10, backgroundColor: colors.background },
  headerControls: { padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  searchWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14, borderWidth: 0 },
  clearSearchButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  buttonGroup: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  buttonOpen: { backgroundColor: colors.primary, borderColor: colors.primary },
  buttonActiveHighlight: { borderColor: colors.primary }, // Subtle hint when filters are active
  actionButtonText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  textActive: { color: '#000' },
  dropdownMenu: {
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  menuLabel: { color: colors.mutedForeground, fontSize: 10, marginBottom: 8, fontWeight: '800', textTransform: 'uppercase' },
  optionRow: { flexDirection: 'row', gap: 8 },
  menuOption: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  menuOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  dropdownField: { marginTop: 16 },
  selectButton: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectButtonOpen: { borderColor: colors.primary },
  selectButtonText: { color: colors.foreground, fontSize: 13, fontWeight: '600', flex: 1 },
  selectMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 10,
  },
  dropdownSearchWrapper: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownSearchInput: { flex: 1, color: colors.foreground, fontSize: 13 },
  selectOptionsList: { maxHeight: 220 },
  selectOption: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  selectOptionActive: { backgroundColor: colors.primary },
  emptyOptionsText: { color: colors.mutedForeground, fontSize: 13, paddingVertical: 10, textAlign: 'center' },
  statsBar: { paddingHorizontal: 16, marginBottom: 8 },
  statsMainText: { color: colors.mutedForeground, fontSize: 13 },
});

export default FilterHeader;