import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";
import type { BudgetInsight } from "@/utils/suggestions";
import { BudgetTheme as theme } from "@/constants/Colors";
import { PressScale } from "@/components/motion";

export function InsightCard({
  insight,
  position,
  total,
  onNext,
  onDismiss,
}: {
  insight: BudgetInsight;
  position: number;
  total: number;
  onNext: () => void;
  onDismiss: () => void;
}) {
  const color = insight.severity === "critical"
    ? theme.color.negative
    : insight.severity === "warning"
      ? theme.color.warning
      : theme.color.accent;
  const icon = insight.severity === "critical"
    ? "error-outline"
    : insight.severity === "warning"
      ? "trending-up"
      : "lightbulb-outline";

  return (
    <View style={[styles.card, { borderColor: `${color}55` }]}>
      <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>Smart insight</Text>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.body}>{insight.body}</Text>
        <View style={styles.footer}>
          <Text style={styles.position}>{position + 1} of {total}</Text>
          <View style={styles.actions}>
            <PressScale
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss insight"
              style={styles.textButton}
            >
              <Text style={styles.dismiss}>Dismiss</Text>
            </PressScale>
            {total > 1 ? (
              <PressScale
                onPress={onNext}
                accessibilityRole="button"
                accessibilityLabel="Next insight"
                style={styles.next}
              >
                <Text style={[styles.nextText, { color }]}>Next</Text>
                <MaterialIcons name="arrow-forward" size={15} color={color} />
              </PressScale>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    padding: 15,
    marginBottom: 28,
  },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  kicker: {
    color: theme.color.textSubtle,
    fontFamily: "PoppinsBold",
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  title: { color: theme.color.text, fontFamily: "PoppinsBold", fontSize: 15, marginTop: 2 },
  body: { color: theme.color.textMuted, fontFamily: "Poppins", fontSize: 12, lineHeight: 18, marginTop: 4 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 9 },
  position: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  textButton: { minHeight: 44, justifyContent: "center" },
  dismiss: { color: theme.color.textSubtle, fontFamily: "PoppinsBold", fontSize: 11 },
  next: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3 },
  nextText: { fontFamily: "PoppinsBold", fontSize: 11 },
});
