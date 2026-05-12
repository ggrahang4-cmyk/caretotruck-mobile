import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { View, ActivityIndicator } from "react-native";
import { colors } from "@/lib/theme";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (user === undefined) return; // still loading

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/landing");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, segments]);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { color: colors.textPrimary },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/landing" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trips/new" options={{ title: "Log Trip", presentation: "modal" }} />
        <Stack.Screen name="trips/[id]" options={{ title: "Trip Detail" }} />
        <Stack.Screen name="receipts/capture" options={{ title: "Scan Receipt", presentation: "modal" }} />
        <Stack.Screen name="receipts/[id]" options={{ title: "Receipt" }} />
        <Stack.Screen name="inspections/new" options={{ title: "New Inspection", presentation: "modal" }} />
        <Stack.Screen name="inspections/[id]" options={{ title: "Inspection Detail" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
