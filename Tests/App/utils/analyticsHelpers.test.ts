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

const months = [month(1, 50, 25), month(2, 80, 20)];

describe("selectedMonthRows", () => {
  it("sorts categories by amount", () => {
    expect(selectedMonthRows(months, 1)[0].category.key).toBe("food");
  });

  it("returns current amounts", () => {
    expect(selectedMonthRows(months, 1)[0].amount).toBe(80);
  });

  it("calculates previous-month change", () => {
    expect(selectedMonthRows(months, 1)[0].delta).toBe(30);
  });

  it("calculates monthly spending share", () => {
    expect(selectedMonthRows(months, 1)[0].share).toBe(0.8);
  });

  it("returns no rows for a missing month", () => {
    expect(selectedMonthRows(months, 99)).toEqual([]);
  });

  it("uses a zero baseline for the first month", () => {
    expect(selectedMonthRows(months, 0)[0].delta).toBe(50);
  });
});

describe("categorySeries", () => {
  it("returns one value per month", () => {
    expect(categorySeries(months, "gas")).toEqual([25, 20]);
  });

  it("returns zeros for an unknown category", () => {
    expect(categorySeries(months, "unknown")).toEqual([0, 0]);
  });
});

describe("trailingAverage", () => {
  it("averages the requested trailing window", () => {
    expect(trailingAverage([10, 20, 30, 40], 3)).toBe(30);
  });

  it("uses all values when the window is larger", () => {
    expect(trailingAverage([10, 20], 3)).toBe(15);
  });

  it("returns zero for no values", () => {
    expect(trailingAverage([])).toBe(0);
  });
});
