import { describe, expect, it } from "vitest";
import {
  categoryRows,
  displayNameFromEmail,
  greetingForDate,
} from "../../../App/utils/budgetHelpers";

describe("displayNameFromEmail", () => {
  it("uses the first local-part segment", () => {
    expect(displayNameFromEmail("jack.doe@example.com")).toBe("Jack");
  });

  it("capitalizes a lowercase name", () => {
    expect(displayNameFromEmail("jack@example.com")).toBe("Jack");
  });

  it("normalizes an uppercase name", () => {
    expect(displayNameFromEmail("JACK@example.com")).toBe("Jack");
  });

  it("falls back when email is missing", () => {
    expect(displayNameFromEmail()).toBe("there");
  });
});

describe("greetingForDate", () => {
  it("greets in the morning", () => {
    expect(greetingForDate(new Date(2026, 0, 1, 8))).toBe("Good morning");
  });

  it("greets in the afternoon", () => {
    expect(greetingForDate(new Date(2026, 0, 1, 14))).toBe("Good afternoon");
  });

  it("greets in the evening", () => {
    expect(greetingForDate(new Date(2026, 0, 1, 20))).toBe("Good evening");
  });

  it("switches to afternoon at noon", () => {
    expect(greetingForDate(new Date(2026, 0, 1, 12))).toBe("Good afternoon");
  });
});

describe("categoryRows", () => {
  it("sorts categories by current spending", () => {
    const rows = categoryRows({ food: 75, groceries: 25 }, undefined, 100);
    expect(rows[0].category.key).toBe("food");
  });

  it("calculates share of total spending", () => {
    const rows = categoryRows({ food: 75 }, undefined, 100);
    expect(rows.find((row) => row.category.key === "food")?.share).toBe(0.75);
  });

  it("calculates change from the previous month", () => {
    const rows = categoryRows({ food: 75 }, { food: 50 }, 100);
    expect(rows.find((row) => row.category.key === "food")?.delta).toBe(25);
  });

  it("uses zero share when nothing was spent", () => {
    const rows = categoryRows({}, undefined, 0);
    expect(rows.every((row) => row.share === 0)).toBe(true);
  });

  it("includes categories with no spending", () => {
    const rows = categoryRows({}, undefined, 0);
    expect(rows).toHaveLength(8);
  });
});
