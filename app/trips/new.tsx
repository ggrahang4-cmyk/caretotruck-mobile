import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={field.root}>
      <Text style={field.label}>{label}</Text>
      {children}
    </View>
  );
}

const field = StyleSheet.create({
  root:  { marginBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: 12, marginBottom: 6 },
});

function StyledInput({ value, onChangeText, placeholder, keyboardType, multiline }: {
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[input.base, multiline && input.multi]}
    />
  );
}

const input = StyleSheet.create({
  base: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    padding: spacing.sm + 2,
    fontSize: 15,
  },
  multi: { minHeight: 80, textAlignVertical: "top" },
});

export default function NewTripScreen() {
  const router = useRouter();

  const [originCity, setOriginCity]       = useState("");
  const [originState, setOriginState]     = useState("TX");
  const [destCity, setDestCity]           = useState("");
  const [destState, setDestState]         = useState("TX");
  const [totalMiles, setTotalMiles]       = useState("");
  const [loadedMiles, setLoadedMiles]     = useState("");
  const [grossRevenue, setGrossRevenue]   = useState("");
  const [pickupDate, setPickupDate]       = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");
  const [loadRef, setLoadRef]             = useState("");
  const [notes, setNotes]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const deadhead = (() => {
    const t = parseFloat(totalMiles);
    const l = parseFloat(loadedMiles);
    if (!isNaN(t) && !isNaN(l) && t >= l) return t - l;
    return null;
  })();

  async function handleSave() {
    setError(null);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!originCity.trim() || !destCity.trim()) {
      setError("Origin and destination cities are required.");
      return;
    }
    const tMiles = parseFloat(totalMiles);
    const lMiles = parseFloat(loadedMiles);
    if (isNaN(tMiles) || tMiles <= 0) { setError("Enter valid total miles."); return; }
    if (isNaN(lMiles) || lMiles <= 0) { setError("Enter valid loaded miles."); return; }
    if (lMiles > tMiles) { setError("Loaded miles cannot exceed total miles."); return; }

    const pickupTs = pickupDate
      ? Timestamp.fromDate(new Date(pickupDate))
      : Timestamp.now();

    const deliveredTs = deliveredDate
      ? Timestamp.fromDate(new Date(deliveredDate))
      : null;

    const revCents = grossRevenue.trim()
      ? Math.round(parseFloat(grossRevenue.replace(/[$,]/g, "")) * 100)
      : null;

    setLoading(true);
    try {
      const ref = await addDoc(collection(db, "trips"), {
        userId: uid,
        truckId: null,
        loadRef: loadRef.trim() || null,
        originCity: originCity.trim(),
        originState,
        destinationCity: destCity.trim(),
        destinationState: destState,
        pickupAt: pickupTs,
        deliveredAt: deliveredTs,
        totalMiles: tMiles,
        loadedMiles: lMiles,
        deadheadMiles: tMiles - lMiles,
        grossRevenueCents: revCents,
        notes: notes.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
      });
      router.replace(`/trips/${ref.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save trip.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBanner}>
            <Text style={{ color: "#fca5a5", fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <Text style={styles.section}>Origin</Text>
        <Field label="City">
          <StyledInput value={originCity} onChangeText={setOriginCity} placeholder="Chicago" />
        </Field>
        <Field label="State">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 0 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {US_STATES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statePill, originState === s && styles.statePillActive]}
                  onPress={() => setOriginState(s)}
                >
                  <Text style={[styles.statePillText, originState === s && styles.statePillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Field>

        <Text style={styles.section}>Destination</Text>
        <Field label="City">
          <StyledInput value={destCity} onChangeText={setDestCity} placeholder="Dallas" />
        </Field>
        <Field label="State">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {US_STATES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statePill, destState === s && styles.statePillActive]}
                  onPress={() => setDestState(s)}
                >
                  <Text style={[styles.statePillText, destState === s && styles.statePillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </Field>

        <Text style={styles.section}>Miles</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="Total Miles">
              <StyledInput value={totalMiles} onChangeText={setTotalMiles} keyboardType="decimal-pad" placeholder="500" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Loaded Miles">
              <StyledInput value={loadedMiles} onChangeText={setLoadedMiles} keyboardType="decimal-pad" placeholder="480" />
            </Field>
          </View>
        </View>
        {deadhead !== null && (
          <Text style={styles.deadhead}>
            Deadhead: {deadhead.toFixed(0)} mi ({totalMiles ? ((deadhead / parseFloat(totalMiles)) * 100).toFixed(1) : 0}%)
          </Text>
        )}

        <Text style={styles.section}>Revenue & Dates</Text>
        <Field label="Gross Revenue ($)">
          <StyledInput value={grossRevenue} onChangeText={setGrossRevenue} keyboardType="decimal-pad" placeholder="2500.00" />
        </Field>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="Pickup Date (YYYY-MM-DD)">
              <StyledInput value={pickupDate} onChangeText={setPickupDate} placeholder="2026-05-01" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Delivered (YYYY-MM-DD)">
              <StyledInput value={deliveredDate} onChangeText={setDeliveredDate} placeholder="2026-05-02" />
            </Field>
          </View>
        </View>

        <Text style={styles.section}>Details</Text>
        <Field label="Load / Reference #">
          <StyledInput value={loadRef} onChangeText={setLoadRef} placeholder="Optional" />
        </Field>
        <Field label="Notes">
          <StyledInput value={notes} onChangeText={setNotes} multiline placeholder="Any notes about this load..." />
        </Field>

        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Trip</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  section: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  errorBanner: {
    backgroundColor: "#450a0a",
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  statePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statePillText: { color: colors.textSecondary, fontSize: 12 },
  statePillTextActive: { color: "#fff", fontWeight: "600" },
  deadhead: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
