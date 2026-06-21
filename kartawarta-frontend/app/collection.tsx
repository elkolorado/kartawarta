import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Shared Components & Hooks
import CardItem from '@/components/CardItem';
import FilterHeader from '@/components/filterHeader';

import { useCardFilters } from '@/hooks/useCardFilters';
import { getExpansionOptions, getRarityOptions } from '@/utils/cardUtils';

// Context & Theme
import { useCardContext } from '../context/CardContext';
import { useSession } from '@/hooks/useAuth';
import { colors } from '@/constants/themeColors';
import { CollectionStats } from '@/components/collectionStats';
import { WindowGrid } from '@/components/windowGrid';
import { getTcgByName, normalizeTcgName } from '@/constants/tcgs';

const SORT_OPTIONS = {
  price: 'Price',
  priceTrend: 'Trend',
  name: 'Name',
  dateAdded: 'Date',
};

const FILTER_OPTIONS = [
  { id: 'owned', label: 'Owned' },
  { id: 'unowned', label: 'Missing' },
  { id: 'all', label: 'All' },
];

const Collection: React.FC = () => {
  const { session, isLoading } = useSession();
  const { cardCollectionData, allCards, setTcgName, setTcgId } = useCardContext();
  const { tcgName: routeTcgName } = useLocalSearchParams<{ tcgName?: string }>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const normalizedTcgName = normalizeTcgName(routeTcgName);
    const tcg = getTcgByName(normalizedTcgName);
    setTcgName(tcg.name);
    setTcgId(tcg.id);
  }, [routeTcgName, setTcgId, setTcgName]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'owned' | 'unowned'>('owned');
  const [sortBy, setSortBy] = useState<any>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedExpansion, setSelectedExpansion] = useState('All');
  const [selectedRarity, setSelectedRarity] = useState('All');

  // 1. Prepare Expansion Options
  const expansionOptions = useMemo(() => getExpansionOptions(allCards), [allCards]);
  const rarityOptions = useMemo(() => getRarityOptions(allCards), [allCards]);

  // 2. Determine the Base List (Before Filtering/Sorting)
  const baseList = useMemo(() => {
    if (filterMode === 'owned') return cardCollectionData;
    if (filterMode === 'unowned') {
      const ownedIds = new Set(cardCollectionData.map(cc => cc.cardMarketId));
      return allCards.filter(ac => !ownedIds.has(ac.cardMarketId));
    }
    // "All" combines both
    const ownedIds = new Set(cardCollectionData.map(cc => cc.cardMarketId));
    const unowned = allCards.filter(ac => !ownedIds.has(ac.cardMarketId));
    return [...cardCollectionData, ...unowned];
  }, [filterMode, allCards, cardCollectionData]);

  // 3. Apply Filters & Sort via Shared Hook
  const memoizedCards = useCardFilters(baseList, {
    searchQuery,
    selectedExpansion,
    selectedRarity,
    sortBy,
    sortDir,
  });

  const handleSortPress = (id: string) => {
    if (sortBy === id) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(id);
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
          filterMode={filterMode}
          filterOptions={FILTER_OPTIONS}
          onFilterPress={(id) => setFilterMode(id as any)}
          secondaryFilterMode={selectedExpansion}
          secondaryFilterOptions={expansionOptions}
          onSecondaryFilterPress={setSelectedExpansion}
          secondaryFilterLabel="Expansions"
          tertiaryFilterMode={selectedRarity}
          tertiaryFilterOptions={rarityOptions}
          onTertiaryFilterPress={setSelectedRarity}
          tertiaryFilterLabel="Rarities"
        />

        <CollectionStats cards={memoizedCards} />

        <WindowGrid
          data={memoizedCards}
          renderCard={(item) => (
            <CardItem
              card={item}
              showCollection={true}
              dimmed={filterMode === 'unowned' || (item.quantity ?? 0) === 0}
              onPress={(c) => Linking.openURL(c?.card_url).catch(() => {})}
            />
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  contentWrapper: { 
    maxWidth: 1536, 
    marginHorizontal: 'auto', 
    flex: 1, 
    width: '100%' 
  },
});

export default Collection;