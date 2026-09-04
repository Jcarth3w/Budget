import { createLogger } from '../utils/logger.js';
import { getSheets, SHEET_ID, SHEET_NAME } from './Auth/sheetsConnection.js';
import {
  parseSheetDate,
  roundMoney,
  breakdownFromTotals,
  getPreviousCalendarMonth,
  aggregateMonthFromRows,
} from '../utils/parseTools.js';

const baseLog = createLogger('services:reads');

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// Returns monthly totals (with previous-month rollover).
// `month` is 0-based; omit month/year to use the current calendar month.
export async function getMonthlyData({ log = baseLog, month, year } = {}) {
  const scoped = log.child ? log.child('getMonthlyData') : log;

  try {
    const { rows } = await getSheetRows({ log: scoped });
    scoped.info('Found rows in sheet', { rowCount: rows.length });

    const now = new Date();
    const currentMonth = Number.isInteger(month) ? month : now.getMonth();
    const currentYear = Number.isInteger(year) ? year : now.getFullYear();
    const prev = getPreviousCalendarMonth(currentMonth, currentYear);
    const isCurrent = currentMonth === now.getMonth() && currentYear === now.getFullYear();

    scoped.debug('Filtering rows for month', {
      month: currentMonth + 1,
      year: currentYear,
      isCurrent,
      rolloverFrom: { month: prev.month + 1, year: prev.year },
    });

    const current = aggregateMonthFromRows(rows, currentMonth, currentYear);
    const previous = aggregateMonthFromRows(rows, prev.month, prev.year);
    const rollover = previous.remaining;
    const available = roundMoney(current.earned + rollover);
    const remaining = roundMoney(available - current.spent);

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
      rolloverFrom: {
        month: prev.month + 1,
        year: prev.year,
        label: MONTH_SHORT[prev.month],
      },
      available,
      remaining,
      breakdown: breakdownFromTotals(current.totals),
      budget503020: {
        needs: roundMoney(available * 0.5),
        wants: roundMoney(available * 0.3),
        investments: roundMoney(available * 0.2),
      },
      previousMonth: {
        earned: previous.earned,
        spent: previous.spent,
        remaining: previous.remaining,
      },
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
    const months = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const agg = aggregateMonthFromRows(rows, month, year);
      months.push({
        year,
        month: month + 1,
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: MONTH_SHORT[month],
        earned: agg.earned,
        spent: agg.spent,
        remaining: agg.remaining,
        breakdown: breakdownFromTotals(agg.totals),
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
