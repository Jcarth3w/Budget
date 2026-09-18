import { describe, expect, it } from "vitest";
import type { MonthTrend } from "../../../App/hooks/useTrends";
import {
  categorySeries,
  selectedMonthRows,
  trailingAverage,
} from "../../../App/utils/analyticsHelpers";

function month(monthNumber: number, food: number, gas: number): MonthTrend {
  return {
    year: 2026,
    month: monthNumber,
    key: `2026-${monthNumber}`,
    label: `M${monthNumber}`,
    earned: 1000,
    spent: food + gas,
    remaining: 800 - food - gas,
    breakdown: {
      entertainment: 0,
      food,
      gas,
      phone: 0,
      medical: 0,
      car: 0,
      apartment: 0,
      groceries: 0,
    },
    buckets: {
      needs: { allocated: 500, spent: gas, rollover: 0, available: 500, remaining: 500 - gas },
      wants: { allocated: 300, spent: food, rollover: 0, available: 300, remaining: 300 - food },
      investments: { allocated: 200, spent: 0, rollover: 0, available: 200, remaining: 200 },
    },
  };
}

describe("analytics helpers", () => {
  const months = [month(1, 50, 25), month(2, 80, 20)];

  it("ranks selected-month categories with share and delta", () => {
    const rows = selectedMonthRows(months, 1);
    expect(rows[0]).toMatchObject({ amount: 80, delta: 30, share: 0.8 });
    expect(rows[0].category.key).toBe("food");
  });

  it("builds category series and trailing averages", () => {
    expect(categorySeries(months, "gas")).toEqual([25, 20]);
    expect(trailingAverage([10, 20, 30, 40], 3)).toBe(30);
    expect(trailingAverage([])).toBe(0);
  });

  it("handles a missing month", () => {
    expect(selectedMonthRows(months, 99)).toEqual([]);
  });
});
