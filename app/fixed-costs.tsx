import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIES = [
  { value: "truck_payment",                   label: "Truck payment" },
  { value: "trailer_payment",                 label: "Trailer payment" },
  { value: "insurance_liability",             label: "Liability insurance" },
  { value: "insurance_physical_damage",       label: "Physical damage insurance" },
  { value: "insurance_occupational_accident", label: "Occupational accident insurance" },
  { value: "insurance_health",                label: "Health insurance" },
  { value: "permits_ifta_irp",                label: "IFTA / IRP permits" },
  { value: "permits_other",                   label: "Other permits" },
  { value: "phone_data",                      label: "Phone / data plan" },
  { value: "office_software",                 label: "Office / software subscriptions" },
  { value: "tolls_subscription",              label: "Tolls subscription" },
  { value: "parking_subscription",            label: "Parking subscription" },
  { value: "loan_interest",                   label: "Loan interest" },
  { value: "other",                           label: "Other" },
] as const;

type CategoryValue = typeof CATEGORIES[number]["value"];

interface FixedCostRow {
  id: string;
  category: CategoryValue;
  label: string;
  monthlyAmountCents: number;
}

const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v.replace(/_/g, " ");
function fmtDollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FixedCostsScreen() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;

  const [rows, setRows] = useState<FixedCostRow[] | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<CategoryValue>("truck_payment");

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "fixedCosts"), where("userId", "==", uid));
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          category: (data.category as CategoryValue) ?? "other",
          label: data.label ?? "",
          monthlyAmountCents: data.monthlyAmountCents ?? 0,
        };
      }));
    }, (err) => {
      console.warn("FixedCosts error:", err);
      setRows([]);
    });
  }, [uid]);

  async function handleAdd() {
    if (!uid) return;
    const cents = Math.round(Number(newAmount) * 100);
    if (!newLabel.trim()) { Alert.alert("Error", "Description is required."); return; }
    if (isNaN(cents) || cents <= 0) { Alert.alert("Error", "Enter a valid monthly amount."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, "fixedCosts"), {
        userId: uid,
        truckId: null,
        category,
        label: newLabel.trim(),
        monthlyAmountCents: cents,
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdAt: serverTimestamp(),
        schemaVersion: 1,
      });
      setNewLabel("");
      setNewAmount("");
    } catch (e) {
      Alert.alert("Error", (e as Error).message || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, label: string) {
    Alert.alert("Delete", `Remove "${label}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await deleteDoc(doc(db, "fixedCosts", id));
      }}
    ]);
  }

  const totalCents = (rows ?? []).reduce((s, r) => s + r.monthlyAmountCents, 0);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total monthly fixed costs</Text>
        <Text style={styles.summaryValue}>{fmtDollars(totalCents)}</Text>
      </View>

      <Text style={styles.sectionTitle}>Add a cost</Text>
      <View style={styles.addCard}>
        <TextInput
          style={styles.input}
          placeholder="Description"
          placeholderTextColor={colors.textMuted}
          value={newLabel}
          onChangeText={setNewLabel}
        />
        <TextInput
          style={styles.input}
          placeholder="Monthly Amount ($)"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={newAmount}
          onChangeText={setNewAmount}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.saveBtnText}>Add Cost</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Current costs</Text>
      {rows === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : rows.length === 0 ? (
        <Text style={styles.emptyText}>No fixed costs yet.</Text>
      ) : (
        <View style={styles.list}>
          {rows.map(row => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowCat}>{catLabel(row.category)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>{fmtDollars(row.monthlyAmountCents)}</Text>
                <TouchableOpacity onPress={() => handleDelete(row.id, row.label)} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  summaryCard: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: colors.textSecondary, fontSize: 14 },
  summaryValue: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginBottom: spacing.sm, marginLeft: spacing.xs },
  addCard: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  input: { backgroundColor: colors.bg, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.md, fontSize: 16 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: colors.surface, fontSize: 16, fontWeight: "600" },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowInfo: { flex: 1 },
  rowLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: "500", marginBottom: 2 },
  rowCat: { color: colors.textMuted, fontSize: 12 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowAmount: { color: colors.textPrimary, fontSize: 16, fontWeight: "600", marginRight: spacing.sm },
  delBtn: { padding: 4 },
  emptyText: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
