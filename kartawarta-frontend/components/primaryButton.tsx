import React from "react";
import {
    TouchableOpacity,
    Text,
    View,
    StyleSheet,
    GestureResponderEvent,
    ViewStyle,
    TextStyle,
    TouchableOpacityProps,
} from "react-native";

type PrimaryButtonProps = {
    title: string;
    onPress?: (event: GestureResponderEvent) => void;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle | TextStyle[];
    activeOpacity?: number;
    disabled?: boolean;
    icon?: React.ReactNode;
} & Pick<TouchableOpacityProps, "testID" | "accessibilityLabel">;

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
    title,
    onPress,
    style,
    textStyle,
    activeOpacity = 0.8,
    disabled = false,
    icon,
    ...rest
}) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={activeOpacity}
            disabled={disabled}
            style={[styles.button, style, disabled && styles.disabled]}
            {...rest}
        >
            <View style={styles.content}>
                {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
                <Text style={[styles.text, textStyle]} numberOfLines={1}>
                    {title}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: "#d4af37",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    iconContainer: {
        marginRight: 10,
    },
    text: {
        color: "#0a1f2e",
        fontSize: 16,
        fontWeight: "600",
    },
    disabled: {
        opacity: 0.6,
    },
});

export default PrimaryButton;