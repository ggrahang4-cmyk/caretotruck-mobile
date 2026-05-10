import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc, onSnapshot, updateDoc, deleteDoc, serverTimestamp,
  collection, query, where, orderBy, limit, getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { centsToDisplay, formatDate } from "@/lib/utils";
import type { ReceiptDoc, TripDoc } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

type Receipt = ReceiptDoc & { id: string };
type Trip    = TripDoc    & { id: string };

const RECEIPT_CATEGORIES: { value: string; label: string }[] = [
  { value: "fuel_diesel",          label: "Diesel Fuel" },
  { value: "fuel_def",             label: "DEF Fluid" },
  { value: "maintenance_repair",   label: "Repair / Service" },
  { value: "maintenance_oil_change", label: "Oil Change" },
  { value: "maintenance_tires",    label: "Tires" },
  { value: "maintenance_parts",    label: "Parts" },
  { value: "tolls",                label: "Tolls" },
  { value: "parking",              label: "Parking" },
  { value: "scale_weighing",       label: "Scale / Weigh" },
  { value: "lumper_fee",           label: "Lumper Fee" },
  { value: "truck_wash",           label: "Truck Wash" },
  { value: "meals",                label: "Meals" },
  { value: "lodging",              label: "Lodging" },
  { value: "phone_internet",       label: "Phone / Internet" },
  { value: "insurance",            label: "Insurance" },
  { value: "permits_fees",         label: "Permits / Fees" },
  { value: "professional_services", label: "Professional Services" },
  { value: "other_business",       label: "Other Business" },
  { value: "personal_non_deductible", label: "Personal (Non-deductible)" },
];

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const uid = auth.currentUser?.uid;

  const [receipt, setReceipt]   = useState<Receipt | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [trips, setTrips]       = useState<Trip[]>([]);
  const [showTrips, setShowTrips] = useState(false);

  // Edit state
  const [merchant, setMerchant]   = useState("");
  const [totalStr, setTotalStr]   = useState("");
  const [category, setCategory]   = useState("");
  const [notes, setNotes]         = useState("");
  const [linkedTripId, setLinked] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "receipts", id), (s) => {
      if (s.exists()) {
        const r = { id: s.id, ...s.data() } as Receipt;
        setReceipt(r);
        setMerchant(r.merchantName);
        setTotalStr((r.totalCents / 100).toFixed(2));
        setCategory(r.category);
        setNotes(r.userNotes ?? "");
        setLinked(r.tripId ?? null);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  async function loadTrips() {
    if (!uid || trips.length > 0) { setShowTrips(true); return; }
    const q = query(
      collection(db, "trips"),
      where("userId", "==", uid),
      orderBy("pickupAt", "desc"),
      limit(50),
    );
    const snap = await getDocs(q);
    setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip)));
    setShowTrips(true);
  }

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "receipts", id), {
        merchantName: merchant.trim(),
        totalCents:   Math.round(parseFloat(totalStr) * 100),
        category,
        userNotes:    notes.trim() || null,
        tripId:       linkedTripId,
        ocrStatus:    "user_corrected",
        updatedAt:    serverTimestamp(),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert("Delete Receipt", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "receipts", id!));
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textSecondary }}>Receipt not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* OCR review banner */}
      {receipt.ocrStatus === "manual_review" && (
        <View style={styles.reviewBanner}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={styles.reviewText}>OCR needs review — please verify the fields below.</Text>
        </View>
      )}

      {/* Image preview */}
      {receipt.imageUrl ? (
        <Image source={{ uri: receipt.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : null}

      {/* Date */}
      <Text style={styles.meta}>{formatDate(receipt.transactionDate)} · {receipt.merchantState}</Text>

      {/* Merchant */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Merchant</Text>
        <TextInput
          value={merchant}
          onChangeText={setMerchant}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Total */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Total ($)</Text>
        <TextInput
          value={totalStr}
          onChangeText={setTotalStr}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {RECEIPT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.catPill, category === cat.value && styles.catPillActive]}
                onPress={() => setCategory(cat.value)}
              >
                <Text style={[styles.catPillText, category === cat.value && styles.catPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Trip link */}
      <View style={styles.field}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.fieldLabel}>Linked Trip</Text>
          <TouchableOpacity onPress={loadTrips}>
            <Text style={{ color: colors.primary, fontSize: 13 }}>
              {linkedTripId ? "Change" : "Link a trip"}
            </Text>
          </TouchableOpacity>
        </View>
        {linkedTripId && !showTrips && (
          <View style={styles.linkedTripBadge}>
            <Ionicons name="map-outline" size={12} color={colors.success} />
            <Text style={styles.linkedTripText}>Trip linked</Text>
            <TouchableOpacity onPress={() => setLinked(null)}>
              <Ionicons name="close-circle" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        {showTrips && (
          <View style={styles.tripDropdown}>
            <TouchableOpacity
              style={styles.tripOption}
              onPress={() => { setLinked(null); setShowTrips(false); }}
            >
              <Text style={styles.tripOptionText}>— None —</Text>
            </TouchableOpacity>
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tripOption, linkedTripId === t.id && styles.tripOptionActive]}
                onPress={() => { setLinked(t.id); setShowTrips(false); }}
              >
                <Text style={styles.tripOptionText}>
                  {t.originState} → {t.destinationState} · {formatDate(t.pickupAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
          placeholderTextColor={colors.textMuted}
          placeholder="Optional notes..."
        />
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Save Receipt</Text>
        }
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={styles.deleteBtnText}>Delete Receipt</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  reviewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#451a03",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewText: { color: colors.warning, fontSize: 13, flex: 1 },

  image: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  meta: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginBottom: spacing.md },

  field:      { marginBottom: spacing.md },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    padding: spacing.sm + 2,
    fontSize: 15,
  },

  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText:       { color: colors.textSecondary, fontSize: 12 },
  catPillTextActive: { color: "#fff", fontWeight: "600" },

  linkedTripBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#14532d",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: 4,
  },
  linkedTripText: { color: "#86efac", fontSize: 13, flex: 1 },

  tripDropdown: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 200,
  },
  tripOption: {
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tripOptionActive: { backgroundColor: "#1e3a5f" },
  tripOptionText:   { color: colors.textPrimary, fontSize: 13 },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { color: colors.danger, fontWeight: "600" },
});
