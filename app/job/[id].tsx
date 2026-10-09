import { ScrollView, Share, Text } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useBookStore } from "@/store/bookStore";
import { buildInvoiceText } from "@/lib/invoice";
import { REMINDER_LABELS } from "@/lib/reminders";
import { sendDocument, SendMethod } from "@/lib/shareDocument";
import { confirmAction, notify } from "@/lib/confirm";
import type { DocumentKind } from "@/lib/documentHtml";
import { Button, Card, Field, styles } from "@/components/ui";
import { ChargesEditor } from "@/components/ChargesEditor";
import { colors, spacing } from "@/constants/theme";

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useBookStore((s) => s.jobs.find((j) => j.id === id));
  const customer = useBookStore((s) => s.customers.find((c) => c.id === job?.customerId));
  const settings = useBookStore((s) => s.settings);
  const { updateJob, updateCustomer, markInvoiced, markPaid, deleteJob } = useBookStore.getState();

  if (!job) return <Text style={[styles.muted, { padding: spacing.md }]}>Job not found.</Text>;

  const latest = () => useBookStore.getState().jobs.find((j) => j.id === job.id)!;

  const sendPdf = async (kind: DocumentKind, method: SendMethod) => {
    if (kind === "invoice") markInvoiced(job.id);
    try {
      // Read the customer fresh too, in case the email was typed just now.
      const currentCustomer = useBookStore.getState().customers.find((c) => c.id === job.customerId);
      await sendDocument(kind, latest(), currentCustomer, settings, method);
    } catch (err) {
      console.warn("[job] PDF send failed:", err);
      notify("Couldn't send the PDF", "Try again, or use \"Share PDF\" to send it another way.");
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
        <Field label="Email" value={customer?.email ?? ""} keyboardType="email-address" autoCapitalize="none"
          autoComplete="email" placeholder="For emailing invoices and quotes"
          onChangeText={(email) => customer && updateCustomer(customer.id, { email })} />
        <Field label="Address" value={customer?.address ?? ""}
          onChangeText={(address) => customer && updateCustomer(customer.id, { address })} />
        <Field label={job.status === "quote" ? "Proposed work" : "Work done"} value={job.title} onChangeText={(title) => updateJob(job.id, { title })} />
        {job.reminderKind && (
          <Text style={[styles.muted, { color: colors.brand }]}>
            🔔 {REMINDER_LABELS[job.reminderKind]} reminder will be set for 12 months' time
          </Text>
        )}
      </Card>

      <ChargesEditor job={job} />

      {job.status === "quote" && (
        <>
          <Button label="Email quote (PDF)" onPress={() => sendPdf("quote", "email")} />
          <Button label="Share quote PDF (WhatsApp, text...)" variant="secondary" onPress={() => sendPdf("quote", "share")} />
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
          <Button label={job.invoiceNumber ? "Email invoice again (PDF)" : "Email invoice (PDF)"} onPress={() => sendPdf("invoice", "email")} />
          <Button label="Share invoice PDF (WhatsApp, text...)" variant="secondary" onPress={() => sendPdf("invoice", "share")} />
          <Button label="Send as a text message (no PDF)" variant="secondary" onPress={sendInvoiceText} />
        </>
      )}
      {job.status === "invoiced" && <Button label="Mark paid" onPress={() => markPaid(job.id)} />}
      {job.status === "paid" && (
        <>
          <Text style={[styles.title, { color: colors.success, textAlign: "center", marginBottom: spacing.md }]}>✓ Paid</Text>
          <Button label="Email paid receipt (PDF)" variant="secondary" onPress={() => sendPdf("invoice", "email")} />
          <Button label="Share paid receipt PDF" variant="secondary" onPress={() => sendPdf("invoice", "share")} />
        </>
      )}
      <Button label="Delete job" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}
