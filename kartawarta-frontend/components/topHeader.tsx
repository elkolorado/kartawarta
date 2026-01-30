import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { colors } from "@/constants/themeColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/hooks/useAuth";
import { TAB_ROUTES } from "@/constants/tabRoutes";
import { usePathname, useRouter } from "expo-router";
import { Picker } from '@react-native-picker/picker';
import { useCardContext } from "@/context/CardContext";
import PrimaryButton from "./primaryButton";
import TCGSelector from "./tcgSelector";
type Props = {
    navigation?: any;
    route?: any;
    options?: any;
};

const TopHeader: React.FC<Props> = ({ navigation, route, options }) => {
    const insets = useSafeAreaInsets();
    const { logout } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const { tcgName, setTcgName } = useCardContext();
    const tcgs = [
        'dragon ball fusion world',
        'riftbound'
    ];

    return (
        <View style={[styles.container]}>
            <View style={styles.topContainer}>

                <View style={[styles.row, styles.topRow, { paddingTop: insets.top + 12 }]}>
                    <View style={styles.brandRow}>
                        {/* <View style={styles.logo}>
                            <Text style={styles.logoEmoji}>📷</Text>
                        </View> */}

                        <View>
                            <Text style={styles.title}>TCG Scanner</Text>
                            <Text style={styles.subtitle}>Scan & Collect</Text>
                        </View>
                        <TCGSelector />
                    </View>

                    <View style={styles.actionsRow}>


                        <TouchableOpacity
                            onPress={logout}
                            style={styles.logoutBtn}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="log-out-outline" size={20} color={colors.foreground} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Bottom Row: Navigation Pills (Web Only) */}
            {true && (
                <View style={styles.bottomContainer}>
                    <View style={[styles.row, styles.bottomRow]}>
                        <View style={styles.navRow}>
                            {TAB_ROUTES.map((item) => {
                                const itemPath = item.name === 'index' ? '/' : `/${item.name}`;
                                const isActive = pathname === itemPath;

                                return (
                                    <TouchableOpacity
                                        key={item.name}
                                        onPress={() => router.push(itemPath as any)}
                                        style={[styles.pill, isActive && styles.pillActive]}
                                    >
                                        <Ionicons
                                            name={item.icon as any}
                                            size={16}
                                            color={isActive ? colors.card : colors.mutedForeground}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

export default TopHeader;

const styles = StyleSheet.create({
    container: {
    },

    topContainer: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
        // display: 'none'


    },
    bottomContainer: {
        backgroundColor: colors.colorBackground,
    },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    topRow: {
        maxWidth: 1536,

        marginInline: "auto",
        width: "100%",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    bottomRow: {
        paddingHorizontal: 16,
        maxWidth: 1536,
        marginInline: "auto",
        width: "100%",
        // paddingVertical: 10,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        zIndex: 100, // Just a safety measure for the trigger
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
        marginRight: 12,
    },
    logoEmoji: { color: colors.teal, fontSize: 20 },
    title: { color: colors.primary, fontSize: 18, fontWeight: "700" },
    subtitle: { color: colors.mutedForeground, fontSize: 12 },
    actionsRow: { flexDirection: "row", alignItems: "center" },
    userWrap: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "rgba(255,255,255,0.03)",
        borderWidth: 1,
        borderColor: "#2b2b2b",
        marginRight: 12,
    },
    userAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#eee",
        borderWidth: 2,
        borderColor: "rgba(212,175,55,0.25)",
        alignItems: "center",
        justifyContent: "center",
    },
    userInitials: { fontSize: 12 },
    logoutBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 0,
        borderColor: colors.foreground,
        backgroundColor: colors.card,
    },/* Navigation Pills Row */
    navRow: {
        flexDirection: "row",
        gap: 12,
        // marginTop: 4,
        paddingVertical: 10,
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        // backgroundColor: "rgba(255,255,255,0.03)",
        // borderColor: "rgba(255,255,255,0.1)",
    },
    pillActive: {
        borderWidth: 1,

        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    pillText: {
        color: colors.mutedForeground,
        fontSize: 14,
        fontWeight: "600",
    },
    pillTextActive: {
        color: colors.card, // Dark text on gold background
    },
    tcgRow: {
        marginLeft: 12,
        minWidth: 160,
        maxWidth: 260,
    },
    picker: {
        height: 36,
        color: colors.foreground,
        backgroundColor: 'transparent',
    },
});