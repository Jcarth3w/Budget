import { useState, useEffect, useRef, useCallback } from "react";
import { Animated } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import SERVER_URL from "@/config/server";

type RefreshListener = () => void;
const refreshListeners = new Set<RefreshListener>();

/** Call after a transaction is written so the Budget tab reloads totals. */
export function notifyBudgetChanged() {
  refreshListeners.forEach((listener) => listener());
}

export type BudgetBreakdown = {
  entertainment: number;
  food: number;
  gas: number;
  phone: number;
  medical: number;
  car: number;
  apartment: number;
  groceries: number;
};

export type BudgetData = {
  earned: number;
  spent: number;
  remaining: number;
  breakdown: BudgetBreakdown;
  budget503020: {
    needs: number;
    wants: number;
    investments: number;
  };
};

//break this into smaller functions?
export function useBudget() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const fetchBudget = useCallback(async () => {


    try {
      const res = await fetch(`${SERVER_URL}/budget`, { cache: "no-store" });
      if (res.status === 304) {
        setError(null);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `Could not load budget (${res.status})`);
      }
      setData(json);
      setError(null);
      animateIn();
    } catch (err: any) {



      const msg = String(err?.message || "");
      const unreachable =
        msg === "Failed to fetch" ||
        msg.includes("Network request failed") ||
        msg.includes("Load failed");
      setError(unreachable ? "Could not reach server." : msg || "Could not load budget.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [animateIn]);

  useFocusEffect(
    useCallback(() => {
      fetchBudget();
    }, [fetchBudget])
  );

  useEffect(() => {
    const listener = () => {
      fetchBudget();
    };
    refreshListeners.add(listener);
    return () => {
      refreshListeners.delete(listener);
    };
  }, [fetchBudget]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchBudget();
  }, [fetchBudget]);

  return { data, loading, refreshing, error, refresh, fadeAnim, slideAnim };
}