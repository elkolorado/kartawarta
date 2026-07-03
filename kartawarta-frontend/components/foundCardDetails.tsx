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

const getMatchImageUri = (cardInfo?: CardMarketCard, result?: string) => {
    if (cardInfo?.tcg_id && cardInfo?.cardMarketId) {
        let imageUrl = '';
        let exceptions = [
            "756524",
            "756531",
            "756532",
            "756834",
            "756835",
            "756836",
            "756837",
            "756850",
            "756851",
            "756857",
            "756858",
            "756860",
            "756861",
            "757123",
            "757124",
            "757125",
            "760154",
            "769057",
            "769058",
            "769070",
            "769071",
            "769073",
            "769074",
            "769077",
            "769078",
            "769571",
            "782861",
            "782862",
            "782870",
            "782871",
            "782878",
            "782879",
            "782883",
            "782884",
            "799740",
            "799743",
            "800425",
            "800427",
            "800519",
            "800520",
            "800526",
            "800527",
            "800735",
            "800737",
            "800738",
            "809377",
            "810470",
            "810472",
            "810484",
            "810485",
            "810498",
            "810499",
            "810501",
            "810502",
            "810640",
            "823589",
            "823590",
            "823591",
            "823592",
            "823599",
            "823600",
            "831557",
            "831558",
            "831563",
            "831573",
            "840230",
            "840263",
            "849829",
            "849831",
            "849837",
            "849855",
            "849856",
            "849863",
            "849864",
            "849868",
            "849869",
            "850062",
            "859086",
            "859095",
            "859100",
            "862301",
            "862302",
            "862308",
            "862309",
            "862311",
            "862312",
            "862315",
            "862316",
            "862837",
            "862838",
            "862839",
            "864822",
            "874943",
            "876647",
            "876648",
            "876649",
            "876661",
            "876662",
            "876666",
            "876667",
            "876668",
            "876669",
            "876807",
            "876808",
            "876809",
            "883653",
            "892726",
            "892728",
            "892751",
            "892752",
            "892767",
            "892768",
            "892795",
            "892849"
        ]
        if (exceptions.includes(String(cardInfo.cardMarketId))) {
            imageUrl = `${API_ENDPOINT}/card-image/${cardInfo.tcg_id}/${cardInfo.cardMarketId}.webp`;
        } else {
            imageUrl = `${API_ENDPOINT}/card-image/${cardInfo.tcg_id}/${cardInfo.cardMarketId}.png`;

        }
        return imageUrl;
    }

    if (!result) return null;

    try {
        const parsed = JSON.parse(result);
        if (parsed?.best_match && cardInfo?.tcg_id) {
            return `${API_ENDPOINT}/card-image/${cardInfo.tcg_id}/${parsed.best_match}`;
        }
    } catch {
        return null;
    }

    return null;
};

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
    const matchImageUri = getMatchImageUri(cardInfo, result);

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
                    {matchImageUri && (
                        <Image
                            key={matchImageUri}
                            source={{ uri: matchImageUri }}
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