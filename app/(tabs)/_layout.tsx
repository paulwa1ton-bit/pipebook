import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/constants/theme";

function TabIcon({ symbol }: { symbol: string }) {
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand },
        headerTintColor: colors.textOnDark,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: false, tabBarIcon: () => <TabIcon symbol="🏠" /> }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: () => <TabIcon symbol="🔧" /> }} />
      <Tabs.Screen name="customers" options={{ title: "Customers", tabBarIcon: () => <TabIcon symbol="👥" /> }} />
      <Tabs.Screen name="reminders" options={{ title: "Reminders", href: null }} />
      <Tabs.Screen name="money" options={{ title: "Money & Tax", tabBarIcon: () => <TabIcon symbol="💷" /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: () => <TabIcon symbol="⚙️" /> }} />
    </Tabs>
  );
}
