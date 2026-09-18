import { createLogger } from '../utils/logger.js';
import { getSheets, SHEET_ID, SHEET_NAME, getSpreadsheetUrl } from './Auth/sheetsConnection.js';
import {
  parseSheetDate,
  breakdownFromTotals,
  chainMonthsThrough,
  emptySpendingTotals,
} from '../utils/parseTools.js';

const baseLog = createLogger('services:reads');

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function rolloverRangeLabel(first, last) {
  if (!first || !last) return 'previous months';
  if (first.year === last.year && first.month === last.month) {
    return MONTH_SHORT[last.month];
  }
  const from =
    first.year === last.year
      ? MONTH_SHORT[first.month]
      : `${MONTH_SHORT[first.month]} ${first.year}`;
  return `${from}–${MONTH_SHORT[last.month]}`;
}

// Reads all rows from the sheet and returns:
// - rows: raw 2D array
// - dateRowMap: { 'M/D/YYYY': rowNumber } where rowNumber is 1-based (Sheets API)
export async function getSheetRows({ log = baseLog } = {}) {
  const sheets = await getSheets(log);

  log.debug('Fetching sheet rows', { range: `${SHEET_NAME}!A1:N400` });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:N400`,
  });

  const rows = response.data.values || [];
  log.debug('Sheet rows fetched', { rowCount: rows.length });

  const dateRowMap = {};
  rows.forEach((row, i) => {
    if (!row[0]) return;
    const parsed = parseSheetDate(row[0]);
    if (!parsed) return;
    const key = `${parsed.month + 1}/${parsed.day}/${parsed.year}`;
    dateRowMap[key] = i + 1; // Sheets API is 1-based
  });

  log.debug('Built dateRowMap', { dateCount: Object.keys(dateRowMap).length });
  return { rows, dateRowMap };
}

// Returns monthly totals with leftover chained from every earlier month in the sheet.
// `month` is 0-based; omit month/year to use the current calendar month.
export async function getMonthlyData({ log = baseLog, month, year } = {}) {
  const scoped = log.child ? log.child('getMonthlyData') : log;

  try {
    const { rows } = await getSheetRows({ log: scoped });
    scoped.info('Found rows in sheet', { rowCount: rows.length });

    const now = new Date();
    const currentMonth = Number.isInteger(month) ? month : now.getMonth();
    const currentYear = Number.isInteger(year) ? year : now.getFullYear();
    const isCurrent = currentMonth === now.getMonth() && currentYear === now.getFullYear();

    const { months: chained } = chainMonthsThrough(rows, currentMonth, currentYear);
    const current = chained[chained.length - 1];
    const previous = chained.length > 1 ? chained[chained.length - 2] : null;
    const first = chained[0];
    const rollover = current.rollover;
    const available = current.available;
    const remaining = current.remaining;

    scoped.debug('Filtering rows for month', {
      month: currentMonth + 1,
      year: currentYear,
      isCurrent,
      chainedMonths: chained.length,
      rolloverFrom: previous
        ? { month: previous.month + 1, year: previous.year }
        : null,
    });

    scoped.info('Aggregated month rows', {
      matchingRows: current.matchingRows,
      earned: current.earned,
      spent: current.spent,
      rollover,
      available,
      remaining,
    });

    const result = {
      year: currentYear,
      month: currentMonth + 1,
      isCurrent,
      earned: current.earned,
      spent: current.spent,
      rollover,
      rolloverFrom: previous
        ? {
            month: previous.month + 1,
            year: previous.year,
            label: rolloverRangeLabel(first, previous),
          }
        : {
            month: currentMonth,
            year: currentYear,
            label: 'previous months',
          },
      available,
      remaining,
      spreadsheetUrl: getSpreadsheetUrl(),
      breakdown: breakdownFromTotals(current.totals),
      budget503020: {
        needs: current.needs.available,
        wants: current.wants.available,
        investments: current.investments.available,
      },
      buckets: {
        needs: current.needs,
        wants: current.wants,
        investments: current.investments,
      },
      previousMonth: previous
        ? {
            earned: previous.earned,
            spent: previous.spent,
            remaining: previous.remaining,
          }
        : undefined,
    };

    scoped.debug('Returning monthly data', result);
    return result;
  } catch (err) {
    scoped.error('getMonthlyData failed', { message: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Monthly earned/spent + category breakdown for the last `monthCount` calendar months.
 * Leading months with no activity are trimmed so a new sheet doesn't show a year of zeros.
 */
export async function getTrendsData({ log = baseLog, monthCount = 12 } = {}) {
  const scoped = log.child ? log.child('getTrendsData') : log;
  const count = Math.min(Math.max(Number(monthCount) || 12, 1), 24);

  try {
    const { rows } = await getSheetRows({ log: scoped });
    const now = new Date();
    const { months: chained } = chainMonthsThrough(rows, now.getMonth(), now.getFullYear());
    const byKey = new Map(chained.map((m) => [`${m.year}-${m.month}`, m]));
    const months = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const agg = byKey.get(`${year}-${month}`);
      months.push({
        year,
        month: month + 1,
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: MONTH_SHORT[month],
        earned: agg?.earned ?? 0,
        spent: agg?.spent ?? 0,
        remaining: agg?.remaining ?? 0,
        breakdown: breakdownFromTotals(agg?.totals ?? emptySpendingTotals()),
        buckets: {
          needs: agg?.needs ?? { allocated: 0, spent: 0, rollover: 0, available: 0, remaining: 0 },
          wants: agg?.wants ?? { allocated: 0, spent: 0, rollover: 0, available: 0, remaining: 0 },
          investments: agg?.investments ?? { allocated: 0, spent: 0, rollover: 0, available: 0, remaining: 0 },
        },
      });
    }

    const firstActive = months.findIndex((m) => m.spent > 0 || m.earned > 0);
    const trimmed = firstActive === -1 ? months.slice(-1) : months.slice(firstActive);

    scoped.info('Returning trends', {
      months: trimmed.length,
      from: trimmed[0]?.key,
      to: trimmed[trimmed.length - 1]?.key,
    });
    return { months: trimmed };
  } catch (err) {
    scoped.error('getTrendsData failed', { message: err.message, stack: err.stack });
    throw err;
  }
}
