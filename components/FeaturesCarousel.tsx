import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  LayoutAnimation, UIManager, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const A = {
  bg:          "#1A110B",
  surface:     "#2d1f15",
  border:      "#3d2b1f",
  borderActive:"#D4A373",
  amber:       "#D4A373",
  amberBg:     "rgba(212,163,115,0.10)",
  amberBgDark: "rgba(212,163,115,0.06)",
  cream:       "#E8DCC4",
  muted:       "#6b5c4e",
  green:       "#22c55e",
};

type Feature = {
  icon: string;
  title: string;
  tagline: string;
  how: string[];
  stat: { value: string; label: string };
};

const FEATURES: Feature[] = [
  {
    icon: "trending-up-outline",
    title: "Cost-Per-Mile",
    tagline: "Know if a load is worth taking before you accept it.",
    how: [
      "Enter fixed monthly costs once — insurance, truck payment, permits, phone",
      "Fuel, maintenance, and tolls flow in from receipts automatically",
      "caretotruck divides total costs by miles driven, live every day",
      "Compare your CPM against any broker rate instantly",
    ],
    stat: { value: "$1.85", label: "Average owner-operator CPM — know yours exactly" },
  },
  {
    icon: "camera-outline",
    title: "Receipt OCR",
    tagline: "Snap it. We read it, file it, and forget it.",
    how: [
      "Open the app, tap Capture — your camera becomes a receipt scanner",
      "AI reads merchant name, date, amount, and fuel gallons automatically",
      "Every receipt is mapped to its Schedule C line (Line 9, 15, 24a…)",
      "Fuel receipts are auto-flagged for IFTA with gallons and state",
    ],
    stat: { value: "0 sec", label: "Manual data entry required — it's all automatic" },
  },
  {
    icon: "car-outline",
    title: "Trip Log",
    tagline: "Log once. Powers IFTA, per-diem, and CPM automatically.",
    how: [
      "Log origin, destination, loaded miles, and deadhead miles per run",
      "Add per-state mile breakdowns — IFTA pulls them at quarter-end",
      "Attach your rate confirmation PDF directly to the trip",
      "Revenue per trip feeds your cost-per-mile dashboard in real time",
    ],
    stat: { value: "48", label: "States tracked for IFTA — all contiguous US" },
  },
  {
    icon: "calendar-outline",
    title: "Per Diem",
    tagline: "$69/day deduction most drivers miss completely.",
    how: [
      "Tap any calendar day to mark it as an away-from-home night",
      "The IRS allows $69/day for OTR drivers — 80% is deductible",
      "caretotruck totals your deduction automatically each month",
      "The annual total flows directly into your quarterly tax estimate",
    ],
    stat: { value: "$20,145", label: "Max annual per-diem deduction (292 nights)" },
  },
  {
    icon: "map-outline",
    title: "IFTA Prep",
    tagline: "Every quarter, a ready-to-file fuel tax summary — done.",
    how: [
      "Trip miles are automatically broken down by state as you log them",
      "Fuel receipts are tied to the state where purchased",
      "At quarter-end, hit Generate — calculates net gallons owed per state",
      "Download a clean PDF summary to hand to your IFTA administrator",
    ],
    stat: { value: "4×", label: "Quarterly IFTA filings handled per year automatically" },
  },
  {
    icon: "calculator-outline",
    title: "Tax Estimator",
    tagline: "No surprise IRS bills. Know your payment before it's due.",
    how: [
      "Pulls your real revenue and deductions from receipts and trips",
      "Applies self-employment tax, QBI 20% deduction, and current IRS brackets",
      "Your per-diem deduction is included automatically",
      "Four cards show exactly what to pay and when (Apr, Jun, Sep, Jan)",
    ],
    stat: { value: "20%", label: "QBI deduction most S/E truckers qualify for — applied automatically" },
  },
  {
    icon: "clipboard-outline",
    title: "Pre-Trip",
    tagline: "DOT-compliant 41-item checklist, saved and signed.",
    how: [
      "41-item checklist covers every item required by 49 CFR § 396.13",
      "Defects flagged in red — driver must note corrective action before sign-off",
      "Each inspection is timestamped, signed, and saved to your permanent record",
      "Log your odometer photo — uploaded and attached to the inspection",
    ],
    stat: { value: "49 CFR", label: "§ 396.13 fully covered — DOT audit-ready records" },
  },
  {
    icon: "document-text-outline",
    title: "Schedule C",
    tagline: "Hand your CPA a clean export at year-end. Zero prep.",
    how: [
      "Every receipt is automatically mapped to a Schedule C line item",
      "Categories follow IRS Publication 535 for truck owner-operators",
      "Year-end export shows totals per line — no spreadsheet needed",
      "Your CPA gets exactly what they need without a single conversation",
    ],
    stat: { value: "100%", label: "Of receipts auto-mapped to IRS Schedule C lines" },
  },
];

