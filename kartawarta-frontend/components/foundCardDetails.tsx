import { useCardContext } from '@/context/CardContext';
import { API_ENDPOINT } from '../constants/apiConfig';
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Linking } from 'react-native';
import { colors } from '@/constants/themeColors';
import { FontAwesome6 } from '@expo/vector-icons';
import FoundCardEditModal from './foundCardEditModal';

export type CardMarketCard = {
    id: number;
    expansion_id: number;
    cardMarketId: number;
    name: string;
    number: string;
    rarity: string;
    image_url: string;
    card_url: string;
    last_updated: string;
    tcg_id: number;
    card_id: number;
    available: number | null;
    price: number | null;
    available_foil: number | null;
    price_foil: number | null;
    from_price: number | null;
    price_trend: number | null;
    avg_30d: number | null;
    avg_7d: number | null;
    avg_1d: number | null;
    avg: number | null;
    low_foil: number | null;
    trend_foil: number | null;
    avg1_foil: number | null;
    avg7_foil: number | null;
    avg30_foil: number | null;
    versions_url: string;
    printed_in: string;
    reprints: string;
    chart_data: {
        date: string;
        price: number;
    }[];
};

interface FoundCardDetailsProps {
    cardName?: string;
    cardInfo?: CardMarketCard;
    photoUri?: string;
    result?: string;
    onReplaceCard?: (cardInfo: CardMarketCard) => void;
}

type CompactActionButtonProps = {
    label: string;
    icon: React.ComponentProps<typeof FontAwesome6>['name'];
    onPress: () => void;
    variant?: 'primary' | 'ghost';
    disabled?: boolean;
};

const CompactActionButton: React.FC<CompactActionButtonProps> = ({ label, icon, onPress, variant = 'ghost', disabled = false }) => (
    <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={0.78}
        disabled={disabled}
        onPress={onPress}
        style={[
            styles.compactAction,
            variant === 'primary' ? styles.compactActionPrimary : styles.compactActionGhost,
            disabled && styles.compactActionDisabled,
        ]}
    >
        <FontAwesome6 name={icon} size={13} color={variant === 'primary' ? colors.background : colors.gold} />
    </TouchableOpacity>
);

