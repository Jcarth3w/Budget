import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import SERVER_URL from "@/config/server";
import { CATEGORY_BY_COL } from "../constants/categories";

export function useTransaction() {
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const showSuccess = useCallback((message: string) => {
    setStatus({ type: "success", message });
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setStatus(null));
  }, [successAnim]);

  const reset = useCallback(() => {
    setAmount("");
    setSelectedCategory(null);
    setDate(new Date());
  }, []);

  const submit = useCallback(async () => {
    // Validate
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      shake();
      setStatus({ type: "error", message: "Enter a valid amount." });
      return;
    }
    if (!selectedCategory) {
      shake();
      setStatus({ type: "error", message: "Pick a category." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${SERVER_URL}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category: selectedCategory,
          date: date.toISOString(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong");

      const categoryLabel = CATEGORY_BY_COL[selectedCategory]?.label ?? selectedCategory;
      showSuccess(`$${parseFloat(amount).toFixed(2)} added to ${categoryLabel}`);
      reset();
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [amount, selectedCategory, date, shake, showSuccess, reset]);

  return {
    amount, setAmount,
    selectedCategory, setSelectedCategory,
    date, setDate,
    loading,
    status,
    shakeAnim,
    submit,
  };
}