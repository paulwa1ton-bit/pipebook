import { useMemo } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookStore } from "@/store/bookStore";
import { buildDashboard, greeting } from "@/lib/dashboard";
import { REMINDER_LABELS, Reminder } from "@/lib/reminders";
import { formatPence, jobTotalPence } from "@/lib/money";
import { formatUkDate, todayIso } from "@/lib/dates";
import { Card, SectionTitle, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";

// Home: the plumber's own business at a glance - their logo and name on top,
// then what needs doing (money to chase, quotes, unbilled work, reminders).

const APP_ICON = require("../../assets/icon.png");

function Tile({ label, value, detail, alert, onPress }: {
  label: string; value: string; detail?: string; alert?: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexBasis: "47%", flexGrow: 1, opacity: pressed ? 0.7 : 1 })}>
      <Card style={{ marginBottom: 0, minHeight: 104 }}>
        <Text style={[styles.muted, { fontSize: 13 }]}>{label}</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, marginVertical: 2 }}>{value}</Text>
        {detail ? (
          <Text style={{ fontSize: 12, color: alert ? colors.danger : colors.textMuted, fontWeight: alert ? "700" : "400" }}>
            {detail}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: "center", paddingVertical: spacing.sm,
      borderRadius: radius.md, backgroundColor: pressed ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)" })}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={{ color: colors.textOnDark, fontWeight: "700", fontSize: 13, marginTop: 2 }}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const jobs = useBookStore((s) => s.jobs);
  const customers = useBookStore((s) => s.customers);
  const expenses = useBookStore((s) => s.expenses);
  const settings = useBookStore((s) => s.settings);
  const d = useMemo(() => buildDashboard(jobs, customers, expenses, settings, todayIso()), [jobs, customers, expenses, settings]);
  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? "";
  const branded = !!(settings.tradingName || settings.logoDataUri);

  const textCustomer = (r: Reminder) => {
    const phone = customers.find((c) => c.id === r.customerId)?.phone;
    const body = `Hi ${r.customerName}, it's ${settings.tradingName || "your plumber"}. Your ${REMINDER_LABELS[r.kind].toLowerCase()} is due on ${formatUkDate(r.dueDate)}. Reply with a day that suits and I'll book you in.`;
    Linking.openURL(`sms:${phone ?? ""}?body=${encodeURIComponent(body)}`);
  };
  const startNew = (kind: "invoice" | "quote") => router.push({ pathname: "/jobs", params: { kind } });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
      {/* Branded header */}
      <View style={{ backgroundColor: colors.brand, paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: "#fff", overflow: "hidden",
            alignItems: "center", justifyContent: "center" }}>
            <Image source={settings.logoDataUri ? { uri: settings.logoDataUri } : APP_ICON}
              style={{ width: 60, height: 60 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textOnDark, opacity: 0.85 }}>{greeting()}</Text>
            <Text style={{ color: colors.textOnDark, fontSize: 22, fontWeight: "800" }} numberOfLines={2}>
              {settings.tradingName || "PipeBook"}
            </Text>
            {settings.gasSafeNumber ? (
              <Text style={{ color: colors.textOnDark, opacity: 0.85, fontSize: 12 }}>Gas Safe reg. {settings.gasSafeNumber}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
          <QuickAction icon="📝" label="New quote" onPress={() => startNew("quote")} />
          <QuickAction icon="🧾" label="New invoice" onPress={() => startNew("invoice")} />
          <QuickAction icon="👤" label="Add customer" onPress={() => router.push("/customer/new")} />
        </View>
      </View>

      <View style={styles.content}>
        {!branded && (
          <Pressable onPress={() => router.push("/settings")}>
            <Card style={{ borderColor: colors.accent, borderWidth: 1.5 }}>
              <Text style={styles.title}>Make PipeBook yours</Text>
              <Text style={[styles.muted, { marginTop: spacing.xs }]}>
                Add your business name and logo. They'll show here and on every quote and invoice. Tap to set up ›
              </Text>
            </Card>
          </Pressable>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <Tile label="Owed to you" value={formatPence(d.owed.pence)} onPress={() => router.push("/jobs")}
            detail={d.owed.overdue.count > 0 ? `${formatPence(d.owed.overdue.pence)} overdue` : `${d.owed.count} invoice${d.owed.count === 1 ? "" : "s"}`}
            alert={d.owed.overdue.count > 0} />
          <Tile label="Quotes awaiting reply" value={String(d.quotes.count)} onPress={() => router.push("/jobs")}
            detail={d.quotes.notSent > 0 ? `${d.quotes.notSent} not sent yet` : d.quotes.expiringSoon > 0 ? `${d.quotes.expiringSoon} expiring this week` : `Worth ${formatPence(d.quotes.pence)}`}
            alert={d.quotes.notSent > 0 || d.quotes.expiringSoon > 0} />
          <Tile label="Done, not invoiced" value={String(d.notInvoiced.count)} onPress={() => router.push("/jobs")}
            detail={d.notInvoiced.count > 0 ? `${formatPence(d.notInvoiced.pence)} to bill` : "All billed"}
            alert={d.notInvoiced.count > 0} />
          <Tile label="Booked in" value={String(d.booked.count)} onPress={() => router.push("/jobs")}
            detail={d.booked.count > 0 ? `${formatPence(d.booked.pence)} of work` : "Nothing booked"} />
        </View>

        <SectionTitle>Reminders</SectionTitle>
        <Card>
          {d.remindersDue.length === 0 ? (
            <Text style={styles.muted}>No services or certificates due in the next month.</Text>
          ) : (
            d.remindersDue.slice(0, 3).map((r) => (
              <View key={`${r.customerId}:${r.kind}`} style={[styles.row, { marginBottom: spacing.sm }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>{r.customerName}</Text>
                  <Text style={{ fontSize: 12, color: r.urgency === "overdue" ? colors.danger : colors.warning }}>
                    {REMINDER_LABELS[r.kind]} · {r.daysUntilDue < 0 ? `overdue ${-r.daysUntilDue} days` : `due ${formatUkDate(r.dueDate)}`}
                  </Text>
                </View>
                <Pressable onPress={() => textCustomer(r)} hitSlop={8}>
                  <Text style={{ color: colors.brand, fontWeight: "700" }}>Text</Text>
                </Pressable>
              </View>
            ))
          )}
          <Pressable onPress={() => router.push("/reminders")} hitSlop={8}>
            <Text style={{ color: colors.brand, fontWeight: "600", marginTop: spacing.xs }}>
              See all reminders{d.remindersDue.length > 3 ? ` (${d.remindersDue.length} due)` : ""} ›
            </Text>
          </Pressable>
        </Card>

        <SectionTitle>This tax quarter</SectionTitle>
        <Pressable onPress={() => router.push("/money")}>
          <Card>
            <View style={styles.row}>
              <Text style={styles.muted}>Profit so far</Text>
              <Text style={styles.title}>{formatPence(d.quarter.profitPence)}</Text>
            </View>
            <View style={[styles.row, { marginTop: spacing.xs }]}>
              <Text style={styles.muted}>MTD update due</Text>
              <Text style={{ color: d.daysToMtdDeadline <= 14 ? colors.danger : colors.text, fontWeight: "600" }}>
                {formatUkDate(d.quarter.quarter.deadline)} ({d.daysToMtdDeadline} days)
              </Text>
            </View>
          </Card>
        </Pressable>

        {d.recent.length > 0 && (
          <>
            <SectionTitle>Recent</SectionTitle>
            {d.recent.map((job) => (
              <Pressable key={job.id} onPress={() => router.push(`/job/${job.id}`)}>
                <Card>
                  <View style={styles.row}>
                    <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{customerName(job.customerId)}</Text>
                    <Text style={styles.title}>{formatPence(jobTotalPence(job.lineItems))}</Text>
                  </View>
                  <Text style={styles.muted} numberOfLines={1}>{job.title}</Text>
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
