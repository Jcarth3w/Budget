import { createLogger } from '../utils/logger.js';
import { getSheets, SHEET_ID, SHEET_NAME } from './Auth/sheetsConnection.js';
import { formatDateKey, colLetterToIndex } from '../utils/parseTools.js';
import { getSheetRows } from './reads.js';

const baseLog = createLogger('services:writes');

let cachedTabSheetId;

async function getTabSheetId(sheets, log) {
  if (cachedTabSheetId != null) return cachedTabSheetId;
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties(sheetId,title)',
  });
  const match = (meta.data.sheets || []).find((s) => s.properties?.title === SHEET_NAME);
  if (!match) {
    throw new Error(`Sheet tab "${SHEET_NAME}" not found`);
  }
  cachedTabSheetId = match.properties.sheetId;
  log.debug('Resolved sheet tab id', { sheetName: SHEET_NAME, sheetId: cachedTabSheetId });
  return cachedTabSheetId;
}

async function readCellNote(sheets, category, rowNumber) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    ranges: [`${SHEET_NAME}!${category}${rowNumber}`],
    fields: 'sheets.data.rowData.values.note',
  });
  return response.data.sheets?.[0]?.data?.[0]?.rowData?.[0]?.values?.[0]?.note || '';
}

function formatNoteLine(amount, note) {
  const dollars = `$${Number(amount).toFixed(2)}`;
  const text = String(note || '').trim();
  return text ? `${dollars} — ${text}` : dollars;
}

async function appendCellNote({ sheets, category, rowNumber, amount, note, log }) {
  const tabId = await getTabSheetId(sheets, log);
  const existing = await readCellNote(sheets, category, rowNumber);
  const line = formatNoteLine(amount, note);
  const next = existing ? `${existing}\n${line}` : line;
  const colIndex = colLetterToIndex(category);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          updateCells: {
            range: {
              sheetId: tabId,
              startRowIndex: rowNumber - 1,
              endRowIndex: rowNumber,
              startColumnIndex: colIndex,
              endColumnIndex: colIndex + 1,
            },
            rows: [{ values: [{ note: next }] }],
            fields: 'note',
          },
        },
      ],
    },
  });

  log.info('Cell note updated', { cell: `${category}${rowNumber}` });
}

// Writes a single transaction additively into the correct cell
// { amount: 12.50, category: 'H', date: Date, note?: string }
export async function writeTransaction({ amount, category, date, note, log = baseLog }) {
  const scoped = log.child ? log.child('writeTransaction') : log;
  scoped.debug('Starting transaction write', {
    amount,
    category,
    date: date instanceof Date ? date.toISOString() : date,
    hasNote: Boolean(note),
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

  let noteWritten = false;
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  if (trimmedNote) {
    try {
      await appendCellNote({
        sheets,
        category,
        rowNumber,
        amount,
        note: trimmedNote,
        log: scoped,
      });
      noteWritten = true;
    } catch (err) {
      scoped.error('Failed to write cell note', { message: err.message, stack: err.stack });
    }
  }

  return {
    date: dateKey,
    category,
    added: amount,
    previousValue: existing,
    newValue,
    noteWritten,
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
