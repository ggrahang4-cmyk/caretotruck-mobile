import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FeaturesCarousel } from "@/components/FeaturesCarousel";

const A = {
  bg:      "#0f0a06",
  amber:   "#D4A373",
  amberBg: "rgba(212,163,115,0.85)",
  cream:   "#E8DCC4",
  muted:   "rgba(232,220,196,0.5)",
  dimText: "rgba(232,220,196,0.35)",
  border:  "rgba(212,163,115,0.18)",
};

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Nav ── */}
        <View style={s.nav}>
          <Text style={s.navLogo}>
            <Text style={{ color: A.amber }}>care</Text>totruck
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={s.navSignIn}>
            <Text style={s.navSignInText}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero ── */}
        <View style={s.hero}>
          <Text style={s.heroEyebrow}>Owner-Operator Software</Text>
          <Text style={s.heroHeadline}>Your back office,{"\n"}in your pocket.</Text>
          <Text style={s.heroSub}>
            Eight tools in one app — built for the independent owner-operator.
            No spreadsheets, no CPA calls mid-load.
          </Text>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { val: "49 CFR", sub: "§ 396.13 DOT" },
              { val: "48",     sub: "States IFTA" },
              { val: "100%",   sub: "Schedule C" },
            ].map(({ val, sub }) => (
              <View key={val} style={s.statPill}>
                <Text style={s.statVal}>{val}</Text>
                <Text style={s.statSub}>{sub}</Text>
              </View>
            ))}
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={s.ctaPrimary}
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.85}
          >
            <Text style={s.ctaPrimaryText}>Start free trial</Text>
            <Ionicons name="arrow-forward" size={16} color="#1A110B" />
          </TouchableOpacity>
          <Text style={s.ctaNote}>7-day free trial · No credit card required</Text>
        </View>

        {/* ── Features ── */}
        <View style={s.featuresSection}>
          <Text style={s.sectionEyebrow}>Features</Text>
          <Text style={s.sectionHeading}>Everything you need between loads</Text>
          <Text style={s.sectionSub}>Tap any feature to see exactly how it works.</Text>

          <FeaturesCarousel />
        </View>

        {/* ── How it works ── */}
        <View style={s.stepsSection}>
          <Text style={s.sectionEyebrow}>How it works</Text>
          <Text style={s.sectionHeading}>Three stops. No CPA required.</Text>

          {[
            { n: "1", title: "Sign up — 60 seconds",  desc: "Enter your home state, entity type, and one truck. No card required for the 7-day trial." },
            { n: "2", title: "Run your routes",       desc: "Snap receipts, log miles after each load, and mark overnight days as you go." },
            { n: "3", title: "Generate your filings", desc: "Hit Generate at quarter-end. Download your IFTA pack and quarterly tax estimate. Done." },
          ].map(({ n, title, desc }) => (
            <View key={n} style={s.step}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{title}</Text>
                <Text style={s.stepDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Bottom CTA ── */}
        <View style={s.bottomCta}>
          <Text style={s.bottomCtaHeading}>Ready to stop guessing your costs?</Text>
          <Text style={s.bottomCtaSub}>Start your 7-day free trial. No credit card. No commitment.</Text>

          <TouchableOpacity
            style={s.ctaPrimary}
            onPress={() => router.push("/(auth)/signup")}
            activeOpacity={0.85}
          >
            <Text style={s.ctaPrimaryText}>Create your free account</Text>
            <Ionicons name="arrow-forward" size={16} color="#1A110B" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={s.ctaSecondary}>
            <Text style={s.ctaSecondaryText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer note ── */}
        <Text style={s.footerNote}>
          caretotruck is a software preparation tool and does not provide tax advice or professional services.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: A.bg },
  scroll: { paddingBottom: 40 },

  // Nav
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navLogo: {
    fontSize: 18,
    fontWeight: "900",
    color: A.cream,
    letterSpacing: -0.3,
  },
  navSignIn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  navSignInText: {
    color: A.cream,
    fontSize: 13,
    fontWeight: "600",
  },

  // Hero
  hero: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: A.amber,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  heroHeadline: {
    fontSize: 38,
    fontWeight: "900",
    color: A.cream,
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  heroSub: {
    fontSize: 15,
    color: A.muted,
    lineHeight: 22,
    marginBottom: 24,
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  statPill: {
    flex: 1,
    backgroundColor: "rgba(212,163,115,0.06)",
    borderWidth: 1,
    borderColor: A.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  statVal: {
    fontSize: 13,
    fontWeight: "800",
    color: A.amber,
    marginBottom: 2,
  },
  statSub: {
    fontSize: 9,
    color: A.dimText,
    textAlign: "center",
  },

  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: A.amberBg,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 28,
    marginBottom: 10,
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A110B",
  },
  ctaNote: {
    textAlign: "center",
    fontSize: 11,
    color: A.dimText,
  },

  // Features section
  featuresSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: A.amber,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: A.cream,
    marginBottom: 6,
    lineHeight: 28,
  },
  sectionSub: {
    fontSize: 13,
    color: A.muted,
    marginBottom: 20,
    lineHeight: 19,
  },

  // How it works steps
  stepsSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(212,163,115,0.08)",
    paddingTop: 36,
  },
  step: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
    alignItems: "flex-start",
  },
  stepNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212,163,115,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,163,115,0.35)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: {
    fontSize: 16,
    fontWeight: "800",
    color: A.amber,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: A.cream,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: A.muted,
    lineHeight: 19,
  },

  // Bottom CTA
  bottomCta: {
    marginHorizontal: 20,
    padding: 24,
    backgroundColor: "rgba(212,163,115,0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: A.border,
    marginBottom: 32,
    alignItems: "stretch",
  },
  bottomCtaHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: A.cream,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 26,
  },
  bottomCtaSub: {
    fontSize: 13,
    color: A.muted,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 19,
  },
  ctaSecondary: {
    paddingVertical: 10,
    alignItems: "center",
  },
  ctaSecondaryText: {
    fontSize: 13,
    color: "rgba(212,163,115,0.6)",
    fontWeight: "500",
  },

  footerNote: {
    paddingHorizontal: 24,
    textAlign: "center",
    fontSize: 10,
    color: A.dimText,
    lineHeight: 15,
  },
});
