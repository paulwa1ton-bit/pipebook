import { Alert, Platform } from "react-native";

/** Yes/no prompt. React Native Web's Alert can't show buttons, so use the browser's confirm there. */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  { cancelLabel = "Cancel", destructive = true }: { cancelLabel?: string; destructive?: boolean } = {},
): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

export function notify(title: string, message: string): void {
  if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
