import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { formatDate } from "@/lib/utils";

type Inspection = {
  id: string;
  inspectionDate: any;
  overallStatus: "pass" | "fail";
  passCount: number;
  failCount: number;
  skipCount: number;
  voiceTranscript?: string | null;
};

export default function InspectionsScreen() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "preTripInspections"),
      where("userId", "==", uid),
      orderBy("inspectionDate", "desc"),
      limit(50),
    );
    return onSnapshot(q, (snap) => {
      setInspections(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Inspection)));
      setLoading(false);
    });
  }, [uid]);

  return (
    <View style={s.root}>
      <FlatList
        data={inspections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            : <EmptyState onPress={() => router.push("/inspections/new")} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/inspections/${item.id}`)}>
            <View style={[s.statusDot, { backgroundColor: item.overallStatus === "pass" ? colors.success : colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.date}>{formatDate(item.inspectionDate)}</Text>
              <Text style={s.counts}>
                {item.passCount} pass · {item.failCount} fail · {item.skipCount} skip
              </Text>
              {item.voiceTranscript && (
                <Text style={s.voice} numberOfLines={1}>🎙 Voice recorded</Text>
              )}
            </View>
            <View style={[s.badge, { backgroundColor: item.overallStatus === "pass" ? "#14532d" : "#450a0a" }]}>
              <Text style={[s.badgeText, { color: item.overallStatus === "pass" ? colors.success : colors.danger }]}>
                {item.overallStatus.toUpperCase()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.fab} onPress={() => router.push("/inspections/new")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={e.root}>
      <Text style={e.emoji}>🚛</Text>
      <Text style={e.title}>No inspections yet</Text>
      <Text style={e.sub}>Record your first pre-trip walkaround to stay DOT-ready.</Text>
      <TouchableOpacity style={e.btn} onPress={onPress}>
        <Text style={e.btnText}>Start Inspection</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
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
    gap: spacing.sm,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  date:      { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
  counts:    { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  voice:     { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  badge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});

const e = StyleSheet.create({
  root:    { alignItems: "center", padding: spacing.xl, marginTop: 60 },
  emoji:   { fontSize: 48, marginBottom: spacing.md },
  title:   { color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginBottom: 8 },
  sub:     { color: colors.textSecondary, fontSize: 14, textAlign: "center", marginBottom: spacing.lg },
  btn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  btnText: { color: "#fff", fontWeight: "600" },
});
