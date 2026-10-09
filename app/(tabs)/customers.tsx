import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useBookStore } from "@/store/bookStore";
import { addressFirstLine, customerSummary, searchCustomers } from "@/lib/customers";
import { formatPence } from "@/lib/money";
import { Button, Card, styles } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

export default function CustomersScreen() {
  const customers = useBookStore((s) => s.customers);
  const jobs = useBookStore((s) => s.jobs);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCustomers(customers, query), [customers, query]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Button label="+ Add customer" onPress={() => router.push("/customer/new")} />
      {customers.length > 0 && (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`Search ${customers.length} customer${customers.length === 1 ? "" : "s"}: name, street, postcode, phone`}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { marginVertical: spacing.sm }]}
        />
      )}
      {customers.length === 0 && (
        <Text style={[styles.muted, { textAlign: "center", marginTop: spacing.lg }]}>
          No customers yet. Add one here, or they're added automatically when you create a quote or invoice.
        </Text>
      )}
      {results.map((c) => {
        const summary = customerSummary(jobs, c.id);
        return (
          <Pressable key={c.id} onPress={() => router.push(`/customer/${c.id}`)}>
            <Card>
              <View style={styles.row}>
                <Text style={[styles.title, { flex: 1 }]}>{c.name}</Text>
                {summary.owedPence > 0 && (
                  <Text style={{ color: colors.warning, fontWeight: "700" }}>Owes {formatPence(summary.owedPence)}</Text>
                )}
              </View>
              {(c.address || c.phone) && (
                <Text style={styles.muted} numberOfLines={1}>
                  {[addressFirstLine(c.address), c.phone].filter(Boolean).join(" · ")}
                </Text>
              )}
              <Text style={[styles.muted, { fontSize: 13, marginTop: spacing.xs }]}>
                {summary.jobCount} job{summary.jobCount === 1 ? "" : "s"}
                {summary.openQuotes > 0 ? ` · ${summary.openQuotes} quote${summary.openQuotes === 1 ? "" : "s"} awaiting reply` : ""}
              </Text>
            </Card>
          </Pressable>
        );
      })}
      {customers.length > 0 && results.length === 0 && (
        <Text style={[styles.muted, { textAlign: "center", marginTop: spacing.md }]}>No customers match "{query}".</Text>
      )}
    </ScrollView>
  );
}
