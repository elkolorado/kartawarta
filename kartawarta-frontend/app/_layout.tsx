import { Tabs } from "expo-router";
import { CardProvider } from "../context/CardContext";
import { SessionProvider } from "@/hooks/useAuth";
import { View, Text, Touchable, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TopHeader from "@/components/topHeader";
import { Platform } from "react-native";
import { TAB_ROUTES } from "@/constants/tabRoutes";
import { colors } from "@/constants/themeColors";
export default function RootLayout() {
  return (
    <SessionProvider>
      <CardProvider>
        <Tabs
          screenOptions={{
            header: ({ navigation, route, options }) => (
              <TopHeader navigation={navigation} route={route} options={options} />
            ),
            tabBarStyle: Platform.select({
              web: { display: 'none' },
              // default: { display: 'flex', backgroundColor: colors.background }, // Shows on iOS and Android
              default: { display: 'none' }, // Shows on iOS and Android
            }),
          }}

        >
          {TAB_ROUTES.map((route) => (
            <Tabs.Screen
              key={route.name}
              name={route.name}
              options={{

                title: route.label,
                tabBarButton: (props: any) => {
                  const isActive = props?.accessibilityState?.selected;
                  return (
                    <TouchableOpacity
                      onPress={props.onPress}
                      style={[styles.pill, isActive && styles.pillActive]}
                    >
                      <Ionicons
                        name={route.icon as any}
                        size={16}
                        color={isActive ? colors.card : colors.foreground}
                      />
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {route.label}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              }}
            />
          ))}

          <Tabs.Screen
            name="login"
            options={{
              headerShown: false,
              href: null,
              tabBarStyle: { display: 'none' }
            }}
          />
        </Tabs>
      </CardProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
  },

  topContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,


  },
  bottomContainer: {
    backgroundColor: colors.background,
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
    paddingVertical: 20,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
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
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },/* Navigation Pills Row */
  navRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  pill: {
    // flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  pillTextActive: {
    color: colors.card, // Dark text on gold background
  },
});