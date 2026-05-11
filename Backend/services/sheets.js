import { google } from 'googleapis';
import fs from 'fs';
import { createLogger } from '../utils/logger.js';

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = '2026';
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'credentials.json';

const baseLog = createLogger('services:sheets');

if (!SHEET_ID) {
  baseLog.error('Missing SHEET_ID environment variable');
  throw new Error('Missing SHEET_ID environment variable. Add SHEET_ID=your_google_sheet_id to your .env file.');
}

if (!fs.existsSync(CREDENTIALS_PATH)) {
  baseLog.error('Google credentials file not found', { path: CREDENTIALS_PATH });
  throw new Error(`Google credentials file not found at ${CREDENTIALS_PATH}. Set GOOGLE_APPLICATION_CREDENTIALS in .env or place credentials.json in the backend root.`);
}

baseLog.info('Sheets service initialized', {
  sheetId: SHEET_ID,
  sheetName: SHEET_NAME,
  credentialsPath: CREDENTIALS_PATH,
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

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
    const d = new Date(row[0]);
    if (isNaN(d)) return;
    const key = formatDateKey(d);
    dateRowMap[key] = i + 1; // Sheets API is 1-based
  });

  log.debug('Built dateRowMap', { dateCount: Object.keys(dateRowMap).length });
  return { rows, dateRowMap };
}

// Returns monthly totals for the current month
export async function getMonthlyData({ log = baseLog } = {}) {
  const scoped = log.child ? log.child('getMonthlyData') : log;
  try {
    const { rows } = await getSheetRows({ log: scoped });
    scoped.info('Found rows in sheet', { rowCount: rows.length });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    scoped.debug('Filtering rows for current month', {
      month: currentMonth + 1,
      year: currentYear,
    });

    let totalEarned = 0;
    const totals = { G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0, N: 0 };

    let matchingRows = 0;
    for (const row of rows) {
      if (!row[0]) continue;
      const date = new Date(row[0]);
      if (isNaN(date)) continue;
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) continue;

      matchingRows++;
      // Column D (index 3) = paychecks
      totalEarned += parseFloat(row[3]) || 0;

      // Spending columns G-N (indices 6-13)
      for (const col of Object.keys(totals)) {
        totals[col] += parseFloat(row[colLetterToIndex(col)]) || 0;
      }
    }

    scoped.info('Aggregated current month rows', {
      matchingRows,
      totalEarned,
    });

    const totalSpent = Object.values(totals).reduce((a, b) => a + b, 0);

    const result = {
      earned: totalEarned,
      spent: totalSpent,
      remaining: totalEarned - totalSpent,
      breakdown: {
        entertainment: totals['G'],
        food: totals['H'],
        gas: totals['I'],
        phone: totals['J'],
        medical: totals['K'],
        car: totals['L'],
        apartment: totals['M'],
        groceries: totals['N'],
      },
      budget503020: {
        needs: totalEarned * 0.5,
        wants: totalEarned * 0.3,
        investments: totalEarned * 0.2,
      },
    };

    scoped.debug('Returning monthly data', result);
    return result;
  } catch (err) {
    scoped.error('getMonthlyData failed', { message: err.message, stack: err.stack });
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
