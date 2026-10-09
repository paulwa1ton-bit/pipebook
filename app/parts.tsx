import { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { usePriceListStore } from "@/store/priceListStore";
import { useBookStore } from "@/store/bookStore";
import { pickSpreadsheet, PickedSpreadsheet } from "@/lib/readSpreadsheet";
import {
  ColumnMapping, MAX_PRICE_LIST_ITEMS, UK_VAT_PERCENT, buildPriceListItems, columnHeaders, detectColumns,
} from "@/lib/priceList";
import { recentParts } from "@/lib/partsSearch";
import { PART_CATEGORIES, PartCategory, STANDARD_PARTS } from "@/data/standardParts";
import { formatPence } from "@/lib/money";
import { formatUkDate } from "@/lib/dates";
import { confirmAction, notify } from "@/lib/confirm";
import { Button, Card, Field, SectionTitle, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";

type ColumnRole = "name" | "price" | "sku";
const ROLE_LABELS: Record<ColumnRole, string> = { name: "Description column", price: "Price column", sku: "Product code column" };

function guessSupplier(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return base.replace(/\b(price ?list|prices|export|account|\d{4,})\b/gi, "").replace(/\s+/g, " ").trim();
}

export default function PartsScreen() {
  const lists = usePriceListStore((s) => s.lists);
  const { importList, removeList } = usePriceListStore.getState();
  const jobs = useBookStore((s) => s.jobs);
  const usedCount = useMemo(() => recentParts(jobs).length, [jobs]);

  const [picked, setPicked] = useState<PickedSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [supplier, setSupplier] = useState("");
  const [addVat, setAddVat] = useState(true);
  const [busy, setBusy] = useState(false);

  const startImport = async () => {
    setBusy(true);
    try {
      const file = await pickSpreadsheet();
      if (!file) return;
      const detected = detectColumns(file.rows);
      setPicked(file);
      setMapping(detected ?? { headerRow: null, name: 0, price: Math.min(1, (file.rows[0]?.length ?? 1) - 1) });
      setSupplier(guessSupplier(file.fileName));
      if (!detected) notify("Check the columns", "We couldn't spot the description and price columns, so please pick them below.");
    } catch (err) {
      notify("Couldn't read that file", (err as Error).message || "Try saving it as CSV or .xlsx and importing again.");
    } finally {
      setBusy(false);
    }
  };

  const result = useMemo(
    () => (picked && mapping ? buildPriceListItems(picked.rows, mapping, { addVat }) : null),
    [picked, mapping, addVat],
  );
  const headers = useMemo(() => (picked && mapping ? columnHeaders(picked.rows, mapping) : []), [picked, mapping]);

  const finishImport = () => {
    if (!picked || !result || result.items.length === 0 || !supplier.trim()) return;
    const replacing = lists.some((l) => l.supplier.trim().toLowerCase() === supplier.trim().toLowerCase());
    importList({
      id: uuidv4(),
      supplier: supplier.trim(),
      fileName: picked.fileName,
      importedAt: new Date().toISOString(),
      vatAdded: addVat,
      itemCount: result.items.length,
      items: result.items,
    });
    setPicked(null);
    setMapping(null);
    notify(
      "Price list imported",
      `${result.items.length.toLocaleString("en-GB")} parts from ${supplier.trim()} are ready to use when adding parts to a job.` +
        (replacing ? " It replaces your previous list from this supplier." : "") +
        (result.truncated ? ` Only the first ${MAX_PRICE_LIST_ITEMS.toLocaleString("en-GB")} lines were imported.` : ""),
    );
  };

  const confirmRemove = async (id: string, name: string) => {
    if (await confirmAction("Remove price list?", `Parts from ${name} won't be suggested any more. Jobs already priced are not affected.`, "Remove")) {
      removeList(id);
    }
  };

  if (picked && mapping) {
    const setRole = (role: ColumnRole, col: number | undefined) => setMapping({ ...mapping, [role]: col });
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.title}>{picked.fileName}</Text>
          <Text style={[styles.muted, { marginBottom: spacing.md }]}>
            {result?.items.length.toLocaleString("en-GB")} parts found
            {result && result.skipped > 0
              ? ` · ${result.skipped} ${result.skipped === 1 ? "line" : "lines"} skipped (no description or price)`
              : ""}
          </Text>
          <Field label="Supplier name" value={supplier} onChangeText={setSupplier} placeholder="e.g. Bradfords" />
          <View style={[styles.row, { marginBottom: spacing.xs }]}>
            <Text style={[styles.title, { flex: 1 }]}>Add {UK_VAT_PERCENT}% VAT to these prices</Text>
            <Switch value={addVat} onValueChange={setAddVat} trackColor={{ true: colors.brandLight, false: colors.border }} />
          </View>
          <Text style={styles.muted}>
            Trade price lists are usually shown without VAT. Leave this on if you're not VAT registered, so parts are
            priced at what you actually pay. Turn it off if you're VAT registered, or if the list already includes VAT.
          </Text>
        </Card>

        <SectionTitle>Preview</SectionTitle>
        <Card>
          {result?.items.slice(0, 6).map((item, i) => (
            <View key={i} style={[styles.row, { marginBottom: spacing.sm }]}>
              <Text style={{ flex: 1, color: colors.text }} numberOfLines={2}>
                {item.name}{item.sku ? <Text style={styles.muted}>  {item.sku}</Text> : null}
              </Text>
              <Text style={[styles.title, { marginLeft: spacing.md }]}>{formatPence(item.costPence)}</Text>
            </View>
          ))}
          {result?.items.length === 0 && (
            <Text style={{ color: colors.danger }}>No parts found with these columns. Pick the right ones below.</Text>
          )}
        </Card>

        <SectionTitle>Columns</SectionTitle>
        <Card>
          <Text style={[styles.muted, { marginBottom: spacing.md }]}>Preview looks wrong? Pick the right columns.</Text>
          {(Object.keys(ROLE_LABELS) as ColumnRole[]).map((role) => (
            <View key={role} style={{ marginBottom: spacing.md }}>
              <Text style={styles.label}>{ROLE_LABELS[role]}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                {role === "sku" && (
                  <ColumnChip label="None" active={mapping.sku === undefined} onPress={() => setRole("sku", undefined)} />
                )}
                {headers.map((h, i) => (
                  <ColumnChip key={i} label={h} active={mapping[role] === i} onPress={() => setRole(role, i)} />
                ))}
              </View>
            </View>
          ))}
        </Card>

        <Button
          label={`Import ${result?.items.length.toLocaleString("en-GB") ?? 0} parts`}
          onPress={finishImport}
          disabled={!result || result.items.length === 0 || !supplier.trim()}
        />
        <Button label="Cancel" variant="secondary" onPress={() => { setPicked(null); setMapping(null); }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>Your parts</Text>
        <Text style={[styles.muted, { marginTop: spacing.xs }]}>
          When you add a part to a job, start typing and pick from parts you've used before ({usedCount} so far), your
          suppliers' price lists, or {STANDARD_PARTS.length} standard parts built into Pipebook. Your price fills in
          automatically (with your commission if it's switched on); for standard parts you add the price yourself.
        </Text>
      </Card>

      <SectionTitle>Supplier price lists</SectionTitle>
      {lists.length === 0 && (
        <Text style={[styles.muted, { marginBottom: spacing.md }]}>
          Ask your merchant (Bradfords, Plumbbase, City Plumbing...) to email you your account price list as a
          spreadsheet, then import it here. CSV and Excel (.xlsx) files both work.
        </Text>
      )}
      {lists.map((l) => (
        <Card key={l.id}>
          <View style={styles.row}>
            <Text style={styles.title}>{l.supplier}</Text>
            <Pressable onPress={() => confirmRemove(l.id, l.supplier)} hitSlop={10}>
              <Text style={{ color: colors.danger }}>Remove</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>
            {l.itemCount.toLocaleString("en-GB")} parts · imported {formatUkDate(l.importedAt.slice(0, 10))}
            {l.vatAdded ? " · VAT added" : ""}
          </Text>
        </Card>
      ))}
      <Button label={busy ? "Opening..." : "Import a price list"} onPress={startImport} disabled={busy} />
      {lists.length > 0 && (
        <Text style={[styles.muted, { textAlign: "center" }]}>
          Importing a new list for the same supplier replaces the old one.
        </Text>
      )}

      <SectionTitle>Standard parts</SectionTitle>
      <Text style={[styles.muted, { marginBottom: spacing.md }]}>
        Common pipe, fittings, valves, boilers and more, already in the app. No prices: you add yours on the job.
      </Text>
      {PART_CATEGORIES.map((category) => (
        <StandardCategory key={category} category={category} />
      ))}
    </ScrollView>
  );
}

function StandardCategory({ category }: { category: PartCategory }) {
  const [open, setOpen] = useState(false);
  const parts = useMemo(() => STANDARD_PARTS.filter((p) => p.category === category), [category]);
  return (
    <Card style={{ paddingVertical: spacing.sm, marginBottom: spacing.sm }}>
      <Pressable onPress={() => setOpen(!open)} style={[styles.row, { paddingVertical: spacing.xs }]}>
        <Text style={styles.title}>{category}</Text>
        <Text style={styles.muted}>{parts.length}  {open ? "▴" : "▾"}</Text>
      </Pressable>
      {open && parts.map((p) => (
        <View key={p.name} style={{ paddingVertical: spacing.xs, borderTopWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text }}>{p.name}</Text>
          <Text style={[styles.muted, { fontSize: 12 }]}>{p.description}</Text>
        </View>
      ))}
    </Card>
  );
}

function ColumnChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}
      style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill,
        backgroundColor: active ? colors.brand : colors.border, maxWidth: 220 }}>
      <Text numberOfLines={1} style={{ color: active ? colors.textOnDark : colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
