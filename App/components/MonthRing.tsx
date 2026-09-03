import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { CATEGORIES } from "@/constants/categories";
import { fmt } from "@/utils/format";
import type { BudgetBreakdown } from "@/hooks/useBudget";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  breakdown: BudgetBreakdown;
  highlightKey?: string | "all";
  size?: number;
  centerLabel?: string;
  centerValue?: number;
};

function Arc({
  color,
  radius,
  circ,
  length,
  offset,
  cx,
  dimmed,
}: {
  color: string;
  radius: number;
  circ: number;
  length: number;
  offset: number;
  cx: number;
  dimmed: boolean;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [progress, length, offset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${progress.value * length} ${circ}`,
    strokeDashoffset: -offset,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cx}
      r={radius}
      stroke={color}
      strokeWidth={dimmed ? 14 : 22}
      strokeLinecap="butt"
      fill="none"
      opacity={dimmed ? 0.22 : 1}
      transform={`rotate(-90 ${cx} ${cx})`}
      animatedProps={animatedProps}
    />
  );
}

export function MonthRing({
  breakdown,
  highlightKey = "all",
  size = 236,
  centerLabel = "Spent",
  centerValue,
}: Props) {
  const slices = CATEGORIES.map((cat) => ({
    ...cat,
    value: (breakdown as Record<string, number>)[cat.key] ?? 0,
  })).filter((s) => s.value > 0);

  const total = slices.reduce((s, x) => s + x.value, 0);
  const display = centerValue != null ? centerValue : total;
  const cx = size / 2;
  const radius = size / 2 - 18;
  const circ = 2 * Math.PI * radius;
  const gap = total > 0 ? 6 : 0;

  let cursor = 0;
  const usable = Math.max(circ - gap * slices.length, 1);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cx}
          r={radius}
          stroke="#1A1A1E"
          strokeWidth={22}
          fill="none"
        />
        {total > 0 &&
          slices.map((s) => {
            const length = (s.value / total) * usable;
            const offset = cursor;
            cursor += length + gap;
            const dimmed = highlightKey !== "all" && highlightKey !== s.key;
            return (
              <Arc
                key={s.key}
                color={s.color}
                radius={radius}
                circ={circ}
                length={length}
                offset={offset}
                cx={cx}
                dimmed={dimmed}
              />
            );
          })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.centerLabel}>{centerLabel}</Text>
        <Text style={styles.centerValue} numberOfLines={1}>
          {fmt(display)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  centerLabel: {
    fontFamily: "Poppins",
    fontSize: 11,
    color: "#666",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  centerValue: {
    fontFamily: "PoppinsBold",
    fontSize: 22,
    color: "#F0F0F0",
  },
});
