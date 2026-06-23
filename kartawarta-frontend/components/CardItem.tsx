import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image'; // Import from expo-image
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useCardContext } from '@/context/CardContext';

import { API_ENDPOINT } from '@/constants/apiConfig';
import { colors } from '@/constants/themeColors';
import { CardMarketCard } from './foundCardDetails';

interface Props {
  card: CardMarketCard;
  onPress?: (card: any) => void;
  showCollection?: boolean;
  dimmed?: boolean;
}



const CardItem: React.FC<Props> = ({ card, onPress, showCollection = false, dimmed = false }) => {
  const imageUrl = `${API_ENDPOINT}/card-image/${card.tcg_id}/${card.cardMarketId}.png`;
  
  const name = card.name || 'Unknown';
  const price = card.from_price;
  const priceTrend = card.price_trend ? card.price_trend : (!card.avg && !card.avg_1d) ? card.trend_foil : null;

  // Collection Logic
  const { cardCollectionData, addCard, removeCard } = useCardContext();
  const [collectionQty, setCollectionQty] = useState<number>(0);

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
    setCollectionQty(entry?.quantity ?? 0);
  }, [showCollection, cardCollectionData, card.cardMarketId, card.card_id]);

  const handleAdd = async () => {
    try { await addCard(card, 1, 0); } catch (e) { console.error(e); }
  };

  const handleRemove = async () => {
    try {
      const id = card.cardMarketId || card.card_id || 0;
      if (id) await removeCard(id, 1, 0);
    } catch (e) { console.error(e); }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(card)}>
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
            <TouchableOpacity onPress={handleRemove} style={styles.qtyBtn} disabled={collectionQty <= 0}>
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