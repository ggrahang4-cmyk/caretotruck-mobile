import { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { centsToDisplay, shortDate } from "@/lib/utils";
import type { ReceiptDoc } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";

type Receipt = ReceiptDoc & { id: string };

const STATUS_COLOR: Record<string, string> = {
  processed:     colors.success,
  manual_review: colors.warning,
  user_corrected: colors.primary,
  pending:       colors.textMuted,
};

export default function ReceiptsScreen() {
  const router = useRouter();
  const uid = auth.currentUser?.uid;
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "receipts"),
      where("userId", "==", uid),
      orderBy("transactionDate", "desc"),
      limit(100),
    );
    const unsub = onSnapshot(q, (s) => {
      setReceipts(s.docs.map((d) => ({ id: d.id, ...d.data() } as Receipt)));
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  return (
    <View style={styles.root}>
      <FlatList
        data={receipts}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            : <EmptyState onPress={() => router.push("/receipts/capture")} />
        }
        renderItem={({ item: r }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/receipts/${r.id}`)}
          >
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.merchant}>{r.merchantName}</Text>
              <Text style={styles.meta}>
                {shortDate(r.transactionDate)} · {r.category.replace(/_/g, " ")}
              </Text>
              {r.tripId ? (
                <View style={styles.tripPill}>
                  <Text style={styles.tripPillText}>trip linked</Text>
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.amount}>{centsToDisplay(r.totalCents)}</Text>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[r.ocrStatus] ?? colors.textMuted }]} />
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/receipts/capture")}>
        <Ionicons name="camera" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={empty.root}>
      <Text style={empty.emoji}>🧾</Text>
      <Text style={empty.title}>No receipts yet</Text>
      <Text style={empty.sub}>Scan a receipt to start tracking deductible expenses.</Text>
      <TouchableOpacity style={empty.button} onPress={onPress}>
        <Text style={empty.buttonText}>Scan Receipt</Text>
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
    gap: spacing.sm,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  merchant: { color: colors.textPrimary, fontWeight: "600", fontSize: 14 },
  meta:     { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tripPill: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#14532d",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tripPillText: { color: "#86efac", fontSize: 10, fontWeight: "600" },
  amount:    { color: colors.textPrimary, fontWeight: "700", fontSize: 14 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
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
