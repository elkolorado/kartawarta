import { CollectionItem } from '@/context/CardContext';

const EXPORT_COLUMNS = [
  'cardmarketid',
  'card_name',
  'quantity',
  'quantity_foil',
  'labels',
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

const formatExportLabels = (card: CollectionItem) => {
  if (!Array.isArray(card.labels) || card.labels.length === 0) return '';

  return card.labels
    .filter(label => (label.quantity ?? 0) > 0 || (label.quantity_foil ?? 0) > 0)
    .map(label => {
      const parts = [];
      if ((label.quantity ?? 0) > 0) parts.push(`${label.quantity}`);
      if ((label.quantity_foil ?? 0) > 0) parts.push(`${label.quantity_foil} foil`);
      return `${label.name}:${parts.join('+') || 0}`;
    })
    .join('; ');
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
        case 'labels': return escapeCsvValue(formatExportLabels(card));
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
