import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { formatDate } from "@/lib/utils";
import { CATEGORY_LABELS, type InspectionCategory } from "@/lib/inspections";

type ItemDoc = {
  id: string;
  label: string;
  category: InspectionCategory;
  status: "pass" | "fail" | "skip" | "pending";
  notes: string | null;
};

type InspectionDoc = {
  id: string;
  inspectionDate: any;
  overallStatus: "pass" | "fail";
  passCount: number;
  failCount: number;
  skipCount: number;
  remarks: string | null;
  voiceTranscript: string | null;
  mileageAtInspection: number | null;
  items: ItemDoc[];
};

const STATUS_ICON: Record<string, { name: any; color: string }> = {
  pass:    { name: "checkmark-circle", color: colors.success },
  fail:    { name: "close-circle",     color: colors.danger },
  skip:    { name: "remove-circle",    color: colors.textMuted },
  pending: { name: "ellipse-outline",  color: colors.textMuted },
};

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [inspection, setInspection] = useState<InspectionDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, "preTripInspections", id), (snap) => {
      setInspection(snap.exists() ? { id: snap.id, ...snap.data() } as InspectionDoc : null);
      setLoading(false);
    });
  }, [id]);

  function handleDelete() {
    Alert.alert("Delete Inspection", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          if (id) await deleteDoc(doc(db, "preTripInspections", id));
          router.replace("/inspections");
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />;
  if (!inspection) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <Text style={{ color: colors.textMuted }}>Inspection not found.</Text>
    </View>
  );

  const categories = [...new Set(inspection.items.map((i) => i.category))] as InspectionCategory[];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.container}>

      {/* Overall status banner */}
      <View style={[s.banner, { backgroundColor: inspection.overallStatus === "pass" ? "#14532d" : "#450a0a", borderColor: inspection.overallStatus === "pass" ? colors.success + "44" : colors.danger + "44" }]}>
        <Ionicons
          name={inspection.overallStatus === "pass" ? "checkmark-circle" : "warning"}
          size={28}
          color={inspection.overallStatus === "pass" ? colors.success : colors.danger}
        />
        <View style={{ flex: 1 }}>
          <Text style={[s.bannerTitle, { color: inspection.overallStatus === "pass" ? colors.success : colors.danger }]}>
            {inspection.overallStatus === "pass" ? "Vehicle OK to Operate" : "Defects Found"}
          </Text>
          <Text style={s.bannerDate}>{formatDate(inspection.inspectionDate)}</Text>
        </View>
      </View>

      {/* Summary counts */}
      <View style={s.countsRow}>
        <View style={s.countCard}>
          <Text style={[s.countNum, { color: colors.success }]}>{inspection.passCount}</Text>
          <Text style={s.countLabel}>Pass</Text>
        </View>
        <View style={s.countCard}>
          <Text style={[s.countNum, { color: colors.danger }]}>{inspection.failCount}</Text>
          <Text style={s.countLabel}>Fail</Text>
        </View>
        <View style={s.countCard}>
          <Text style={[s.countNum, { color: colors.textMuted }]}>{inspection.skipCount}</Text>
          <Text style={s.countLabel}>Skip</Text>
        </View>
        {inspection.mileageAtInspection && (
          <View style={s.countCard}>
            <Text style={[s.countNum, { color: colors.textPrimary }]}>{inspection.mileageAtInspection.toLocaleString()}</Text>
            <Text style={s.countLabel}>Miles</Text>
          </View>
        )}
      </View>

      {/* Voice transcript */}
      {inspection.voiceTranscript && (
        <View style={s.card}>
          <Text style={s.cardTitle}>🎙 Voice Transcript</Text>
          <Text style={s.transcriptText}>{inspection.voiceTranscript}</Text>
        </View>
      )}

      {/* Remarks */}
      {inspection.remarks && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Remarks</Text>
          <Text style={s.metaText}>{inspection.remarks}</Text>
        </View>
      )}

      {/* Items by category */}
      {categories.map((cat) => {
        const catItems = inspection.items.filter((i) => i.category === cat);
        const failures = catItems.filter((i) => i.status === "fail");
        return (
          <View key={cat} style={s.card}>
            <View style={s.catHeader}>
              <Text style={s.catTitle}>{CATEGORY_LABELS[cat] ?? cat}</Text>
              {failures.length > 0 && (
                <View style={[s.chip, { backgroundColor: "#450a0a" }]}>
                  <Text style={[s.chipText, { color: colors.danger }]}>{failures.length} fail</Text>
                </View>
              )}
            </View>
            {catItems.map((item) => {
              const ic = STATUS_ICON[item.status] ?? STATUS_ICON.pending;
              return (
                <View key={item.id} style={s.itemRow}>
                  <Ionicons name={ic.name} size={18} color={ic.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemLabel}>{item.label}</Text>
                    {item.notes && <Text style={s.itemNotes}>{item.notes}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Delete */}
      <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
        <Text style={s.deleteBtnText}>Delete Inspection</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, paddingBottom: 40 },

  banner: {
    flexDirection: "row", gap: spacing.sm, alignItems: "center",
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  bannerTitle: { fontSize: 15, fontWeight: "700" },
  bannerDate:  { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  countsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  countCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, alignItems: "center",
  },
  countNum:   { fontSize: 22, fontWeight: "700" },
  countLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  cardTitle:      { color: colors.textPrimary, fontWeight: "600", fontSize: 13, marginBottom: spacing.sm },
  transcriptText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
  metaText:       { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },

  catHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  catTitle:  { color: colors.textPrimary, fontWeight: "600", fontSize: 13 },
  chip:      { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  chipText:  { fontSize: 11, fontWeight: "700" },

  itemRow: {
    flexDirection: "row", gap: spacing.sm, alignItems: "flex-start",
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border,
  },
  itemLabel: { color: colors.textPrimary, fontSize: 13 },
  itemNotes: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  deleteBtn: {
    flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: colors.danger + "44", borderRadius: radius.md,
    paddingVertical: 12, marginTop: spacing.sm,
  },
  deleteBtnText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
});
