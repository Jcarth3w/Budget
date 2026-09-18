import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES, CATEGORY_BY_KEY } from "@/constants/categories";
import { BudgetTheme as theme } from "@/constants/Colors";
import { useTrends } from "@/hooks/useTrends";
import { selectedMonthRows } from "@/utils/analyticsHelpers";
import { fmt } from "@/utils/format";
import { AmbientGlow, FadeSlideIn, PressScale } from "@/components/motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AreaChart } from "@/components/AreaChart";
import { CategoryIcon } from "@/components/CategoryIcon";
import { DepletingBar } from "@/components/DepletingBar";
import { MonthRing } from "@/components/MonthRing";
import { StackedCategoryChart } from "@/components/StackedCategoryChart";

function tap() {
  Haptics.selectionAsync().catch(() => {});
}

export default function AnalyticsScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, refreshing, error, refresh } = useTrends();
  const months = useMemo(() => data?.months ?? [], [data?.months]);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (category && CATEGORY_BY_KEY[category]) setSelectedCategory(category);
  }, [category]);

  const latestIndex = Math.max(months.length - 1, 0);
  const monthIndex = Math.min(activeMonth ?? latestIndex, latestIndex);
  const selectedMonth = months[monthIndex];
  const rows = selectedMonthRows(months, monthIndex);
  const focus = selectedCategory ? CATEGORY_BY_KEY[selectedCategory] : null;
  const focusedAmount = focus && selectedMonth
    ? Number(selectedMonth.breakdown[focus.key as keyof typeof selectedMonth.breakdown]) || 0
    : selectedMonth?.spent ?? 0;

  if (loading && !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.color.accent} />
        <Text style={styles.loadingText}>Building your spending view…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.loading}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.color.accent} />}
      >
        <Text style={styles.errorTitle}>Couldn’t load analytics</Text>
        <Text style={styles.error}>{error}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 10, 28) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.color.accent} />}
    >
      <AmbientGlow color={focus?.color ?? theme.color.accent} intensity="strong" />
      <FadeSlideIn>
        <Text style={styles.eyebrow}>Spending intelligence</Text>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>See what changed, not just what you spent.</Text>
      </FadeSlideIn>

      {selectedMonth ? (
        <>
          <FadeSlideIn delay={60}>
            <View style={styles.overviewCard}>
              <View style={styles.overviewCopy}>
                <Text style={styles.monthName}>{selectedMonth.label} {selectedMonth.year}</Text>
                <Text style={styles.metricLabel}>{focus?.label ?? "Total spending"}</Text>
                <AnimatedNumber value={focusedAmount} formatter={fmt} style={styles.metric} duration={650} />
                <Text style={styles.metricMeta}>
                  {focus
                    ? `${Math.round((focusedAmount / Math.max(selectedMonth.spent, 1)) * 100)}% of this month`
                    : `${rows.filter((row) => row.amount > 0).length} active categories`}
                </Text>
              </View>
              <MonthRing
                breakdown={selectedMonth.breakdown}
                highlightKey={selectedCategory ?? "all"}
                centerLabel="Spent"
                centerValue={selectedMonth.spent}
                size={154}
              />
            </View>
          </FadeSlideIn>

          <SectionHeader title="Category history" subtitle={`${months.length} month view`} />
          <View style={styles.chartCard}>
            <StackedCategoryChart
              months={months}
              selectedMonth={monthIndex}
              selectedCategory={selectedCategory}
              onSelectMonth={(index) => {
                tap();
                setActiveMonth(index);
              }}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.legend}
          >
            <PressScale
              onPress={() => {
                tap();
                setSelectedCategory(null);
              }}
              accessibilityRole="button"
              accessibilityLabel="Show all categories"
              accessibilityState={{ selected: selectedCategory == null }}
              style={[styles.legendChip, selectedCategory == null && styles.legendChipOn]}
            >
              <MaterialIcons name="donut-large" size={18} color={theme.color.accent} />
              <Text style={[styles.legendText, selectedCategory == null && styles.legendTextOn]}>All</Text>
            </PressScale>
            {CATEGORIES.map((item) => {
              const on = selectedCategory === item.key;
              return (
                <PressScale
                  key={item.key}
                  onPress={() => {
                    tap();
                    setSelectedCategory(on ? null : item.key);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} category`}
                  accessibilityState={{ selected: on }}
                  style={[styles.legendChip, on && { borderColor: `${item.color}88`, backgroundColor: `${item.color}14` }]}
                >
                  <CategoryIcon name={item.icon} color={item.color} size={16} containerSize={28} />
                  <Text style={[styles.legendText, on && { color: item.color }]}>{item.label}</Text>
                </PressScale>
              );
            })}
          </ScrollView>

          {focus ? (
            <FadeSlideIn>
              <View style={styles.detailCard}>
                <View style={styles.detailTitle}>
                  <CategoryIcon name={focus.icon} color={focus.color} />
                  <View>
                    <Text style={styles.detailLabel}>{focus.label} trend</Text>
                    <Text style={styles.detailMeta}>Tap any point for its exact amount</Text>
                  </View>
                </View>
                <View style={styles.areaChart}>
                  <AreaChart
                    months={months}
                    seriesKey={focus.key}
                    color={focus.color}
                    activeMonthIndex={monthIndex}
                    onSelectMonth={(index) => {
                      tap();
                      setActiveMonth(index);
                    }}
                  />
                </View>
              </View>
            </FadeSlideIn>
          ) : null}

          <SectionHeader title={`${selectedMonth.label} breakdown`} subtitle="Compared with prior month" />
          <View style={styles.ranking}>
            {rows.map(({ category: item, amount, delta, share }) => {
              const active = selectedCategory === item.key;
              return (
                <PressScale
                  key={item.key}
                  onPress={() => {
                    tap();
                    setSelectedCategory(active ? null : item.key);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}, ${fmt(amount)}, ${Math.round(share * 100)} percent`}
                  accessibilityState={{ selected: active }}
                  style={[styles.rankCard, active && { borderColor: `${item.color}77` }]}
                >
                  <View style={styles.rankTop}>
                    <CategoryIcon name={item.icon} color={item.color} size={19} containerSize={38} />
                    <View style={styles.rankMain}>
                      <Text style={styles.rankName}>{item.label}</Text>
                      <Text style={styles.rankShare}>{Math.round(share * 100)}% of spending</Text>
                    </View>
                    <View style={styles.rankAmountWrap}>
                      <Text style={styles.rankAmount}>{fmt(amount)}</Text>
                      <Text style={[styles.rankDelta, delta > 0 && styles.rankDeltaUp]}>
                        {monthIndex === 0
                          ? "No prior month"
                          : delta === 0
                            ? "No change"
                            : `${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))}`}
                      </Text>
                    </View>
                  </View>
                  <DepletingBar total={Math.max(selectedMonth.spent, 1)} spent={amount} color={item.color} height={4} />
                </PressScale>
              );
            })}
          </View>
        </>
      ) : (
        <Text style={styles.empty}>No spending history yet.</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.color.background },
  container: { paddingHorizontal: 20, paddingBottom: 120 },
  loading: {
    flexGrow: 1,
    backgroundColor: theme.color.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: { color: theme.color.accent, fontFamily: "Poppins", fontSize: 15 },
  eyebrow: { color: theme.color.accent, fontFamily: "PoppinsBold", fontSize: 10, letterSpacing: 1.7, textTransform: "uppercase" },
  title: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 36, lineHeight: 43, marginTop: 2 },
  subtitle: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 13, marginBottom: 18 },
  overviewCard: {
    minHeight: 180,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingLeft: 18,
    paddingRight: 8,
    marginBottom: 28,
  },
  overviewCopy: { flex: 1, minWidth: 0 },
  monthName: { color: theme.color.accent, fontFamily: "PoppinsBold", fontSize: 11, letterSpacing: 0.7 },
  metricLabel: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 12, marginTop: 8 },
  metric: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 28, lineHeight: 36 },
  metricMeta: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  sectionTitle: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 18 },
  sectionSubtitle: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10 },
  chartCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    paddingVertical: 12,
    marginBottom: 10,
  },
  legend: { gap: 8, paddingVertical: 8, paddingRight: 8, marginBottom: 18 },
  legendChip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    paddingHorizontal: 9,
  },
  legendChipOn: { borderColor: `${theme.color.accent}88`, backgroundColor: "#123025" },
  legendText: { color: theme.color.textMuted, fontFamily: "PoppinsBold", fontSize: 11 },
  legendTextOn: { color: theme.color.accent },
  detailCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    padding: 14,
    marginBottom: 26,
  },
  detailTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailLabel: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 14 },
  detailMeta: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10 },
  areaChart: { height: 235, marginTop: 8 },
  ranking: { gap: 9, marginBottom: 24 },
  rankCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    padding: 13,
  },
  rankTop: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 10 },
  rankMain: { flex: 1 },
  rankName: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 14 },
  rankShare: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 10, marginTop: 2 },
  rankAmountWrap: { alignItems: "flex-end" },
  rankAmount: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 14 },
  rankDelta: { color: theme.color.positive, fontFamily: "Poppins", fontSize: 9, marginTop: 2 },
  rankDeltaUp: { color: theme.color.warning },
  empty: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 14, textAlign: "center", padding: 40 },
  errorTitle: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 20, textAlign: "center" },
  error: { color: theme.color.negative, fontFamily: "Poppins", fontSize: 12, textAlign: "center", marginTop: 12 },
});
