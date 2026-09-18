import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import { apiFetch } from "@/utils/api";
import { CATEGORY_BY_COL } from "../constants/categories";
import { notifyBudgetChanged } from "./useBudget";
import { toDateOnly } from "@/utils/format";

export type EntryType = "spend" | "income";

export function useTransaction() {
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("spend");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [lastAdded, setLastAdded] = useState<{
    amount: number;
    label: string;
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
    setNote("");
  }, []);

  const submit = useCallback(async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      shake();
      setStatus({ type: "error", message: "Enter a valid amount." });
      return;
    }
    if (entryType === "spend" && !selectedCategory) {
      shake();
      setStatus({ type: "error", message: "Pick a category." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const result = await apiFetch<{ noteWritten?: boolean }>("/transaction", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(amount),
          category: entryType === "income" ? "D" : selectedCategory,
          type: entryType,
          date: toDateOnly(date),
          note: note.trim() || undefined,
        }),
      });

      const categoryLabel =
        entryType === "income"
          ? "Income"
          : CATEGORY_BY_COL[selectedCategory ?? ""]?.label ?? selectedCategory;
      const parsed = parseFloat(amount);
      setLastAdded({ amount: parsed, label: categoryLabel ?? "entry" });
      const noteFailed = Boolean(note.trim()) && result.noteWritten === false;
      showSuccess(
        noteFailed
          ? `$${parsed.toFixed(2)} added to ${categoryLabel}, but the note didn’t save`
          : `$${parsed.toFixed(2)} added to ${categoryLabel}`
      );
      notifyBudgetChanged();
      reset();
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }, [amount, selectedCategory, date, note, entryType, shake, showSuccess, reset]);

  return {
    amount, setAmount,
    selectedCategory, setSelectedCategory,
    date, setDate,
    note, setNote,
    entryType, setEntryType,
    loading,
    status,
    shakeAnim,
    submit,
    lastAdded,
  };
}
