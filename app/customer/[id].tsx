import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useBookStore } from "@/store/bookStore";
import { customerSummary } from "@/lib/customers";
import { formatPence, jobTotalPence } from "@/lib/money";
import { formatUkDate } from "@/lib/dates";
import { quoteReference } from "@/lib/documentHtml";
import { confirmAction, notify } from "@/lib/confirm";
import { CustomerDetails, CustomerFields } from "@/components/CustomerPicker";
import { Button, Card, SectionTitle, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import type { Customer, JobStatus } from "@/types/models";

const STATUS_TEXT: Record<JobStatus, string> = {
  quote: "Quote", declined: "Declined quote", booked: "Booked in", done: "Not invoiced", invoiced: "Awaiting payment", paid: "Paid",
};

export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id === "new" ? <NewCustomer /> : <ExistingCustomer id={id} />;
}

function NewCustomer() {
  const addCustomer = useBookStore((s) => s.addCustomer);
  const [details, setDetails] = useState<CustomerDetails>({ name: "", address: "", phone: "", email: "" });
  const save = () => {
    if (!details.name.trim()) return notify("Name needed", "Add the customer's name before saving.");
    const customer = addCustomer(details);
    router.replace(`/customer/${customer.id}`);
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "New customer" }} />
      <Card>
        <CustomerFields value={details} onChange={(patch) => setDetails({ ...details, ...patch })} autoFocus />
      </Card>
      <Button label="Save customer" onPress={save} disabled={!details.name.trim()} />
    </ScrollView>
  );
}

function ContactButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: "center", paddingVertical: 10,
      borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.brand, opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ color: colors.brand, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function ExistingCustomer({ id }: { id: string }) {
  const customer = useBookStore((s) => s.customers.find((c) => c.id === id));
  const allJobs = useBookStore((s) => s.jobs);
  const { updateCustomer, deleteCustomer } = useBookStore.getState();
  const jobs = useMemo(() => allJobs.filter((j) => j.customerId === id).sort((a, b) => b.date.localeCompare(a.date)), [allJobs, id]);
  const summary = useMemo(() => customerSummary(allJobs, id), [allJobs, id]);

  if (!customer) return <Text style={[styles.muted, { padding: spacing.md }]}>Customer not found.</Text>;

  // Return to the existing Jobs tab (rather than stacking another copy) with the customer chosen.
  const startNew = (kind: "invoice" | "quote") => router.dismissTo({ pathname: "/", params: { customerId: customer.id, kind } });

  const remove = async () => {
    if (jobs.length > 0) {
      return notify("Can't delete", `${customer.name} has ${jobs.length} job${jobs.length === 1 ? "" : "s"} or quote${jobs.length === 1 ? "" : "s"}. Delete those first, or keep the customer for your records.`);
    }
    if (await confirmAction("Delete customer?", `${customer.name} will be removed.`, "Delete")) {
      deleteCustomer(customer.id);
      router.back();
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: customer.name || "Customer" }} />

      {(customer.phone || customer.email) && (
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          {customer.phone && <ContactButton label="Call" onPress={() => Linking.openURL(`tel:${customer.phone!.replace(/\s/g, "")}`)} />}
          {customer.phone && <ContactButton label="Text" onPress={() => Linking.openURL(`sms:${customer.phone!.replace(/\s/g, "")}`)} />}
          {customer.email && <ContactButton label="Email" onPress={() => Linking.openURL(`mailto:${customer.email}`)} />}
        </View>
      )}

      <Card>
        <CustomerFields value={customer} onChange={(patch: Partial<Customer>) => updateCustomer(customer.id, patch)} />
        <Text style={styles.muted}>Changes save as you type and appear on all their quotes, invoices and emails.</Text>
      </Card>

      <Button label={`New quote for ${customer.name}`} onPress={() => startNew("quote")} />
      <Button label={`New invoice for ${customer.name}`} variant="secondary" onPress={() => startNew("invoice")} />

      <SectionTitle>
        Jobs and quotes ({summary.jobCount})
        {summary.owedPence > 0 ? <Text style={{ color: colors.warning }}>  · owes {formatPence(summary.owedPence)}</Text> : null}
      </SectionTitle>
      {jobs.length === 0 && <Text style={[styles.muted, { marginBottom: spacing.md }]}>Nothing yet.</Text>}
      {jobs.map((job) => (
        <Pressable key={job.id} onPress={() => router.push(`/job/${job.id}`)}>
          <Card>
            <View style={styles.row}>
              <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{job.title}</Text>
              <Text style={styles.title}>{formatPence(jobTotalPence(job.lineItems))}</Text>
            </View>
            <Text style={styles.muted}>
              {STATUS_TEXT[job.status]} · {job.invoiceNumber ?? (job.status === "quote" || job.status === "declined" ? quoteReference(job) : "")}
              {job.invoiceNumber || job.status === "quote" || job.status === "declined" ? " · " : ""}{formatUkDate(job.date)}
            </Text>
          </Card>
        </Pressable>
      ))}

      <Button label="Delete customer" variant="danger" onPress={remove} />
    </ScrollView>
  );
}
