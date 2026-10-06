import { useMemo } from "react";
import { Linking, ScrollView, Text } from "react-native";
import { useBookStore } from "@/store/bookStore";
import { buildReminders, REMINDER_LABELS, Reminder } from "@/lib/reminders";
import { formatUkDate, todayIso } from "@/lib/dates";
import { Button, Card, SectionTitle, styles } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

const URGENCY_COLOURS = { overdue: colors.danger, due_soon: colors.warning, upcoming: colors.textMuted };

export default function RemindersScreen() {
  const jobs = useBookStore((s) => s.jobs);
  const customers = useBookStore((s) => s.customers);
  const tradingName = useBookStore((s) => s.settings.tradingName);
  const reminders = useMemo(() => buildReminders(jobs, customers, todayIso()), [jobs, customers]);

  const actionable = reminders.filter((r) => r.urgency !== "upcoming");
  const upcoming = reminders.filter((r) => r.urgency === "upcoming");

  const textCustomer = (r: Reminder) => {
    const phone = customers.find((c) => c.id === r.customerId)?.phone;
    const body = `Hi ${r.customerName}, it's ${tradingName || "your plumber"}. Your ${REMINDER_LABELS[r.kind].toLowerCase()} is due on ${formatUkDate(r.dueDate)}. Reply with a day that suits and I'll book you in.`;
    Linking.openURL(`sms:${phone ?? ""}?body=${encodeURIComponent(body)}`);
  };

  const renderReminder = (r: Reminder) => (
    <Card key={`${r.customerId}:${r.kind}`}>
      <Text style={styles.title}>{r.customerName}</Text>
      <Text style={styles.muted}>{REMINDER_LABELS[r.kind]}</Text>
      <Text style={{ color: URGENCY_COLOURS[r.urgency], fontWeight: "700", marginVertical: spacing.sm }}>
        {r.daysUntilDue < 0 ? `Overdue by ${-r.daysUntilDue} days` : `Due ${formatUkDate(r.dueDate)} (${r.daysUntilDue} days)`}
      </Text>
      <Button label="Text to book in" variant="secondary" onPress={() => textCustomer(r)} />
    </Card>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {reminders.length === 0 && (
        <Text style={[styles.muted, { textAlign: "center", marginTop: spacing.lg }]}>
          Boiler services, landlord CP12s and unvented cylinder services you log will show up here 12 months on,
          so you can book the repeat work.
        </Text>
      )}
      {actionable.length > 0 && <SectionTitle>Chase now</SectionTitle>}
      {actionable.map(renderReminder)}
      {upcoming.length > 0 && <SectionTitle>Coming up</SectionTitle>}
      {upcoming.map(renderReminder)}
    </ScrollView>
  );
}
