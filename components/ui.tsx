import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label, onPress, variant = "primary", disabled,
}: { label: string; onPress: () => void; variant?: "primary" | "secondary" | "danger"; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.buttonLabel, variant === "secondary" && { color: colors.brand }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props} />
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.brand },
  buttonDanger: { backgroundColor: colors.danger },
  buttonLabel: { color: colors.textOnDark, fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
