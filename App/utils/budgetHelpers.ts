import type { BudgetBreakdown } from "../hooks/useBudget";
import { CATEGORIES } from "../constants/categories";

export function displayNameFromEmail(email?: string | null): string {
  const local = email?.split("@")[0]?.trim() ?? "";
  const first = local.split(/[._+-]/).find(Boolean) ?? "";
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function greetingForDate(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function categoryRows(
  breakdown: Partial<BudgetBreakdown>,
  previousBreakdown: Partial<BudgetBreakdown> | undefined,
  totalSpent: number,
) {
  return CATEGORIES.map((category) => {
    const amount = Number(breakdown[category.key as keyof BudgetBreakdown]) || 0;
    const previous = Number(previousBreakdown?.[category.key as keyof BudgetBreakdown]) || 0;
    return {
      category,
      amount,
      previous,
      delta: amount - previous,
      share: totalSpent > 0 ? amount / totalSpent : 0,
    };
  }).sort((a, b) => b.amount - a.amount || a.category.label.localeCompare(b.category.label));
}