export function FeaturesCarousel() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  function toggle(i: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveIdx((prev) => (prev === i ? null : i));
  }

  const active = activeIdx !== null ? FEATURES[activeIdx] : null;

  return (
    <View>
      {/* 2-column grid */}
      <View style={s.grid}>
        {FEATURES.map((f, i) => {
          const isActive = activeIdx === i;
          return (
            <TouchableOpacity
              key={f.title}
              style={[s.card, isActive && s.cardActive]}
              onPress={() => toggle(i)}
              activeOpacity={0.8}
            >
              <View style={[s.iconBox, isActive && s.iconBoxActive]}>
                <Ionicons name={f.icon as any} size={20} color={A.amber} />
              </View>
              <Text style={s.cardTitle}>{f.title}</Text>
              <Text style={s.cardTagline} numberOfLines={2}>{f.tagline}</Text>
              <Text style={[s.cardCta, isActive && s.cardCtaActive]}>
                {isActive ? "Hide ↑" : "See how →"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Expandable detail panel */}
      {active && activeIdx !== null && (
        <View style={s.detail}>
          {/* Header row */}
          <View style={s.detailHeader}>
            <View style={s.detailIconBox}>
              <Ionicons name={active.icon as any} size={22} color={A.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.detailTitle}>{active.title}</Text>
              <Text style={s.detailTagline}>{active.tagline}</Text>
            </View>
            <TouchableOpacity onPress={() => toggle(activeIdx)} style={s.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={18} color={A.muted} />
            </TouchableOpacity>
          </View>

          {/* Steps */}
          <Text style={s.sectionLabel}>HOW IT WORKS</Text>
          {active.how.map((step, i) => (
            <View key={i} style={s.step}>
              <View style={s.stepBadge}>
                <Ionicons name="checkmark" size={11} color={A.amber} />
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}

          {/* Stat callout */}
          <View style={s.statCard}>
            <Text style={s.statValue}>{active.stat.value}</Text>
            <Text style={s.statLabel}>{active.stat.label}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    width: "48.5%",
    backgroundColor: A.amberBgDark,
    borderWidth: 1,
    borderColor: A.border,
    borderRadius: 16,
    padding: 14,
  },
  cardActive: {
    borderColor: A.borderActive,
    backgroundColor: A.amberBg,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(212,163,115,0.12)",
    borderWidth: 1,
    borderColor: A.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconBoxActive: {
    backgroundColor: "rgba(212,163,115,0.20)",
    borderColor: A.amber,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: A.cream,
    marginBottom: 4,
  },
  cardTagline: {
    fontSize: 11,
    color: A.muted,
    lineHeight: 15,
    marginBottom: 8,
  },
  cardCta: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(212,163,115,0.5)",
  },
  cardCtaActive: {
    color: A.amber,
  },

  // Detail panel
  detail: {
    marginTop: 12,
    backgroundColor: A.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(212,163,115,0.25)",
    padding: 18,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  detailIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(212,163,115,0.15)",
    borderWidth: 1,
    borderColor: "rgba(212,163,115,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: A.cream,
    marginBottom: 3,
  },
  detailTagline: {
    fontSize: 12,
    color: A.amber,
    fontWeight: "500",
    lineHeight: 17,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(212,163,115,0.55)",
    marginBottom: 10,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(212,163,115,0.12)",
    borderWidth: 1,
    borderColor: "rgba(212,163,115,0.30)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(232,220,196,0.75)",
    lineHeight: 19,
  },

  statCard: {
    marginTop: 14,
    backgroundColor: "rgba(212,163,115,0.07)",
    borderWidth: 1,
    borderColor: "rgba(212,163,115,0.18)",
    borderRadius: 12,
    padding: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: A.amber,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: A.muted,
    lineHeight: 17,
  },
});
