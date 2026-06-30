// @/components/CollectionStats.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { colors } from '@/constants/themeColors';
import { CollectionItem } from '@/context/CardContext';
import CollectionImportExport from '@/components/collectionImportExport';

interface StatsProps {
  cards: CollectionItem[];
  exportCards?: CollectionItem[];
  tcgName?: string;
}

export const CollectionStats: React.FC<StatsProps> = ({ cards, exportCards, tcgName }) => {
  const stats = React.useMemo(() => {
    const totalFromPrice = cards.reduce((sum, card) => sum + (card.from_price ?? 0) * (card.quantity ?? 0), 0);
    const totalFromPriceFoil = cards.reduce((sum, card) => sum + (card.low_foil ?? 0) * (card.quantity_foil ?? 0), 0);
    const totalValue = totalFromPrice + totalFromPriceFoil;
    const totalCount = cards.reduce((sum, card) => sum + (card.quantity ?? 0) + (card.quantity_foil ?? 0), 0);
    const totalTrend = cards.reduce((sum, card) => {
        const trend = card.price_trend || ((!card.avg && !card.avg_1d) ? card.trend_foil : 0);
        return sum + (trend ?? 0) * (card.quantity ?? 0);
    }, 0);

    return { totalValue, totalCount, totalTrend };
  }, [cards]);

  return (
    <View style={styles.statsBar}>
      <Text style={styles.statsText}>
        {stats.totalCount} cards ·{' '}
        <Text style={{ color: colors.primary }}>{stats.totalValue.toFixed(2)}€</Text>{' '}
        {stats.totalTrend > 0 && (
          <Text style={{ color: colors.primary }}>
            <FontAwesome6 name="arrow-trend-up" size={14} /> {stats.totalTrend.toFixed(2)}€
          </Text>
        )}
      </Text>
      {exportCards && tcgName ? (
        <CollectionImportExport cards={exportCards} tcgName={tcgName} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  statsBar: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 20,
  },
  statsText: { color: colors.mutedForeground, fontSize: 14 },
});