import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { landing } from "@/constants/theme";

// Branded landing page shown over the app as it opens. The very first time it
// waits for "Get started"; after that it shows briefly and fades away by
// itself (tap to skip), so it never slows down a plumber who's in a hurry.

const ART = require("../assets/landing.jpg");
const ART_ASPECT = 768 / 1376; // width / height of the artwork
const SEEN_KEY = "pipebook-landing-seen";
const AUTO_HIDE_MS = 1800;
const FADE_MS = 350;
const BUTTON_SPACE = 96; // room kept below the artwork for "Get started"

export function LandingOverlay() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(1)).current;
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);

  const dismiss = () => {
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => setVisible(false));
    AsyncStorage.setItem(SEEN_KEY, "1").catch(() => {});
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(SEEN_KEY)
      .catch(() => null)
      .then((seen) => {
        setFirstRun(!seen);
        if (seen) timer = setTimeout(dismiss, AUTO_HIDE_MS);
      });
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  // Fit the whole artwork (it has text near every edge) below the status bar,
  // leaving room for the button on first run; fill any spare space with the
  // artwork's own colours so it looks full-bleed.
  const reserved = firstRun ? BUTTON_SPACE + insets.bottom : 0;
  const artWidth = Math.min(width, (height - insets.top - reserved) * ART_ASPECT);
  const buttonInset = Math.max(24, (width - artWidth) / 2 + 24);
  const artHeight = artWidth / ART_ASPECT;

  return (
    <Animated.View
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity, backgroundColor: landing.cream, zIndex: 10 }}
    >
      <Pressable style={{ flex: 1 }} onPress={firstRun ? undefined : dismiss} accessibilityLabel="PipeBook. Tap to continue">
        <View style={{ height: insets.top }} />
        <Image source={ART} style={{ width: artWidth, height: artHeight, alignSelf: "center" }} resizeMode="contain" />
        <View style={{ flex: 1, backgroundColor: landing.orange, marginTop: -2 }} />
      </Pressable>

      {firstRun && (
        <Pressable
          onPress={dismiss}
          style={({ pressed }) => ({
            position: "absolute", left: buttonInset, right: buttonInset, bottom: insets.bottom + 20,
            backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 16, alignItems: "center",
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: landing.orange, fontSize: 18, fontWeight: "800" }}>Get started</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
