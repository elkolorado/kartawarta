import { View, Text, StyleSheet } from "react-native";

const styles = StyleSheet.create({
    badgeBase: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        margin: 4,
        alignItems: 'center',
        justifyContent: 'center',
    }
});

type Props = {
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    style?: object;
};

const Badge: React.FC<Props> = ({ label, bgColor, textColor, borderColor, style }) => (
        <View style={[styles.badgeBase, { backgroundColor: bgColor, borderColor: borderColor }, style]}>
            <Text style={{ color: textColor, fontSize: 14 }}>{label}</Text>
        </View>
    );

    export default Badge;