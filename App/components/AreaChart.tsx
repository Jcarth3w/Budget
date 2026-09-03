import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { fmt, fmtCompact } from "@/utils/format";
import type { MonthTrend } from "@/hooks/useTrends";

const PAD_TOP = 36;
const PAD_BOTTOM = 28;
const PAD_X = 10;
const MIN_PLOT_H = 140;

type Point = { x: number; y: number };

function seriesValue(month: MonthTrend, key: string | "all") {
  if (key === "all") return month.spent;
  return (month.breakdown as Record<string, number>)[key] ?? 0;
}

function smoothLine(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

type Props = {
  months: MonthTrend[];
  seriesKey: string | "all";
  color: string;
  activeMonthIndex: number;
  onSelectMonth: (index: number) => void;
};

export function AreaChart({ months, seriesKey, color, activeMonthIndex, onSelectMonth }: Props) {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const pulse = useSharedValue(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [pulse]);

  const seriesId = `${seriesKey}:${months.map((m) => m.key).join(",")}`;
  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [reveal, seriesId]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.25, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.55]) }],
  }));

  const chartStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: interpolate(reveal.value, [0, 1], [18, 0]) }],
  }));

  const values = useMemo(
    () => months.map((m) => seriesValue(m, seriesKey)),
    [months, seriesKey]
  );
  const maxVal = Math.max(...values, 1) * 1.08;

  const plotW = Math.max(width - PAD_X * 2, 0);
  const plotH = Math.max(height - PAD_TOP - PAD_BOTTOM, MIN_PLOT_H);
  const n = months.length;
  const step = n > 1 ? plotW / (n - 1) : plotW;

  const points: Point[] = values.map((v, i) => ({
    x: PAD_X + i * step,
    y: PAD_TOP + (1 - v / maxVal) * plotH,
  }));

  const line = smoothLine(points);
  const area =
    points.length > 0
      ? `${line} L ${points[points.length - 1].x} ${PAD_TOP + plotH} L ${points[0].x} ${PAD_TOP + plotH} Z`
      : "";

  const active = points[activeMonthIndex] ?? points[points.length - 1];
  const activeMonth = months[activeMonthIndex] ?? months[months.length - 1];
  const activeValue = values[activeMonthIndex] ?? 0;

  const gradId = `area-${color.replace("#", "")}`;
  const svgH = PAD_TOP + plotH + PAD_BOTTOM;

  const tooltipLeft = active
    ? Math.min(Math.max(active.x - 52, 4), Math.max(width - 108, 4))
    : 0;

  return (
    <View
      style={styles.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width);
        setHeight(e.nativeEvent.layout.height);
      }}
    >
      {width > 0 && height > 0 && (
        <Animated.View style={[chartStyle, styles.chartInner]}>
          <Svg width={width} height={svgH}>
            <Defs>
              <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={0.42} />
                <Stop offset="0.55" stopColor={color} stopOpacity={0.12} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Line
              x1={PAD_X}
              x2={width - PAD_X}
              y1={PAD_TOP + plotH}
              y2={PAD_TOP + plotH}
              stroke="#222"
              strokeWidth={1}
            />
            {active && (
              <Line
                x1={active.x}
                x2={active.x}
                y1={PAD_TOP}
                y2={PAD_TOP + plotH}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="4 6"
                opacity={0.45}
              />
            )}
            {area ? <Path d={area} fill={`url(#${gradId})`} /> : null}
            {line ? (
              <Path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {points.map((p, i) => (
              <Circle
                key={months[i].key}
                cx={p.x}
                cy={p.y}
                r={i === activeMonthIndex ? 5 : 3}
                fill={i === activeMonthIndex ? color : "#0D0D0F"}
                stroke={color}
                strokeWidth={i === activeMonthIndex ? 0 : 2}
              />
            ))}
          </Svg>

          {active && (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulse,
                  glowStyle,
                  { left: active.x - 14, top: active.y - 14, backgroundColor: color },
                ]}
              />
              <View
                pointerEvents="none"
                style={[styles.tooltip, { left: tooltipLeft, top: Math.max(active.y - 58, 0) }]}
              >
                <Text style={styles.tooltipMonth}>
                  {activeMonth.label} {activeMonth.year}
                </Text>
                <Text style={[styles.tooltipAmt, { color }]}>{fmt(activeValue)}</Text>
              </View>
            </>
          )}

          <Text style={styles.maxTick}>{fmtCompact(maxVal)}</Text>

          {months.map((m, i) => {
            const x = points[i]?.x ?? 0;
            const activeLbl = i === activeMonthIndex;
            const show = n <= 8 || activeLbl || i === 0 || i === n - 1 || i === Math.floor(n / 2);
            if (!show) return null;
            return (
              <Text
                key={m.key}
                style={[
                  styles.monthLbl,
                  { left: x - 16, color: activeLbl ? color : "#444" },
                  activeLbl && styles.monthLblOn,
                ]}
              >
                {m.label}
              </Text>
            );
          })}

          <View style={styles.hitRow}>
            {months.map((m, i) => (
              <Pressable key={m.key} onPress={() => onSelectMonth(i)} style={styles.hit} />
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: "100%", minHeight: MIN_PLOT_H + PAD_TOP + PAD_BOTTOM },
  chartInner: { flex: 1 },
  pulse: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tooltip: {
    position: "absolute",
    width: 104,
    alignItems: "center",
  },
  tooltipMonth: {
    fontFamily: "Poppins",
    fontSize: 11,
    color: "#888",
    letterSpacing: 0.4,
  },
  tooltipAmt: {
    fontFamily: "PoppinsBold",
    fontSize: 16,
  },
  maxTick: {
    position: "absolute",
    left: PAD_X,
    top: 4,
    fontFamily: "Poppins",
    fontSize: 10,
    color: "#3A3A3A",
  },
  monthLbl: {
    position: "absolute",
    bottom: 2,
    width: 32,
    textAlign: "center",
    fontFamily: "Poppins",
    fontSize: 11,
  },
  monthLblOn: { fontFamily: "PoppinsBold" },
  hitRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    paddingHorizontal: PAD_X,
  },
  hit: { flex: 1 },
});
