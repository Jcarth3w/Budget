import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type DepletingBarProps = {
  total: number;
  spent: number;
  color: string;
  height?: number;
  /** Stagger bar animations (ms) */
  delay?: number;
};

function remainingPercent(total: number, spent: number) {
  if (total <= 0) return 0;
  const remaining = total - spent;
  if (remaining <= 0) return 0;
  return Math.min((remaining / total) * 100, 100);
}

export function DepletingBar({
  total,
  spent,
  color,
  height = 6,
  delay = 0,
}: DepletingBarProps) {
  const anim = useRef(new Animated.Value(100)).current;
  const target = remainingPercent(total, spent);
  const isOver = total > 0 && spent > total;
  const fillColor = isOver ? "#FF6B6B" : color;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: target,
      duration: 850,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, target, delay]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const radius = height / 2;

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radius },
        isOver && styles.trackOver,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width,
            height,
            borderRadius: radius,
            backgroundColor: fillColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: "#222",
    overflow: "hidden",
  },
  trackOver: {
    backgroundColor: "#2a1515",
  },
  fill: {
    alignSelf: "flex-start",
  },
});
