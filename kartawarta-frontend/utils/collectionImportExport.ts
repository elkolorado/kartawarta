import { CollectionItem } from '@/context/CardContext';

const EXPORT_COLUMNS = [
  'cardmarketid',
  'card_name',
  'quantity',
  'quantity_foil',
];

const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /["\n\r,;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const normalizeExportCardName = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/""/g, '"');
};

export const buildCollectionCsv = (cards: CollectionItem[]) => {
  const ownedCards = cards.filter(card => (card.quantity ?? 0) > 0 || (card.quantity_foil ?? 0) > 0);
  const lines = [EXPORT_COLUMNS.join(',')];

  ownedCards.forEach(card => {
    lines.push(EXPORT_COLUMNS.map(column => {
      switch (column) {
        case 'cardmarketid': return escapeCsvValue(card.cardMarketId);
        case 'card_name': return escapeCsvValue(normalizeExportCardName(card.name));
        case 'quantity': return escapeCsvValue(card.quantity ?? 0);
        case 'quantity_foil': return escapeCsvValue(card.quantity_foil ?? 0);
        default: return escapeCsvValue((card as any)[column]);
      }
    }).join(','));
  });

  return lines.join('\n');
};

export const getCollectionExportFilename = (tcgName: string, extension = 'csv') => {
  const safeTcgName = tcgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'collection';
  const date = new Date().toISOString().slice(0, 10);
  return `kartawarta-${safeTcgName}-collection-${date}.${extension}`;
};
