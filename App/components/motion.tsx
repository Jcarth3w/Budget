import React, { useEffect } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const enterEase = Easing.out(Easing.cubic);

export function FadeSlideIn({
  children,
  delay = 0,
  duration = 560,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(duration).easing(enterEase)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

export function PressScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.97,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 16, stiffness: 420 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
      }}
      style={style}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

/** Soft color orb — intensity="strong" for screens that need more life. */
export function AmbientGlow({
  color = "#7DF9C2",
  style,
  intensity = "soft",
}: {
  color?: string;
  style?: StyleProp<ViewStyle>;
  intensity?: "soft" | "strong";
}) {
  const pulse = useSharedValue(0);
  const strong = intensity === "strong";

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: strong ? 2800 : 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [pulse, strong]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], strong ? [0.12, 0.26] : [0.045, 0.09]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, strong ? 1.14 : 1.08]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -90,
          right: -70,
          width: strong ? 300 : 240,
          height: strong ? 300 : 240,
          borderRadius: strong ? 150 : 120,
          backgroundColor: color,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
