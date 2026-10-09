import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useBookStore } from "@/store/bookStore";
import { parseQuickEntry } from "@/lib/quickEntry";
import { activeMarkupPercent } from "@/lib/pricing";
import { formatPence, jobTotalPence } from "@/lib/money";
import { formatUkDate } from "@/lib/dates";
import { Button, Card, SectionTitle, styles } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import type { Job, JobStatus } from "@/types/models";

const STATUS_LABELS: Record<JobStatus, string> = {
  quote: "Quote",
  booked: "Booked",
  done: "Done - not invoiced",
  invoiced: "Awaiting payment",
  paid: "Paid",
};

const STATUS_ORDER: JobStatus[] = ["done", "invoiced", "booked", "quote", "paid"];

export default function JobsScreen() {
  const jobs = useBookStore((s) => s.jobs);
  const customers = useBookStore((s) => s.customers);
  const settings = useBookStore((s) => s.settings);
  const addJobFromDraft = useBookStore((s) => s.addJobFromDraft);
  const [note, setNote] = useState("");

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  const grouped = useMemo(
    () => STATUS_ORDER.map((status) => ({ status, jobs: jobs.filter((j) => j.status === status) }))
      .filter((g) => g.jobs.length > 0),
    [jobs],
  );

  const addJob = (status: JobStatus) => {
    if (!note.trim()) return;
    const job = addJobFromDraft(
      parseQuickEntry(note, { ...settings, markupPercent: activeMarkupPercent(settings) }),
      status,
    );
    setNote("");
    router.push(`/job/${job.id}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={styles.title}>Quick job</Text>
        <Text style={[styles.muted, { marginVertical: spacing.sm }]}>
          Type or tap the 🎤 on your keyboard and say it, e.g.{"\n"}
          "Mrs Smith, replaced kitchen tap, 1 hour, £85 parts"
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Customer, what you did, time, £ parts"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { minHeight: 80, textAlignVertical: "top", marginBottom: spacing.md }]}
        />
        <Button label="Add finished job" onPress={() => addJob("done")} disabled={!note.trim()} />
        <Button label="Save as quote" variant="secondary" onPress={() => addJob("quote")} disabled={!note.trim()} />
      </Card>

      {grouped.length === 0 && (
        <Text style={[styles.muted, { textAlign: "center", marginTop: spacing.lg }]}>
          No jobs yet. Add your first one above.
        </Text>
      )}

      {grouped.map((group) => (
        <View key={group.status}>
          <SectionTitle>{STATUS_LABELS[group.status]} ({group.jobs.length})</SectionTitle>
          {group.jobs.map((job) => (
            <JobRow key={job.id} job={job} customerName={customerName(job.customerId)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function JobRow({ job, customerName }: { job: Job; customerName: string }) {
  return (
    <Pressable onPress={() => router.push(`/job/${job.id}`)}>
      <Card>
        <View style={styles.row}>
          <Text style={styles.title}>{customerName}</Text>
          <Text style={styles.title}>{formatPence(jobTotalPence(job.lineItems))}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.muted}>{job.title}</Text>
          <Text style={styles.muted}>{job.invoiceNumber ?? formatUkDate(job.date)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}
