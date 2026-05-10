import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { centsToDisplay, formatDate } from "@/lib/utils";
import type { TripDoc } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

type Trip = TripDoc & { id: string };

export default function TripsScreen() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;
  const [trips, setTrips]   = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "trips"),
      where("userId", "==", uid),
      orderBy("pickupAt", "desc"),
      limit(100),
    );
    const unsub = onSnapshot(q, (s) => {
      setTrips(s.docs.map((d) => ({ id: d.id, ...d.data() } as Trip)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return (
    <View style={styles.root}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            : <EmptyState onPress={() => router.push("/trips/new")} />
        }
        renderItem={({ item: trip }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/trips/${trip.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.route}>
                {trip.originCity}, {trip.originState} → {trip.destinationCity}, {trip.destinationState}
              </Text>
              <Text style={styles.meta}>
                {formatDate(trip.pickupAt)} · {trip.totalMiles.toLocaleString()} mi total
              </Text>
              {trip.loadRef ? (
                <Text style={styles.ref}>Ref: {trip.loadRef}</Text>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end", minWidth: 70 }}>
              {trip.grossRevenueCents != null
                ? <Text style={styles.revenue}>{centsToDisplay(trip.grossRevenueCents)}</Text>
                : <Text style={styles.noRev}>No rate</Text>
              }
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginTop: 4 }} />
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/trips/new")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={empty.root}>
      <Text style={empty.emoji}>🗺️</Text>
      <Text style={empty.title}>No trips yet</Text>
      <Text style={empty.sub}>Log your first load to start tracking CPM and revenue.</Text>
      <TouchableOpacity style={empty.button} onPress={onPress}>
        <Text style={empty.buttonText}>Log a Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  route:   { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
  meta:    { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  ref:     { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  revenue: { color: colors.success, fontWeight: "600", fontSize: 14 },
  noRev:   { color: colors.textMuted, fontSize: 12 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

const empty = StyleSheet.create({
  root: { alignItems: "center", padding: spacing.xl, marginTop: 60 },
  emoji: { fontSize: 48, marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginBottom: 8 },
  sub:   { color: colors.textSecondary, fontSize: 14, textAlign: "center", marginBottom: spacing.lg },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
