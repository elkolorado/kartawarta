// @/hooks/useCardFilters.ts
import { useMemo } from 'react';

interface FilterConfig {
  searchQuery: string;
  selectedExpansion: string;
  selectedRarity?: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const useCardFilters = (cards: any[], config: FilterConfig) => {
  const { searchQuery, selectedExpansion, selectedRarity, sortBy, sortDir } = config;

  return useMemo(() => {
    let list = [...cards];

    // 1. Expansion Filter
    if (selectedExpansion !== 'All') {
      list = list.filter((c) => String(c.expansion_id) === selectedExpansion);
    }

    // 2. Rarity Filter
    if (selectedRarity && selectedRarity !== 'All') {
      list = list.filter((c) => String(c.rarity || '').toLowerCase() === selectedRarity.toLowerCase());
    }

    // 3. Search Filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        ((c.card_name || c.name || '') as string).toLowerCase().includes(q)
      );
    }

    // 4. Sorting Logic
    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return dir * (Number(a.from_price ?? 0) - Number(b.from_price ?? 0));
        case 'name':
          return dir * String(a.name || '').localeCompare(String(b.name || ''));
        case 'dateAdded':
          return dir * (new Date(a.collection_last_updated || 0).getTime() - new Date(b.collection_last_updated || 0).getTime());
        case 'priceTrend':
          const getTrend = (c: any) => Number(c.price_trend || ((!c.avg && !c.avg_1d) ? c.trend_foil : 0));
          return dir * (getTrend(a) - getTrend(b));
        default:
          return 0;
      }
    });

    return list;
  }, [cards, searchQuery, selectedExpansion, selectedRarity, sortBy, sortDir]);
};