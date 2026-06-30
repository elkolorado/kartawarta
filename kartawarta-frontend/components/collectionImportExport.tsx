import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { colors } from '@/constants/themeColors';
import { CollectionItem } from '@/context/CardContext';
import { buildCollectionCsv, getCollectionExportFilename } from '@/utils/collectionImportExport';

type CollectionImportExportProps = {
  cards: CollectionItem[];
  tcgName: string;
};

const downloadTextFile = (content: string, filename: string, mimeType: string) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const CollectionImportExport: React.FC<CollectionImportExportProps> = ({ cards, tcgName }) => {
  const [isOpen, setIsOpen] = useState(false);

  const ownedCount = cards.filter(card => (card.quantity ?? 0) > 0 || (card.quantity_foil ?? 0) > 0).length;

  const handleToggleMenu = () => setIsOpen(open => !open);

  const handleExportCsv = () => {
    const csv = buildCollectionCsv(cards);
    downloadTextFile(csv, getCollectionExportFilename(tcgName, 'csv'), 'text/csv;charset=utf-8');
    setIsOpen(false);
  };

  const handleExportTxt = () => {
    const csv = buildCollectionCsv(cards);
    downloadTextFile(csv, getCollectionExportFilename(tcgName, 'txt'), 'text/plain;charset=utf-8');
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      {isOpen && <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />}

      <TouchableOpacity
        accessibilityLabel={`Export ${ownedCount} owned collection cards`}
        accessibilityRole="button"
        onPress={handleToggleMenu}
      >
        <FontAwesome6 name="download" size={14} color={colors.foreground} />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleExportCsv}>
            <FontAwesome6 name="file-csv" size={14} color={colors.foreground} />
            <Text style={styles.menuText}>Export CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleExportTxt}>
            <FontAwesome6 name="file-lines" size={14} color={colors.foreground} />
            <Text style={styles.menuText}>Export TXT</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    position: Platform.OS === 'web' ? 'fixed' as any : 'absolute',
    left: -10000,
    right: -10000,
    top: -10000,
    bottom: -10000,
    zIndex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconButtonActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 42,
    minWidth: 152,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    overflow: 'hidden',
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CollectionImportExport;
