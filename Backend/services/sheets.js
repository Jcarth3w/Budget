import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';
import { resolveGoogleAuthOptions } from './sheetsConnection.js';

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || String(new Date().getFullYear());

const baseLog = createLogger('services:sheets');

if (!SHEET_ID) {
  baseLog.error('Missing SHEET_ID environment variable');
  throw new Error('Missing SHEET_ID environment variable. Add SHEET_ID=your_google_sheet_id to your .env file.');
}


function resolveCredentialsPath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  const fromCwd = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fromCwd)) return fromCwd;
  return path.resolve(BACKEND_ROOT, filePath);
}

const { options: googleAuthOptions, meta: authMeta } = resolveGoogleAuthOptions(baseLog);

baseLog.info('Sheets service initialized', {
  sheetId: SHEET_ID,
  sheetName: SHEET_NAME,
  ...authMeta,
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

const auth = new google.auth.GoogleAuth(googleAuthOptions);

async function getSheets(log = baseLog) {
  log.debug('Getting Google Sheets client');
  const client = await auth.getClient();
  log.debug('Google auth client obtained');
  return google.sheets({ version: 'v4', auth: client });
}
// ─── Helpers ──────────────────────────────────────────────────────────────────

// Converts a column letter to a zero-based index (A=0, B=1, G=6, etc.)
function colLetterToIndex(letter) {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

// Formats a date as M/D/YYYY to match your sheet
function formatDateKey(date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/** Parse sheet dates as calendar M/D/YYYY (avoids UTC timezone shifting months). */
function parseSheetDate(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const month = parseInt(mdy[1], 10) - 1;
    const day = parseInt(mdy[2], 10);
    const year = parseInt(mdy[3], 10);
    return { month, year, day, date: new Date(year, month, day) };
  }
  const date = new Date(raw);
  if (isNaN(date.getTime())) return null;
  return { month: date.getMonth(), year: date.getFullYear(), day: date.getDate(), date };
}

// Income columns C-E (indices 2-4)
const EARNED_COLS = ['C', 'D', 'E'];
// Spending columns G-N (indices 6-13)
const SPENDING_COLS = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

function emptySpendingTotals() {
  return Object.fromEntries(SPENDING_COLS.map((col) => [col, 0]));
}

function breakdownFromTotals(totals) {
  return {
    entertainment: roundMoney(totals.G),
    food: roundMoney(totals.H),
    gas: roundMoney(totals.I),
    phone: roundMoney(totals.J),
    medical: roundMoney(totals.K),
    car: roundMoney(totals.L),
    apartment: roundMoney(totals.M),
    groceries: roundMoney(totals.N),
  };
}

function getPreviousCalendarMonth(month, year) {
  if (month === 0) return { month: 11, year: year - 1 };
  return { month: month - 1, year };
}

/** Sum earned (cols C–E) and spending (cols G–N) for one calendar month. */
function aggregateMonthFromRows(rows, targetMonth, targetYear) {
  let earned = 0;
  const totals = emptySpendingTotals();
  let matchingRows = 0;

  for (const row of rows) {
    if (!row[0]) continue;
    const parsed = parseSheetDate(row[0]);
    if (!parsed) continue;
    if (parsed.month !== targetMonth || parsed.year !== targetYear) continue;

    matchingRows++;
    for (const col of EARNED_COLS) {
      earned += parseFloat(row[colLetterToIndex(col)]) || 0;
    }
    for (const col of SPENDING_COLS) {
      totals[col] += parseFloat(row[colLetterToIndex(col)]) || 0;
    }
  }

  const spent = Object.values(totals).reduce((a, b) => a + b, 0);
  return {
    matchingRows,
    earned: roundMoney(earned),
    spent: roundMoney(spent),
    remaining: roundMoney(earned - spent),
    totals,
  };
}


// ─── Reads ────────────────────────────────────────────────────────────────────

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

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// ─── Writes ───────────────────────────────────────────────────────────────────

// Writes a single transaction additively into the correct cell
// { amount: 12.50, category: 'H', date: Date }
export async function writeTransaction({ amount, category, date, log = baseLog }) {
  const scoped = log.child ? log.child('writeTransaction') : log;
  scoped.debug('Starting transaction write', {
    amount,
    category,
    date: date instanceof Date ? date.toISOString() : date,
  });

  const sheets = await getSheets(scoped);
  const { rows, dateRowMap } = await getSheetRows({ log: scoped });

  const dateKey = formatDateKey(date);
  const rowNumber = dateRowMap[dateKey];

  if (!rowNumber) {
    scoped.warn('No row found for date', { dateKey });
    throw new Error(`No row found in sheet for date ${dateKey}. Make sure the date exists in column A.`);
  }

  const colIndex = colLetterToIndex(category);
  const existingRow = rows[rowNumber - 1] || [];
  const existing = parseFloat(existingRow[colIndex]) || 0;
  const newValue = Math.round((existing + amount) * 100) / 100;

  scoped.debug('Computed new cell value', {
    cell: `${category}${rowNumber}`,
    existing,
    added: amount,
    newValue,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${category}${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[newValue]],
    },
  });

  scoped.info('Cell updated in Google Sheet', {
    cell: `${category}${rowNumber}`,
    newValue,
  });

  return {
    date: dateKey,
    category,
    added: amount,
    previousValue: existing,
    newValue,
  };
}

// Takes grouped transactions and writes them additively into the sheet
// grouped: { 'M/D/YYYY': { 'G': 12.50, 'H': 8.99, ... } }
export async function writeCategoryTotals({ grouped, rows, dateRowMap, log = baseLog }) {
  const scoped = log.child ? log.child('writeCategoryTotals') : log;
  const sheets = await getSheets(scoped);
  const updateData = [];

  for (const [dateKey, colTotals] of Object.entries(grouped)) {
    const rowNumber = dateRowMap[dateKey];

    if (!rowNumber) {
      scoped.warn('No row found for date, skipping', { dateKey });
      continue;
    }

    for (const [col, amount] of Object.entries(colTotals)) {
      const colIndex = colLetterToIndex(col);
      const existingRow = rows[rowNumber - 1] || [];
      const existing = parseFloat(existingRow[colIndex]) || 0;
      const newValue = Math.round((existing + amount) * 100) / 100;

      updateData.push({
        range: `${SHEET_NAME}!${col}${rowNumber}`,
        values: [[newValue]],
      });
    }
  }

  scoped.debug('Prepared batch update', { updateCount: updateData.length });

  if (updateData.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: 'RAW',
        data: updateData,
      },
    });
    scoped.info('Batch update completed', { updateCount: updateData.length });
  } else {
    scoped.info('No updates to apply');
  }

  return updateData.length;
}

/** Call on startup to surface bad/revoked keys immediately instead of on first /budget. */
export async function verifyGoogleCredentials({ log = baseLog } = {}) {
  const scoped = log.child ? log.child('verify') : log;
  scoped.debug('Verifying Google service account');
  const client = await auth.getClient();
  await client.getAccessToken();
  scoped.info('Google service account credentials are valid');
}
