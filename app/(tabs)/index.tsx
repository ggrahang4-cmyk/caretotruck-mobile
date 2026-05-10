import { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection, doc, onSnapshot, query, where,
  orderBy, limit, Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { centsToDisplay, cpmDisplay, formatDate } from "@/lib/utils";
import type { UserDoc, TripDoc, ReceiptDoc, FixedCostDoc } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

// ── helpers ──────────────────────────────────────────────────────────────────

function getQuarter(d: Date): string {
  return `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
}

function currentQuarterBounds(): [Date, Date] {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const start = new Date(now.getFullYear(), (q - 1) * 3, 1);
  const end   = new Date(now.getFullYear(), q * 3, 1);
  return [start, end];
}

const VARIABLE_CATS = new Set([
  "fuel_diesel", "fuel_def", "maintenance_repair", "maintenance_oil_change",
  "maintenance_tires", "maintenance_parts", "tolls", "parking", "scale_weighing",
  "lumper_fee", "truck_wash", "shop_supplies",
]);

// ── sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <View style={[card.root, { flex: 1 }]}>
      <Text style={card.label}>{label}</Text>
      <Text style={[card.value, accent ? { color: accent } : {}]}>{value}</Text>
      {sub ? <Text style={card.sub}>{sub}</Text> : null}
    </View>
  );
}

const card = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.xs / 2,
  },
  label: { color: colors.textSecondary, fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { color: colors.textPrimary, fontSize: 22, fontWeight: "700" },
  sub:   { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={qa.root} onPress={onPress}>
      <Text style={qa.icon}>{icon}</Text>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const qa = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    flex: 1,
    margin: spacing.xs / 2,
  },
  icon: { fontSize: 24, marginBottom: 4 },
  label: { color: colors.textPrimary, fontSize: 12, fontWeight: "500", textAlign: "center" },
});

// ── main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;

  const [user, setUser]         = useState<UserDoc | null>(null);
  const [trips, setTrips]       = useState<(TripDoc & { id: string })[]>([]);
  const [receipts, setReceipts] = useState<(ReceiptDoc & { id: string })[]>([]);
  const [fixedCosts, setFixed]  = useState<FixedCostDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(doc(db, "users", uid), (s) => {
      if (s.exists()) setUser(s.data() as UserDoc);
    }));

    const [qStart, qEnd] = currentQuarterBounds();
    unsubs.push(onSnapshot(
      query(collection(db, "trips"),
        where("userId", "==", uid),
        where("pickupAt", ">=", Timestamp.fromDate(qStart)),
        where("pickupAt", "<",  Timestamp.fromDate(qEnd)),
        orderBy("pickupAt", "desc"),
        limit(100)),
      (s) => setTrips(s.docs.map((d) => ({ id: d.id, ...d.data() } as TripDoc & { id: string })))
    ));

    unsubs.push(onSnapshot(
      query(collection(db, "receipts"),
        where("userId", "==", uid),
        where("transactionDate", ">=", Timestamp.fromDate(qStart)),
        where("transactionDate", "<",  Timestamp.fromDate(qEnd)),
        orderBy("transactionDate", "desc"),
        limit(200)),
      (s) => setReceipts(s.docs.map((d) => ({ id: d.id, ...d.data() } as ReceiptDoc & { id: string })))
    ));

    unsubs.push(onSnapshot(
      query(collection(db, "fixedCosts"), where("userId", "==", uid)),
      (s) => setFixed(s.docs.map((d) => d.data() as FixedCostDoc))
    ));

    return () => unsubs.forEach((u) => u());
  }, [uid]);

  const metrics = useMemo(() => {
    const totalMiles    = trips.reduce((s, t) => s + t.totalMiles, 0);
    const loadedMiles   = trips.reduce((s, t) => s + t.loadedMiles, 0);
    const grossRevenue  = trips.reduce((s, t) => s + (t.grossRevenueCents ?? 0), 0);

    const monthlyFixed  = fixedCosts.reduce((s, f) => s + f.monthlyAmountCents, 0);
    const varExpenses   = receipts
      .filter((r) => VARIABLE_CATS.has(r.category))
      .reduce((s, r) => s + r.totalCents, 0);

    const months = 3; // quarter
    const totalCost = monthlyFixed * months + varExpenses;
    const cpm = totalMiles > 0 ? totalCost / totalMiles : null;
    const rpm = loadedMiles > 0 ? grossRevenue / loadedMiles : null;
    const margin = rpm && cpm ? rpm - cpm : null;
    const netProfit = grossRevenue - totalCost;

    const targetCpm = user?.targetCpmCents ?? null;
    const variance  = cpm && targetCpm ? cpm - targetCpm : null;

    return { totalMiles, loadedMiles, grossRevenue, cpm, rpm, margin, netProfit, variance, targetCpm, totalCost };
  }, [trips, receipts, fixedCosts, user]);

  const recentTrips = trips.slice(0, 3);

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  const now = new Date();
  const qLabel = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Overview · {qLabel}</Text>
      </View>

      {/* CPM Row */}
      <View style={styles.row}>
        <MetricCard
          label="Actual CPM"
          value={metrics.cpm ? cpmDisplay(metrics.cpm) : "—"}
          sub={`${metrics.totalMiles.toLocaleString()} mi driven`}
          accent={
            metrics.variance
              ? metrics.variance > 0 ? colors.danger : colors.success
              : undefined
          }
        />
        <MetricCard
          label="Target CPM"
          value={metrics.targetCpm ? cpmDisplay(metrics.targetCpm) : "Not set"}
          sub={
            metrics.variance
              ? `${metrics.variance > 0 ? "+" : ""}${cpmDisplay(metrics.variance)} vs target`
              : undefined
          }
        />
      </View>

      {/* Revenue Row */}
      <View style={styles.row}>
        <MetricCard
          label="Gross Revenue"
          value={centsToDisplay(metrics.grossRevenue)}
          sub={`${trips.length} trips`}
        />
        <MetricCard
          label="Net Profit"
          value={centsToDisplay(metrics.netProfit)}
          accent={metrics.netProfit >= 0 ? colors.success : colors.danger}
        />
      </View>

      {/* RPM / Margin Row */}
      <View style={styles.row}>
        <MetricCard
          label="RPM"
          value={metrics.rpm ? cpmDisplay(metrics.rpm) : "—"}
          sub="revenue per loaded mile"
        />
        <MetricCard
          label="Margin/mi"
          value={metrics.margin ? cpmDisplay(metrics.margin) : "—"}
          accent={
            metrics.margin
              ? metrics.margin > 0 ? colors.success : colors.danger
              : undefined
          }
        />
      </View>

      {/* Total Expenses */}
      <View style={[card.root, { margin: spacing.xs / 2 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={card.label}>Total Expenses</Text>
          <Text style={{ color: colors.warning, fontSize: 16, fontWeight: "600" }}>
            {centsToDisplay(metrics.totalCost)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={card.sub}>{receipts.length} receipts</Text>
          <Text style={card.sub}>{metrics.loadedMiles.toLocaleString()} loaded mi</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Quick Actions</Text>
      <View style={styles.row}>
        <QuickAction icon="🗺️" label="Log Trip" onPress={() => router.push("/trips/new")} />
        <QuickAction icon="📷" label="Scan Receipt" onPress={() => router.push("/receipts/capture")} />
        <QuickAction icon="📋" label="All Trips" onPress={() => router.push("/(tabs)/trips")} />
      </View>

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/trips")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={tripCard.root}
              onPress={() => router.push(`/trips/${trip.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={tripCard.route}>
                  {trip.originState} → {trip.destinationState}
                </Text>
                <Text style={tripCard.meta}>
                  {formatDate(trip.pickupAt)} · {trip.totalMiles.toLocaleString()} mi
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {trip.grossRevenueCents
                  ? <Text style={tripCard.revenue}>{centsToDisplay(trip.grossRevenueCents)}</Text>
                  : <Text style={tripCard.noRev}>No rate</Text>
                }
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  seeAll: { color: colors.primary, fontSize: 13 },
  row: { flexDirection: "row", marginHorizontal: -spacing.xs / 2, marginBottom: spacing.xs },
});

const tripCard = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  route: { color: colors.textPrimary, fontWeight: "600", fontSize: 15 },
  meta:  { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  revenue: { color: colors.success, fontWeight: "600", fontSize: 14 },
  noRev: { color: colors.textMuted, fontSize: 13 },
});
