import { colors } from '@/constants/themeColors';
import { FontAwesome6 } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import CardItem from './CardItem';
import FilterHeader from './filterHeader';
import type { CardMarketCard } from './foundCardDetails';
import { WindowGrid } from './windowGrid';
import { getExpansionOptions, getRarityOptions } from '@/utils/cardUtils';

type FoundCardEditModalProps = {
    visible: boolean;
    search: string;
    cards: CardMarketCard[];
    onSearchChange: (value: string) => void;
    onClose: () => void;
    onSelectCard: (card: CardMarketCard) => void;
};

const SORT_OPTIONS = {
    price: 'Price',
    priceTrend: 'Trend',
    name: 'Name',
};

const FoundCardEditModal: React.FC<FoundCardEditModalProps> = ({
    visible,
    search,
    cards,
    onSearchChange,
    onClose,
    onSelectCard,
}) => {
    const { width } = useWindowDimensions();
    const columns = width >= 700 ? 3 : 2;
    const [selectedExpansion, setSelectedExpansion] = useState('All');
    const [selectedRarity, setSelectedRarity] = useState('All');
    const [sortBy, setSortBy] = useState<'price' | 'priceTrend' | 'name'>('price');
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

    const expansionOptions = useMemo(() => getExpansionOptions(cards as any[]), [cards]);
    const rarityOptions = useMemo(() => getRarityOptions(cards as any[]), [cards]);
    const filteredCards = useMemo(() => {
        const query = search.trim().toLowerCase();
        const dir = sortDir === 'asc' ? 1 : -1;

        return cards
            .filter(card => {
                if (selectedExpansion !== 'All' && String(card.expansion_id) !== selectedExpansion) return false;
                if (selectedRarity !== 'All' && String(card.rarity || '').toLowerCase() !== selectedRarity.toLowerCase()) return false;
                if (!query) return true;

                return [card.name, card.number, card.rarity, card.printed_in]
                    .filter(Boolean)
                    .some(value => String(value).toLowerCase().includes(query));
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'price':
                        return dir * (Number(a.from_price ?? 0) - Number(b.from_price ?? 0));
                    case 'priceTrend': {
                        const getTrend = (card: CardMarketCard) => Number(card.price_trend || ((!card.avg && !card.avg_1d) ? card.trend_foil : 0));
                        return dir * (getTrend(a) - getTrend(b));
                    }
                    case 'name':
                        return dir * String(a.name || '').localeCompare(String(b.name || ''));
                    default:
                        return 0;
                }
            })
            .slice(0, 60);
    }, [cards, search, selectedExpansion, selectedRarity, sortBy, sortDir]);

    const handleSortPress = (id: string) => {
        if (sortBy === id) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(id as typeof sortBy);
            setSortDir('desc');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.editModal}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalTitleWrapper}>
                            <Text style={styles.modalTitle}>Edit scan result</Text>
                            <Text style={styles.modalSubtitle}>Search and pick the correct card.</Text>
                        </View>
                        <TouchableOpacity accessibilityLabel="Close edit scan result" style={styles.closeButton} onPress={onClose}>
                            <FontAwesome6 name="xmark" size={16} color={colors.foreground} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterHeaderWrapper}>
                        <FilterHeader
                            searchQuery={search}
                            setSearchQuery={onSearchChange}
                            currentSort={sortBy}
                            sortDir={sortDir}
                            sortOptions={SORT_OPTIONS}
                            onSortPress={handleSortPress}
                            filterMode={selectedExpansion}
                            filterOptions={expansionOptions}
                            onFilterPress={setSelectedExpansion}
                            filterLabel="Expansions"
                            secondaryFilterMode={selectedRarity}
                            secondaryFilterOptions={rarityOptions}
                            onSecondaryFilterPress={setSelectedRarity}
                            secondaryFilterLabel="Rarities"
                            statsText={`${filteredCards.length} matches`}
                        />
                    </View>

                    <View style={styles.resultsContainer}>
                        {filteredCards.length > 0 ? (
                            <WindowGrid
                                data={filteredCards}
                                columns={columns}
                                contentContainerStyle={styles.resultsGrid}
                                itemStyle={styles.gridItem}
                                renderCard={(card) => (
                                    <CardItem
                                        card={card}
                                        onPress={onSelectCard}
                                    />
                                )}
                            />
                        ) : (
                            <View style={styles.emptyResultsGrid}>
                                <Text style={styles.noMatchesText}>No cards found</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.74)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    editModal: {
        width: '100%',
        maxWidth: 860,
        maxHeight: '88%',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.28)',
        backgroundColor: colors.background,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.34,
        shadowRadius: 28,
        elevation: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
    },
    modalTitleWrapper: {
        flex: 1,
    },
    modalTitle: {
        color: colors.foreground,
        fontSize: 18,
        fontWeight: '800',
    },
    modalSubtitle: {
        color: colors.mutedForeground,
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        width: 34,
        height: 34,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterHeaderWrapper: {
        marginHorizontal: -16,
        marginTop: -16,
    },
    resultsContainer: {
        flex: 1,
        minHeight: 0,
    },
    resultsGrid: {
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 8,
    },
    emptyResultsGrid: {
        flex: 1,
        justifyContent: 'center',
    },
    gridItem: {
        padding: 6,
    },
    noMatchesText: {
        color: colors.mutedForeground,
        textAlign: 'center',
        paddingVertical: 28,
    },
});

export default FoundCardEditModal;
