import { CATEGORIES } from "../constants/categories";
import type { MonthTrend } from "../hooks/useTrends";

export function selectedMonthRows(months: MonthTrend[], index: number) {
  const current = months[index];
  const previous = index > 0 ? months[index - 1] : undefined;
  if (!current) return [];

  return CATEGORIES.map((category) => {
    const amount = Number(current.breakdown[category.key as keyof typeof current.breakdown]) || 0;
    const previousAmount = Number(previous?.breakdown[category.key as keyof typeof current.breakdown]) || 0;
    return {
      category,
      amount,
      previousAmount,
      delta: amount - previousAmount,
      share: current.spent > 0 ? amount / current.spent : 0,
    };
  }).sort((a, b) => b.amount - a.amount || a.category.label.localeCompare(b.category.label));
}

export function categorySeries(months: MonthTrend[], categoryKey: string) {
  return months.map((month) =>
    Number(month.breakdown[categoryKey as keyof typeof month.breakdown]) || 0
  );
}

export function trailingAverage(values: number[], count = 3) {
  const sample = values.slice(-count).filter((value) => Number.isFinite(value));
  if (sample.length === 0) return 0;
  return sample.reduce((sum, value) => sum + value, 0) / sample.length;
}
