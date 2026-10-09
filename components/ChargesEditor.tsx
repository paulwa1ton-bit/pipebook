import { useEffect, useState } from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";
import { useBookStore } from "@/store/bookStore";
import { formatPence, jobTotalPence, lineTotalPence, poundsToPence } from "@/lib/money";
import {
  DEFAULT_MARKUP_PERCENT, activeMarkupPercent, applyMarkup, hourlyLabourLine, jobHourlyRate,
  markupEarnedPence, partsLine, roundHours, withMarkup,
} from "@/lib/pricing";
import { Button, Card, Field, SectionTitle, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import type { Job, LineItem } from "@/types/models";

type NewChargeKind = "parts" | "hours" | "fixed";

const CHARGE_LABELS: Record<NewChargeKind, string> = { parts: "Parts", hours: "Hours", fixed: "Fixed price" };

const HOURS_STEP = 0.5;

function penceToInput(pence: number): string {
  return (pence / 100).toFixed(2);
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill,
        backgroundColor: active ? colors.brand : colors.border }}
    >
      <Text style={{ color: active ? colors.textOnDark : colors.text }}>{label}</Text>
    </Pressable>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}
      style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.brand,
        alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.brand, fontSize: 18, fontWeight: "700", lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function ChargesEditor({ job }: { job: Job }) {
  const settings = useBookStore((s) => s.settings);
  const { addLineItem, removeLineItem, updateLineItem, setJobHourlyRate } = useBookStore.getState();

  const rate = jobHourlyRate(job, settings);
  const settingsMarkup = activeMarkupPercent(settings);
  const commission = markupEarnedPence(job.lineItems);

  const [rateInput, setRateInput] = useState(penceToInput(rate));
  useEffect(() => setRateInput(penceToInput(rate)), [rate]);

  const [kind, setKind] = useState<NewChargeKind>("parts");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [hours, setHours] = useState("");
  const [addCommission, setAddCommission] = useState(settings.markupEnabled ?? false);
  const newMarkup = settings.markupPercent ?? DEFAULT_MARKUP_PERCENT;

  const saveRate = () => {
    const pence = poundsToPence(rateInput);
    if (pence === null || pence === rate) return setRateInput(penceToInput(rate));
    setJobHourlyRate(job.id, pence);
  };

  const parsedHours = parseFloat(hours);
  const parsedAmount = poundsToPence(amount);
  const preview =
    kind === "hours" && parsedHours > 0
      ? `${roundHours(parsedHours)} hrs × ${formatPence(rate)} = ${formatPence(Math.round(roundHours(parsedHours) * rate))}`
      : kind === "parts" && parsedAmount !== null && addCommission
        ? `${formatPence(parsedAmount)} + ${newMarkup}% = customer pays ${formatPence(applyMarkup(parsedAmount, newMarkup))}`
        : null;

  const addCharge = () => {
    if (kind === "hours") {
      if (!(parsedHours > 0)) return;
      addLineItem(job.id, { ...hourlyLabourLine(parsedHours, rate), description: desc.trim() || "Labour" });
    } else {
      if (!desc.trim() || parsedAmount === null) return;
      addLineItem(job.id, kind === "parts"
        ? partsLine(desc.trim(), parsedAmount, addCommission ? newMarkup : undefined)
        : { kind: "other", description: desc.trim(), quantity: 1, unitPricePence: parsedAmount });
    }
    setDesc("");
    setAmount("");
    setHours("");
  };

  const toggleLineCommission = (item: LineItem) =>
    updateLineItem(job.id, item.id, withMarkup(item, item.markupPercent ? undefined : settingsMarkup ?? newMarkup));

  return (
    <>
      <SectionTitle>Charges</SectionTitle>
      <Card>
        <View style={[styles.row, { marginBottom: spacing.md }]}>
          <Text style={{ color: colors.text, flex: 1 }}>Hourly rate for this job</Text>
          <Text style={{ color: colors.text, marginRight: spacing.xs }}>£</Text>
          <TextInput
            value={rateInput}
            onChangeText={setRateInput}
            onBlur={saveRate}
            onSubmitEditing={saveRate}
            keyboardType="decimal-pad"
            style={[styles.input, { width: 90, paddingVertical: 8, textAlign: "right" }]}
          />
          <Text style={{ color: colors.textMuted, marginLeft: spacing.xs }}>/hr</Text>
        </View>

        {job.lineItems.length === 0 && <Text style={[styles.muted, { marginBottom: spacing.sm }]}>No charges yet.</Text>}

        {job.lineItems.map((item) => (
          <View key={item.id} style={{ marginBottom: spacing.md }}>
            <View style={styles.row}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: "600" }}>{item.description}</Text>
              <Text style={{ color: colors.text, marginRight: spacing.md }}>{formatPence(lineTotalPence(item))}</Text>
              <Pressable onPress={() => removeLineItem(job.id, item.id)} hitSlop={10}>
                <Text style={{ color: colors.danger }}>✕</Text>
              </Pressable>
            </View>

            {item.hourly && (
              <View style={[styles.row, { justifyContent: "flex-start", gap: spacing.sm, marginTop: spacing.xs }]}>
                <StepButton label="−" onPress={() =>
                  updateLineItem(job.id, item.id, { quantity: roundHours(item.quantity - HOURS_STEP) })} />
                <Text style={styles.muted}>{item.quantity} hrs × {formatPence(item.unitPricePence)}/hr</Text>
                <StepButton label="+" onPress={() =>
                  updateLineItem(job.id, item.id, { quantity: roundHours(item.quantity + HOURS_STEP) })} />
              </View>
            )}

            {item.kind === "parts" && (
              <View style={[styles.row, { marginTop: spacing.xs }]}>
                <Text style={[styles.muted, { flex: 1 }]}>
                  {item.markupPercent
                    ? `Cost ${formatPence(item.costPence ?? 0)} + ${item.markupPercent}% commission`
                    : "No commission"}
                </Text>
                <Pressable onPress={() => toggleLineCommission(item)} hitSlop={8}>
                  <Text style={{ color: colors.brand, fontWeight: "600" }}>
                    {item.markupPercent ? "Remove commission" : "Add commission"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <View style={[styles.row, { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm }]}>
          <Text style={styles.title}>Total</Text>
          <Text style={styles.title}>{formatPence(jobTotalPence(job.lineItems))}</Text>
        </View>
        {commission > 0 && (
          <Text style={[styles.muted, { marginTop: spacing.xs, color: colors.success }]}>
            Includes {formatPence(commission)} commission on parts (not shown to the customer)
          </Text>
        )}
      </Card>

      <Card>
        <Text style={[styles.title, { marginBottom: spacing.sm }]}>Add a charge</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          {(Object.keys(CHARGE_LABELS) as NewChargeKind[]).map((k) => (
            <Chip key={k} label={CHARGE_LABELS[k]} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>

        {kind === "hours" ? (
          <>
            <Field label="Hours" value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder="e.g. 4" />
            <Field label="Description (optional)" value={desc} onChangeText={setDesc} placeholder="Labour" />
          </>
        ) : (
          <>
            <Field label="Item" value={desc} onChangeText={setDesc}
              placeholder={kind === "parts" ? "e.g. Worcester Bosch 30i boiler" : "e.g. Skip hire"} />
            <Field label={kind === "parts" ? "What you paid (£)" : "Price (£)"} value={amount}
              onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
            {kind === "parts" && (
              <View style={[styles.row, { marginBottom: spacing.md }]}>
                <Text style={{ color: colors.text }}>Add my {newMarkup}% commission</Text>
                <Switch value={addCommission} onValueChange={setAddCommission}
                  trackColor={{ true: colors.brandLight, false: colors.border }} />
              </View>
            )}
          </>
        )}
        {preview && <Text style={[styles.muted, { marginBottom: spacing.md, color: colors.brand }]}>{preview}</Text>}
        <Button label="Add charge" variant="secondary" onPress={addCharge} />
      </Card>
    </>
  );
}
