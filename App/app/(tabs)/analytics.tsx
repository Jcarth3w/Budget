import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useTrends } from "@/hooks/useTrends";
import { CATEGORIES, CATEGORY_BY_KEY } from "@/constants/categories";
import { fmt, pctChange } from "@/utils/format";
import { AmbientGlow, PressScale } from "@/components/motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AreaChart } from "@/components/AreaChart";
import { MonthRing } from "@/components/MonthRing";
import { SnapHint } from "@/components/SnapHint";

function tap() {
  Haptics.selectionAsync().catch(() => {});
}

const ALL = { key: "all" as const, label: "All spending", emoji: "✨", color: "#7DF9C2" };
const TAB_H = 78;

export default function AnalyticsScreen() {
  const { data, loading, refreshing, error, refresh } = useTrends();
  const [selected, setSelected] = useState<string | "all">("all");
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const { height } = useWindowDimensions();
  const pageH = Math.max(height - TAB_H, 520);

  const months = data?.months ?? [];
  const current = months[months.length - 1];
  const focus = selected === "all" ? ALL : (CATEGORY_BY_KEY[selected] ?? ALL);

  const stats = useMemo(() => {
    const values = months.map((m) =>
      selected === "all" ? m.spent : ((m.breakdown as Record<string, number>)[selected] ?? 0)
    );
    const latest = values[values.length - 1] ?? 0;
    const prev = values[values.length - 2];
    const mom = prev == null ? null : pctChange(latest, prev);
    const period = values.reduce((s, v) => s + v, 0);
    return { values, latest, prev, mom, period };
  }, [months, selected]);

  const monthIndex = activeMonth ?? Math.max(months.length - 1, 0);

  const renderPicker = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pickerRow}
    >
      {[ALL, ...CATEGORIES].map((cat) => {
        const on = cat.key === selected;
        return (
          <PressScale
            key={cat.key}
            scaleTo={0.9}
            onPress={() => {
              tap();
              setSelected(cat.key);
              setActiveMonth(null);
            }}
            style={[
              styles.dot,
              on && { borderColor: cat.color, backgroundColor: `${cat.color}22` },
            ]}
          >
            <Text style={[styles.dotEmoji, on && styles.dotEmojiOn]}>{cat.emoji}</Text>
          </PressScale>
        );
      })}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7DF9C2" />
        <Text style={styles.loadingText}>Loading trends...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.loadingContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7DF9C2" />
        }
      >
        <Text style={styles.errorTitle}>Couldn’t load analytics</Text>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.retryHint}>Pull down to retry</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      pagingEnabled
      snapToInterval={pageH}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7DF9C2" />
      }
    >
      {/* Page 1 — this month */}
      <View style={[styles.page, { height: pageH }]}>
        <AmbientGlow color={focus.color} intensity="strong" />
        <Animated.View key={focus.key} entering={FadeInDown.duration(420).springify().damping(18)}>
          <Text style={styles.kicker}>This month</Text>
          <View style={styles.identity}>
            <Animated.Text entering={ZoomIn.springify().damping(12)} style={styles.heroEmoji}>
              {focus.emoji}
            </Animated.Text>
            <Text style={[styles.heroName, { color: focus.color }]}>{focus.label}</Text>
          </View>
          <AnimatedNumber value={stats.latest} formatter={fmt} style={styles.heroAmount} duration={700} />
          <View style={styles.metaRow}>
            {stats.mom != null && (
              <View
                style={[
                  styles.pill,
                  { backgroundColor: stats.mom <= 0 ? "#0D2A1F" : "#2A1515" },
                ]}
              >
                <Text style={[styles.pillText, { color: stats.mom <= 0 ? "#7DF9C2" : "#FF6B6B" }]}>
                  {stats.mom > 0 ? "▲" : "▼"} {Math.abs(stats.mom).toFixed(0)}% vs last month
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.ringWrap}>
          {current ? (
            <MonthRing
              breakdown={current.breakdown}
              highlightKey={selected}
              centerLabel={selected === "all" ? "Spent" : focus.label}
              centerValue={stats.latest}
            />
          ) : (
            <Text style={styles.empty}>No spending yet</Text>
          )}
        </View>

        {renderPicker()}
        <SnapHint label="Trend" />
      </View>

      {/* Page 2 — trend */}
      <View style={[styles.page, { height: pageH }]}>
        <AmbientGlow color={focus.color} intensity="strong" />
        <Text style={styles.kicker}>Monthly trend</Text>
        <Text style={[styles.trendTitle, { color: focus.color }]}>
          {focus.emoji} {focus.label}
        </Text>
        <Text style={styles.periodHint}>{fmt(stats.period)} across {months.length} months</Text>

        <Animated.View entering={FadeIn.duration(500)} style={styles.chartBlock}>
          {months.length === 0 ? (
            <Text style={styles.empty}>No months to show yet</Text>
          ) : (
            <AreaChart
              months={months}
              seriesKey={selected}
              color={focus.color}
              activeMonthIndex={monthIndex}
              onSelectMonth={(i) => {
                tap();
                setActiveMonth(i);
              }}
            />
          )}
        </Animated.View>
        <View style={styles.pickerDock}>{renderPicker()}</View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0D0D0F" },
  page: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    justifyContent: "flex-start",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0D0D0F",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: "#7DF9C2", fontFamily: "Poppins", fontSize: 16 },
  kicker: {
    fontFamily: "Poppins",
    fontSize: 12,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  heroEmoji: { fontSize: 28 },
  heroName: { fontFamily: "PoppinsBold", fontSize: 24, lineHeight: 30, flex: 1 },
  heroAmount: { fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0", lineHeight: 48, marginBottom: 8 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 4 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { fontFamily: "PoppinsBold", fontSize: 12 },
  periodHint: { fontFamily: "Poppins", fontSize: 13, color: "#555", marginBottom: 4 },
  trendTitle: { fontFamily: "PoppinsBold", fontSize: 28, lineHeight: 34, marginBottom: 4 },
  ringWrap: { alignItems: "center", justifyContent: "center", flex: 1 },
  chartBlock: { marginHorizontal: -8, marginTop: 4, flex: 1, minHeight: 0, width: "100%" },
  empty: { fontFamily: "Poppins", fontSize: 14, color: "#555", textAlign: "center", padding: 24 },
  pickerDock: { marginTop: 4, marginBottom: 4 },
  pickerRow: { gap: 12, paddingVertical: 4, paddingHorizontal: 2, alignItems: "center" },
  dot: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#16161A",
    borderWidth: 1.5,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  dotEmoji: { fontSize: 30 },
  dotEmojiOn: { fontSize: 34 },
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
