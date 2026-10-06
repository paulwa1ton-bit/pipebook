import { useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useBookStore } from "@/store/bookStore";
import { formatPence, jobTotalPence, lineTotalPence, poundsToPence } from "@/lib/money";
import { buildInvoiceText } from "@/lib/invoice";
import { REMINDER_LABELS } from "@/lib/reminders";
import { shareDocument } from "@/lib/shareDocument";
import { confirmAction, notify } from "@/lib/confirm";
import type { DocumentKind } from "@/lib/documentHtml";
import { Button, Card, Field, SectionTitle, styles } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import type { LineItemKind } from "@/types/models";

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useBookStore((s) => s.jobs.find((j) => j.id === id));
  const customer = useBookStore((s) => s.customers.find((c) => c.id === job?.customerId));
  const settings = useBookStore((s) => s.settings);
  const { updateJob, updateCustomer, addLineItem, removeLineItem, markInvoiced, markPaid, deleteJob } =
    useBookStore.getState();

  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newKind, setNewKind] = useState<LineItemKind>("parts");

  if (!job) return <Text style={[styles.muted, { padding: spacing.md }]}>Job not found.</Text>;

  const addLine = () => {
    const pence = poundsToPence(newPrice);
    if (!newDesc.trim() || pence === null) return;
    addLineItem(job.id, { kind: newKind, description: newDesc.trim(), quantity: 1, unitPricePence: pence });
    setNewDesc("");
    setNewPrice("");
  };

  const latest = () => useBookStore.getState().jobs.find((j) => j.id === job.id)!;

  const sendPdf = async (kind: DocumentKind) => {
    if (kind === "invoice") markInvoiced(job.id);
    try {
      await shareDocument(kind, latest(), customer, settings);
    } catch (err) {
      console.warn("[job] PDF share failed:", err);
      notify("Couldn't create the PDF", "Try again, or send it as a text message instead.");
    }
  };

  const sendInvoiceText = async () => {
    markInvoiced(job.id);
    const message = buildInvoiceText(latest(), customer, settings);
    try {
      await Share.share({ message });
    } catch {
      // Some browsers have no share sheet - show the text so it can be copied.
      notify("Invoice", message);
    }
  };

  const confirmDelete = async () => {
    if (await confirmAction("Delete job?", "This can't be undone.", "Delete")) {
      deleteJob(job.id);
      router.back();
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: job.invoiceNumber ?? (job.status === "quote" ? "Quote" : "Job") }} />

      <Card>
        <Field label="Customer" value={customer?.name ?? ""} onChangeText={(name) => customer && updateCustomer(customer.id, { name })} />
        <Field label="Phone" value={customer?.phone ?? ""} keyboardType="phone-pad"
          onChangeText={(phone) => customer && updateCustomer(customer.id, { phone })} />
        <Field label="Address" value={customer?.address ?? ""}
          onChangeText={(address) => customer && updateCustomer(customer.id, { address })} />
        <Field label={job.status === "quote" ? "Proposed work" : "Work done"} value={job.title} onChangeText={(title) => updateJob(job.id, { title })} />
        {job.reminderKind && (
          <Text style={[styles.muted, { color: colors.brand }]}>
            🔔 {REMINDER_LABELS[job.reminderKind]} reminder will be set for 12 months' time
          </Text>
        )}
      </Card>

      <SectionTitle>Charges</SectionTitle>
      <Card>
        {job.lineItems.map((item) => (
          <View key={item.id} style={[styles.row, { marginBottom: spacing.sm }]}>
            <Text style={{ flex: 1, color: colors.text }}>
              {item.description}{item.kind === "labour" && item.quantity !== 1 ? ` (${item.quantity} hrs)` : ""}
            </Text>
            <Text style={{ color: colors.text, marginRight: spacing.md }}>{formatPence(lineTotalPence(item))}</Text>
            <Pressable onPress={() => removeLineItem(job.id, item.id)} hitSlop={10}>
              <Text style={{ color: colors.danger }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={[styles.row, { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm }]}>
          <Text style={styles.title}>Total</Text>
          <Text style={styles.title}>{formatPence(jobTotalPence(job.lineItems))}</Text>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          {(["parts", "labour", "other"] as LineItemKind[]).map((k) => (
            <Pressable key={k} onPress={() => setNewKind(k)}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
                backgroundColor: newKind === k ? colors.brand : colors.border }}>
              <Text style={{ color: newKind === k ? colors.textOnDark : colors.text }}>{k}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Item" value={newDesc} onChangeText={setNewDesc} placeholder="e.g. 15mm isolation valve" />
        <Field label="Price (£)" value={newPrice} onChangeText={setNewPrice} keyboardType="decimal-pad" placeholder="0.00" />
        <Button label="Add charge" variant="secondary" onPress={addLine} />
      </Card>

      {job.status === "quote" && (
        <>
          <Button label="Send quote (PDF)" onPress={() => sendPdf("quote")} />
          <Button label="Quote accepted - book it in" variant="secondary"
            onPress={() => updateJob(job.id, { status: "booked" })} />
        </>
      )}
      {(job.status === "quote" || job.status === "booked") && (
        <Button label="Mark job done" variant={job.status === "quote" ? "secondary" : "primary"}
          onPress={() => updateJob(job.id, { status: "done" })} />
      )}
      {(job.status === "done" || job.status === "invoiced") && (
        <>
          <Button label={job.invoiceNumber ? "Resend invoice (PDF)" : "Send invoice (PDF)"} onPress={() => sendPdf("invoice")} />
          <Button label="Send as text message instead" variant="secondary" onPress={sendInvoiceText} />
        </>
      )}
      {job.status === "invoiced" && <Button label="Mark paid" onPress={() => markPaid(job.id)} />}
      {job.status === "paid" && (
        <>
          <Text style={[styles.title, { color: colors.success, textAlign: "center", marginBottom: spacing.md }]}>✓ Paid</Text>
          <Button label="Send paid receipt (PDF)" variant="secondary" onPress={() => sendPdf("invoice")} />
        </>
      )}
      <Button label="Delete job" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}
