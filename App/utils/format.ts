// Formats a number as a dollar amount e.g. 1234.5 → "$1,234.50"
export function fmt(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Formats a Date as "Month DD, YYYY" e.g. "April 5, 2026"
export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Formats a Date as "Month YYYY" e.g. "April 2026"
export function formatMonthYear(d: Date): string {
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}