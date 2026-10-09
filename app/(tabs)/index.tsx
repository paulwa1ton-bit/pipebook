import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useBookStore } from "@/store/bookStore";
import { parseQuickEntry } from "@/lib/quickEntry";
import { activeMarkupPercent } from "@/lib/pricing";
import { formatPence, jobTotalPence } from "@/lib/money";
import { formatUkDate, todayIso } from "@/lib/dates";
import { quoteReference } from "@/lib/documentHtml";
import { quoteState } from "@/lib/quotes";
import { Button, Card, SectionTitle, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import type { BusinessSettings, Job, JobStatus } from "@/types/models";

type NewKind = "invoice" | "quote";

const STATUS_LABELS: Record<JobStatus, string> = {
  quote: "Quotes awaiting a reply",
  booked: "Booked in",
  done: "Done - not invoiced",
  invoiced: "Awaiting payment",
  paid: "Paid",
  declined: "Declined quotes",
};

const STATUS_ORDER: JobStatus[] = ["done", "invoiced", "quote", "booked", "paid", "declined"];

const EXAMPLES: Record<NewKind, { hint: string; button: string }> = {
  invoice: { hint: '"Mrs Smith, replaced kitchen tap, 1 hour, £85 parts"', button: "Create invoice" },
  quote: { hint: '"Mr Khan, new combi boiler, 8 hours, £1000 boiler"', button: "Create quote" },
};

export default function JobsScreen() {
  const jobs = useBookStore((s) => s.jobs);
  const customers = useBookStore((s) => s.customers);
  const settings = useBookStore((s) => s.settings);
  const addJobFromDraft = useBookStore((s) => s.addJobFromDraft);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<NewKind>("invoice");

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  const grouped = useMemo(
    () => STATUS_ORDER.map((status) => ({ status, jobs: jobs.filter((j) => j.status === status) }))
      .filter((g) => g.jobs.length > 0),
    [jobs],
  );

  const create = () => {
    if (!note.trim()) return;
    const job = addJobFromDraft(
      parseQuickEntry(note, { ...settings, markupPercent: activeMarkupPercent(settings) }),
      kind === "quote" ? "quote" : "done",
    );
    setNote("");
    router.push(`/job/${job.id}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <View style={{ flexDirection: "row", backgroundColor: colors.border, borderRadius: radius.md, padding: 3, marginBottom: spacing.md }}>
          {(["invoice", "quote"] as NewKind[]).map((k) => (
            <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="tab" accessibilityState={{ selected: kind === k }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: radius.md - 2, alignItems: "center",
                backgroundColor: kind === k ? colors.card : "transparent" }}>
              <Text style={{ fontWeight: "700", color: kind === k ? colors.brand : colors.textMuted }}>
                {k === "invoice" ? "Invoice" : "Quote"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.muted}>
          {kind === "invoice" ? "Job done? " : "Pricing up a job? "}
          Type or tap the 🎤 on your keyboard and say it, e.g.{"\n"}{EXAMPLES[kind].hint}
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder={kind === "invoice" ? "Customer, what you did, time, £ parts" : "Customer, the work, time, £ parts"}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { minHeight: 80, textAlignVertical: "top", marginVertical: spacing.md }]}
        />
        <Button label={EXAMPLES[kind].button} onPress={create} disabled={!note.trim()} />
      </Card>

      {grouped.length === 0 && (
        <Text style={[styles.muted, { textAlign: "center", marginTop: spacing.lg }]}>
          No jobs or quotes yet. Add your first one above.
        </Text>
      )}

      {grouped.map((group) => (
        <View key={group.status}>
          <SectionTitle>{STATUS_LABELS[group.status]} ({group.jobs.length})</SectionTitle>
          {group.jobs.map((job) => (
            <JobRow key={job.id} job={job} customerName={customerName(job.customerId)} settings={settings} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function quoteLine(job: Job, settings: BusinessSettings): { text: string; colour: string } {
  const state = quoteState(job, todayIso(), settings);
  if (state.kind === "draft") return { text: "Not sent yet", colour: colors.warning };
  if (state.kind === "expired") return { text: `Expired ${formatUkDate(state.validUntil)}`, colour: colors.danger };
  return { text: `Sent · valid ${state.daysLeft} more day${state.daysLeft === 1 ? "" : "s"}`, colour: colors.textMuted };
}

function JobRow({ job, customerName, settings }: { job: Job; customerName: string; settings: BusinessSettings }) {
  const quote = job.status === "quote" ? quoteLine(job, settings) : null;
  const reference = job.invoiceNumber ?? (job.status === "quote" || job.status === "declined" ? quoteReference(job) : formatUkDate(job.date));
  return (
    <Pressable onPress={() => router.push(`/job/${job.id}`)}>
      <Card>
        <View style={styles.row}>
          <Text style={styles.title}>{customerName}</Text>
          <Text style={styles.title}>{formatPence(jobTotalPence(job.lineItems))}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.muted, { flex: 1 }]} numberOfLines={1}>{job.title}</Text>
          <Text style={styles.muted}>{reference}</Text>
        </View>
        {quote && <Text style={{ color: quote.colour, fontSize: 13, marginTop: spacing.xs }}>{quote.text}</Text>}
        {job.quoteAcceptedOn && job.status === "booked" && (
          <Text style={{ color: colors.success, fontSize: 13, marginTop: spacing.xs }}>
            Quote accepted {formatUkDate(job.quoteAcceptedOn)}
          </Text>
        )}
      </Card>
    </Pressable>
  );
}
