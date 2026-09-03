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

/** Chart / compact labels: $1.2k or $42 */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthTitle(year: number, month: number): string {
  return `${MONTH_LONG[month - 1] ?? ""} ${year}`.trim();
}

/** month is 1–12 */
export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function isCurrentMonth(year: number, month: number) {
  const n = new Date();
  return n.getFullYear() === year && n.getMonth() + 1 === month;
}