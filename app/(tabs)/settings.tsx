import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { useBookStore } from "@/store/bookStore";
import { formatPence, poundsToPence } from "@/lib/money";
import { Card, Field, styles } from "@/components/ui";
import { spacing } from "@/constants/theme";

export default function SettingsScreen() {
  const settings = useBookStore((s) => s.settings);
  const updateSettings = useBookStore((s) => s.updateSettings);
  const [hourly, setHourly] = useState((settings.hourlyRatePence / 100).toFixed(2));
  const [callout, setCallout] = useState((settings.calloutPence / 100).toFixed(2));

  const savePence = (value: string, key: "hourlyRatePence" | "calloutPence") => {
    const pence = poundsToPence(value);
    if (pence !== null) updateSettings({ [key]: pence });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Field label="Trading name (shown on invoices)" value={settings.tradingName}
          onChangeText={(tradingName) => updateSettings({ tradingName })} placeholder="e.g. J Bloggs Plumbing" />
        <Field label="Hourly rate (£)" value={hourly} keyboardType="decimal-pad"
          onChangeText={setHourly} onBlur={() => savePence(hourly, "hourlyRatePence")} />
        <Field label="Call-out charge (£)" value={callout} keyboardType="decimal-pad"
          onChangeText={setCallout} onBlur={() => savePence(callout, "calloutPence")} />
        <Field label="Payment terms (days)" value={String(settings.paymentTermsDays)} keyboardType="number-pad"
          onChangeText={(v) => updateSettings({ paymentTermsDays: parseInt(v, 10) || 0 })} />
        <Field label="Bank details (shown on invoices)" value={settings.bankDetails ?? ""} multiline
          onChangeText={(bankDetails) => updateSettings({ bankDetails })} placeholder="Name, sort code, account number" />
      </Card>
      <Text style={[styles.muted, { marginTop: spacing.sm }]}>
        Quick entries use {formatPence(settings.hourlyRatePence)}/hr and a {formatPence(settings.calloutPence)} call-out.
        Next invoice number: {settings.nextInvoiceNumber}.
      </Text>
    </ScrollView>
  );
}
