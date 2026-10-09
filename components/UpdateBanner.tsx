import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { colors, spacing } from "@/constants/theme";

// Fixes published with `eas update` download in the background when the app
// opens. Rather than wait for the next cold start, offer a one-tap restart so
// testers pick them up straight away. Does nothing in Expo Go / development.

export function UpdateBanner() {
  if (!Updates.isEnabled) return null;
  return <Banner />;
}

function Banner() {
  const insets = useSafeAreaInsets();
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending) Updates.fetchUpdateAsync().catch(() => {});
  }, [isUpdateAvailable, isUpdatePending]);

  if (!isUpdatePending) return null;
  return (
    <Pressable
      onPress={() => Updates.reloadAsync().catch(() => {})}
      style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: insets.bottom + 64, zIndex: 5,
        backgroundColor: colors.success, borderRadius: 12, padding: spacing.md, alignItems: "center",
        shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}
      accessibilityRole="button"
    >
      <Text style={{ color: "#fff", fontWeight: "800" }}>Update ready - tap to restart Pipebook</Text>
    </Pressable>
  );
}

/** "0.1.0 (update 1a2b3c4d)" - shown in Settings so testers can say which version they're on. */
export function versionLabel(appVersion: string | undefined): string {
  const id = Updates.isEnabled ? Updates.updateId : null;
  return `${appVersion ?? "dev"}${id ? ` (update ${id.slice(0, 8)})` : Updates.isEnabled ? " (built-in)" : " (development)"}`;
}
