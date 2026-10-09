import { useEffect, useState } from "react";
import { Image, ScrollView, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useBookStore } from "@/store/bookStore";
import { formatPence, poundsToPence } from "@/lib/money";
import { DEFAULT_MARKUP_PERCENT, applyMarkup } from "@/lib/pricing";
import { notify } from "@/lib/confirm";
import { AccountCard } from "@/components/AccountCard";
import { Button, Card, Field, SectionTitle, styles } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

// Logos are stored inline (as a small JPEG data URI) so they print on PDFs
// offline and back up with the rest of the settings.
async function pickLogo(): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
  if (picked.canceled) return null;
  const image = await ImageManipulator.manipulate(picked.assets[0].uri).resize({ width: 400 }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
}

export default function SettingsScreen() {
  const settings = useBookStore((s) => s.settings);
  const updateSettings = useBookStore((s) => s.updateSettings);
  const [hourly, setHourly] = useState((settings.hourlyRatePence / 100).toFixed(2));
  const [callout, setCallout] = useState((settings.calloutPence / 100).toFixed(2));

  // Rates can change underneath us when a backup restores from another phone.
  useEffect(() => setHourly((settings.hourlyRatePence / 100).toFixed(2)), [settings.hourlyRatePence]);
  useEffect(() => setCallout((settings.calloutPence / 100).toFixed(2)), [settings.calloutPence]);

  const markupPercent = settings.markupPercent ?? DEFAULT_MARKUP_PERCENT;
  const [markup, setMarkup] = useState(String(markupPercent));
  useEffect(() => setMarkup(String(markupPercent)), [markupPercent]);
  const saveMarkup = () => {
    const value = parseFloat(markup);
    if (value >= 0 && value <= 500) updateSettings({ markupPercent: Math.round(value * 10) / 10 });
    else setMarkup(String(markupPercent));
  };

  const savePence = (value: string, key: "hourlyRatePence" | "calloutPence") => {
    const pence = poundsToPence(value);
    if (pence !== null) updateSettings({ [key]: pence });
  };

  const chooseLogo = async () => {
    try {
      const logoDataUri = await pickLogo();
      if (logoDataUri) updateSettings({ logoDataUri });
    } catch (err) {
      console.warn("[settings] logo pick failed:", err);
      notify("Couldn't use that image", "Try a different photo or screenshot of your logo.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AccountCard />

      <SectionTitle>Your business</SectionTitle>
      <Card>
        <Text style={[styles.muted, { marginBottom: spacing.md }]}>Shown at the top of your invoices and quotes.</Text>
        <View style={{ alignItems: "center", marginBottom: spacing.md }}>
          {settings.logoDataUri ? (
            <Image source={{ uri: settings.logoDataUri }} style={{ width: 160, height: 80 }} resizeMode="contain" />
          ) : (
            <Text style={styles.muted}>No logo yet</Text>
          )}
        </View>
        <Button label={settings.logoDataUri ? "Change logo" : "Add logo"} variant="secondary" onPress={chooseLogo} />
        {settings.logoDataUri && (
          <Button label="Remove logo" variant="secondary" onPress={() => updateSettings({ logoDataUri: undefined })} />
        )}
        <Field label="Trading name" value={settings.tradingName}
          onChangeText={(tradingName) => updateSettings({ tradingName })} placeholder="e.g. J Bloggs Plumbing" />
        <Field label="Business address" value={settings.businessAddress ?? ""} multiline
          onChangeText={(businessAddress) => updateSettings({ businessAddress })} />
        <Field label="Phone" value={settings.businessPhone ?? ""} keyboardType="phone-pad"
          onChangeText={(businessPhone) => updateSettings({ businessPhone })} />
        <Field label="Email" value={settings.businessEmail ?? ""} keyboardType="email-address" autoCapitalize="none"
          onChangeText={(businessEmail) => updateSettings({ businessEmail })} />
        <Field label="Gas Safe registration number (optional)" value={settings.gasSafeNumber ?? ""} keyboardType="number-pad"
          onChangeText={(gasSafeNumber) => updateSettings({ gasSafeNumber })} />
        <Field label="Bank details" value={settings.bankDetails ?? ""} multiline
          onChangeText={(bankDetails) => updateSettings({ bankDetails })} placeholder="Name, sort code, account number" />
      </Card>

      <SectionTitle>Rates</SectionTitle>
      <Card>
        <Field label="Default hourly rate (£)" value={hourly} keyboardType="decimal-pad"
          onChangeText={setHourly} onBlur={() => savePence(hourly, "hourlyRatePence")} />
        <Field label="Call-out charge (£)" value={callout} keyboardType="decimal-pad"
          onChangeText={setCallout} onBlur={() => savePence(callout, "calloutPence")} />
        <Field label="Payment terms (days)" value={String(settings.paymentTermsDays)} keyboardType="number-pad"
          onChangeText={(v) => updateSettings({ paymentTermsDays: parseInt(v, 10) || 0 })} />
        <Text style={styles.muted}>You can also change the hourly rate on any individual job.</Text>
      </Card>

      <SectionTitle>Commission on parts</SectionTitle>
      <Card>
        <View style={[styles.row, { marginBottom: spacing.sm }]}>
          <Text style={[styles.title, { flex: 1 }]}>Add commission to parts I supply</Text>
          <Switch value={settings.markupEnabled ?? false} onValueChange={(markupEnabled) => updateSettings({ markupEnabled })}
            trackColor={{ true: colors.brandLight, false: colors.border }} />
        </View>
        <Text style={[styles.muted, { marginBottom: spacing.md }]}>
          For sourcing, collecting and guaranteeing parts. Enter what you paid and the commission is added on top.
          Customers only see the final price.
        </Text>
        {settings.markupEnabled && (
          <>
            <Field label="Commission (%)" value={markup} onChangeText={setMarkup} onBlur={saveMarkup}
              keyboardType="decimal-pad" />
            <Text style={styles.muted}>
              e.g. a £1,000.00 boiler is charged at {formatPence(applyMarkup(100000, markupPercent))}.
              You can switch it off for any single part on a job.
            </Text>
          </>
        )}
      </Card>
      <Text style={[styles.muted, { marginTop: spacing.sm }]}>
        Quick entries use {formatPence(settings.hourlyRatePence)}/hr and a {formatPence(settings.calloutPence)} call-out.
        Next invoice number: {settings.nextInvoiceNumber}.
      </Text>
    </ScrollView>
  );
}
