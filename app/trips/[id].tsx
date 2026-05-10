import { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc, onSnapshot, collection, query, where, orderBy,
  updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { centsToDisplay, cpmDisplay, formatDate, shortDate } from "@/lib/utils";
import type { TripDoc, ReceiptDoc } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

type Trip    = TripDoc    & { id: string };
type Receipt = ReceiptDoc & { id: string };

const VARIABLE_CATS = new Set([
  "fuel_diesel", "fuel_def", "maintenance_repair", "maintenance_oil_change",
  "maintenance_tires", "maintenance_parts", "tolls", "parking", "scale_weighing",
  "lumper_fee", "truck_wash", "shop_supplies",
]);

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={stat.root}>
      <Text style={stat.label}>{label}</Text>
      <Text style={[stat.value, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  root:  { flex: 1, alignItems: "center", paddingVertical: spacing.sm },
  label: { color: colors.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  value: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
});

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const uid = auth.currentUser?.uid;

  const [trip, setTrip]         = useState<Trip | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!id || !uid) return;

    const unsub1 = onSnapshot(doc(db, "trips", id), (s) => {
      if (s.exists()) setTrip({ id: s.id, ...s.data() } as Trip);
      setLoading(false);
    });

    const unsub2 = onSnapshot(
      query(collection(db, "receipts"),
        where("userId", "==", uid),
        where("tripId", "==", id),
        orderBy("transactionDate", "desc")),
      (s) => setReceipts(s.docs.map((d) => ({ id: d.id, ...d.data() } as Receipt)))
    );

    return () => { unsub1(); unsub2(); };
  }, [id, uid]);

  const metrics = useMemo(() => {
    if (!trip) return null;
    const totalExpenses = receipts.reduce((s, r) => s + r.totalCents, 0);
    const varExpenses   = receipts.filter((r) => VARIABLE_CATS.has(r.category)).reduce((s, r) => s + r.totalCents, 0);
    const cpm = trip.totalMiles > 0 ? totalExpenses / trip.totalMiles : null;
    const rpm = trip.loadedMiles > 0 && trip.grossRevenueCents
      ? trip.grossRevenueCents / trip.loadedMiles
      : null;
    const margin = rpm && cpm ? rpm - cpm : null;
    const netProfit = trip.grossRevenueCents != null ? trip.grossRevenueCents - totalExpenses : null;
    return { totalExpenses, varExpenses, cpm, rpm, margin, netProfit };
  }, [trip, receipts]);

  // Category breakdown
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of receipts) {
      map.set(r.category, (map.get(r.category) ?? 0) + r.totalCents);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [receipts]);

  async function handleDelete() {
    Alert.alert("Delete Trip", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "trips", id!));
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

  if (!trip) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textSecondary }}>Trip not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Route header */}
      <View style={styles.routeCard}>
        <Text style={styles.routeText}>
          {trip.originCity}, {trip.originState}
        </Text>
        <Ionicons name="arrow-forward" size={18} color={colors.textMuted} style={{ marginHorizontal: 8 }} />
        <Text style={styles.routeText}>
          {trip.destinationCity}, {trip.destinationState}
        </Text>
      </View>
      <Text style={styles.dateMeta}>
        {formatDate(trip.pickupAt)}{trip.deliveredAt ? ` → ${shortDate(trip.deliveredAt)}` : ""}
        {trip.loadRef ? ` · Ref: ${trip.loadRef}` : ""}
      </Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat label="Total Miles" value={trip.totalMiles.toLocaleString()} />
        <Stat label="Loaded" value={trip.loadedMiles.toLocaleString()} />
        <Stat label="Deadhead" value={trip.deadheadMiles.toLocaleString()} />
      </View>

      {/* Revenue & CPM */}
      {metrics && (
        <View style={styles.metricsGrid}>
          <View style={[styles.metricTile, { flex: 1 }]}>
            <Text style={styles.metricLabel}>Revenue</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {trip.grossRevenueCents != null ? centsToDisplay(trip.grossRevenueCents) : "—"}
            </Text>
          </View>
          <View style={[styles.metricTile, { flex: 1 }]}>
            <Text style={styles.metricLabel}>Trip CPM</Text>
            <Text style={styles.metricValue}>
              {metrics.cpm ? cpmDisplay(metrics.cpm) : "—"}
            </Text>
          </View>
          <View style={[styles.metricTile, { flex: 1 }]}>
            <Text style={styles.metricLabel}>Net Profit</Text>
            <Text style={[styles.metricValue, {
              color: metrics.netProfit != null
                ? metrics.netProfit >= 0 ? colors.success : colors.danger
                : colors.textPrimary,
            }]}>
              {metrics.netProfit != null ? centsToDisplay(metrics.netProfit) : "—"}
            </Text>
          </View>
          <View style={[styles.metricTile, { flex: 1 }]}>
            <Text style={styles.metricLabel}>Margin/mi</Text>
            <Text style={[styles.metricValue, {
              color: metrics.margin != null
                ? metrics.margin > 0 ? colors.success : colors.danger
                : colors.textPrimary,
            }]}>
              {metrics.margin ? cpmDisplay(metrics.margin) : "—"}
            </Text>
          </View>
        </View>
      )}

      {/* Notes */}
      {trip.notes && (
        <View style={styles.notesCard}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.notes}>{trip.notes}</Text>
        </View>
      )}

      {/* Expenses */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>Expenses ({receipts.length})</Text>
        <TouchableOpacity onPress={() => router.push("/receipts/capture")}>
          <View style={styles.addReceiptBtn}>
            <Ionicons name="camera" size={14} color={colors.primary} />
            <Text style={styles.addReceiptText}>Scan</Text>
          </View>
        </TouchableOpacity>
      </View>

      {receipts.length === 0 ? (
        <View style={styles.emptyExpenses}>
          <Text style={styles.emptyExpensesText}>No receipts linked to this trip.</Text>
          <TouchableOpacity onPress={() => router.push("/receipts/capture")}>
            <Text style={{ color: colors.primary, fontSize: 13, marginTop: 4 }}>Scan a receipt →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Category breakdown */}
          {breakdown.map(([cat, cents]) => {
            const total = metrics?.totalExpenses ?? 1;
            const pct = Math.round((cents / total) * 100);
            return (
              <View key={cat} style={styles.breakdownRow}>
                <Text style={styles.breakdownCat}>{cat.replace(/_/g, " ")}</Text>
                <View style={styles.breakdownBarBg}>
                  <View style={[styles.breakdownBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.breakdownAmt}>{centsToDisplay(cents)}</Text>
              </View>
            );
          })}

          {/* Receipt list */}
          <View style={{ marginTop: spacing.sm }}>
            {receipts.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.receiptRow}
                onPress={() => router.push(`/receipts/${r.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.receiptMerchant}>{r.merchantName}</Text>
                  <Text style={styles.receiptMeta}>
                    {shortDate(r.transactionDate)} · {r.category.replace(/_/g, " ")}
                  </Text>
                </View>
                <Text style={styles.receiptAmt}>{centsToDisplay(r.totalCents)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={styles.deleteBtnText}>Delete Trip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeText: { color: colors.textPrimary, fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  dateMeta:  { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: spacing.md },

  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  metricTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    margin: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: "45%",
  },
  metricLabel: { color: colors.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  metricValue: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },

  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  notes: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },

  sectionRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm, marginTop: spacing.md },
  sectionLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

  addReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addReceiptText: { color: colors.primary, fontSize: 12, fontWeight: "600" },

  emptyExpenses: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  emptyExpensesText: { color: colors.textMuted, fontSize: 13 },

  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  breakdownCat: { color: colors.textSecondary, fontSize: 11, width: 120 },
  breakdownBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: spacing.sm,
  },
  breakdownBarFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  breakdownAmt: { color: colors.textSecondary, fontSize: 11, width: 60, textAlign: "right" },

  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  receiptMerchant: { color: colors.textPrimary, fontSize: 14 },
  receiptMeta:     { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  receiptAmt:      { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { color: colors.danger, fontWeight: "600" },
});
