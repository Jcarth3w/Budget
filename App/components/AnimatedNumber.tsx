import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleProp, Text, TextStyle } from "react-native";

type Props = {
  value: number;
  formatter?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
};

export function AnimatedNumber({
  value,
  formatter = (n) => String(Math.round(n)),
  style,
  duration = 900,
}: Props) {
  const [shown, setShown] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const previous = useRef(0);

  useEffect(() => {
    anim.setValue(previous.current);
    const id = anim.addListener(({ value: v }) => setShown(v));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      previous.current = value;
      setShown(value);
    });
    return () => anim.removeListener(id);
  }, [anim, value, duration]);

  return <Text style={style}>{formatter(shown)}</Text>;
}
