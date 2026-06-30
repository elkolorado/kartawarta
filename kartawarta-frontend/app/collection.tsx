import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Linking, Text, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
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
import LabelPickerModal from '@/components/labelPickerModal';

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
  const { bulkUpdateCollection } = useSession();
  const { cardCollectionData, allCards, labels, fetchLabels, createLabel, updateLabel, deleteLabel, fetchCollection, setTcgName, setTcgId, tcgName, tcgId } = useCardContext();
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
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isBulkWorking, setIsBulkWorking] = useState(false);

  // 1. Prepare Expansion Options
  const expansionOptions = useMemo(() => getExpansionOptions(allCards), [allCards]);
  const rarityOptions = useMemo(() => getRarityOptions(allCards), [allCards]);
  const labelOptions = useMemo(() => getLabelOptions(labels), [labels]);
  const activeLabelIds = useMemo(() => selectedLabels.includes('All') ? [] : selectedLabels.map(Number).filter(Number.isFinite), [selectedLabels]);

  const getSelectionKey = (card: any) => String(card.user_collection_id ?? card.cardMarketId ?? card.card_id);

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

  const selectedCards = useMemo(() => displayCards.filter(card => selectedCardIds.has(getSelectionKey(card))), [displayCards, selectedCardIds]);
  const selectedCount = selectedCards.length;

  useEffect(() => {
    setSelectedCardIds(prev => {
      const visibleKeys = new Set(displayCards.map(getSelectionKey));
      const next = new Set(Array.from(prev).filter(key => visibleKeys.has(key)));
      return next.size === prev.size ? prev : next;
    });
  }, [displayCards]);

  const handleSortPress = (id: string) => {
    if (sortBy === id) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(id);
      setSortDir('desc');
    }
  };

  const toggleCardSelection = (card: any, index: number, event?: any) => {
    const key = getSelectionKey(card);
    const isShift = Boolean(event?.nativeEvent?.shiftKey || event?.shiftKey);
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (isShift && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i += 1) next.add(getSelectionKey(displayCards[i]));
      } else if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setLastSelectedIndex(index);
  };

  const buildBulkItems = (cards: any[]) => cards.map(card => ({
    card_id: typeof card.card_id === 'number' ? card.card_id : undefined,
    card_market_id: typeof card.cardMarketId === 'number' ? card.cardMarketId : undefined,
    quantity: Number(card.quantity ?? 0),
    quantity_foil: Number(card.quantity_foil ?? 0),
  })).filter(item => item.card_id || item.card_market_id);

  const buildRemoveItems = (cards: any[]) => buildBulkItems(cards).map(item => {
    const card = cards.find(selected => selected.card_id === item.card_id || selected.cardMarketId === item.card_market_id);
    const next: any = { ...item };
    if (Array.isArray(card?.labels)) {
      const activeRealLabelIds = activeLabelIds.filter(labelId => labelId > 0);
      const labelsToRemove = activeRealLabelIds.length > 0
        ? card.labels.filter((label: any) => activeRealLabelIds.includes(Number(label.id)))
        : card.labels;
      next.label_quantities = Object.fromEntries(labelsToRemove.map((label: any) => [label.id, Number(label.quantity ?? 0)]).filter(([, quantity]) => Number(quantity) > 0));
      next.label_foil_quantities = Object.fromEntries(labelsToRemove.map((label: any) => [label.id, Number(label.quantity_foil ?? 0)]).filter(([, quantity]) => Number(quantity) > 0));
    }
    return next;
  });

  const clearSelection = () => {
    setSelectedCardIds(new Set());
    setLastSelectedIndex(null);
    setIsActionsOpen(false);
  };

  const handleBulkDelete = async () => {
    if (selectedCards.length === 0 || isBulkWorking) return;
    setIsActionsOpen(false);
    setIsBulkWorking(true);
    try {
      const success = await bulkUpdateCollection('remove', buildRemoveItems(selectedCards));
      if (success) {
        clearSelection();
        await fetchCollection(tcgId ?? undefined);
      }
    } finally {
      setIsBulkWorking(false);
    }
  };

  const openMoveModal = async () => {
    setIsActionsOpen(false);
    await fetchLabels();
    setIsMoveModalOpen(true);
  };

  const handleMoveConfirm = async (labelIds: number[]) => {
    const selectedLabelId = Number(labelIds[0] ?? 0);
    if (selectedCards.length === 0 || isBulkWorking) return;

    setIsMoveModalOpen(false);
    setIsBulkWorking(true);
    try {
      const removeItems = buildRemoveItems(selectedCards);
      const removed = await bulkUpdateCollection('remove', removeItems);
      if (!removed) return;

      const addItems = buildBulkItems(selectedCards);
      const added = await bulkUpdateCollection('add', addItems, selectedLabelId > 0 ? [selectedLabelId] : []);
      if (added) {
        clearSelection();
        await fetchCollection(tcgId ?? undefined);
      }
    } finally {
      setIsBulkWorking(false);
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

        {selectedCount > 0 && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedCount} selected</Text>
            <View style={styles.selectionActions}>
              <TouchableOpacity style={[styles.actionsButton, isBulkWorking && styles.disabled]} disabled={isBulkWorking} onPress={() => setIsActionsOpen(prev => !prev)}>
                <Text style={styles.actionsButtonText}>Actions</Text>
                <FontAwesome6 name="chevron-down" size={11} color={colors.background} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} disabled={isBulkWorking} onPress={clearSelection}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {isActionsOpen && (
              <View style={styles.actionsMenu}>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleBulkDelete}>
                  <FontAwesome6 name="trash" size={12} color="#ff6b6b" />
                  <Text style={styles.deleteActionText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionMenuItem} onPress={openMoveModal}>
                  <FontAwesome6 name="folder-open" size={12} color={colors.foreground} />
                  <Text style={styles.actionMenuText}>Move</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <LabelPickerModal
          visible={isMoveModalOpen}
          labels={labels}
          title="Move selected cards"
          description="Choose which label these selected cards should be moved to."
          mode="select"
          singleSelect
          initialSelectedIds={[0]}
          includeNoLabel
          isWorking={isBulkWorking}
          confirmLabel="Move"
          onCreateLabel={createLabel}
          onUpdateLabel={updateLabel}
          onDeleteLabel={deleteLabel}
          onCancel={() => setIsMoveModalOpen(false)}
          onConfirm={handleMoveConfirm}
        />

        <WindowGrid
          data={displayCards}
          renderCard={(item) => {
            const index = displayCards.findIndex(card => getSelectionKey(card) === getSelectionKey(item));
            return (
            <CardItem
              card={item}
              showCollection={true}
              displayQuantity={item.quantity ?? 0}
              activeLabelIds={activeLabelIds}
              selectable={filterMode !== 'unowned' && (item.quantity ?? 0) > 0}
              selected={selectedCardIds.has(getSelectionKey(item))}
              selectionActive={selectedCount > 0}
              onToggleSelect={(event) => toggleCardSelection(item, index, event)}
              dimmed={filterMode === 'unowned' || (item.quantity ?? 0) === 0}
              onPress={(c) => Linking.openURL(c?.card_url).catch(() => {})}
            />
          );}}
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
  selectionBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 25,
  },
  selectionText: { color: colors.foreground, fontSize: 14, fontWeight: '800' },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsButton: { height: 34, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionsButtonText: { color: colors.background, fontWeight: '900' },
  clearButton: { height: 34, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  clearButtonText: { color: colors.foreground, fontWeight: '800' },
  actionsMenu: { position: 'absolute', right: 70, top: 48, minWidth: 150, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 6, zIndex: 50 },
  actionMenuItem: { minHeight: 36, borderRadius: 9, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionMenuText: { color: colors.foreground, fontWeight: '800' },
  deleteActionText: { color: '#ff6b6b', fontWeight: '800' },
  disabled: { opacity: 0.5 },
});

export default Collection;