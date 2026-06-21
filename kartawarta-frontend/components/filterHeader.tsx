// @/components/FilterHeader.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/themeColors';

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

  // Helper to check if any non-default filters are active
  const hasActiveFilters = filterMode !== 'all'
    || (secondaryFilterMode && secondaryFilterMode !== 'All')
    || (tertiaryFilterMode && tertiaryFilterMode !== 'All');

  return (
    <View style={styles.container}>
      <View style={styles.headerControls}>
        <View style={styles.searchWrapper}>
          <FontAwesome6 name="magnifying-glass" size={14} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cards..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.mutedForeground}
          />
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

          {/* Category 2: Sets (Expansions) */}
          {secondaryFilterOptions && (
            <>
              <Text style={[styles.menuLabel, { marginTop: 16 }]}>{secondaryFilterLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                {secondaryFilterOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.menuOption, secondaryFilterMode === opt.id && styles.menuOptionActive]}
                    onPress={() => onSecondaryFilterPress?.(opt.id)}
                  >
                    <Text style={[styles.optionText, secondaryFilterMode === opt.id && styles.textActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {tertiaryFilterOptions && (
            <>
              <Text style={[styles.menuLabel, { marginTop: 16 }]}>{tertiaryFilterLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
                {tertiaryFilterOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.menuOption, tertiaryFilterMode === opt.id && styles.menuOptionActive]}
                    onPress={() => onTertiaryFilterPress?.(opt.id)}
                  >
                    <Text style={[styles.optionText, tertiaryFilterMode === opt.id && styles.textActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
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
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) },
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
  statsBar: { paddingHorizontal: 16, marginBottom: 8 },
  statsMainText: { color: colors.mutedForeground, fontSize: 13 },
});

export default FilterHeader;