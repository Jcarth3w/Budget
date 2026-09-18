import { describe, expect, it } from "vitest";
import type {
  BudgetData,
  BudgetBreakdown,
  BucketProgress,
} from "../../../App/hooks/useBudget";
import type { MonthTrend } from "../../../App/hooks/useTrends";
import { buildBudgetInsights } from "../../../App/utils/suggestions";

const zeroBreakdown = (): BudgetBreakdown => ({
  entertainment: 0,
  food: 0,
  gas: 0,
  phone: 0,
  medical: 0,
  car: 0,
  apartment: 0,
  groceries: 0,
});

const bucket = (available: number, spent: number): BucketProgress => ({
  allocated: available,
  rollover: 0,
  available,
  spent,
  remaining: available - spent,
});

function budget(overrides: Partial<BudgetData> = {}): BudgetData {
  return {
    year: 2026,
    month: 9,
    isCurrent: true,
    earned: 1000,
    spent: 400,
    rollover: 0,
    available: 800,
    remaining: 400,
    breakdown: zeroBreakdown(),
    budget503020: { needs: 500, wants: 300, investments: 200 },
    buckets: {
      needs: bucket(500, 250),
      wants: bucket(300, 150),
      investments: bucket(200, 0),
    },
    ...overrides,
  };
}

function trend(month: number, food: number): MonthTrend {
  return {
    year: 2026,
    month,
    key: `2026-${String(month).padStart(2, "0")}`,
    label: "Month",
    earned: 1000,
    spent: food,
    remaining: 800 - food,
    breakdown: { ...zeroBreakdown(), food },
    buckets: {
      needs: bucket(500, 0),
      wants: bucket(300, food),
      investments: bucket(200, 0),
    },
  };
}

describe("budget insights", () => {
  it("prioritizes an overall overspend warning", () => {
    const result = buildBudgetInsights(
      budget({ remaining: -75, spent: 875 }),
      [],
      new Date(2026, 8, 20),
    );
    expect(result[0]).toMatchObject({ id: "total-over-2026-09", severity: "critical" });
  });

  it("warns when current pace projects above the allowance", () => {
    const result = buildBudgetInsights(
      budget({ spent: 500, remaining: 300 }),
      [],
      new Date(2026, 8, 10),
    );
    expect(result.some((insight) => insight.id === "pace-2026-09")).toBe(true);
  });

  it("flags a category only with enough meaningful history", () => {
    const current = budget({
      breakdown: { ...zeroBreakdown(), food: 160 },
      spent: 160,
      remaining: 640,
    });
    const months = [trend(6, 80), trend(7, 100), trend(8, 90), trend(9, 160)];
    const result = buildBudgetInsights(current, months, new Date(2026, 8, 12));
    expect(result.some((insight) => insight.id === "spike-food-2026-09")).toBe(true);
  });

  it("returns a calm status when no warning or tip applies", () => {
    const result = buildBudgetInsights(
      budget({ isCurrent: false }),
      [],
      new Date(2026, 9, 1),
    );
    expect(result).toEqual([
      expect.objectContaining({ id: "steady-2026-09", severity: "info" }),
    ]);
  });
});
