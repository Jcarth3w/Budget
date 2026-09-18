import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useBudget, type BucketProgress } from "@/hooks/useBudget";
import { useTrends } from "@/hooks/useTrends";
import { NEEDS_KEYS, WANTS_KEYS } from "@/constants/categories";
import { BudgetTheme as theme } from "@/constants/Colors";
import { fmt, isCurrentMonth, monthTitle, shiftMonth } from "@/utils/format";
import { categoryRows, displayNameFromEmail, greetingForDate } from "@/utils/budgetHelpers";
import { buildBudgetInsights } from "@/utils/suggestions";
import { AmbientGlow, FadeSlideIn, PressScale } from "@/components/motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CategoryCard } from "@/components/CategoryCard";
import { DepletingBar } from "@/components/DepletingBar";
import { InsightCard } from "@/components/InsightCard";

function nowView() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export default function HomeScreen() {
  const [view, setView] = useState(nowView);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [insightIndex, setInsightIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data, loading, refreshing, error, refresh } = useBudget(view);
  const { data: trends } = useTrends();

  const viewingNow = isCurrentMonth(view.year, view.month);
  const go = (delta: number) => {
    const next = shiftMonth(view.year, view.month, delta);
    const now = nowView();
    if (next.year * 12 + next.month > now.year * 12 + now.month) return;
    Haptics.selectionAsync().catch(() => {});
    setExpandedCategory(null);
    setView(next);
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.color.accent} />
        <Text style={styles.loadingText}>Loading your budget…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.loadingContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.color.accent} />}
      >
        <Text style={styles.errorTitle}>Couldn’t load your budget</Text>
        <Text style={styles.error}>{error}</Text>
        <Text style={styles.retryHint}>Pull down to retry</Text>
      </ScrollView>
    );
  }

  const spent = data?.spent ?? 0;
  const rollover = data?.rollover ?? 0;
  const available = data?.available ?? 0;
  const remaining = data?.remaining ?? available - spent;
  const breakdown = data?.breakdown ?? {};
  const needsSpent = data?.buckets?.needs.spent
    ?? NEEDS_KEYS.reduce((sum, key) => sum + (Number(breakdown[key as keyof typeof breakdown]) || 0), 0);
  const wantsSpent = data?.buckets?.wants.spent
    ?? WANTS_KEYS.reduce((sum, key) => sum + (Number(breakdown[key as keyof typeof breakdown]) || 0), 0);
  const fallbackBucket = (availableAmount: number, bucketSpent: number): BucketProgress => ({
    allocated: availableAmount,
    rollover: 0,
    available: availableAmount,
    spent: bucketSpent,
    remaining: availableAmount - bucketSpent,
  });
  const needs = data?.buckets?.needs ?? fallbackBucket(data?.budget503020.needs ?? 0, needsSpent);
  const wants = data?.buckets?.wants ?? fallbackBucket(data?.budget503020.wants ?? 0, wantsSpent);
  const investments = data?.buckets?.investments
    ?? fallbackBucket(data?.budget503020.investments ?? 0, 0);

  const trendIndex = trends?.months.findIndex((month) => month.year === view.year && month.month === view.month) ?? -1;
  const previousBreakdown = trendIndex > 0 ? trends?.months[trendIndex - 1].breakdown : undefined;
  const rows = categoryRows(breakdown, previousBreakdown, spent);
  const percentUsed = available > 0 ? Math.round((spent / available) * 100) : 0;
  const insights = data
    ? buildBudgetInsights(data, trends?.months ?? []).filter((insight) => !dismissedInsights.includes(insight.id))
    : [];
  const activeInsightIndex = insights.length > 0 ? insightIndex % insights.length : 0;
  const activeInsight = insights[activeInsightIndex];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 10, 24) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.color.accent} />}
    >
      <AmbientGlow intensity="strong" />

      <FadeSlideIn>
        <View style={styles.heroTop}>
          <View style={styles.greetingWrap}>
            <Text style={styles.eyebrow}>{greetingForDate()}</Text>
            <Text style={styles.greeting} numberOfLines={1}>{displayNameFromEmail(user?.email)}</Text>
          </View>
          <View style={styles.actions}>
            {data?.spreadsheetUrl ? (
              <IconAction
                icon="description"
                label="Open spreadsheet"
                onPress={() => Linking.openURL(data.spreadsheetUrl as string).catch(() => {})}
              />
            ) : null}
            <IconAction icon="logout" label="Log out" onPress={() => logout().catch(() => {})} />
          </View>
        </View>

        <View style={styles.monthNav}>
          <PressScale
            onPress={() => go(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.navButton}
          >
            <MaterialIcons name="chevron-left" size={24} color={theme.color.text} />
          </PressScale>
          <View style={styles.monthCenter}>
            <Text style={styles.monthLabel}>{monthTitle(view.year, view.month)}</Text>
            {!viewingNow ? (
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Return to this month"
                onPress={() => setView(nowView())}
              >
                <Text style={styles.nowLink}>Return to this month</Text>
              </PressScale>
            ) : (
              <Text style={styles.currentLabel}>Current cycle</Text>
            )}
          </View>
          <PressScale
            onPress={() => go(1)}
            disabled={viewingNow}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: viewingNow }}
            style={[styles.navButton, viewingNow && styles.navButtonDisabled]}
          >
            <MaterialIcons name="chevron-right" size={24} color={theme.color.text} />
          </PressScale>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={70}>
        <View style={styles.allowanceCard}>
          <View style={styles.allowanceHeader}>
            <View>
              <Text style={styles.allowanceLabel}>Monthly allowance</Text>
              <AnimatedNumber value={available} formatter={fmt} style={styles.allowanceAmount} duration={650} />
            </View>
            <View style={[styles.statusPill, remaining < 0 && styles.statusPillOver]}>
              <Text style={[styles.statusText, remaining < 0 && styles.statusTextOver]}>
                {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
              </Text>
            </View>
          </View>
          <DepletingBar
            total={Math.max(available, 1)}
            spent={spent}
            color={remaining >= 0 ? theme.color.accent : theme.color.negative}
            height={7}
          />
          <View style={styles.allowanceFooter}>
            <Text style={styles.allowanceMeta}>{fmt(spent)} spent</Text>
            <Text style={styles.allowanceMeta}>{percentUsed}% used</Text>
          </View>
          {rollover !== 0 ? (
            <Text style={styles.rolloverText}>
              Includes {fmt(rollover)} carried from {data?.rolloverFrom?.label ?? "earlier months"}
            </Text>
          ) : null}
        </View>
      </FadeSlideIn>

      {activeInsight ? (
        <FadeSlideIn delay={110}>
          <InsightCard
            insight={activeInsight}
            position={activeInsightIndex}
            total={insights.length}
            onNext={() => setInsightIndex((current) => (current + 1) % insights.length)}
            onDismiss={() => {
              setDismissedInsights((current) => [...current, activeInsight.id]);
              setInsightIndex(0);
            }}
          />
        </FadeSlideIn>
      ) : null}

      <SectionHeader title="Your plan" subtitle="50 / 30 / 20 allocation" />
      <View style={styles.bucketStack}>
        <BucketCard label="Needs" progress={needs} color={theme.color.accent} />
        <BucketCard label="Wants" progress={wants} color={theme.color.warning} />
        <BucketCard label="Invest" progress={investments} color="#A78BFA" />
      </View>

      <SectionHeader title="Spending" subtitle="Tap a category for details" />
      <View style={styles.categoryStack}>
        {rows.map(({ category, amount, previous, share }, index) => (
          <FadeSlideIn key={category.key} delay={Math.min(index * 35, 180)}>
            <CategoryCard
              category={category}
              amount={amount}
              previous={previous}
              share={share}
              bucketSpent={category.bucket === "needs" ? needsSpent : wantsSpent}
              expanded={expandedCategory === category.key}
              onToggle={() => setExpandedCategory((current) => current === category.key ? null : category.key)}
              onViewTrend={() => router.push({ pathname: "/(tabs)/analytics", params: { category: category.key } })}
            />
          </FadeSlideIn>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function IconAction({ icon, label, onPress }: { icon: "description" | "logout"; label: string; onPress: () => void }) {
  return (
    <PressScale
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.iconAction}
    >
      <MaterialIcons name={icon} size={20} color={theme.color.textMuted} />
    </PressScale>
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

function BucketCard({ label, progress, color }: { label: string; progress: BucketProgress; color: string }) {
  const over = progress.remaining < 0;
  return (
    <View style={styles.bucketCard}>
      <View style={[styles.bucketAccent, { backgroundColor: color }]} />
      <View style={styles.bucketHeader}>
        <View>
          <Text style={[styles.bucketLabel, { color }]}>{label}</Text>
          <Text style={styles.bucketAllocation}>{fmt(progress.available)} available</Text>
        </View>
        <View style={styles.bucketRight}>
          <Text style={[styles.bucketRemaining, over && styles.negative]}>
            {over ? `${fmt(Math.abs(progress.remaining))} over` : `${fmt(progress.remaining)} left`}
          </Text>
          <Text style={styles.bucketSpent}>{fmt(progress.spent)} spent</Text>
        </View>
      </View>
      <DepletingBar
        total={Math.max(progress.available, 1)}
        spent={progress.spent}
        color={over ? theme.color.negative : color}
        height={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.color.background },
  container: { paddingHorizontal: 20, paddingBottom: 120 },
  loadingContainer: {
    flexGrow: 1,
    backgroundColor: theme.color.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: { color: theme.color.accent, fontFamily: "Poppins", fontSize: 15 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  greetingWrap: { flex: 1 },
  eyebrow: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 13 },
  greeting: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 34, lineHeight: 40 },
  actions: { flexDirection: "row", gap: 8 },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNav: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 12 },
  monthCenter: { flex: 1, alignItems: "center" },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: { opacity: 0.25 },
  monthLabel: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 14 },
  currentLabel: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10, marginTop: 1 },
  nowLink: { color: theme.color.accent, fontFamily: "Poppins", fontSize: 10, marginTop: 1 },
  allowanceCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: 18,
    marginBottom: 28,
  },
  allowanceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  allowanceLabel: { color: theme.color.textMuted, fontFamily: "PoppinsBold", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  allowanceAmount: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 30, lineHeight: 38 },
  statusPill: { backgroundColor: "#123025", borderRadius: theme.radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  statusPillOver: { backgroundColor: "#321A1D" },
  statusText: { color: theme.color.positive, fontFamily: "PoppinsBold", fontSize: 11 },
  statusTextOver: { color: theme.color.negative },
  allowanceFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  allowanceMeta: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 11 },
  rolloverText: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10, marginTop: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  sectionTitle: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 18 },
  sectionSubtitle: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10 },
  bucketStack: { gap: 10, marginBottom: 28 },
  bucketCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    padding: 15,
    overflow: "hidden",
  },
  bucketAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  bucketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 11 },
  bucketLabel: { fontFamily: "PoppinsBold", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  bucketAllocation: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 11, marginTop: 2 },
  bucketRight: { alignItems: "flex-end" },
  bucketRemaining: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 14 },
  bucketSpent: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10, marginTop: 1 },
  negative: { color: theme.color.negative },
  categoryStack: { gap: 10, marginBottom: 24 },
  errorTitle: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 20, textAlign: "center" },
  error: { color: theme.color.negative, fontFamily: "Poppins", fontSize: 13, textAlign: "center", marginTop: 16 },
  retryHint: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 12 },
});
