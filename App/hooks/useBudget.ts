import { useState, useEffect, useRef, useCallback } from "react";
import { Animated } from "react-native";
import SERVER_URL from "@/config/server";

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
      const res = await fetch(`${SERVER_URL}/budget`);
      const json = await res.json();
      setData(json);
      setError(null);
      animateIn();
    } catch (err) {
      setError("Could not reach server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [animateIn]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchBudget();
  }, [fetchBudget]);

  return { data, loading, refreshing, error, refresh, fadeAnim, slideAnim };
}