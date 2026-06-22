import { API_ENDPOINT } from '@/constants/apiConfig';
import { colors } from '@/constants/themeColors';
import { FontAwesome6 } from '@expo/vector-icons';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import CardItem from './CardItem';
import type { CardMarketCard } from './foundCardDetails';
import { WindowGrid } from './windowGrid';

type FoundCardEditModalProps = {
    visible: boolean;
    search: string;
    cards: CardMarketCard[];
    onSearchChange: (value: string) => void;
    onClose: () => void;
    onSelectCard: (card: CardMarketCard) => void;
};

const inputNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;

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

                    <View style={styles.editSearchWrapper}>
                        <FontAwesome6 name="magnifying-glass" size={14} color={colors.mutedForeground} style={styles.searchIcon} />
                        <TextInput
                            style={[styles.editSearchInput, inputNoOutline]}
                            placeholder="Search card by name, number, rarity..."
                            value={search}
                            onChangeText={onSearchChange}
                            placeholderTextColor={colors.mutedForeground}
                            selectionColor={colors.gold}
                            autoFocus={false}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity accessibilityLabel="Clear search" activeOpacity={0.75} style={styles.clearSearchButton} onPress={() => onSearchChange('')}>
                                <FontAwesome6 name="xmark" size={12} color={colors.background} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.resultsContainer}>
                        {cards.length > 0 ? (
                            <WindowGrid
                                data={cards}
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
    editSearchWrapper: {
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.26)',
        backgroundColor: colors.card,
        paddingLeft: 12,
        paddingRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    searchIcon: {
        marginRight: 8,
    },
    editSearchInput: {
        flex: 1,
        height: '100%',
        color: colors.foreground,
        fontSize: 14,
        borderWidth: 0,
        paddingVertical: 0,
    },
    clearSearchButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
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
