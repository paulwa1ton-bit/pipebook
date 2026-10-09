import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useBookStore } from "@/store/bookStore";
import { quarterFor, summariseQuarter } from "@/lib/taxQuarters";
import { daysBetween, formatUkDate, todayIso } from "@/lib/dates";
import { formatPence, poundsToPence } from "@/lib/money";
import { Button, Card, Field, SectionTitle, styles } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import type { ExpenseCategory } from "@/types/models";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  costOfGoods: "Parts & materials",
  travelCosts: "Van & fuel",
  adminCosts: "Phone & office",
  premisesRunningCosts: "Premises",
  professionalFees: "Accountant & fees",
  otherExpenses: "Other (tools, insurance...)",
};

export default function MoneyScreen() {
  const jobs = useBookStore((s) => s.jobs);
  const expenses = useBookStore((s) => s.expenses);
  const addExpense = useBookStore((s) => s.addExpense);
  const deleteExpense = useBookStore((s) => s.deleteExpense);

  const today = todayIso();
  const summary = useMemo(() => summariseQuarter(quarterFor(today), jobs, expenses), [today, jobs, expenses]);
  const { quarter } = summary;
  const owed = jobs.filter((j) => j.status === "invoiced").length;

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("costOfGoods");

  const saveExpense = () => {
    const pence = poundsToPence(amount);
    if (!desc.trim() || pence === null) return;
    addExpense({ date: today, description: desc.trim(), amountPence: pence, category });
    setDesc("");
    setAmount("");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={{ backgroundColor: colors.brand, borderColor: colors.brand }}>
        <Text style={{ color: colors.textOnDark, opacity: 0.8 }}>
          Tax year {quarter.taxYear} · Quarter {quarter.quarter} ({formatUkDate(quarter.start)} - {formatUkDate(quarter.end)})
        </Text>
        <Text style={{ color: colors.textOnDark, fontSize: 32, fontWeight: "800", marginVertical: spacing.sm }}>
          {formatPence(summary.profitPence)}
        </Text>
        <Text style={{ color: colors.textOnDark }}>profit so far this quarter</Text>
        <Text style={{ color: colors.accent, marginTop: spacing.sm, fontWeight: "700" }}>
          MTD update due {formatUkDate(quarter.deadline)} ({daysBetween(today, quarter.deadline)} days)
        </Text>
      </Card>

      <Card>
        <Row label={`Paid in (${summary.paidJobCount} jobs)`} value={formatPence(summary.turnoverPence)} />
        {summary.commissionPence > 0 && (
          <Row label="   incl. commission on parts" value={formatPence(summary.commissionPence)} muted />
        )}
        <Row label="Expenses" value={formatPence(-summary.expensesPence)} />
        {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[])
          .filter((c) => summary.expensesByCategory[c] > 0)
          .map((c) => <Row key={c} label={`   ${CATEGORY_LABELS[c]}`} value={formatPence(summary.expensesByCategory[c])} muted />)}
        {owed > 0 && <Text style={[styles.muted, { marginTop: spacing.sm }]}>{owed} invoice(s) still awaiting payment</Text>}
      </Card>

      <SectionTitle>Log an expense</SectionTitle>
      <Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
          {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
                backgroundColor: category === c ? colors.brand : colors.border }}>
              <Text style={{ color: category === c ? colors.textOnDark : colors.text }}>{CATEGORY_LABELS[c]}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="What for" value={desc} onChangeText={setDesc} placeholder="e.g. Screwfix fittings" />
        <Field label="Amount (£)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
        <Button label="Save expense" onPress={saveExpense} />
      </Card>

      {expenses.length > 0 && <SectionTitle>Recent expenses</SectionTitle>}
      {expenses.slice(0, 20).map((e) => (
        <Card key={e.id}>
          <View style={styles.row}>
            <Text style={styles.title}>{e.description}</Text>
            <Text style={styles.title}>{formatPence(e.amountPence)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.muted}>{formatUkDate(e.date)} · {CATEGORY_LABELS[e.category]}</Text>
            <Pressable onPress={() => deleteExpense(e.id)} hitSlop={10}>
              <Text style={{ color: colors.danger }}>Delete</Text>
            </Pressable>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={[styles.row, { marginBottom: spacing.xs }]}>
      <Text style={muted ? styles.muted : { color: colors.text }}>{label}</Text>
      <Text style={muted ? styles.muted : styles.title}>{value}</Text>
    </View>
  );
}
