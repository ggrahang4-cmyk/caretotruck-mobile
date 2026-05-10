import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, focused }: { name: IoniconName; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={22}
      color={focused ? colors.primary : colors.textMuted}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "speedometer" : "speedometer-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "map" : "map-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="receipts"
        options={{
          title: "Receipts",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "receipt" : "receipt-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="inspections"
        options={{
          title: "Pre-Trip",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "clipboard" : "clipboard-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "settings" : "settings-outline"} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
