export type Category = {
  key: string;
  col: string;
  label: string;
  emoji: string;
  bucket: "needs" | "wants";
  color: string;
};

export const CATEGORIES: Category[] = [
  { key: "entertainment", col: "G", label: "Entertainment", emoji: "🎮", bucket: "wants", color: "#A78BFA" },
  { key: "food",          col: "H", label: "Food",          emoji: "🍔", bucket: "wants", color: "#FFD166" },
  { key: "gas",           col: "I", label: "Gas",           emoji: "⛽", bucket: "needs", color: "#FF8A5B" },
  { key: "phone",         col: "J", label: "Phone",         emoji: "📱", bucket: "needs", color: "#7DD3FC" },
  { key: "medical",       col: "K", label: "Medical",       emoji: "🏥", bucket: "needs", color: "#FF6B6B" },
  { key: "car",           col: "L", label: "Car",           emoji: "🚗", bucket: "needs", color: "#60A5FA" },
  { key: "apartment",     col: "M", label: "Apartment",     emoji: "🏠", bucket: "needs", color: "#7DF9C2" },
  { key: "groceries",     col: "N", label: "Groceries",     emoji: "🛒", bucket: "needs", color: "#34D399" },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export const CATEGORY_BY_COL = Object.fromEntries(CATEGORIES.map((c) => [c.col, c]));

export const CATEGORY_BY_KEY: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
);

export const NEEDS_KEYS = CATEGORIES.filter((c) => c.bucket === "needs").map((c) => c.key);
export const WANTS_KEYS = CATEGORIES.filter((c) => c.bucket === "wants").map((c) => c.key);
