import type MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";

export type CategoryIconName = ComponentProps<typeof MaterialIcons>["name"];

export type Category = {
  key: string;
  col: string;
  label: string;
  icon: CategoryIconName;
  bucket: "needs" | "wants";
  color: string;
};

export const CATEGORIES: Category[] = [
  { key: "entertainment", col: "G", label: "Entertainment", icon: "sports-esports", bucket: "wants", color: "#A78BFA" },
  { key: "food",          col: "H", label: "Food",          icon: "restaurant", bucket: "wants", color: "#FFD166" },
  { key: "gas",           col: "I", label: "Gas",           icon: "local-gas-station", bucket: "needs", color: "#FF8A5B" },
  { key: "phone",         col: "J", label: "Phone",         icon: "smartphone", bucket: "needs", color: "#7DD3FC" },
  { key: "medical",       col: "K", label: "Medical",       icon: "local-hospital", bucket: "needs", color: "#FF6B6B" },
  { key: "car",           col: "L", label: "Car",           icon: "directions-car", bucket: "needs", color: "#60A5FA" },
  { key: "apartment",     col: "M", label: "Apartment",     icon: "home", bucket: "needs", color: "#7DF9C2" },
  { key: "groceries",     col: "N", label: "Groceries",     icon: "shopping-cart", bucket: "needs", color: "#34D399" },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export const CATEGORY_BY_COL = Object.fromEntries(CATEGORIES.map((c) => [c.col, c]));

export const CATEGORY_BY_KEY: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
);

export const NEEDS_KEYS = CATEGORIES.filter((c) => c.bucket === "needs").map((c) => c.key);
export const WANTS_KEYS = CATEGORIES.filter((c) => c.bucket === "wants").map((c) => c.key);
