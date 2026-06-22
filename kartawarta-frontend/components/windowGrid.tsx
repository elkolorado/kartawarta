import { FlatList, StyleProp, useWindowDimensions, View, ViewStyle } from "react-native";

// Responsive grid helper using window width to determine number of columns
export const WindowGrid: React.FC<{
  data: any[];
  renderCard: (item: any) => React.ReactNode;
  columns?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
}> = ({ data, renderCard, columns, contentContainerStyle, itemStyle }) => {
  const { width } = useWindowDimensions();

  const getColumnsForWidth = (w: number) => {
    if (w >= 3000) return 12;
    if (w >= 2400) return 10;
    if (w >= 1920) return 8;
    if (w >= 1400) return 6;
    if (w >= 1000) return 4;
    if (w >= 600) return 3;
    return 2;
  };

  const numColumns = Math.max(1, columns ?? getColumnsForWidth(width));

  return (
    <FlatList
      data={data}
      // ADD THIS LINE BELOW:
      key={`grid-${numColumns}`} 
      keyExtractor={(item, idx) => String(item.user_collection_id ?? item.cardMarketId ?? item.card_id ?? idx)}
      numColumns={numColumns}
      renderItem={({ item }) => (
        <View style={[{ width: `${100 / numColumns}%`, padding: 4 }, itemStyle]}>
          {renderCard(item)}
        </View>
      )}
      contentContainerStyle={[{ padding: 8 }, contentContainerStyle]}
    />
  );
};