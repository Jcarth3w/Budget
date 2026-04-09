import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useBudget } from "@/hooks/useBudget";
import { CATEGORY_BY_KEY } from "../../constants/categories";
import { fmt, formatMonthYear } from "@/utils/format";

SplashScreen.preventAutoHideAsync();

const NEEDS_KEYS = ["gas", "phone", "medical", "car", "apartment", "groceries"];
const WANTS_KEYS = ["entertainment", "food"];

export default function HomeScreen() {
  const { data, loading, refreshing, error, refresh, fadeAnim, slideAnim } = useBudget();

  const [fontsLoaded] = useFonts({
    Poppins: require("../../assets/fonts/Poppins-Regular.ttf"),
    PoppinsBold: require("../../assets/fonts/Poppins-Bold.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color="#7DF9C2" />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  const earned = data?.earned ?? 0;
  const spent = data?.spent ?? 0;
  const remaining = data?.remaining ?? 0;
  const breakdown = data?.breakdown ?? {};
  const targets = data?.budget503020 ?? { needs: 0, wants: 0, investments: 0 };

  const needsSpent = NEEDS_KEYS.reduce((sum, k) => sum + ((breakdown as any)[k] ?? 0), 0);
  const wantsSpent = WANTS_KEYS.reduce((sum, k) => sum + ((breakdown as any)[k] ?? 0), 0);
  const spentPercent = earned > 0 ? Math.min((spent / earned) * 100, 100) : 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      onLayout={onLayoutRootView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7DF9C2" />
      }
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.monthLabel}>{formatMonthYear(new Date())}</Text>
          <Text style={styles.title}>Budget</Text>
        </View>

        {/* Main balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Earned This Month</Text>
          <Text style={styles.balanceAmount}>{fmt(earned)}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${spentPercent}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>Spent {fmt(spent)}</Text>
            <Text style={[styles.progressText, { color: remaining >= 0 ? "#7DF9C2" : "#FF6B6B" }]}>
              {remaining >= 0 ? "Remaining" : "Over"} {fmt(remaining)}
            </Text>
          </View>
        </View>

        {/* 50/30/20 Buckets */}
        <Text style={styles.sectionTitle}>50 / 30 / 20</Text>
        <View style={styles.bucketsRow}>
          <BucketCard label="Needs"  target={targets.needs}       spent={needsSpent} color="#7DF9C2" />
          <BucketCard label="Wants"  target={targets.wants}       spent={wantsSpent} color="#FFD166" />
          <BucketCard label="Invest" target={targets.investments} spent={0}          color="#A78BFA" noSpend />
        </View>

        {/* Category breakdown */}
        <Text style={styles.sectionTitle}>Breakdown</Text>
        <View style={styles.breakdownGrid}>
          {Object.entries(breakdown).map(([key, amount]) => {
            const cat = CATEGORY_BY_KEY[key];
            if (!cat) return null;
            return (
              <View key={key} style={styles.breakdownItem}>
                <Text style={styles.breakdownEmoji}>{cat.emoji}</Text>
                <Text style={styles.breakdownLabel}>{cat.label}</Text>
                <Text style={styles.breakdownAmount}>{fmt(amount as number)}</Text>
              </View>
            );
          })}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

      </Animated.View>
    </ScrollView>
  );
}

type BucketCardProps = {
  label: string;
  target: number;
  spent: number;
  color: string;
  noSpend?: boolean;
};

function BucketCard({ label, target, spent, color, noSpend }: BucketCardProps) {
  const remaining = target - spent;
  const percent = target > 0 ? Math.min((spent / target) * 100, 100) : 0;

  return (
    <View style={[styles.bucketCard, { borderTopColor: color }]}>
      <Text style={[styles.bucketLabel, { color }]}>{label}</Text>
      <Text style={styles.bucketTarget}>{fmt(target)}</Text>
      {!noSpend && (
        <>
          <View style={styles.bucketTrack}>
            <View style={[styles.bucketFill, { width: `${percent}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.bucketRemaining}>
            {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
          </Text>
        </>
      )}
      {noSpend && <Text style={styles.bucketRemaining}>Target</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0D0D0F" },
  container: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0D0D0F",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#7DF9C2", fontFamily: "Poppins", fontSize: 16 },
  header: { marginBottom: 28 },
  monthLabel: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0", lineHeight: 46 },
  balanceCard: {
    backgroundColor: "#16161A",
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#222",
  },
  balanceLabel: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#666",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  balanceAmount: { fontFamily: "PoppinsBold", fontSize: 38, color: "#F0F0F0", marginBottom: 20 },
  progressTrack: {
    height: 6,
    backgroundColor: "#222",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: { height: "100%", backgroundColor: "#7DF9C2", borderRadius: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressText: { fontFamily: "Poppins", fontSize: 13, color: "#666" },
  sectionTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 16,
    color: "#444",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  bucketsRow: { flexDirection: "row", gap: 10, marginBottom: 32 },
  bucketCard: {
    flex: 1,
    backgroundColor: "#16161A",
    borderRadius: 16,
    padding: 14,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: "#222",
  },
  bucketLabel: { fontFamily: "PoppinsBold", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  bucketTarget: { fontFamily: "PoppinsBold", fontSize: 16, color: "#F0F0F0", marginBottom: 10 },
  bucketTrack: { height: 4, backgroundColor: "#222", borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  bucketFill: { height: "100%", borderRadius: 2 },
  bucketRemaining: { fontFamily: "Poppins", fontSize: 11, color: "#555" },
  breakdownGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  breakdownItem: {
    width: "47%",
    backgroundColor: "#16161A",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
  },
  breakdownEmoji: { fontSize: 22, marginBottom: 6 },
  breakdownLabel: { fontFamily: "Poppins", fontSize: 12, color: "#666", marginBottom: 2 },
  breakdownAmount: { fontFamily: "PoppinsBold", fontSize: 18, color: "#F0F0F0" },
  error: { color: "#FF6B6B", fontFamily: "Poppins", fontSize: 14, textAlign: "center", marginTop: 12 },
});