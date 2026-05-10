import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
  Alert, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { auth, storage, functions } from "@/lib/firebase";
import { colors, spacing, radius } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";

function buildReceiptPath(uid: string, filename: string) {
  const ts = Date.now();
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  return `receipts/${uid}/${ts}_${safe}`;
}

type Phase = "idle" | "picking" | "uploading" | "processing" | "done" | "error";

export default function CaptureScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [phase, setPhase]       = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function pickCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed to scan receipts.");
      return;
    }
    setPhase("picking");
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });
    setPhase("idle");
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function pickLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Photo library access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleUpload() {
    const uid = auth.currentUser?.uid;
    if (!uid || !imageUri) return;

    setErrorMsg(null);
    setPhase("uploading");
    setProgress(0);

    try {
      // Fetch the local image as a blob
      const resp = await fetch(imageUri);
      const blob = await resp.blob();
      const filename = imageUri.split("/").pop() ?? "receipt.jpg";
      const path = buildReceiptPath(uid, filename);

      // Upload to Firebase Storage with progress
      const fileRef = storageRef(storage, path);
      const task = uploadBytesResumable(fileRef, blob, { contentType: "image/jpeg" });

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            setProgress(snap.totalBytes > 0 ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0);
          },
          reject,
          resolve,
        );
      });

      setPhase("processing");

      // Call Cloud Function for OCR
      const processReceipt = httpsCallable<
        { storagePath: string; originalFilename: string },
        { receiptId: string; ocrStatus: string }
      >(functions, "processReceipt");

      const result = await processReceipt({ storagePath: path, originalFilename: filename });
      setPhase("done");

      // Navigate to receipt review
      router.replace(`/receipts/${result.data.receiptId}`);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Upload failed. Please try again.");
      setPhase("error");
    }
  }

  const busy = phase === "picking" || phase === "uploading" || phase === "processing";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Scan a Receipt</Text>
      <Text style={styles.sub}>Take a photo or choose from your library. We'll extract the details automatically.</Text>

      {/* Preview */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}

      {/* Pick buttons */}
      {!busy && (
        <View style={styles.pickRow}>
          <TouchableOpacity style={styles.pickBtn} onPress={pickCamera}>
            <Ionicons name="camera" size={22} color={colors.primary} />
            <Text style={styles.pickBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={pickLibrary}>
            <Ionicons name="images" size={22} color={colors.primary} />
            <Text style={styles.pickBtnText}>Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress / Status */}
      {phase === "uploading" && (
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Uploading… {Math.round(progress)}%</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      {phase === "processing" && (
        <View style={styles.statusBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.statusLabel, { marginTop: 8 }]}>Running OCR…</Text>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Upload CTA */}
      {imageUri && !busy && (
        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={styles.uploadBtnText}>Upload & Scan</Text>
        </TouchableOpacity>
      )}

      {imageUri && !busy && (
        <TouchableOpacity style={styles.retakeBtn} onPress={() => { setImageUri(null); setErrorMsg(null); setPhase("idle"); }}>
          <Text style={styles.retakeBtnText}>Use a different image</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, alignItems: "center", paddingBottom: spacing.xl },

  heading: { color: colors.textPrimary, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  sub:     { color: colors.textSecondary, fontSize: 13, textAlign: "center", marginBottom: spacing.lg },

  preview: {
    width: "100%",
    height: 300,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  placeholder: {
    width: "100%",
    height: 240,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  placeholderText: { color: colors.textMuted, marginTop: 8 },

  pickRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, width: "100%" },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
  },
  pickBtnText: { color: colors.textPrimary, fontWeight: "600" },

  statusBox:    { alignItems: "center", width: "100%", marginBottom: spacing.md },
  statusLabel:  { color: colors.textSecondary, fontSize: 13 },
  progressBg:   { width: "100%", height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 8, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },

  errorBox:  { backgroundColor: "#450a0a", borderRadius: radius.sm, padding: spacing.sm, width: "100%", marginBottom: spacing.md },
  errorText: { color: "#fca5a5", fontSize: 13, textAlign: "center" },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  retakeBtn: { paddingVertical: 10 },
  retakeBtnText: { color: colors.textSecondary, fontSize: 13 },
});
