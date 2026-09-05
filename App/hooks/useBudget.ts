import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/utils/api";

type RefreshListener = () => void;
const refreshListeners = new Set<RefreshListener>();

/** Call after a transaction is written so the Budget tab reloads totals. */
export function notifyBudgetChanged() {
  refreshListeners.forEach((listener) => listener());
}

export function subscribeBudgetChanged(listener: RefreshListener) {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
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
  year: number;
  month: number;
  isCurrent: boolean;
  earned: number;
  spent: number;
  rollover: number;
  rolloverFrom?: { month: number; year: number; label: string };
  available: number;
  remaining: number;
  breakdown: BudgetBreakdown;
  budget503020: {
    needs: number;
    wants: number;
    investments: number;
  };
  previousMonth?: {
    earned: number;
    spent: number;
    remaining: number;
  };
};

export function useBudget(view?: { month: number; year: number }) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const month = view?.month;
  const year = view?.year;

  const fetchBudget = useCallback(async () => {
    try {
      const qs =
        month != null && year != null ? `?month=${month}&year=${year}` : "";
      const json = await apiFetch<BudgetData>(`/budget${qs}`);
      const earned = Number(json.earned) || 0;
      const spent = Number(json.spent) || 0;
      const rollover = Number(json.rollover) || 0;
      const available = json.available != null ? Number(json.available) : earned + rollover;
      const remaining =
        json.remaining != null ? Number(json.remaining) : available - spent;
      const now = new Date();
      setData({
        ...json,
        year: Number(json.year) || year || now.getFullYear(),
        month: Number(json.month) || month || now.getMonth() + 1,
        isCurrent: json.isCurrent !== false,
        earned,
        spent,
        rollover,
        available,
        remaining,
        budget503020: json.budget503020 ?? {
          needs: available * 0.5,
          wants: available * 0.3,
          investments: available * 0.2,
        },
      });
      setError(null);
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
  }, [month, year]);

  useFocusEffect(
    useCallback(() => {
      fetchBudget();
    }, [fetchBudget])
  );

  useEffect(() => subscribeBudgetChanged(fetchBudget), [fetchBudget]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchBudget();
  }, [fetchBudget]);

  return { data, loading, refreshing, error, refresh };
}
