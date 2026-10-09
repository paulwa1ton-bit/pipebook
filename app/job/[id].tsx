import { useRef, useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useBookStore } from "@/store/bookStore";
import type { Job } from "@/types/models";
import { buildInvoiceText } from "@/lib/invoice";
import { REMINDER_LABELS } from "@/lib/reminders";
import { emailFillsIn, sendDocument, SendMethod } from "@/lib/shareDocument";
import { confirmAction, notify, showInfo } from "@/lib/confirm";
import { quoteReference, type DocumentKind } from "@/lib/documentHtml";
import { acceptQuotePatch, changeSinceQuote, quoteState } from "@/lib/quotes";
import { formatUkDate, todayIso } from "@/lib/dates";
import { formatPence } from "@/lib/money";
import { Button, Card, Field, SectionTitle, styles } from "@/components/ui";
import { ChargesEditor, ChargesEditorHandle } from "@/components/ChargesEditor";
import { CustomerPicker } from "@/components/CustomerPicker";
import { syncNow } from "@/lib/cloudSync";
import { colors, spacing } from "@/constants/theme";

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useBookStore((s) => s.jobs.find((j) => j.id === id));
  const customer = useBookStore((s) => s.customers.find((c) => c.id === job?.customerId));
  const settings = useBookStore((s) => s.settings);
  const { updateJob, updateCustomer, markInvoiced, markPaid, deleteJob } = useBookStore.getState();
  const charges = useRef<ChargesEditorHandle>(null);
  const [saved, setSaved] = useState(false);
  const [pickingCustomer, setPickingCustomer] = useState(false);

  if (!job) return <Text style={[styles.muted, { padding: spacing.md }]}>Job not found.</Text>;

  const latest = () => useBookStore.getState().jobs.find((j) => j.id === job.id)!;

  const sendPdf = async (kind: DocumentKind, method: SendMethod) => {
    if (kind === "invoice") markInvoiced(job.id);
    // Validity runs from the latest send.
    if (kind === "quote") updateJob(job.id, { quoteSentOn: todayIso() });
    try {
      // Read the customer fresh too, in case the email was typed just now.
      const currentCustomer = useBookStore.getState().customers.find((c) => c.id === job.customerId);
      if (method === "email" && Platform.OS === "android" && !emailFillsIn()) {
        // Explain before the share sheet covers the screen.
        await showInfo(
          "Pick your email app",
          "The PDF will be attached. Your message is copied ready to paste: in the email, press and hold, then tap Paste." +
            (currentCustomer?.email ? ` Send it to ${currentCustomer.email}.` : ""),
        );
      }
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

  // Everything already saves as it's typed; Save finishes anything left
  // half-done, backs up straight away, and confirms before closing the job.
  const save = async () => {
    Keyboard.dismiss();
    const editor = charges.current;
    editor?.commitRate();
    const pending = editor?.pendingCharge();
    if (pending === "incomplete") {
      const leave = await confirmAction(
        "Unfinished charge",
        "You've started typing a charge but it needs a price (or hours) before it can be added. Save without it?",
        "Save without it",
        { cancelLabel: "Go back", destructive: false },
      );
      if (!leave) return;
    } else if (pending) {
      const add = await confirmAction(
        "Add this charge?",
        `You typed "${pending}" but didn't tap Add charge.`,
        "Add it",
        { cancelLabel: "Leave it out", destructive: false },
      );
      if (add) editor?.addPendingCharge();
    }
    void syncNow();
    setSaved(true);
    setTimeout(() => router.back(), 700);
  };

  const accept = (workDone: boolean) => updateJob(job.id, acceptQuotePatch(latest(), todayIso(), workDone));

  const decline = async () => {
    if (await confirmAction("Mark quote as declined?", "It moves to Declined quotes. You can reopen it later.", "Declined",
      { destructive: false })) {
      updateJob(job.id, { status: "declined" });
    }
  };

  const confirmDelete = async () => {
    if (await confirmAction("Delete job?", "This can't be undone.", "Delete")) {
      deleteJob(job.id);
      router.back();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Stack.Screen
          options={{
            title: job.invoiceNumber ?? (job.status === "quote" || job.status === "declined" ? quoteReference(job) : "Job"),
            headerRight: () => (
              <Pressable onPress={save} hitSlop={10} style={{ paddingHorizontal: spacing.sm }} accessibilityRole="button">
                <Text style={{ color: colors.textOnDark, fontSize: 16, fontWeight: "700" }}>Save</Text>
              </Pressable>
            ),
          }}
        />

        <Card>
          <View style={[styles.row, { marginBottom: spacing.sm }]}>
            <Pressable onPress={() => setPickingCustomer(true)} hitSlop={8}>
              <Text style={{ color: colors.brand, fontWeight: "600" }}>Change customer</Text>
            </Pressable>
            {customer && (
              <Pressable onPress={() => router.push(`/customer/${customer.id}`)} hitSlop={8}>
                <Text style={{ color: colors.brand, fontWeight: "600" }}>Customer page ›</Text>
              </Pressable>
            )}
          </View>
          <Field label="Customer" value={customer?.name ?? ""} onChangeText={(name) => customer && updateCustomer(customer.id, { name })} />
          <Field label="Phone" value={customer?.phone ?? ""} keyboardType="phone-pad"
            onChangeText={(phone) => customer && updateCustomer(customer.id, { phone })} />
          <Field label="Email" value={customer?.email ?? ""} keyboardType="email-address" autoCapitalize="none"
            autoComplete="email" placeholder="For emailing invoices and quotes"
            onChangeText={(email) => customer && updateCustomer(customer.id, { email })} />
          <Field label="Address" value={customer?.address ?? ""}
            onChangeText={(address) => customer && updateCustomer(customer.id, { address })} />
          <Field label={job.status === "quote" || job.status === "declined" ? "Proposed work" : "Work done"} value={job.title} onChangeText={(title) => updateJob(job.id, { title })} />
          {job.reminderKind && (
            <Text style={[styles.muted, { color: colors.brand }]}>
              🔔 {REMINDER_LABELS[job.reminderKind]} reminder will be set for 12 months' time
            </Text>
          )}
        </Card>

        <CustomerPicker visible={pickingCustomer} onClose={() => setPickingCustomer(false)}
          onPick={(c) => updateJob(job.id, { customerId: c.id })} />

        <QuoteStatusCard job={job} />

        <ChargesEditor job={job} ref={charges} />

        <Button label="Save job" onPress={save} />

        {job.status === "quote" && (
          <>
            <Button label={job.quoteSentOn ? "Email quote again (PDF)" : "Email quote (PDF)"} onPress={() => sendPdf("quote", "email")} />
            <Button label="Share quote PDF (WhatsApp, text...)" variant="secondary" onPress={() => sendPdf("quote", "share")} />
            <SectionTitle>Customer's answer</SectionTitle>
            <Button label="Accepted - book it in" variant="secondary" onPress={() => accept(false)} />
            <Button label="Accepted - work done, create invoice" variant="secondary" onPress={() => accept(true)} />
            <Button label="Declined" variant="secondary" onPress={decline} />
          </>
        )}
        {job.status === "declined" && (
          <Button label="Reopen quote" variant="secondary" onPress={() => updateJob(job.id, { status: "quote" })} />
        )}
        {job.status === "booked" && (
          <Button label="Work done - create invoice" onPress={() => updateJob(job.id, { status: "done", date: todayIso() })} />
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
      {saved && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 40, alignItems: "center" }}>
          <View style={{ backgroundColor: colors.success, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              ✓ Saved{useBookStore.getState().account ? " and backed up" : ""}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** Where a quote stands, or for an accepted quote, how the bill compares with it. */
function QuoteStatusCard({ job }: { job: Job }) {
  const settings = useBookStore((s) => s.settings);
  const ref = quoteReference(job);

  if (job.status === "quote") {
    const state = quoteState(job, todayIso(), settings);
    const [text, colour] =
      state.kind === "draft" ? ["Not sent to the customer yet", colors.warning]
        : state.kind === "expired" ? [`Expired on ${formatUkDate(state.validUntil)} - send it again to renew`, colors.danger]
          : [`Sent ${formatUkDate(job.quoteSentOn!)} · valid until ${formatUkDate(state.validUntil)} (${state.daysLeft} days)`, colors.textMuted];
    return (
      <Card>
        <Text style={styles.title}>Quote {ref}</Text>
        <Text style={{ color: colour, marginTop: spacing.xs }}>{text}</Text>
      </Card>
    );
  }

  if (job.status === "declined") {
    return (
      <Card>
        <Text style={styles.title}>Quote {ref} - declined</Text>
        <Text style={[styles.muted, { marginTop: spacing.xs }]}>Reopen it if the customer changes their mind.</Text>
      </Card>
    );
  }

  const change = changeSinceQuote(job);
  if (!job.quoteAcceptedOn || change === null) return null;
  return (
    <Card>
      <Text style={styles.title}>From quote {ref}</Text>
      <Text style={[styles.muted, { marginTop: spacing.xs }]}>
        Accepted {formatUkDate(job.quoteAcceptedOn)} · quoted {formatPence(job.quotedTotalPence!)}
      </Text>
      {change !== 0 && (
        <Text style={{ color: colors.warning, marginTop: spacing.xs, fontWeight: "600" }}>
          {formatPence(Math.abs(change))} {change > 0 ? "more" : "less"} than quoted
        </Text>
      )}
    </Card>
  );
}
