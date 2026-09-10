import { CollectionItem } from "@/context/CardContext";

interface ExpansionOption {
  id: string;
  label: string;
  release_date: string;
}

export const getExpansionOptions = (cards: CollectionItem[]): ExpansionOption[] => {
  const expansionMap = new Map<string, ExpansionOption>();

  cards.forEach(({ expansion_id, expansion_name, release_date }) => {
    if (expansion_id && expansion_name) {
      const idStr = expansion_id.toString();
      if (!expansionMap.has(idStr)) {
        expansionMap.set(idStr, {
          id: idStr,
          label: expansion_name,
          release_date: release_date || '',
        });
      }
    }
  });

  const sortedExpansions = Array.from(expansionMap.values()).sort((a, b) => {
    return (
      b.release_date.localeCompare(a.release_date) || 
      a.label.localeCompare(b.label)
    );
  });

  return [{ id: 'All', label: 'All Sets', release_date: '' }, ...sortedExpansions];
};

interface RarityOption {
  id: string;
  label: string;
}

export const getRarityOptions = (cards: CollectionItem[]): RarityOption[] => {
  const rarityMap = new Map<string, RarityOption>();

  cards.forEach(({ rarity }) => {
    const rarityLabel = (rarity || '').trim();
    if (!rarityLabel) return;

    const id = rarityLabel.toLowerCase();
    if (!rarityMap.has(id)) {
      rarityMap.set(id, { id, label: rarityLabel });
    }
  });

  return [{ id: 'All', label: 'All Rarities' }, ...Array.from(rarityMap.values()).sort((a, b) => a.label.localeCompare(b.label))];
};