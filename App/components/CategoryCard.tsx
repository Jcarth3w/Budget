import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { Category } from "@/constants/categories";
import { fmt } from "@/utils/format";
import { CategoryIcon } from "@/components/CategoryIcon";
import { DepletingBar } from "@/components/DepletingBar";
import { PressScale } from "@/components/motion";
import { BudgetTheme as theme } from "@/constants/Colors";

type Props = {
  category: Category;
  amount: number;
  previous: number;
  share: number;
  bucketSpent: number;
  expanded: boolean;
  onToggle: () => void;
  onViewTrend: () => void;
};

export function CategoryCard({
  category,
  amount,
  previous,
  share,
  bucketSpent,
  expanded,
  onToggle,
  onViewTrend,
}: Props) {
  const delta = amount - previous;
  const bucketShare = bucketSpent > 0 ? amount / bucketSpent : 0;

  return (
    <View style={[styles.card, expanded && { borderColor: `${category.color}66` }]}>
      <PressScale
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${category.label}, ${fmt(amount)}, ${Math.round(share * 100)} percent of spending`}
        accessibilityHint={expanded ? "Collapses category details" : "Expands category details"}
        accessibilityState={{ expanded }}
        style={styles.pressTarget}
      >
        <View style={styles.row}>
          <CategoryIcon name={category.icon} color={category.color} />
          <View style={styles.main}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{category.label}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{category.bucket}</Text>
              </View>
            </View>
            <Text style={styles.meta}>{Math.round(share * 100)}% of monthly spending</Text>
          </View>
          <View style={styles.amountWrap}>
            <Text style={styles.amount}>{fmt(amount)}</Text>
            <MaterialIcons
              name={expanded ? "expand-less" : "expand-more"}
              size={20}
              color={theme.color.textSubtle}
            />
          </View>
        </View>
      </PressScale>

      {expanded ? (
        <View style={styles.details}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailLabel}>Share of {category.bucket}</Text>
            <Text style={styles.detailValue}>{Math.round(bucketShare * 100)}%</Text>
          </View>
          <DepletingBar total={Math.max(bucketSpent, 1)} spent={amount} color={category.color} height={5} />
          <View style={styles.detailFooter}>
            <Text style={[styles.comparison, delta > 0 && styles.comparisonUp]}>
              {previous > 0
                ? `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${fmt(Math.abs(delta))} vs previous month`
                : "No previous-month spending"}
            </Text>
            <PressScale
              onPress={onViewTrend}
              accessibilityRole="button"
              accessibilityLabel={`View ${category.label} trend`}
              style={styles.trendButton}
            >
              <Text style={[styles.trendText, { color: category.color }]}>View trend</Text>
              <MaterialIcons name="arrow-forward" size={16} color={category.color} />
            </PressScale>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    borderColor: theme.color.borderSoft,
    overflow: "hidden",
  },
  pressTarget: { minHeight: 76, justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  main: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 15 },
  badge: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceRaised,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: theme.color.textSubtle,
    fontFamily: "PoppinsBold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  meta: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 11, marginTop: 3 },
  amountWrap: { alignItems: "flex-end" },
  amount: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 16 },
  details: {
    borderTopWidth: 1,
    borderTopColor: theme.color.borderSoft,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 14,
  },
  detailHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  detailLabel: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 11 },
  detailValue: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 11 },
  detailFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 },
  comparison: { flex: 1, color: theme.color.positive, fontFamily: "Poppins", fontSize: 11 },
  comparisonUp: { color: theme.color.warning },
  trendButton: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, justifyContent: "center" },
  trendText: { fontFamily: "PoppinsBold", fontSize: 12 },
});
