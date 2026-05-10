import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import {
  INSPECTION_ITEMS, CATEGORIES, CATEGORY_LABELS,
  type InspectionCategory, type ItemStatus,
} from "@/lib/inspections";

const API_URL = "https://www.caretotruck.com/api/transcribe-inspection";

const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "hi", label: "हिंदी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
] as const;

type Lang = typeof LANGS[number]["code"];

type ItemState = {
  id: string;
  label: string;
  category: InspectionCategory;
  status: ItemStatus;
  notes: string | null;
  viaVoice: boolean;
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function NewInspectionScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ItemState[]>(
    INSPECTION_ITEMS.map((i) => ({ ...i, status: "pending", notes: null, viaVoice: false }))
  );
  const [collapsed, setCollapsed] = useState<Partial<Record<InspectionCategory, boolean>>>({});

  // Voice
  const [lang, setLang] = useState<Lang>("en");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Odometer + remarks
  const [mileage, setMileage] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission needed", "Allow microphone access to use voice inspection.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setRecording(true);
      setTranscript(null);
    } catch {
      setError("Could not start recording. Check microphone permissions.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    setRecording(false);
    try {
      await rec.stopAndUnloadAsync();
    } catch { /* already unloaded */ }
    const uri = rec.getURI();
    recordingRef.current = null;
    if (!uri) { setError("Recording failed — no audio captured."); return; }

    setTranscribing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const fd = new FormData();
      fd.append("audio", { uri, name: "inspection.m4a", type: "audio/m4a" } as any);
      fd.append("lang", lang);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcription failed.");
      setTranscript(data.transcript ?? "");

      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems((prev) => {
          const map = new Map(data.items.map((v: any) => [v.id, v]));
          return prev.map((item) => {
            const hit = map.get(item.id) as any;
            if (!hit) return item;
            return { ...item, status: hit.status, notes: hit.notes ?? null, viaVoice: true };
          });
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Transcription failed. Mark items manually.");
    } finally {
      setTranscribing(false);
    }
  }, [lang]);

  function setStatus(id: string, status: ItemStatus) {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status, viaVoice: false } : i));
  }

  async function handleSave() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      const docItems = items.map((i) => ({
        id: i.id, label: i.label, category: i.category,
        status: i.status, notes: i.notes,
      }));
      const passCount  = items.filter((i) => i.status === "pass").length;
      const failCount  = items.filter((i) => i.status === "fail").length;
      const skipCount  = items.filter((i) => i.status === "skip").length;

      const docRef = await addDoc(collection(db, "preTripInspections"), {
        userId: uid,
        truckId: null,
        inspectionDate: Timestamp.now(),
        items: docItems,
        overallStatus: failCount > 0 ? "fail" : "pass",
        passCount, failCount, skipCount,
        remarks: remarks.trim() || null,
        signedOffAt: serverTimestamp(),
        mileageAtInspection: mileage ? parseInt(mileage, 10) : null,
        mileageImageUrl: null,
        mileageStoragePath: null,
        voiceTranscript: transcript,
        schemaVersion: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.replace(`/inspections/${docRef.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save. Try again.");
      setSaving(false);
    }
  }

  const passCount    = items.filter((i) => i.status === "pass").length;
  const failCount    = items.filter((i) => i.status === "fail").length;
  const skipCount    = items.filter((i) => i.status === "skip").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Header counts */}
        <View style={s.countsRow}>
          {passCount > 0    && <View style={[s.chip, { backgroundColor: "#14532d" }]}><Text style={[s.chipText, { color: colors.success }]}>{passCount} pass</Text></View>}
          {failCount > 0    && <View style={[s.chip, { backgroundColor: "#450a0a" }]}><Text style={[s.chipText, { color: colors.danger }]}>{failCount} fail</Text></View>}
          {pendingCount > 0 && <View style={[s.chip, { backgroundColor: colors.surface }]}><Text style={[s.chipText, { color: colors.textMuted }]}>{pendingCount} pending</Text></View>}
        </View>

        {/* ── Voice section ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Voice Inspection</Text>
          <Text style={s.cardSub}>Record your walkaround — AI marks items automatically</Text>

          {/* Language picker */}
          <View style={s.langRow}>
            {LANGS.map(({ code, label }) => (
              <TouchableOpacity
                key={code}
                onPress={() => !recording && !transcribing && setLang(code)}
                style={[s.langPill, lang === code && s.langPillActive]}
              >
                <Text style={[s.langText, lang === code && s.langTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Record button */}
          <View style={{ alignItems: "center", marginTop: spacing.md }}>
            {!recording ? (
              <TouchableOpacity
                style={[s.micBtn, { backgroundColor: colors.warning }]}
                onPress={transcribing ? undefined : startRecording}
                disabled={transcribing}
              >
                <Ionicons name="mic" size={32} color="#000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.micBtn, { backgroundColor: colors.danger }]} onPress={stopRecording}>
                <Ionicons name="stop" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            {recording && (
              <Text style={s.timer}>{fmtTime(elapsed)}</Text>
            )}
          </View>

          {transcribing && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.md }}>
              <ActivityIndicator color={colors.warning} size="small" />
              <Text style={s.cardSub}>Analyzing your recording…</Text>
            </View>
          )}

          {transcript && !transcribing && (
            <View style={s.transcriptBox}>
              <Text style={s.transcriptLabel}>Transcript</Text>
              <Text style={s.transcriptText}>{transcript}</Text>
            </View>
          )}
        </View>

        {/* ── Checklist ── */}
        {CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          const catFail  = catItems.filter((i) => i.status === "fail").length;
          const catPass  = catItems.filter((i) => i.status === "pass").length;
          const isOpen   = !collapsed[cat];

          return (
            <View key={cat} style={s.card}>
              <TouchableOpacity
                style={s.catHeader}
                onPress={() => setCollapsed((p) => ({ ...p, [cat]: !p[cat] }))}
              >
                <Text style={s.catTitle}>{CATEGORY_LABELS[cat]}</Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  {catFail > 0 && <View style={[s.chip, { backgroundColor: "#450a0a" }]}><Text style={[s.chipText, { color: colors.danger }]}>{catFail} fail</Text></View>}
                  {catPass > 0 && catFail === 0 && <Text style={s.catProgress}>{catPass}/{catItems.length}</Text>}
                  <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              {isOpen && catItems.map((item) => (
                <View key={item.id} style={s.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemLabel}>{item.label}</Text>
                    {item.notes && <Text style={s.itemNotes}>{item.notes}</Text>}
                    {item.viaVoice && <Text style={s.voiceTag}>🎙 voice</Text>}
                  </View>
                  <View style={s.statusBtns}>
                    <TouchableOpacity
                      style={[s.statusBtn, item.status === "pass" && { backgroundColor: colors.success }]}
                      onPress={() => setStatus(item.id, "pass")}
                    >
                      <Ionicons name="checkmark" size={16} color={item.status === "pass" ? "#fff" : colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.statusBtn, item.status === "fail" && { backgroundColor: colors.danger }]}
                      onPress={() => setStatus(item.id, "fail")}
                    >
                      <Ionicons name="close" size={16} color={item.status === "fail" ? "#fff" : colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.statusBtn, item.status === "skip" && { backgroundColor: colors.border }]}
                      onPress={() => setStatus(item.id, "skip")}
                    >
                      <Ionicons name="play-skip-forward" size={14} color={item.status === "skip" ? colors.textPrimary : colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {/* ── Odometer ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Odometer Reading</Text>
          <TextInput
            value={mileage}
            onChangeText={setMileage}
            placeholder="Current mileage"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            style={s.input}
          />
        </View>

        {/* ── Remarks ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Remarks <Text style={{ color: colors.textMuted, fontWeight: "400" }}>(optional)</Text></Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Any notes about vehicle condition, defects, repairs needed…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
          />
        </View>

        {/* ── Summary ── */}
        <View style={[s.summary, { borderColor: failCount > 0 ? colors.danger + "55" : colors.success + "55", backgroundColor: failCount > 0 ? "#450a0a" : "#14532d33" }]}>
          <Ionicons
            name={failCount > 0 ? "warning" : "checkmark-circle"}
            size={22}
            color={failCount > 0 ? colors.danger : colors.success}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.summaryTitle, { color: failCount > 0 ? colors.danger : colors.success }]}>
              {failCount > 0
                ? `${failCount} defect${failCount !== 1 ? "s" : ""} found`
                : pendingCount > 0
                  ? `${pendingCount} items still pending`
                  : "All items checked — vehicle OK to operate"}
            </Text>
            <Text style={s.summaryMeta}>
              {passCount} passed · {failCount} failed · {skipCount} skipped · {pendingCount} pending
            </Text>
          </View>
        </View>

        {error && (
          <View style={s.errorBanner}>
            <Text style={{ color: "#fca5a5", fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* ── Sign off ── */}
        <TouchableOpacity
          style={[s.saveBtn, (saving || recording || transcribing) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving || recording || transcribing}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveBtnText}>Sign Off & Save</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: 40 },
  countsRow: { flexDirection: "row", gap: 6, marginBottom: spacing.md },
  chip: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: "700" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { color: colors.textPrimary, fontWeight: "600", fontSize: 14, marginBottom: 2 },
  cardSub:   { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },

  langRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: spacing.sm },
  langPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  langPillActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  langText:       { color: colors.textSecondary, fontSize: 13 },
  langTextActive: { color: "#000", fontWeight: "700" },

  micBtn: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  timer: { color: colors.danger, fontSize: 14, fontWeight: "600", marginTop: 8 },

  transcriptBox: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
  transcriptLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  transcriptText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

  catHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  catTitle:  { color: colors.textPrimary, fontWeight: "600", fontSize: 13, flex: 1 },
  catProgress: { color: colors.success, fontSize: 12 },

  itemRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  itemLabel: { color: colors.textPrimary, fontSize: 13 },
  itemNotes: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  voiceTag:  { color: colors.warning, fontSize: 10, marginTop: 2 },

  statusBtns: { flexDirection: "row", gap: 4 },
  statusBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },

  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, color: colors.textPrimary,
    padding: spacing.sm + 2, fontSize: 15, marginTop: spacing.sm,
  },

  summary: {
    flexDirection: "row", gap: spacing.sm, alignItems: "flex-start",
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  summaryTitle: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  summaryMeta:  { color: colors.textMuted, fontSize: 12 },

  errorBanner: {
    backgroundColor: "#450a0a", borderRadius: radius.sm,
    padding: spacing.sm, marginBottom: spacing.md,
  },
  saveBtn: {
    backgroundColor: colors.warning, borderRadius: radius.md,
    paddingVertical: 14, alignItems: "center", marginTop: spacing.sm,
  },
  saveBtnText: { color: "#000", fontWeight: "700", fontSize: 16 },
});
