import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookStore } from "@/store/bookStore";
import { addressFirstLine, searchCustomers } from "@/lib/customers";
import { Button, Card, Field, styles } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";
import type { Customer } from "@/types/models";

export type CustomerDetails = Pick<Customer, "name" | "address" | "phone" | "email">;

/** Name, address, phone and email fields, shared by the customer page and the picker. */
export function CustomerFields({ value, onChange, autoFocus }: {
  value: CustomerDetails;
  onChange: (patch: Partial<CustomerDetails>) => void;
  autoFocus?: boolean;
}) {
  return (
    <>
      <Field label="Name" value={value.name} onChangeText={(name) => onChange({ name })} autoFocus={autoFocus}
        placeholder="e.g. Mrs Smith" autoCapitalize="words" />
      <Field label="Address" value={value.address ?? ""} onChangeText={(address) => onChange({ address })} multiline
        placeholder={"House number and street\nTown\nPostcode"} style={[styles.input, { minHeight: 76, textAlignVertical: "top" }]} />
      <Field label="Phone" value={value.phone ?? ""} onChangeText={(phone) => onChange({ phone })} keyboardType="phone-pad" />
      <Field label="Email" value={value.email ?? ""} onChangeText={(email) => onChange({ email })} keyboardType="email-address"
        autoCapitalize="none" autoComplete="email" placeholder="For emailing invoices and quotes" />
    </>
  );
}

/**
 * Full-screen list to pick an existing customer (searchable) or add a new one.
 */
export function CustomerPicker({ visible, onClose, onPick }: {
  visible: boolean;
  onClose: () => void;
  onPick: (customer: Customer) => void;
}) {
  const insets = useSafeAreaInsets();
  const customers = useBookStore((s) => s.customers);
  const addCustomer = useBookStore((s) => s.addCustomer);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<CustomerDetails | null>(null);
  const results = useMemo(() => searchCustomers(customers, query), [customers, query]);

  const close = () => {
    setQuery("");
    setAdding(null);
    onClose();
  };
  const pick = (c: Customer) => {
    onPick(c);
    close();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={[styles.row, { padding: spacing.md, backgroundColor: colors.brand }]}>
          <Text style={{ color: colors.textOnDark, fontSize: 18, fontWeight: "700" }}>
            {adding ? "New customer" : "Choose customer"}
          </Text>
          <Pressable onPress={adding ? () => setAdding(null) : close} hitSlop={10}>
            <Text style={{ color: colors.textOnDark, fontSize: 16 }}>{adding ? "Back" : "Cancel"}</Text>
          </Pressable>
        </View>

        {adding ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Card>
              <CustomerFields value={adding} onChange={(patch) => setAdding({ ...adding, ...patch })} autoFocus />
            </Card>
            <Button label="Save customer" disabled={!adding.name.trim()} onPress={() => pick(addCustomer(adding))} />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, street, postcode or phone"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { marginBottom: spacing.md }]}
              autoFocus={customers.length > 0}
            />
            <Button label="+ Add a new customer" variant="secondary"
              onPress={() => setAdding({ name: query.trim(), address: "", phone: "", email: "" })} />
            {results.map((c) => (
              <Pressable key={c.id} onPress={() => pick(c)}
                style={({ pressed }) => ({ backgroundColor: pressed ? colors.border : colors.card, borderRadius: radius.md,
                  borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm })}>
                <Text style={styles.title}>{c.name}</Text>
                {(c.address || c.phone) && (
                  <Text style={styles.muted} numberOfLines={1}>
                    {[addressFirstLine(c.address), c.phone].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </Pressable>
            ))}
            {customers.length > 0 && results.length === 0 && (
              <Text style={[styles.muted, { textAlign: "center", marginTop: spacing.md }]}>No customers match "{query}".</Text>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
