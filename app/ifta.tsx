import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

// ── Helpers ───────────────────────────────────────────────────────────────────
function recentQuarters(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1;
  for (let i = 0; i < n; i++) {
    out.push(`${y}-Q${q}`);
    q--;
    if (q === 0) { q = 4; y--; }
  }
  return out;
}

function quarterLabel(q: string): string {
  const [year, qn] = q.split("-");
  const num = parseInt(qn.slice(1), 10);
  const ranges = ["Jan – Mar", "Apr – Jun", "Jul – Sep", "Oct – Dec"];
  return `Q${num} ${year} · ${ranges[num - 1] ?? ""}`;
}

const QUARTERS = recentQuarters(6);

type PackMeta = {
  status: "ready" | "filed" | "draft";
  totalMiles: number;
  totalGallons: number;
  rowCount: number;
} | null | undefined; 

function usePackMeta(userId: string | undefined, quarter: string): PackMeta {
  const [meta, setMeta] = useState<PackMeta>(undefined);
  useEffect(() => {
    if (!userId) return;
    const ref = doc(db, "iftaPrepPacks", `${userId}_${quarter}`);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) { setMeta(null); return; }
      const d = snap.data();
      setMeta({
        status: d.status || "ready",
        totalMiles: d.totalMiles || 0,
        totalGallons: d.totalGallons || 0,
        rowCount: Array.isArray(d.rows) ? d.rows.length : 0,
      });
    }, () => setMeta(null));
  }, [userId, quarter]);
  return meta;
}

function QuarterRow({ quarter, userId }: { quarter: string; userId: string }) {
  const meta = usePackMeta(userId, quarter);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const fn = httpsCallable(functions, "generateIftaPrepPack");
      await fn({ quarter });
    } catch (e) {
      Alert.alert("Generation Failed", (e as Error).message || "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{quarterLabel(quarter)}</Text>
        {meta && (
          <Text style={styles.rowStats}>
            {meta.totalMiles.toLocaleString()} mi · {meta.totalGallons.toFixed(1)} gal · {meta.rowCount} state{meta.rowCount !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
      <View style={styles.rowAction}>
        {meta?.status === "filed" ? (
          <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>Filed</Text></View>
        ) : meta?.status === "ready" ? (
          <View style={styles.badgeInfo}><Text style={styles.badgeInfoText}>Ready</Text></View>
        ) : null}

        {meta === undefined ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <TouchableOpacity 
            style={[styles.btn, generating && { opacity: 0.7 }]} 
            onPress={generate} 
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color={colors.surface} size="small" style={{ marginRight: 6 }} />
            ) : null}
            <Text style={styles.btnText}>
              {meta === null ? "Generate" : "Re-generate"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function IftaScreen() {
  const uid = auth.currentUser?.uid;

  if (!uid) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
        <Text style={styles.infoText}>
          Generate the state-by-state miles and gallons summary for your quarterly IFTA return. 
          The formula is: taxable gallons = state miles ÷ avg fleet MPG.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Quarters</Text>
      <View style={styles.list}>
        {QUARTERS.map((q) => (
          <QuarterRow key={q} quarter={q} userId={uid} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  infoBox: { flexDirection: "row", backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl },
  infoText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginBottom: spacing.sm, marginLeft: spacing.xs },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowInfo: { flex: 1 },
  rowLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: "600", marginBottom: 2 },
  rowStats: { color: colors.textMuted, fontSize: 12 },
  rowAction: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badgeSuccess: { backgroundColor: "rgba(34, 197, 94, 0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeSuccessText: { color: "#22c55e", fontSize: 11, fontWeight: "600" },
  badgeInfo: { backgroundColor: "rgba(59, 130, 246, 0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeInfoText: { color: "#3b82f6", fontSize: 11, fontWeight: "600" },
  btn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center" },
  btnText: { color: colors.surface, fontSize: 13, fontWeight: "600" },
});
