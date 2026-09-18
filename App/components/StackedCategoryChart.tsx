import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { CATEGORIES } from "@/constants/categories";
import type { MonthTrend } from "@/hooks/useTrends";
import { fmt, fmtCompact } from "@/utils/format";
import { BudgetTheme as theme } from "@/constants/Colors";

const CHART_HEIGHT = 210;
const PLOT_TOP = 25;
const PLOT_BOTTOM = 177;
const BAR_WIDTH = 24;
const MONTH_WIDTH = 52;
const LEFT_PAD = 12;

export function StackedCategoryChart({
  months,
  selectedMonth,
  selectedCategory,
  onSelectMonth,
}: {
  months: MonthTrend[];
  selectedMonth: number;
  selectedCategory: string | null;
  onSelectMonth: (index: number) => void;
}) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const contentWidth = Math.max(viewportWidth, months.length * MONTH_WIDTH + LEFT_PAD * 2);
  const maxSpent = Math.max(...months.map((month) => month.spent), 1);
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;

  return (
    <View style={styles.viewport} onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ width: contentWidth }}>
        <View style={{ width: contentWidth, height: CHART_HEIGHT }}>
          <Svg width={contentWidth} height={CHART_HEIGHT}>
            {[0, 0.5, 1].map((ratio) => {
              const y = PLOT_TOP + plotHeight * ratio;
              return (
                <Line
                  key={ratio}
                  x1={0}
                  x2={contentWidth}
                  y1={y}
                  y2={y}
                  stroke={theme.color.borderSoft}
                  strokeWidth={1}
                />
              );
            })}
            {months.map((month, monthIndex) => {
              const x = LEFT_PAD + monthIndex * MONTH_WIDTH + (MONTH_WIDTH - BAR_WIDTH) / 2;
              let bottom = PLOT_BOTTOM;
              const selected = monthIndex === selectedMonth;
              return (
                <G key={month.key}>
                  {CATEGORIES.map((category) => {
                    const amount = Number(month.breakdown[category.key as keyof typeof month.breakdown]) || 0;
                    const height = (amount / maxSpent) * plotHeight;
                    bottom -= height;
                    if (height <= 0) return null;
                    return (
                      <Rect
                        key={category.key}
                        x={x}
                        y={bottom}
                        width={BAR_WIDTH}
                        height={Math.max(height, 1)}
                        rx={2}
                        fill={category.color}
                        opacity={!selectedCategory || selectedCategory === category.key ? 1 : 0.16}
                        stroke={selected ? theme.color.text : "transparent"}
                        strokeWidth={selected ? 0.7 : 0}
                      />
                    );
                  })}
                  <SvgText
                    x={x + BAR_WIDTH / 2}
                    y={15}
                    fill={selected ? theme.color.text : theme.color.textSubtle}
                    fontSize={9}
                    fontFamily="Poppins"
                    textAnchor="middle"
                  >
                    {fmtCompact(month.spent)}
                  </SvgText>
                  <SvgText
                    x={x + BAR_WIDTH / 2}
                    y={199}
                    fill={selected ? theme.color.accent : theme.color.textSubtle}
                    fontSize={10}
                    fontFamily={selected ? "PoppinsBold" : "Poppins"}
                    textAnchor="middle"
                  >
                    {month.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
          {months.map((month, index) => (
            <Pressable
              key={month.key}
              onPress={() => onSelectMonth(index)}
              accessibilityRole="button"
              accessibilityLabel={`${month.label} ${month.year}, ${fmt(month.spent)} spent`}
              accessibilityState={{ selected: index === selectedMonth }}
              style={[
                styles.hitArea,
                {
                  left: LEFT_PAD + index * MONTH_WIDTH,
                  width: MONTH_WIDTH,
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>
      <Text style={styles.hint}>Tap a month to inspect its categories</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { width: "100%" },
  hitArea: { position: "absolute", top: 0, height: CHART_HEIGHT },
  hint: { color: theme.color.textSubtle, fontFamily: "Poppins", fontSize: 10, textAlign: "center", marginTop: 2 },
});
