import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import Badge from "./badge";
import { colors } from "@/constants/themeColors";
import style from './style';
import { FontAwesome6 } from '@expo/vector-icons';
import SwipeableRow from './swipeableCardDetails';
import { useSession } from '@/hooks/useAuth';
import { useCardContext } from '@/context/CardContext';
type Props = {
    results: any[];
    style?: object;
    removeResult?: (index: number) => void;
    clearResults?: () => void;
}

const styles = style();


const ScannedCards: React.FC<Props> = ({ results, style, removeResult, clearResults }) => {

    const swipeRef = useRef<any>(null);
    const { bulkUpdateCollection } = useSession();
    const { fetchCollection, tcgId } = useCardContext();
    const [isBulkWorking, setIsBulkWorking] = useState(false);
    const [hasSavedBatch, setHasSavedBatch] = useState(false);

    const totalPrice = useMemo(() => {
        return results.reduce((total, card) => {
            const price = parseFloat(card.cardInfo.from_price || '0');
            return total + (isNaN(price) ? 0 : price);
        }, 0).toFixed(2);
    }, [results]);

    const totalTrend = useMemo(() => {
        return results.reduce((total, card) => {
            const price = parseFloat(card.cardInfo?.price_trend ? card.cardInfo.price_trend : (!card.cardInfo?.avg && !card.cardInfo?.avg_1d) ? card.cardInfo?.trend_foil : null || '0');
            return total + (isNaN(price) ? 0 : price);
        }, 0).toFixed(2);
    }, [results]);

    const bulkItems = useMemo(() => {
        const grouped = new Map<string, { card_id?: number; card_market_id?: number; quantity: number; quantity_foil: number }>();

        results.forEach((card) => {
            const cardInfo = card.cardInfo || {};
            const key = String(cardInfo.card_id ?? cardInfo.cardMarketId ?? card.cardName ?? card.id);
            const current = grouped.get(key);
            const nextItem = {
                card_id: typeof cardInfo.card_id === 'number' ? cardInfo.card_id : undefined,
                card_market_id: typeof cardInfo.cardMarketId === 'number' ? cardInfo.cardMarketId : undefined,
                quantity: 1,
                quantity_foil: 0,
            };

            if (current) {
                current.quantity += 1;
            } else {
                grouped.set(key, nextItem);
            }
        });

        return Array.from(grouped.values());
    }, [results]);

    const handleBulkAction = async (action: 'add' | 'remove') => {
        if (results.length === 0 || isBulkWorking) return;

        setIsBulkWorking(true);
        try {
            const success = await bulkUpdateCollection(action, bulkItems);
            if (success) {
                await fetchCollection(tcgId ?? undefined);
                setHasSavedBatch(action === 'add');
            }
        } finally {
            setIsBulkWorking(false);
        }
    };

    const handleClearQueue = () => {
        clearResults?.();
        setHasSavedBatch(false);
    };

    // --- LEFT ACTION (Delete) ---
    const renderRightActions = (progress: any, drag: any, index: number, onDelete: () => void) => {

        // This style reacts to the swipe progress
        const animatedIconStyle = useAnimatedStyle(() => {
            return {
                opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1]),
                transform: [
                    {
                        scale: interpolate(progress.value, [0, 0.5, 1], [0.5, 0.7, 1.2]),
                    },
                ],
            };
        });

        return (
            <TouchableOpacity
                style={[styles.leftAction, { backgroundColor: 'red' }]}
                onPress={onDelete}
                activeOpacity={0.7}
            >
                <Reanimated.View style={animatedIconStyle}>
                    <FontAwesome6 name="trash" size={24} color="white" />
                </Reanimated.View>
            </TouchableOpacity>
        );
    };

    // --- RIGHT ACTION (Add) ---
    const renderLeftActions = (progress: any, drag: any) => {
        return (
            <TouchableOpacity
                style={[styles.rightAction, { backgroundColor: colors.primary }]}
                onPress={() => { /* logic to add */ }}
            >
                <Text style={styles.actionText}>Add</Text>
            </TouchableOpacity>
        );
    };
    console.log(results)

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={style}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '700' }}>Scanned Cards</Text>
                        <Badge style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderColor: '#d4af3766', fontSize: 12, }} label={results.length.toString()} bgColor="" textColor={colors.primary} borderColor={colors.primary} />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, color: colors.foreground, opacity: 0.85 }}>Total:</Text>
                        <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '700' }}>{totalPrice}€</Text>
                        <FontAwesome6 name="arrow-trend-up" size={13} color={colors.foreground} />
                        <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '700' }}>{totalTrend}€</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => handleBulkAction(hasSavedBatch ? 'remove' : 'add')}
                            disabled={results.length === 0 || isBulkWorking}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 4,
                                borderRadius: 10,
                                backgroundColor: hasSavedBatch ? 'rgba(212,175,55,0.14)' : colors.primary,
                                borderWidth: hasSavedBatch ? 1 : 0,
                                borderColor: colors.primary,
                                opacity: results.length === 0 || isBulkWorking ? 0.5 : 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <FontAwesome6
                                name={hasSavedBatch ? 'arrow-rotate-left' : 'floppy-disk'}
                                size={14}
                                color={hasSavedBatch ? colors.foreground : colors.card}
                            />
                            <Text style={{ color: hasSavedBatch ? colors.foreground : colors.card, fontWeight: '700' }}>
                                {hasSavedBatch ? 'Undo all' : 'Save all'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleClearQueue}
                            disabled={results.length === 0 || isBulkWorking}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.14)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: results.length === 0 || isBulkWorking ? 0.5 : 1,
                            }}
                        >
                            <FontAwesome6 name="trash" size={12} color={colors.foreground} />
                        </TouchableOpacity>
                    </View>
                </View>


                <View style={[styles.scannedCardsContainer]}>
                    {results.length === 0 ? (
                        <View style={styles.noResultsContainer}>
                            <Text style={styles.noResultsMessage}>No scanned cards yet</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={{ gap: 16 }}>
                            {results.map((item, index) => (
                                <SwipeableRow
                                    key={item.id} // USE item.id, NOT index
                                    item={item}
                                    index={index}
                                    removeResult={removeResult}
                                    renderLeftActions={renderLeftActions}
                                    renderRightActions={renderRightActions}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            </View>
        </GestureHandlerRootView>
    );
};

export default ScannedCards;