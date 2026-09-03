import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Haptics from "expo-haptics";
import { useBudget } from "@/hooks/useBudget";
import { DepletingBar } from "@/components/DepletingBar";
import { CATEGORY_BY_KEY, NEEDS_KEYS, WANTS_KEYS } from "@/constants/categories";
import { fmt, isCurrentMonth, monthTitle, shiftMonth } from "@/utils/format";
import { AmbientGlow, FadeSlideIn, PressScale } from "@/components/motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";

SplashScreen.preventAutoHideAsync();

function nowView() {
  const n = new Date();
  return { month: n.getMonth() + 1, year: n.getFullYear() };
}

export default function HomeScreen() {
  const [view, setView] = useState(nowView);
  const { data, loading, refreshing, error, refresh } = useBudget(view);

  const [fontsLoaded] = useFonts({
    Poppins: require("../../assets/fonts/Poppins-Regular.ttf"),
    PoppinsBold: require("../../assets/fonts/Poppins-Bold.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const viewingNow = isCurrentMonth(view.year, view.month);
  const go = (delta: number) => {
    const next = shiftMonth(view.year, view.month, delta);
    if (delta > 0 && !isCurrentMonth(next.year, next.month) && next.year * 12 + next.month > nowView().year * 12 + nowView().month) {
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setView(next);
  };

  if (!fontsLoaded) return null;

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color="#7DF9C2" />
        <Text style={styles.loadingText}>Loading budget...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.loadingContainer}
        onLayout={onLayoutRootView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7DF9C2" />
        }
      >
        <Text style={styles.errorTitle}>Couldn’t load budget</Text>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.retryHint}>Pull down to retry</Text>
      </ScrollView>
    );
  }

  const earned = data?.earned ?? 0;
  const spent = data?.spent ?? 0;
  const rollover = data?.rollover ?? 0;
  const available = data?.available ?? earned + rollover;
  const remaining = data?.remaining ?? available - spent;
  const breakdown = data?.breakdown ?? {};
  const targets = data?.budget503020 ?? { needs: 0, wants: 0, investments: 0 };
  const fromLabel = data?.rolloverFrom?.label ?? "last month";

  const needsSpent = NEEDS_KEYS.reduce((sum, k) => sum + ((breakdown as Record<string, number>)[k] ?? 0), 0);
  const wantsSpent = WANTS_KEYS.reduce((sum, k) => sum + ((breakdown as Record<string, number>)[k] ?? 0), 0);

  const breakdownEntries = Object.entries(breakdown).filter(([key]) => CATEGORY_BY_KEY[key]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      onLayout={onLayoutRootView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7DF9C2" />
      }
    >
      <AmbientGlow intensity="strong" />

      <FadeSlideIn delay={0}>
        <View style={styles.monthNav}>
          <PressScale onPress={() => go(-1)} style={styles.navBtn}>
            <Text style={styles.navChevron}>‹</Text>
          </PressScale>
          <View style={styles.monthNavCenter}>
            <Text style={styles.monthLabel}>{monthTitle(view.year, view.month)}</Text>
            {!viewingNow && (
              <PressScale onPress={() => { Haptics.selectionAsync().catch(() => {}); setView(nowView()); }}>
                <Text style={styles.nowLink}>This month</Text>
              </PressScale>
            )}
          </View>
          <PressScale
            onPress={() => go(1)}
            disabled={viewingNow}
            style={[styles.navBtn, viewingNow && styles.navBtnOff]}
          >
            <Text style={[styles.navChevron, viewingNow && styles.navChevronOff]}>›</Text>
          </PressScale>
        </View>
        <Text style={styles.title}>Budget</Text>
      </FadeSlideIn>

      <FadeSlideIn delay={90}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Earned</Text>
          <AnimatedNumber value={earned} formatter={fmt} style={styles.balanceAmount} />

          <DepletingBar total={available} spent={spent} color="#7DF9C2" height={6} />
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>Spent {fmt(spent)}</Text>
            <AnimatedNumber
              value={Math.abs(remaining)}
              formatter={(n) => `${remaining >= 0 ? "Left" : "Over"} ${fmt(n)}`}
              style={[styles.progressText, { color: remaining >= 0 ? "#7DF9C2" : "#FF6B6B" }]}
            />
          </View>
        </View>
      </FadeSlideIn>

      {rollover !== 0 && (
        <FadeSlideIn delay={140}>
          <View style={[styles.rolloverCard, rollover < 0 && styles.rolloverCardNeg]}>
            <View style={styles.rolloverCopy}>
              <Text style={styles.rolloverKicker}>
                {rollover >= 0 ? "Rolled over" : "Carried over"} from {fromLabel}
              </Text>
              <Text style={styles.rolloverHint}>
                {rollover >= 0
                  ? "Added to what you can spend"
                  : "Taken from this month’s available"}
              </Text>
            </View>
            <Text style={[styles.rolloverAmt, { color: rollover >= 0 ? "#7DF9C2" : "#FF6B6B" }]}>
              {rollover >= 0 ? "+" : "−"}
              {fmt(rollover)}
            </Text>
          </View>
          <Text style={styles.availableLine}>Available {fmt(available)}</Text>
        </FadeSlideIn>
      )}

      {rollover === 0 && (
        <Text style={styles.availableLineSolo}>Available {fmt(available)}</Text>
      )}

      <FadeSlideIn delay={180}>
        <Text style={styles.sectionTitle}>50 / 30 / 20</Text>
        <View style={styles.bucketsRow}>
          <BucketCard label="Needs"  target={targets.needs}       spent={needsSpent} color="#7DF9C2" delay={0} />
          <BucketCard label="Wants"  target={targets.wants}       spent={wantsSpent} color="#FFD166" delay={120} />
          <BucketCard label="Invest" target={targets.investments} spent={0}          color="#A78BFA" noSpend delay={240} />
        </View>
      </FadeSlideIn>

      <Text style={styles.sectionTitle}>Breakdown</Text>
      <View style={styles.breakdownGrid}>
        {breakdownEntries.map(([key, amount], i) => {
          const cat = CATEGORY_BY_KEY[key];
          if (!cat) return null;
          return (
            <FadeSlideIn key={key} delay={260 + i * 70} style={styles.breakdownItem}>
              <View style={[styles.breakdownAccent, { backgroundColor: cat.color }]} />
              <Text style={styles.breakdownEmoji}>{cat.emoji}</Text>
              <Text style={styles.breakdownLabel}>{cat.label}</Text>
              <AnimatedNumber
                value={amount as number}
                formatter={fmt}
                style={styles.breakdownAmount}
                duration={800}
              />
            </FadeSlideIn>
          );
        })}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

type BucketCardProps = {
  label: string;
  target: number;
  spent: number;
  color: string;
  noSpend?: boolean;
  delay?: number;
};

function BucketCard({ label, target, spent, color, noSpend, delay = 0 }: BucketCardProps) {
  const remaining = target - spent;

  return (
    <View style={[styles.bucketCard, { borderTopColor: color }]}>
      <Text style={[styles.bucketLabel, { color }]}>{label}</Text>
      <AnimatedNumber value={target} formatter={fmt} style={styles.bucketTarget} duration={700} />
      {!noSpend && (
        <>
          <DepletingBar total={target} spent={spent} color={color} height={4} delay={delay} />
          <Text style={styles.bucketRemaining}>
            {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
          </Text>
        </>
      )}
      {noSpend && (
        <>
          <DepletingBar total={1} spent={0} color={color} height={4} delay={delay} />
          <Text style={styles.bucketRemaining}>Target</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0D0D0F" },
  container: { padding: 24, paddingTop: 56, paddingBottom: 120 },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0D0D0F",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#7DF9C2", fontFamily: "Poppins", fontSize: 16 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  monthNavCenter: { flex: 1, alignItems: "center" },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#16161A",
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnOff: { opacity: 0.35 },
  navChevron: { fontFamily: "PoppinsBold", fontSize: 28, color: "#F0F0F0", marginTop: -4 },
  navChevronOff: { color: "#444" },
  monthLabel: {
    fontFamily: "PoppinsBold",
    fontSize: 15,
    color: "#AAA",
    letterSpacing: 0.5,
  },
  nowLink: {
    fontFamily: "Poppins",
    fontSize: 12,
    color: "#7DF9C2",
    marginTop: 2,
  },
  title: { fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0", lineHeight: 46, marginBottom: 22 },
  balanceCard: {
    backgroundColor: "#16161A",
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
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
  balanceAmount: { fontFamily: "PoppinsBold", fontSize: 38, color: "#F0F0F0", marginBottom: 16 },
  rolloverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D2A1F",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#1A4A38",
    marginBottom: 10,
    gap: 12,
  },
  rolloverCardNeg: {
    backgroundColor: "#2A1515",
    borderColor: "#4A1A1A",
  },
  rolloverCopy: { flex: 1 },
  rolloverKicker: {
    fontFamily: "PoppinsBold",
    fontSize: 14,
    color: "#F0F0F0",
    marginBottom: 2,
  },
  rolloverHint: { fontFamily: "Poppins", fontSize: 12, color: "#888" },
  rolloverAmt: { fontFamily: "PoppinsBold", fontSize: 22 },
  availableLine: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#888",
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  availableLineSolo: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#888",
    marginBottom: 28,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
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
  bucketRemaining: { fontFamily: "Poppins", fontSize: 11, color: "#555", marginTop: 6 },
  breakdownGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  breakdownItem: {
    width: "47%",
    backgroundColor: "#16161A",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
  },
  breakdownAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  breakdownEmoji: { fontSize: 22, marginBottom: 6 },
  breakdownLabel: { fontFamily: "Poppins", fontSize: 12, color: "#666", marginBottom: 2 },
  breakdownAmount: { fontFamily: "PoppinsBold", fontSize: 18, color: "#F0F0F0" },
  errorTitle: {
    fontFamily: "PoppinsBold",
    fontSize: 20,
    color: "#F0F0F0",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  error: {
    color: "#FF6B6B",
    fontFamily: "Poppins",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 24,
  },
  retryHint: {
    color: "#555",
    fontFamily: "Poppins",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
});
