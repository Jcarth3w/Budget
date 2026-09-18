import { describe, expect, it } from "vitest";
import {
  categoryRows,
  displayNameFromEmail,
  greetingForDate,
} from "../../../App/utils/budgetHelpers";

describe("budget helpers", () => {
  it("derives a readable first name from an email", () => {
    expect(displayNameFromEmail("jack.doe@example.com")).toBe("Jack");
    expect(displayNameFromEmail()).toBe("there");
  });

  it("uses time-aware greetings", () => {
    expect(greetingForDate(new Date(2026, 0, 1, 8))).toBe("Good morning");
    expect(greetingForDate(new Date(2026, 0, 1, 14))).toBe("Good afternoon");
    expect(greetingForDate(new Date(2026, 0, 1, 20))).toBe("Good evening");
  });

  it("sorts category rows by spend and computes shares and deltas", () => {
    const rows = categoryRows(
      { food: 75, groceries: 25 },
      { food: 50, groceries: 30 },
      100,
    );
    expect(rows[0].category.key).toBe("food");
    expect(rows[0]).toMatchObject({ amount: 75, delta: 25, share: 0.75 });
  });
});
