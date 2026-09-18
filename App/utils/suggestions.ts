import { CATEGORIES } from "../constants/categories";
import type { BudgetData } from "../hooks/useBudget";
import type { MonthTrend } from "../hooks/useTrends";
import { fmt } from "./format";

export type InsightSeverity = "info" | "warning" | "critical";

export type BudgetInsight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  categoryKey?: string;
};

const severityOrder: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function buildBudgetInsights(
  budget: BudgetData,
  months: MonthTrend[],
  now = new Date(),
): BudgetInsight[] {
  const period = `${budget.year}-${String(budget.month).padStart(2, "0")}`;
  const insights: BudgetInsight[] = [];
  const currentMonth = budget.year === now.getFullYear() && budget.month === now.getMonth() + 1;

  if (budget.remaining < 0) {
    insights.push({
      id: `total-over-${period}`,
      severity: "critical",
      title: "Spending is over plan",
      body: `You’re ${fmt(Math.abs(budget.remaining))} beyond this month’s spendable allowance. Review the largest categories first.`,
    });
  }

  for (const bucket of ["needs", "wants"] as const) {
    const progress = budget.buckets?.[bucket];
    if (progress && progress.remaining < 0) {
      insights.push({
        id: `${bucket}-over-${period}`,
        severity: "warning",
        title: `${bucket === "needs" ? "Needs" : "Wants"} are above target`,
        body: `${fmt(Math.abs(progress.remaining))} over the ${bucket} allocation, with ${fmt(progress.spent)} spent.`,
      });
    }
  }

  if (currentMonth && budget.available > 0 && now.getDate() >= 3) {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projected = (budget.spent / now.getDate()) * daysInMonth;
    if (projected > budget.available * 1.05) {
      insights.push({
        id: `pace-${period}`,
        severity: "warning",
        title: "This month is trending high",
        body: `At the current daily pace, spending could reach about ${fmt(projected)}. Your allowance is ${fmt(budget.available)}.`,
      });
    }
  }

  const currentIndex = months.findIndex((month) => month.year === budget.year && month.month === budget.month);
  if (currentIndex >= 1) {
    const history = months.slice(Math.max(0, currentIndex - 3), currentIndex);
    for (const category of CATEGORIES) {
      const values = history
        .map((month) => Number(month.breakdown[category.key as keyof typeof month.breakdown]) || 0)
        .filter((value) => value > 0);
      if (values.length < 2) continue;
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      const current = Number(budget.breakdown[category.key as keyof typeof budget.breakdown]) || 0;
      if (current > average * 1.3 && current - average >= 25) {
        insights.push({
          id: `spike-${category.key}-${period}`,
          severity: "warning",
          categoryKey: category.key,
          title: `${category.label} is above your usual`,
          body: `${fmt(current)} so far, about ${fmt(current - average)} above your recent three-month average.`,
        });
      }
    }
  }

  if (
    currentMonth
    && now.getDate() >= 22
    && budget.available > 0
    && budget.remaining >= budget.available * 0.15
  ) {
    insights.push({
      id: `surplus-${period}`,
      severity: "info",
      title: "You have room to save more",
      body: `${fmt(budget.remaining)} remains late in the month. Consider moving part of it toward your savings goal.`,
    });
  } else if (currentMonth && now.getDate() >= 16 && (budget.buckets?.investments.available ?? 0) > 0) {
    insights.push({
      id: `invest-${period}`,
      severity: "info",
      title: "Protect the savings portion",
      body: `Your 20% plan sets aside ${fmt(budget.buckets?.investments.available ?? 0)}. Move it to savings before treating it as spendable.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: `steady-${period}`,
      severity: "info",
      title: "Spending looks steady",
      body: "No unusual category changes or budget warnings stand out right now.",
    });
  }

  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 5);
}
