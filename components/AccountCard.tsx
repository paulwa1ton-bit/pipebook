import { useState } from "react";
import { Text, View } from "react-native";
import { isFirebaseConfigured } from "@/lib/firebase";
import { createAccount, logIn, logOut, prepareLogOut } from "@/lib/account";
import { resetPassword } from "@/lib/auth";
import { syncNow } from "@/lib/cloudSync";
import { confirmAction, notify } from "@/lib/confirm";
import { useBookStore } from "@/store/bookStore";
import { Button, Card, Field, styles } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

function formatSyncedAt(iso: string | null): string {
  if (!iso) return "Not backed up yet";
  const d = new Date(iso);
  return `Last backed up ${d.toLocaleDateString("en-GB")} at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function AccountCard() {
  const account = useBookStore((s) => s.account);
  const lastSyncedAt = useBookStore((s) => s.lastSyncedAt);
  const syncStatus = useBookStore((s) => s.syncStatus);
  const syncError = useBookStore((s) => s.syncError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isFirebaseConfigured) {
    return (
      <Card>
        <Text style={styles.title}>Account & backup</Text>
        <Text style={[styles.muted, { marginTop: spacing.sm }]}>
          Cloud backup isn't switched on in this build yet. Everything is saved on this phone.
        </Text>
      </Card>
    );
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!account) {
    return (
      <Card>
        <Text style={styles.title}>Account & backup</Text>
        <Text style={[styles.muted, { marginVertical: spacing.sm }]}>
          Create a free account to back up your jobs, invoices and expenses, so nothing is lost if your phone is.
          Anything already on this phone is included.
        </Text>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none"
          keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry
          autoComplete="password" placeholder="At least 6 characters" />
        {error && <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{error}</Text>}
        <Button label="Create account" disabled={busy || !email || !password}
          onPress={() => run(() => createAccount(email, password))} />
        <Button label="Log in" variant="secondary" disabled={busy || !email || !password}
          onPress={() => run(() => logIn(email, password))} />
        <Text
          style={[styles.muted, { textAlign: "center", textDecorationLine: "underline", marginTop: spacing.xs }]}
          onPress={() => {
            if (!email) return setError("Enter your email first, then tap Forgot password.");
            run(async () => {
              await resetPassword(email);
              notify("Check your email", `We've sent a password reset link to ${email}.`);
            });
          }}
        >
          Forgot password?
        </Text>
      </Card>
    );
  }

  const status =
    syncStatus === "syncing" ? "Backing up..." : syncStatus === "error" ? syncError : formatSyncedAt(lastSyncedAt);

  const handleLogOut = () =>
    run(async () => {
      const unsaved = await prepareLogOut();
      const message = unsaved > 0
        ? `${unsaved} change(s) haven't backed up yet and will be lost. Get a signal and try again to keep them.`
        : "Your data is backed up. It will be removed from this phone and comes back when you log in again.";
      if (await confirmAction("Log out?", message, "Log out")) await logOut();
    });

  return (
    <Card>
      <Text style={styles.title}>Account & backup</Text>
      <Text style={[styles.muted, { marginTop: spacing.xs }]}>{account.email}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", marginVertical: spacing.md }}>
        <Text style={{ color: syncStatus === "error" ? colors.warning : colors.success, fontWeight: "700" }}>
          {syncStatus === "error" ? "⚠ " : "☁ "}
        </Text>
        <Text style={{ color: colors.text, flex: 1 }}>{status}</Text>
      </View>
      <Button label="Back up now" variant="secondary" disabled={busy || syncStatus === "syncing"}
        onPress={() => run(syncNow)} />
      <Button label="Log out" variant="secondary" disabled={busy} onPress={handleLogOut} />
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </Card>
  );
}
