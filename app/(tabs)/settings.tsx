import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Platform,
} from "react-native";
import { doc, onSnapshot, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { signOut, updateProfile, deleteUser } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "@/lib/firebase";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
const API_BASE =
  (extra?.API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://www.caretotruck.com").replace(/\/$/, "");
                    import { colors, spacing, radius } from "@/lib/theme";
                    import type { UserDoc } from "@/lib/types";
                    import { Ionicons } from "@expo/vector-icons";

                    function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
                      return (
                        <View style={sec.root}>
                          <Text style={sec.title}>{title}</Text>
                          {children}
                        </View>
                      );
                    }

                    const sec = StyleSheet.create({
                      root: {
                        backgroundColor: colors.surface,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                        marginBottom: spacing.md,
                      },
                      title: {
                        color: colors.textSecondary,
                        fontSize: 11,
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: spacing.md,
                      },
                    });

                    function Field({ label, children }: { label: string; children: React.ReactNode }) {
                      return (
                        <View style={{ marginBottom: spacing.md }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>{label}</Text>
                          {children}
                        </View>
                      );
                    }

                    function Input({ value, onChangeText, placeholder, keyboardType, editable }: {
                      value: string;
                      onChangeText?: (s: string) => void;
                      placeholder?: string;
                      keyboardType?: "default" | "numeric" | "decimal-pad" | "email-address" | "phone-pad";
                      editable?: boolean;
                    }) {
                      return (
                        <TextInput
                          value={value}
                          onChangeText={onChangeText}
                          placeholder={placeholder}
                          placeholderTextColor={colors.textMuted}
                          keyboardType={keyboardType}
                          editable={editable !== false}
                          style={[
                            {
                              backgroundColor: colors.bg,
                              borderWidth: 1,
                              borderColor: colors.border,
                              borderRadius: radius.sm,
                              color: editable === false ? colors.textMuted : colors.textPrimary,
                              padding: spacing.sm + 2,
                              fontSize: 15,
                            },
                          ]}
                        />
                      );
                    }

                    function isoFromTimestamp(ts?: Timestamp | null): string {
                      if (!ts) return "";
                      return ts.toDate().toISOString().slice(0, 10);
                    }

                    function timestampFromIso(s: string): Timestamp | null {
                      if (!s.trim()) return null;
                      const ms = Date.parse(s.trim());
                      return isNaN(ms) ? null : Timestamp.fromMillis(ms);
                    }

                    export default function SettingsScreen() {
                      const uid = auth.currentUser?.uid;
                      const [user, setUser] = useState<UserDoc | null>(null);

                      const [displayName, setDisplayName]         = useState("");
                      const [phone, setPhone]                     = useState("");
                      const [mcNumber, setMcNumber]               = useState("");
                      const [usdotNumber, setUsdotNumber]         = useState("");
                      const [targetCpm, setTargetCpm]             = useState("");
                      const [expMiles, setExpMiles]               = useState("");
                      const [insuranceProvider, setInsProvider]   = useState("");
                      const [insuranceExpiry, setInsExpiry]       = useState("");
                      const [cdlClass, setCdlClass]               = useState("");
                      const [cdlExpiry, setCdlExpiry]             = useState("");
                      const [medCardExpiry, setMedCardExpiry]     = useState("");
                      const [saving, setSaving]                   = useState(false);
                      const [saved, setSaved]                     = useState(false);
                      const [coiScanning, setCoiScanning]         = useState(false);
                      const [coiMsg, setCoiMsg]                   = useState<string | null>(null);
                      const [medCardScanning, setMedCardScanning] = useState(false);
                      const [medCardMsg, setMedCardMsg]           = useState<string | null>(null);
                      const [authorityScanning, setAuthorityScanning] = useState(false);
                      const [authorityMsg, setAuthorityMsg]       = useState<string | null>(null);

                      useEffect(() => {
                        if (!uid) return;
                        return onSnapshot(doc(db, "users", uid), (s) => {
                          if (s.exists()) {
                            const u = s.data() as UserDoc;
                            setUser(u);
                            setDisplayName(u.displayName ?? "");
                            setPhone(u.phone ?? "");
                            setMcNumber(u.mcNumber ?? "");
                            setUsdotNumber(u.usdotNumber ?? "");
                            setTargetCpm(u.targetCpmCents ? (u.targetCpmCents / 100).toFixed(3) : "");
                            setExpMiles(u.expectedMonthlyMiles ? String(u.expectedMonthlyMiles) : "");
                            setInsProvider(u.insuranceProvider ?? "");
                            setInsExpiry(isoFromTimestamp(u.insuranceExpiresAt));
                            setCdlClass(u.cdlClass ?? "");
                            setCdlExpiry(isoFromTimestamp(u.cdlExpiresAt));
                            setMedCardExpiry(isoFromTimestamp(u.medCardExpiresAt));
                          }
                        });
                      }, [uid]);

                      async function scanCOI() {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!perm.granted) {
                          Alert.alert("Permission needed", "Allow photo library access to upload your COI.");
                          return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          quality: 0.85,
                        });
                        if (result.canceled || !result.assets[0]) return;

                        setCoiScanning(true);
                        setCoiMsg(null);
                        try {
                          const token = await auth.currentUser?.getIdToken();
                          const asset = result.assets[0];
                          const fd = new FormData();
                          if (Platform.OS === "web") {
                            const resp = await fetch(asset.uri);
                            const blob = await resp.blob();
                            fd.append("file", blob, "coi.jpg");
                          } else {
                            fd.append("file", { uri: asset.uri, type: "image/jpeg", name: "coi.jpg" } as any);
                          }
                          fd.append("type", "coi");

                          const res = await fetch(`${API_BASE}/api/extract-document`, {
                            method: "POST",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: fd,
                          });
                          if (!res.ok) throw new Error("Scan failed — try again.");
                          const data = await res.json();

                          if (data.provider)       setInsProvider(data.provider);
                          if (data.expirationDate) setInsExpiry(data.expirationDate);

                          const parts: string[] = [];
                          if (data.provider)       parts.push(data.provider);
                          if (data.policyNumber)   parts.push(`#${data.policyNumber}`);
                          if (data.expirationDate) parts.push(`exp ${data.expirationDate}`);
                          setCoiMsg(parts.length ? "Filled: " + parts.join(" · ") : "Fields filled — review below.");
                        } catch (err) {
                          setCoiMsg((err as Error).message || "Could not read certificate.");
                        } finally {
                          setCoiScanning(false);
                        }
                      }

                      async function scanMedCard() {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access to upload your medical card."); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
                        if (result.canceled || !result.assets[0]) return;
                        setMedCardScanning(true);
                        setMedCardMsg(null);
                        try {
                          const token = await auth.currentUser?.getIdToken();
                          const asset = result.assets[0];
                          const fd = new FormData();
                          if (Platform.OS === "web") {
                            const resp = await fetch(asset.uri);
                            const blob = await resp.blob();
                            fd.append("file", blob, "medcard.jpg");
                          } else {
                            fd.append("file", { uri: asset.uri, type: "image/jpeg", name: "medcard.jpg" } as any);
                          }
                          fd.append("type", "medcard");
                          const res = await fetch(`${API_BASE}/api/extract-document`, {
                            method: "POST",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: fd,
                          });
                          if (!res.ok) throw new Error("Scan failed — try again.");
                          const data = await res.json();
                          if (data.expirationDate) setMedCardExpiry(data.expirationDate);
                          setMedCardMsg(data.expirationDate ? `Medical card expiry set to ${data.expirationDate}.` : "Expiry not found — enter manually.");
                        } catch (err) {
                          setMedCardMsg((err as Error).message || "Could not read medical card.");
                        } finally {
                          setMedCardScanning(false);
                        }
                      }

                      async function scanAuthority() {
                        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access to upload your authority letter."); return; }
                        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
                        if (result.canceled || !result.assets[0]) return;
                        setAuthorityScanning(true);
                        setAuthorityMsg(null);
                        try {
                          const token = await auth.currentUser?.getIdToken();
                          const asset = result.assets[0];
                          const fd = new FormData();
                          if (Platform.OS === "web") {
                            const resp = await fetch(asset.uri);
                            const blob = await resp.blob();
                            fd.append("file", blob, "authority.jpg");
                          } else {
                            fd.append("file", { uri: asset.uri, type: "image/jpeg", name: "authority.jpg" } as any);
                          }
                          fd.append("type", "authority");
                          const res = await fetch(`${API_BASE}/api/extract-document`, {
                            method: "POST",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: fd,
                          });
                          if (!res.ok) throw new Error("Scan failed — try again.");
                          const data = await res.json();
                          if (data.mcNumber)    setMcNumber(data.mcNumber);
                          if (data.usdotNumber) setUsdotNumber(data.usdotNumber);
                          const parts: string[] = [];
                          if (data.legalName)   parts.push(data.legalName);
                          if (data.mcNumber)    parts.push(data.mcNumber);
                          if (data.usdotNumber) parts.push(`DOT ${data.usdotNumber}`);
                          setAuthorityMsg(parts.length ? "Filled: " + parts.join(" · ") : "Fields filled — review below.");
                        } catch (err) {
                          setAuthorityMsg((err as Error).message || "Could not read authority document.");
                        } finally {
                          setAuthorityScanning(false);
                        }
                      }

                      async function handleSave() {
                        if (!uid) return;
                        setSaving(true);
                        setSaved(false);
                        try {
                          const targetCpmCents = targetCpm.trim()
                            ? Math.round(parseFloat(targetCpm) * 100)
                            : null;
                          const miles = expMiles.trim() ? parseInt(expMiles, 10) : null;

                          await updateDoc(doc(db, "users", uid), {
                            displayName:        displayName.trim(),
                            phone:              phone.trim() || null,
                            mcNumber:           mcNumber.trim() || null,
                            usdotNumber:        usdotNumber.trim() || null,
                            targetCpmCents,
                            expectedMonthlyMiles: miles,
                            insuranceProvider:  insuranceProvider.trim() || null,
                            insuranceExpiresAt: timestampFromIso(insuranceExpiry),
                            cdlClass:           cdlClass.trim() || null,
                            cdlExpiresAt:       timestampFromIso(cdlExpiry),
                            medCardExpiresAt:   timestampFromIso(medCardExpiry),
                            updatedAt:          serverTimestamp(),
                          });

                          if (auth.currentUser && displayName.trim() !== auth.currentUser.displayName) {
                            await updateProfile(auth.currentUser, { displayName: displayName.trim() });
                          }

                          setSaved(true);
                          setTimeout(() => setSaved(false), 2500);
                        } finally {
                          setSaving(false);
                        }
                      }

                      function handleSignOut() {
                        Alert.alert("Sign Out", "Are you sure?", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Sign Out", style: "destructive", onPress: () => signOut(auth) },
                        ]);
                      }

                      function handleDeleteAccount() {
                        Alert.alert("Delete Account", "Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone.", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete My Account", style: "destructive", onPress: async () => {
                            try {
                              const currentUser = auth.currentUser;
                              if (currentUser) {
                                await deleteUser(currentUser);
                              }
                            } catch (e) {
                              Alert.alert("Error", "Please sign out and sign back in to verify your identity before deleting your account.");
                            }
                          }},
                        ]);
                      }

                      const trialDaysLeft = (() => {
                        if (!user?.trialEndsAt || user.subscriptionTier !== "trial") return null;
                        const ms = user.trialEndsAt.toDate().getTime() - Date.now();
                        return Math.ceil(ms / (1000 * 60 * 60 * 24));
                      })();
                      const showTrialWarning = trialDaysLeft !== null && trialDaysLeft <= 3;

                      return (
                        <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                          {/* Trial expiry warning */}
                          {showTrialWarning && (
                            <TouchableOpacity
                              style={[styles.trialBanner, trialDaysLeft <= 0 && styles.trialBannerExpired]}
                              onPress={() => Linking.openURL("https://www.caretotruck.com/billing")}
                            >
                              <Ionicons
                                name="alert-circle-outline"
                                size={18}
                                color={trialDaysLeft <= 0 ? colors.danger : colors.warning}
                              />
                              <Text style={[styles.trialBannerText, trialDaysLeft <= 0 && { color: colors.danger }]}>
                                {trialDaysLeft <= 0
                                  ? "Your trial has ended — tap to upgrade and keep your data."
                                  : `Trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} — tap to upgrade.`}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {/* Profile */}
                          <SectionCard title="Profile">
                            <Field label="Display Name">
                              <Input value={displayName} onChangeText={setDisplayName} placeholder="John Smith" />
                            </Field>
                            <Field label="Email">
                              <Input value={auth.currentUser?.email ?? ""} editable={false} />
                            </Field>
                            <Field label="Phone">
                              <Input value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />
                            </Field>
                            <Field label="MC Number">
                              <Input value={mcNumber} onChangeText={setMcNumber} placeholder="MC-123456" />
                            </Field>
                            <Field label="USDOT Number">
                              <Input value={usdotNumber} onChangeText={setUsdotNumber} placeholder="1234567" keyboardType="numeric" />
                            </Field>
                          </SectionCard>

                          {/* Compliance / Insurance */}
                          <SectionCard title="Compliance & Insurance">
                            {/* COI scan button */}
                            <TouchableOpacity
                              style={[styles.coiBtn, coiScanning && { opacity: 0.6 }]}
                              onPress={scanCOI}
                              disabled={coiScanning}
                            >
                              {coiScanning
                                ? <ActivityIndicator color={colors.primary} size="small" />
                                : <Ionicons name="scan-outline" size={16} color={colors.primary} />
                              }
                              <Text style={styles.coiBtnText}>
                                {coiScanning ? "Scanning certificate…" : "Scan Certificate of Insurance"}
                              </Text>
                            </TouchableOpacity>
                            {coiMsg && <Text style={styles.coiMsg}>{coiMsg}</Text>}

                            {/* Medical card scan */}
                            <TouchableOpacity
                              style={[styles.coiBtn, medCardScanning && { opacity: 0.6 }]}
                              onPress={scanMedCard}
                              disabled={medCardScanning}
                            >
                              {medCardScanning
                                ? <ActivityIndicator color={colors.primary} size="small" />
                                : <Ionicons name="id-card-outline" size={16} color={colors.primary} />
                              }
                              <Text style={styles.coiBtnText}>
                                {medCardScanning ? "Scanning medical card…" : "Scan DOT Medical Card"}
                              </Text>
                            </TouchableOpacity>
                            {medCardMsg && <Text style={styles.coiMsg}>{medCardMsg}</Text>}

                            {/* Authority letter scan */}
                            <TouchableOpacity
                              style={[styles.coiBtn, authorityScanning && { opacity: 0.6 }]}
                              onPress={scanAuthority}
                              disabled={authorityScanning}
                            >
                              {authorityScanning
                                ? <ActivityIndicator color={colors.primary} size="small" />
                                : <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                              }
                              <Text style={styles.coiBtnText}>
                                {authorityScanning ? "Scanning authority letter…" : "Scan FMCSA Authority Letter"}
                              </Text>
                            </TouchableOpacity>
                            {authorityMsg && <Text style={styles.coiMsg}>{authorityMsg}</Text>}

                            <Field label="Insurance provider">
                              <Input value={insuranceProvider} onChangeText={setInsProvider} placeholder="Progressive Commercial" />
                            </Field>
                            <Field label="Policy expiry (YYYY-MM-DD)">
                              <Input value={insuranceExpiry} onChangeText={setInsExpiry} placeholder="2026-12-31" />
                            </Field>
                            <Field label="CDL class (A / B / C)">
                              <Input value={cdlClass} onChangeText={setCdlClass} placeholder="A" />
                            </Field>
                            <Field label="CDL expiry (YYYY-MM-DD)">
                              <Input value={cdlExpiry} onChangeText={setCdlExpiry} placeholder="2028-05-01" />
                            </Field>
                            <Field label="Medical card expiry (YYYY-MM-DD)">
                              <Input value={medCardExpiry} onChangeText={setMedCardExpiry} placeholder="2026-09-15" />
                            </Field>
                          </SectionCard>

                          {/* CPM Target */}
                          <SectionCard title="Cost Target">
                            <Text style={styles.hint}>
                              Set your target cost-per-mile so the dashboard can show variance vs. your actual CPM.
                            </Text>
                            <Field label="Target CPM ($/mi)">
                              <Input value={targetCpm} onChangeText={setTargetCpm} keyboardType="decimal-pad" placeholder="1.450" />
                            </Field>
                            <Field label="Expected Monthly Miles">
                              <Input value={expMiles} onChangeText={setExpMiles} keyboardType="numeric" placeholder="10000" />
                            </Field>
                          </SectionCard>

                          {/* Account info */}
                          {user && (
                            <SectionCard title="Account">
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Plan</Text>
                                <Text style={styles.infoValue}>{user.subscriptionTier}</Text>
                              </View>
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Status</Text>
                                <Text style={[styles.infoValue, user.subscriptionStatus === "active" && { color: colors.success }]}>
                                  {user.subscriptionStatus}
                                </Text>
                              </View>
                              <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Home State</Text>
                                <Text style={styles.infoValue}>{user.homeStateCode}</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.billingLink}
                                onPress={() => Linking.openURL("https://www.caretotruck.com/billing")}
                              >
                                <Text style={styles.billingLinkText}>Manage billing →</Text>
                              </TouchableOpacity>
                            </SectionCard>
                          )}

                          {/* Save button */}
                          {saved && (
                            <View style={styles.savedBanner}>
                              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                              <Text style={{ color: colors.success, marginLeft: 6, fontSize: 13 }}>Changes saved</Text>
                            </View>
                          )}

                          <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            onPress={handleSave}
                            disabled={saving}
                          >
                            {saving
                              ? <ActivityIndicator color="#fff" />
                              : <Text style={styles.saveBtnText}>Save Changes</Text>
                            }
                          </TouchableOpacity>

                          {/* Sign out */}
                          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                            <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.signOutText}>Sign Out</Text>
                          </TouchableOpacity>

                          {/* Delete Account */}
                          <TouchableOpacity style={[styles.signOutBtn, { marginTop: spacing.md }]} onPress={handleDeleteAccount}>
                            <Ionicons name="warning-outline" size={18} color={colors.danger} />
                            <Text style={[styles.signOutText, { color: colors.danger }]}>Delete Account</Text>
                          </TouchableOpacity>
                        </ScrollView>
                      );
                    }

                    const styles = StyleSheet.create({
                      root:    { flex: 1, backgroundColor: colors.bg },
                      content: { padding: spacing.md, paddingBottom: spacing.xl },

                      hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md },

                      infoRow: {
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 6,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                      infoLabel: { color: colors.textSecondary, fontSize: 13 },
                      infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: "600" },

                      savedBanner: {
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#14532d",
                        borderRadius: radius.sm,
                        padding: spacing.sm,
                        marginBottom: spacing.sm,
                      },

                      saveBtn: {
                        backgroundColor: colors.primary,
                        borderRadius: radius.md,
                        paddingVertical: 14,
                        alignItems: "center",
                        marginBottom: spacing.md,
                      },
                      saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

                      signOutBtn: {
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingVertical: 12,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.danger,
                      },
                      signOutText: { color: colors.danger, fontWeight: "600" },

                      coiBtn: {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        borderWidth: 1,
                        borderColor: colors.primary + "55",
                        backgroundColor: colors.primary + "18",
                        borderRadius: radius.sm,
                        paddingVertical: 10,
                        paddingHorizontal: spacing.sm,
                        marginBottom: spacing.md,
                      },
                      coiBtnText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
                      coiMsg:     { color: colors.textSecondary, fontSize: 12, marginBottom: spacing.md },

                      trialBanner: {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: colors.warning + "22",
                        borderWidth: 1,
                        borderColor: colors.warning + "55",
                        borderRadius: radius.md,
                        padding: spacing.md,
                        marginBottom: spacing.md,
                      },
                      trialBannerExpired: {
                        backgroundColor: colors.danger + "22",
                        borderColor: colors.danger + "55",
                      },
                      trialBannerText: {
                        flex: 1,
                        color: colors.warning,
                        fontSize: 13,
                        fontWeight: "600",
                      },

                      billingLink: {
                        marginTop: spacing.sm,
                        paddingTop: spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        alignItems: "flex-end",
                      },
                      billingLinkText: {
                        color: colors.primary,
                        fontSize: 13,
                        fontWeight: "600",
                      },
                    });
