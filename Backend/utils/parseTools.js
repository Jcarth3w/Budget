// Converts a column letter to a zero-based index (A=0, B=1, G=6, etc.)
export function colLetterToIndex(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
}

// Formats a date as M/D/YYYY to match sheet format
export function formatDateKey(date) {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Parse a client-supplied date as a local calendar day (no UTC shift).
 * Prefers YYYY-MM-DD, then M/D/YYYY, then Date.
 */
export function parseClientDate(raw) {
    if (raw == null || raw === '') return new Date();
    if (raw instanceof Date) {
        if (isNaN(raw.getTime())) return null;
        return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
    }
    const s = String(raw).trim();
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
        return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    }
    const parsed = parseSheetDate(s);
    return parsed ? parsed.date : null;
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
export const EARNED_COLS = ['C', 'D', 'E'];
// Spending columns G-N (indices 6-13)
export const SPENDING_COLS = ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
export const WANT_COLS = ['G', 'H'];
export const NEED_COLS = ['I', 'J', 'K', 'L', 'M', 'N'];

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

/** 0-based month + year → comparable integer (consecutive across year boundaries). */
export function toMonthKey(year, month) {
    return year * 12 + month;
}

export function fromMonthKey(key) {
    return { year: Math.floor(key / 12), month: key % 12 };
}

function sumCols(totals, cols) {
    return roundMoney(cols.reduce((s, c) => s + (Number(totals?.[c]) || 0), 0));
}

function emptyBucketProgress() {
    return { allocated: 0, spent: 0, rollover: 0, available: 0, remaining: 0 };
}

function stepBucket(prevRemaining, allocated, spent) {
    const rollover = prevRemaining;
    const available = roundMoney(rollover + allocated);
    const remaining = roundMoney(available - spent);
    return { allocated, spent, rollover, available, remaining };
}

function emptyMonth(month, year) {
    return {
        month,
        year,
        matchingRows: 0,
        earned: 0,
        spent: 0,
        remaining: 0,
        totals: emptySpendingTotals(),
    };
}

function finalizeBucket(bucket) {
    const earned = roundMoney(bucket.earned);
    const spent = roundMoney(Object.values(bucket.totals).reduce((a, b) => a + b, 0));
    return {
        month: bucket.month,
        year: bucket.year,
        matchingRows: bucket.matchingRows,
        earned,
        spent,
        remaining: roundMoney(earned - spent),
        totals: bucket.totals,
    };
}

/** Group sheet rows by calendar month (0-based). */
export function bucketRowsByMonth(rows) {
    const buckets = new Map();
    for (const row of rows) {
        if (!row[0]) continue;
        const parsed = parseSheetDate(row[0]);
        if (!parsed) continue;
        const key = toMonthKey(parsed.year, parsed.month);
        let bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                month: parsed.month,
                year: parsed.year,
                earned: 0,
                totals: emptySpendingTotals(),
                matchingRows: 0,
            };
            buckets.set(key, bucket);
        }
        bucket.matchingRows++;
        for (const col of EARNED_COLS) {
            bucket.earned += parseFloat(row[colLetterToIndex(col)]) || 0;
        }
        for (const col of SPENDING_COLS) {
            bucket.totals[col] += parseFloat(row[colLetterToIndex(col)]) || 0;
        }
    }
    return buckets;
}

/**
 * Walk every calendar month from the first month with activity through `targetMonth`/`targetYear`.
 * Cash leftover and 50/30/20 leftover each chain: prior remaining + this month's allocation − spending.
 * `month`/`year` on results are 0-based / full year.
 */
export function chainMonthsThrough(rows, targetMonth, targetYear) {
    const buckets = bucketRowsByMonth(rows);
    const targetKey = toMonthKey(targetYear, targetMonth);

    let firstKey = null;
    for (const [key, bucket] of buckets) {
        if (key > targetKey) continue;
        const spent = Object.values(bucket.totals).reduce((a, b) => a + b, 0);
        if (!bucket.earned && !spent) continue;
        if (firstKey == null || key < firstKey) firstKey = key;
    }

    const blank = {
        ...emptyMonth(targetMonth, targetYear),
        rollover: 0,
        available: 0,
        remaining: 0,
        cashRollover: 0,
        cashAvailable: 0,
        cashRemaining: 0,
        needs: emptyBucketProgress(),
        wants: emptyBucketProgress(),
        investments: emptyBucketProgress(),
    };

    if (firstKey == null) {
        return { months: [blank] };
    }

    const months = [];
    let cashRollover = 0;
    let needLeft = 0;
    let wantLeft = 0;
    let investLeft = 0;

    for (let key = firstKey; key <= targetKey; key++) {
        const { year, month } = fromMonthKey(key);
        const isolated = buckets.has(key)
            ? finalizeBucket(buckets.get(key))
            : emptyMonth(month, year);

        const needSpent = sumCols(isolated.totals, NEED_COLS);
        const wantSpent = sumCols(isolated.totals, WANT_COLS);
        const needs = stepBucket(needLeft, roundMoney(isolated.earned * 0.5), needSpent);
        const wants = stepBucket(wantLeft, roundMoney(isolated.earned * 0.3), wantSpent);
        const investments = stepBucket(investLeft, roundMoney(isolated.earned * 0.2), 0);

        const cashAvailable = roundMoney(isolated.earned + cashRollover);
        const cashRemaining = roundMoney(cashAvailable - isolated.spent);
        const spendableRollover = roundMoney(needLeft + wantLeft);
        const spendableAvailable = roundMoney(needs.available + wants.available);
        const spendableRemaining = roundMoney(needs.remaining + wants.remaining);

        months.push({
            ...isolated,
            rollover: spendableRollover,
            available: spendableAvailable,
            remaining: spendableRemaining,
            cashRollover,
            cashAvailable,
            cashRemaining,
            needs,
            wants,
            investments,
        });

        cashRollover = cashRemaining;
        needLeft = needs.remaining;
        wantLeft = wants.remaining;
        investLeft = investments.remaining;
    }

    return { months };
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