const FoundCardDetails: React.FC<FoundCardDetailsProps> = ({ cardName, cardInfo, photoUri, result, onReplaceCard }) => {
    const { addCard, removeCard, allCards } = useCardContext();
    const [isCardAdded, setIsCardAdded] = useState(false);
    const [addedCardMarketId, setAddedCardMarketId] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editSearch, setEditSearch] = useState(cardInfo?.name || '');

    const handleAddCard = async () => {
        if (!cardInfo) return;
        const ucId = await addCard(cardInfo, 1, 0);
        setAddedCardMarketId(cardInfo.cardMarketId);
        setIsCardAdded(true);
    };

    const handleRemoveCard = async () => {
        if (addedCardMarketId != null) {
            await removeCard(addedCardMarketId, 1, 0);
            setIsCardAdded(false);
            setAddedCardMarketId(null);
        }
    };


    const price = cardInfo?.from_price
    const priceTrend = cardInfo?.price_trend ? cardInfo.price_trend : (!cardInfo?.avg && !cardInfo?.avg_1d) ? cardInfo?.trend_foil : null;

    const handleOpenEdit = () => {
        setEditSearch(cardInfo?.name || '');
        setIsEditing(true);
    };

    const handleReplaceCard = (replacement: CardMarketCard) => {
        onReplaceCard?.(replacement);
        setIsCardAdded(false);
        setAddedCardMarketId(null);
        setIsEditing(false);
    };

    return (
        <View style={styles.container}>
            {/* 1. Name Row: Flexible height, will push the rest down */}
            <View style={styles.nameRow}>
                <Text
                    style={styles.nameText}
                    onPress={() => {
                        if (cardInfo?.card_url) Linking.openURL(cardInfo.card_url);
                    }}
                // Removed numberOfLines to allow it to be multi-line
                >
                    {cardInfo?.name?.replace?.("[Fusion World]", "") || ''}
                </Text>
            </View>

            {/* 2. Content Row: This expands to fill the remaining 175px */}
            <View style={styles.contentRow}>

                {/* 3. Photos Column: Flex 1 so it shrinks/grows to fit space */}
                <View style={styles.photosColumn}>
                    {result && (
                        <Image
                            source={{
                                uri: `${API_ENDPOINT}/card-image/${cardInfo?.tcg_id}/${JSON.parse(result).best_match}`,
                            }}
                            style={[styles.cardImageResult, styles.cardImage]}
                        />
                    )}
                    {photoUri && (
                        <Image source={{ uri: photoUri }} style={styles.cardImage} />
                    )}

                </View>

                {/* 4. Prices Column: Fixed width / wrap-content to ensure visibility */}
                <View style={styles.pricesColumn}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>From Price</Text>
                        <Text style={styles.priceValue}>{typeof price === 'number' ? `${price}€` : (price ? String(price) : '-')}</Text>
                    </View>

                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}><FontAwesome6 name="arrow-trend-up" size={10} /> Trend</Text>

                        <Text style={styles.priceValue}>{priceTrend ? `${Number(priceTrend)}€` : ''}</Text>

                    </View>

                    <View style={styles.actionWrapper}>
                        <CompactActionButton label="Edit" icon="pen" onPress={handleOpenEdit} variant="ghost" />

                        {!isCardAdded && (<CompactActionButton label="Save" variant="primary" icon="save" onPress={handleAddCard} disabled={isCardAdded} />)}

                        {isCardAdded && (
                            <CompactActionButton label="Undo" icon="arrow-rotate-left" onPress={handleRemoveCard} />
                        )}
                    </View>
                </View>
            </View>

            <FoundCardEditModal
                visible={isEditing}
                search={editSearch}
                cards={allCards}
                photoUri={photoUri}
                onSearchChange={setEditSearch}
                onClose={() => setIsEditing(false)}
                onSelectCard={handleReplaceCard}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 175, // Lock the height
        borderColor: "#d4af374d",
        borderRadius: 16,
        borderWidth: 2,
        padding: 10,
        backgroundColor: "#af85960d",
        overflow: 'hidden',
    },
    nameRow: {
        width: '100%',
        marginBottom: 8,
        flexShrink: 0, // Ensure name doesn't get cut off by images
    },
    nameText: {
        fontSize: 15,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        color: colors.mutedForeground,
    },
    contentRow: {
        flex: 1, // Takes all space left after NameRow
        flexDirection: 'row',
        alignItems: 'stretch', // Stretch children vertically
        gap: 10,
    },
    photosColumn: {
        flex: 1, // Shrink or grow images to fill what's left
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardImageResult: {
        borderColor: colors.gold,
        borderWidth: 2,
    },
    cardImage: {
        height: '100%',
        aspectRatio: 0.71,
        resizeMode: 'contain',
        borderRadius: 6,
    },
    pricesColumn: {
        width: 100, // Fixed width ensures prices are always visible and aligned
        justifyContent: 'center',
        flexShrink: 0, // Prevents price column from disappearing
    },
    priceContainer: {
        marginBottom: 4,
    },
    priceLabel: {
        fontSize: 10,
        color: colors.mutedForeground,
        textTransform: 'uppercase',
    },
    priceValue: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.foreground
    },
    actionWrapper: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    compactAction: {
        width: 34,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 4,
        elevation: 2,
    },
    compactActionPrimary: {
        backgroundColor: colors.gold,
        borderColor: colors.gold,
    },
    compactActionGhost: {
        backgroundColor: 'rgba(212, 175, 55, 0.10)',
        borderColor: 'rgba(212, 175, 55, 0.42)',
    },
    compactActionDisabled: {
        opacity: 0.45,
    },
});

export default FoundCardDetails;