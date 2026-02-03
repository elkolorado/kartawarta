import React, { useRef } from 'react';
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import Badge from "./badge";
import { colors } from "@/constants/themeColors";
import style from './style';
import { FontAwesome6 } from '@expo/vector-icons';
import SwipeableRow from './swipeableCardDetails';
type Props = {
    results: any[];
    style?: object;
    removeResult?: (index: number) => void;
}

const styles = style();


const ScannedCards: React.FC<Props> = ({ results, style, removeResult }) => {

    const swipeRef = useRef<any>(null);

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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, color: colors.primary }}>Scanned Cards</Text>
                        <Badge style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderColor: '#d4af3766', fontSize: 12, }} label={results.length.toString()} bgColor="" textColor={colors.primary} borderColor={colors.primary} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {/* sum the from_price or price of all scanned cards */}
                        <Text style={{ fontSize: 14, color: colors.foreground }}>Total:</Text>
                        <Text style={{ fontSize: 14, color: colors.foreground }}>
                            {results.reduce((total, card) => {
                                const price = parseFloat(card.cardInfo.from_price || '0');
                                return total + (isNaN(price) ? 0 : price);
                            }, 0).toFixed(2)}€
                        </Text>
                        <FontAwesome6 name="arrow-trend-up" size={14} color={colors.foreground} />
                        <Text style={{ fontSize: 14, color: colors.foreground }}>{results.reduce((total, card) => {
                            const price = parseFloat(card.cardInfo?.price_trend ? card.cardInfo.price_trend : (!card.cardInfo?.avg && !card.cardInfo?.avg_1d) ? card.cardInfo?.trend_foil : null || '0');
                            return total + (isNaN(price) ? 0 : price);
                        }, 0).toFixed(2)}€</Text>

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