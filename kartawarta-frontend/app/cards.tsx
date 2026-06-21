import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import CardItem from '@/components/CardItem';
import { Linking } from 'react-native';
import { colors } from '@/constants/themeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCardContext } from '../context/CardContext';
import FilterHeader from '@/components/filterHeader';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSession } from '@/hooks/useAuth';
import { useCardFilters } from '@/hooks/useCardFilters';
import { WindowGrid } from '@/components/windowGrid';
import { getExpansionOptions, getRarityOptions } from '@/utils/cardUtils';
import { getTcgByName, normalizeTcgName } from '@/constants/tcgs';





const CardsView: React.FC = () => {
  const { session, isLoading } = useSession();
  const { allCards, setTcgName, setTcgId } = useCardContext(); // Using centralized data
  const { tcgName: routeTcgName } = useLocalSearchParams<{ tcgName?: string }>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const normalizedTcgName = normalizeTcgName(routeTcgName);
    const tcg = getTcgByName(normalizedTcgName);
    setTcgName(tcg.name);
    setTcgId(tcg.id);
  }, [routeTcgName, setTcgId, setTcgName]);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpansion, setSelectedExpansion] = useState('All');
  const [selectedRarity, setSelectedRarity] = useState('All');
  const [sortBy, setSortBy] = useState<'price' | 'priceTrend' | 'name' | 'availability'>('price');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const SORT_OPTIONS = {
    price: 'Price',
    priceTrend: 'Trend',
    name: 'Name',
    availability: 'Stock',
  };

  const expansionOptions = useMemo(() => getExpansionOptions(allCards), [allCards]);
  const rarityOptions = useMemo(() => getRarityOptions(allCards), [allCards]);
  const memoizedCards = useCardFilters(allCards, { searchQuery, selectedExpansion, selectedRarity, sortBy, sortDir });

  const handleSortPress = (id: string) => {
    if (sortBy === id) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(id as any);
      setSortDir('desc');
    }
  };

  if (isLoading) {
    return <View style={styles.container} />;
  }

  if (!session) return <Redirect href="/login" />;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.contentWrapper}>
        <FilterHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentSort={sortBy}
          sortDir={sortDir}
          sortOptions={SORT_OPTIONS}
          onSortPress={handleSortPress}
          filterMode={selectedExpansion}
          filterOptions={expansionOptions}
          onFilterPress={setSelectedExpansion}
          filterLabel="Expansions"
          secondaryFilterMode={selectedRarity}
          secondaryFilterOptions={rarityOptions}
          onSecondaryFilterPress={setSelectedRarity}
          secondaryFilterLabel="Rarities"
          statsText={`${memoizedCards.length} cards found`}
        />

        <WindowGrid
          data={memoizedCards}
          renderCard={(item) => (
            <CardItem
              card={item}
              onPress={(c) => Linking.openURL(c?.card_url).catch(() => { })}
            />
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentWrapper: { maxWidth: 1536, marginHorizontal: 'auto', flex: 1, width: '100%' },

  header: {
    fontSize: 24,
    fontWeight: '800',
    padding: 16,
    color: colors.foreground,
    letterSpacing: 0.5
  },
  filters: {
    paddingHorizontal: 16,
    gap: 12 // Using gap instead of margins for cleaner spacing
  },
  // --- SEARCH BAR ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
  },
  search: {
    flex: 1,
    height: '100%',
    color: colors.foreground,
    fontSize: 16,
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },
  // --- PICKER ROW ---
  dropdownRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  dropdownContainer: {
    flex: 1,
    height: 48, // Stała wysokość taka sama jak TextInput
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', // Centruje Picker w pionie
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    color: colors.foreground,
    backgroundColor: 'transparent',
    ...Platform.select({
      android: {
        height: 48,
        scaleX: 0.9, // Opcjonalne: lekkie zmniejszenie skali, by tekst nie dotykał krawędzi
        scaleY: 0.9,
      },
      web: {
        outlineStyle: 'none',
        cursor: 'pointer',
      }
    }),
  },
  // --- SORT BAR ---
  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  sortActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  sortText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
  sortTextActive: { color: '#000', fontWeight: '700' },
});

export default CardsView;
