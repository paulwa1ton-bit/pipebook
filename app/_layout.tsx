import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { useCloudBackup } from "@/hooks/useCloudBackup";
import { LandingOverlay } from "@/components/LandingOverlay";
import { UpdateBanner } from "@/components/UpdateBanner";

export default function RootLayout() {
  useCloudBackup();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.brand },
            headerTintColor: colors.textOnDark,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="job/[id]" options={{ title: "Job" }} />
          <Stack.Screen name="parts" options={{ title: "Parts & price lists" }} />
          <Stack.Screen name="customer/[id]" options={{ title: "Customer" }} />
        </Stack>
        <UpdateBanner />
        <LandingOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
