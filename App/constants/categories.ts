export type Category = {
  col: string;       // Column letter in the sheet
  label: string;     // Display name
  emoji: string;     // Icon
  bucket: "needs" | "wants";  // Which 50/30/20 bucket it belongs to
};

export const CATEGORIES: Category[] = [
  { col: "G", label: "Entertainment", emoji: "🎮", bucket: "wants" },
  { col: "H", label: "Food",          emoji: "🍔", bucket: "wants" },
  { col: "I", label: "Gas",           emoji: "⛽", bucket: "needs" },
  { col: "J", label: "Phone",         emoji: "📱", bucket: "needs" },
  { col: "K", label: "Medical",       emoji: "🏥", bucket: "needs" },
  { col: "L", label: "Car",           emoji: "🚗", bucket: "needs" },
  { col: "M", label: "Apartment",     emoji: "🏠", bucket: "needs" },
  { col: "N", label: "Groceries",     emoji: "🛒", bucket: "needs" },
];

// Lookup by column letter
export const CATEGORY_BY_COL = Object.fromEntries(
  CATEGORIES.map((c) => [c.col, c])
);

// Lookup by backend key (matches what /budget returns in breakdown)
export const CATEGORY_BY_KEY: Record<string, Category> = {
  entertainment: CATEGORIES[0],
  food:          CATEGORIES[1],
  gas:           CATEGORIES[2],
  phone:         CATEGORIES[3],
  medical:       CATEGORIES[4],
  car:           CATEGORIES[5],
  apartment:     CATEGORIES[6],
  groceries:     CATEGORIES[7],
};

// Keys that belong to each bucket
export const NEEDS_KEYS = CATEGORIES.filter(c => c.bucket === "needs").map(c => c.label.toLowerCase());
export const WANTS_KEYS = CATEGORIES.filter(c => c.bucket === "wants").map(c => c.label.toLowerCase());