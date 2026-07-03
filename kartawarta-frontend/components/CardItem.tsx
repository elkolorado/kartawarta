import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image'; // Import from expo-image
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useCardContext } from '@/context/CardContext';

import { API_ENDPOINT } from '@/constants/apiConfig';
import { colors } from '@/constants/themeColors';
import { CardMarketCard } from './foundCardDetails';
import LabelPickerModal from './labelPickerModal';
import { useSession } from '@/hooks/useAuth';

interface Props {
  card: CardMarketCard;
  onPress?: (card: any) => void;
  showCollection?: boolean;
  dimmed?: boolean;
  displayQuantity?: number;
  activeLabelIds?: number[];
  selectable?: boolean;
  selected?: boolean;
  selectionActive?: boolean;
  onToggleSelect?: (event?: any) => void;
}



const CardItem: React.FC<Props> = ({ card, onPress, showCollection = false, dimmed = false, displayQuantity, activeLabelIds = [], selectable = false, selected = false, selectionActive = false, onToggleSelect }) => {
  
  let imageUrl = ''
  if(card.cardMarketId == 756835){
    imageUrl = `${API_ENDPOINT}/card-image/${card.tcg_id}/${card.cardMarketId}.webp`;
  } else {
    imageUrl = `${API_ENDPOINT}/card-image/${card.tcg_id}/${card.cardMarketId}.png`;
    
  } 
  
  const name = card.name || 'Unknown';
  const price = card.from_price;
  const priceTrend = card.price_trend ? card.price_trend : (!card.avg && !card.avg_1d) ? card.trend_foil : null;

  // Collection Logic
  const { bulkUpdateCollection } = useSession();
  const { cardCollectionData, labels, fetchLabels, createLabel, updateLabel, deleteLabel, fetchCollection, tcgId, removeCard } = useCardContext();
  const [collectionQty, setCollectionQty] = useState<number>(0);
  const [collectionEntry, setCollectionEntry] = useState<any>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!showCollection) return;
    const entry = cardCollectionData?.find((c) => {
      if (c.cardMarketId != null && card.cardMarketId != null) {
        if (c.cardMarketId === card.cardMarketId) return true;
      }
      if (c.card_id != null && card.card_id != null) {
        if (c.card_id === card.card_id) return true;
      }
      return false;
    });
    setCollectionEntry(entry ?? null);
    setCollectionQty(displayQuantity ?? entry?.quantity ?? 0);
  }, [showCollection, cardCollectionData, card.cardMarketId, card.card_id, displayQuantity]);

  const openLabelQuantityModal = async () => {
    if (!showCollection) return;
    await fetchLabels();
    setIsLabelModalOpen(true);
  };

  const handleAdd = async () => {
    await openLabelQuantityModal();
  };

  const handleRemove = async () => {
    await openLabelQuantityModal();
  };

  const labelQuantityById = React.useMemo(() => {
    const result: Record<number, number> = {};
    const totalQuantity = Number(collectionEntry?.quantity ?? 0);
    let labeledQuantity = 0;
    (collectionEntry?.labels ?? []).forEach((label: any) => {
      const quantity = Number(label.quantity ?? 0);
      result[label.id] = quantity;
      labeledQuantity += quantity;
    });
    result[0] = Math.max(0, totalQuantity - labeledQuantity);
    return result;
  }, [collectionEntry]);

  const labelModalLabels = React.useMemo(() => {
    return labels;
  }, [labels]);

  const addQuantityByLabel = React.useMemo(() => ({
    ...Object.fromEntries((collectionEntry?.labels ?? []).map((label: any) => [label.id, Number(label.quantity ?? 0)])),
    0: labelQuantityById[0] ?? 0,
  }), [collectionEntry, labelQuantityById]);

  const singleActionMaxByLabel = React.useMemo(() => {
    const maxByLabel: Record<number, number> = {};
    Object.keys(labelQuantityById).forEach(labelId => {
      maxByLabel[Number(labelId)] = Number.MAX_SAFE_INTEGER;
    });
    labels.forEach(label => { maxByLabel[label.id] = Number.MAX_SAFE_INTEGER; });
    maxByLabel[0] = Number.MAX_SAFE_INTEGER;
    return maxByLabel;
  }, [labelQuantityById, labels]);

  const cardBulkItem = React.useMemo(() => ({
    card_id: typeof card.card_id === 'number' ? card.card_id : undefined,
    card_market_id: typeof card.cardMarketId === 'number' ? card.cardMarketId : undefined,
    quantity: 1,
    quantity_foil: 0,
  }), [card.cardMarketId, card.card_id]);

  const addCardForLabel = async (labelId?: number, quantity = 1) => {
    const item = { ...cardBulkItem, quantity };
    const success = await bulkUpdateCollection('add', [item], labelId && labelId > 0 ? [labelId] : [], labelId && labelId > 0 ? { [labelId]: quantity } : {});
    if (success) await fetchCollection(tcgId ?? undefined);
  };

  const removeCardForLabel = async (labelId?: number, quantity = 1) => {
    const id = card.cardMarketId || card.card_id || 0;
    if (id) await removeCard(id, quantity, 0, labelId && labelId > 0 ? labelId : undefined);
  };

  const handleLabelActionConfirm = async (_labelIds: number[], quantities?: Record<number, number>) => {
    const changedEntries = Object.entries(quantities ?? {}).filter(([labelId, nextQuantity]) => {
      const previousQuantity = Number(addQuantityByLabel[Number(labelId)] ?? 0);
      return Number(nextQuantity) !== previousQuantity;
    });
    if (changedEntries.length === 0) {
      setIsLabelModalOpen(false);
      return;
    }
    setIsLabelModalOpen(false);
    try {
      const labelDeltas: Record<number, number> = {};
      let totalAddDelta = 0;
      for (const [labelId, nextQuantity] of changedEntries) {
        const numericLabelId = Number(labelId);
        const previousQuantity = Number(addQuantityByLabel[numericLabelId] ?? 0);
        const delta = Number(nextQuantity) - previousQuantity;
        if (delta > 0) {
          totalAddDelta += delta;
          if (numericLabelId > 0) labelDeltas[numericLabelId] = delta;
        } else if (delta < 0) {
          await removeCardForLabel(numericLabelId || undefined, Math.abs(delta));
        }
      }
      if (totalAddDelta > 0) {
        const success = await bulkUpdateCollection('add', [{ ...cardBulkItem, quantity: totalAddDelta }], Object.keys(labelDeltas).map(Number), labelDeltas);
        if (success) await fetchCollection(tcgId ?? undefined);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <LabelPickerModal
        visible={isLabelModalOpen}
        title="Edit card quality"
        description="Adjust quantities per label."
        labels={labelModalLabels}
        mode="allocate"
        maxQuantity={0}
        quantityByLabel={addQuantityByLabel}
        maxQuantityByLabel={singleActionMaxByLabel}
        includeNoLabel
        confirmLabel="Save"
        onCreateLabel={createLabel}
        onUpdateLabel={updateLabel}
        onDeleteLabel={deleteLabel}
        onCancel={() => setIsLabelModalOpen(false)}
        onConfirm={handleLabelActionConfirm}
      />
      <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        onPress={(event: any) => selectionActive ? onToggleSelect?.(event) : onPress && onPress(card)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {selectable && (isHovered || selected || selectionActive) && (
        <Pressable
          style={[styles.selectOverlay, selected && styles.selectOverlayActive]}
          onPress={(event: any) => {
            event?.stopPropagation?.();
            onToggleSelect?.(event);
          }}
        >
          {selected ? <FontAwesome6 name="check" size={13} color={colors.background} /> : null}
        </Pressable>
      )}
      <Image
        source={imageUrl}
        style={[
          styles.image, 
          // Grayscale filter works directly on expo-image
          dimmed && ({ filter: 'grayscale(1)'} as any) 
        ]}
        contentFit="contain"
        transition={200} // Smooth fade-in
        placeholderContentFit="contain"
      />

      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.name}>{name}</Text>
        <View style={styles.row}>
         <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {typeof price === 'number' ? `${price}€` : (price ? String(price) : '-')}
         </Text>
          {priceTrend && (
           <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                <FontAwesome6 name="arrow-trend-up" size={14} /> {Number(priceTrend)}€
             </Text>
          )}
        </View>

        {showCollection && (
          <View style={styles.collectionRow}>
            <TouchableOpacity onPress={handleRemove} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{collectionQty}</Text>
            <TouchableOpacity onPress={handleAdd} style={styles.qtyBtn}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  selectOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 30,
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectOverlayActive: {
    backgroundColor: colors.primary,
  },
  image: {
    width: '100%',
    // Typical trading card aspect ratio is 2.5 / 3.5
    aspectRatio: 0.714, 
    backgroundColor: '#1a1a1a',
  },
  meta: {
    padding: 8,
    minWidth: 0,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
    color: colors.foreground,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  collectionRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  qtyBtn: {
    width: 34,
    height: 28,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  qtyText: {
    minWidth: 28,
    textAlign: 'center',
    color: colors.foreground,
    fontWeight: '700',
  },
  price: {
    color: colors.primary,
    fontWeight: '700',
    flexShrink: 1,
    minWidth: 0,
  },
});

export default CardItem;