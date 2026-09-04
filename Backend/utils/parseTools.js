// Converts a column letter to a zero-based index (A=0, B=1, G=6, etc.)
export function colLetterToIndex(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
}

// Formats a date as M/D/YYYY to match sheet format
export function formatDateKey(date) {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/** Parse sheet dates as calendar M/D/YYYY (avoids UTC timezone shifting months). */
export function parseSheetDate(raw) {
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

export function roundMoney(n) {
    return Math.round(n * 100) / 100;
}

export function emptySpendingTotals() {
    return Object.fromEntries(SPENDING_COLS.map((col) => [col, 0]));
}

export function breakdownFromTotals(totals) {
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

export function getPreviousCalendarMonth(month, year) {
    if (month === 0) return { month: 11, year: year - 1 };
    return { month: month - 1, year };
}

/** Sum earned (cols C–E) and spending (cols G–N) for one calendar month. */
export function aggregateMonthFromRows(rows, targetMonth, targetYear) {
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