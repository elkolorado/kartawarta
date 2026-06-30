import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Shared Components & Hooks
import CardItem from '@/components/CardItem';
import FilterHeader from '@/components/filterHeader';

import { useCardFilters } from '@/hooks/useCardFilters';
import { getExpansionOptions, getLabelOptions, getRarityOptions } from '@/utils/cardUtils';

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
  const { cardCollectionData, allCards, labels, setTcgName, setTcgId, tcgName } = useCardContext();
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
  const [selectedLabels, setSelectedLabels] = useState<string[]>(['All']);

  // 1. Prepare Expansion Options
  const expansionOptions = useMemo(() => getExpansionOptions(allCards), [allCards]);
  const rarityOptions = useMemo(() => getRarityOptions(allCards), [allCards]);
  const labelOptions = useMemo(() => getLabelOptions(labels), [labels]);
  const activeLabelIds = useMemo(() => selectedLabels.includes('All') ? [] : selectedLabels.map(Number).filter(Number.isFinite), [selectedLabels]);

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
    selectedLabels,
    sortBy,
    sortDir,
  });

  const displayCards = useMemo(() => {
    if (activeLabelIds.length === 0) return memoizedCards;
    const activeLabelSet = new Set(activeLabelIds.map(String));
    return memoizedCards.map(card => {
      const matchingLabels = Array.isArray(card.labels) ? card.labels.filter((label: any) => activeLabelSet.has(String(label.id))) : [];
      const labeledQuantity = Array.isArray(card.labels) ? card.labels.reduce((sum: number, label: any) => sum + Number(label.quantity ?? 0), 0) : 0;
      const noLabelQuantity = activeLabelSet.has('0') ? Math.max(0, Number(card.quantity ?? 0) - labeledQuantity) : 0;
      const labelQuantity = noLabelQuantity + matchingLabels.reduce((sum: number, label: any) => sum + Number(label.quantity ?? 0), 0);
      const labelFoilQuantity = matchingLabels.reduce((sum: number, label: any) => sum + Number(label.quantity_foil ?? 0), 0);
      return { ...card, quantity: labelQuantity, quantity_foil: labelFoilQuantity };
    });
  }, [activeLabelIds, memoizedCards]);

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
          fourthFilterMode={selectedLabels}
          fourthFilterOptions={labelOptions}
          onFourthFilterPress={setSelectedLabels}
          fourthFilterLabel="Labels"
        />

        <CollectionStats cards={displayCards} exportCards={cardCollectionData} tcgName={tcgName} />

        <WindowGrid
          data={displayCards}
          renderCard={(item) => (
            <CardItem
              card={item}
              showCollection={true}
              displayQuantity={item.quantity ?? 0}
              activeLabelIds={activeLabelIds}
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