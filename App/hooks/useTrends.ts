import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/utils/api";
import { subscribeBudgetChanged, type BudgetBreakdown } from "@/hooks/useBudget";

export type MonthTrend = {
  year: number;
  month: number;
  key: string;
  label: string;
  earned: number;
  spent: number;
  remaining: number;
  breakdown: BudgetBreakdown;
};

export type TrendsData = {
  months: MonthTrend[];
};

export function useTrends() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      const json = await apiFetch<TrendsData>("/budget/trends?months=12");
      const months = Array.isArray(json.months) ? json.months : [];
      setData({
        months: months.map((m: MonthTrend) => ({
          ...m,
          earned: Number(m.earned) || 0,
          spent: Number(m.spent) || 0,
          remaining: Number(m.remaining) || 0,
          breakdown: m.breakdown ?? {
            entertainment: 0,
            food: 0,
            gas: 0,
            phone: 0,
            medical: 0,
            car: 0,
            apartment: 0,
            groceries: 0,
          },
        })),
      });
      setError(null);
    } catch (err: any) {
      const msg = String(err?.message || "");
      const unreachable =
        msg === "Failed to fetch" ||
        msg.includes("Network request failed") ||
        msg.includes("Load failed");
      setError(unreachable ? "Could not reach server." : msg || "Could not load trends.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTrends();
    }, [fetchTrends])
  );

  useEffect(() => subscribeBudgetChanged(fetchTrends), [fetchTrends]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchTrends();
  }, [fetchTrends]);

  return { data, loading, refreshing, error, refresh };
}
