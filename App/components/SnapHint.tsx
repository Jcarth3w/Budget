import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export function SnapHint({ label = "Trend" }: { label?: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(y.value, [0, 1], [0, 7]) }],
    opacity: interpolate(y.value, [0, 1], [0.45, 1]),
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <Text style={styles.arrow}>⌄</Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 4, paddingBottom: 8 },
  arrow: { color: "#7DF9C2", fontSize: 22, lineHeight: 22, marginBottom: -4 },
  label: {
    fontFamily: "Poppins",
    fontSize: 11,
    color: "#555",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
});
