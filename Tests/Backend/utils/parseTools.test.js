import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateMonthFromRows,
  breakdownFromTotals,
  bucketRowsByMonth,
  chainMonthsThrough,
  colLetterToIndex,
  emptySpendingTotals,
  formatDateKey,
  fromMonthKey,
  getPreviousCalendarMonth,
  parseClientDate,
  parseSheetDate,
  roundMoney,
  toMonthKey,
} from '../../../Backend/utils/parseTools.js';

function row(date, { income = 0, entertainment = 0, food = 0, gas = 0 } = {}) {
  const values = Array(14).fill('');
  values[0] = date;
  values[3] = income;
  values[6] = entertainment;
  values[7] = food;
  values[8] = gas;
  return values;
}

test('colLetterToIndex converts A', () => {
  assert.equal(colLetterToIndex('A'), 0);
});

test('colLetterToIndex is case-insensitive', () => {
  assert.equal(colLetterToIndex('n'), 13);
});

test('formatDateKey formats a local date', () => {
  assert.equal(formatDateKey(new Date(2026, 8, 5)), '9/5/2026');
});

test('parseSheetDate parses M/D/YYYY', () => {
  const parsed = parseSheetDate('12/31/2025');
  assert.deepEqual(
    { year: parsed.year, month: parsed.month, day: parsed.day },
    { year: 2025, month: 11, day: 31 },
  );
});

test('parseSheetDate rejects invalid text', () => {
  assert.equal(parseSheetDate('not-a-date'), null);
});

test('parseSheetDate rejects an empty value', () => {
  assert.equal(parseSheetDate(''), null);
});

test('parseClientDate parses YYYY-MM-DD locally', () => {
  const parsed = parseClientDate('2026-01-02');
  assert.deepEqual(
    { year: parsed.getFullYear(), month: parsed.getMonth(), day: parsed.getDate() },
    { year: 2026, month: 0, day: 2 },
  );
});

test('parseClientDate accepts M/D/YYYY', () => {
  const parsed = parseClientDate('4/9/2026');
  assert.equal(formatDateKey(parsed), '4/9/2026');
});

test('parseClientDate rejects invalid text', () => {
  assert.equal(parseClientDate('not-a-date'), null);
});

test('roundMoney rounds to cents', () => {
  assert.equal(roundMoney(10.129), 10.13);
});

test('emptySpendingTotals initializes every spending column', () => {
  assert.deepEqual(emptySpendingTotals(), {
    G: 0,
    H: 0,
    I: 0,
    J: 0,
    K: 0,
    L: 0,
    M: 0,
    N: 0,
  });
});

test('breakdownFromTotals maps every category', () => {
  assert.deepEqual(
    breakdownFromTotals({ G: 1, H: 2, I: 3, J: 4, K: 5, L: 6, M: 7, N: 8 }),
    {
      entertainment: 1,
      food: 2,
      gas: 3,
      phone: 4,
      medical: 5,
      car: 6,
      apartment: 7,
      groceries: 8,
    },
  );
});

test('breakdownFromTotals rounds category amounts', () => {
  const breakdown = breakdownFromTotals({ G: 10.129, H: 0, I: 0, J: 0, K: 0, L: 0, M: 0, N: 0 });
  assert.equal(breakdown.entertainment, 10.13);
});

test('getPreviousCalendarMonth decrements within a year', () => {
  assert.deepEqual(getPreviousCalendarMonth(8, 2026), { month: 7, year: 2026 });
});

test('getPreviousCalendarMonth crosses into December', () => {
  assert.deepEqual(getPreviousCalendarMonth(0, 2026), { month: 11, year: 2025 });
});

test('toMonthKey creates consecutive month keys', () => {
  assert.equal(toMonthKey(2026, 0) - toMonthKey(2025, 11), 1);
});

test('fromMonthKey reverses toMonthKey', () => {
  assert.deepEqual(fromMonthKey(toMonthKey(2026, 8)), { year: 2026, month: 8 });
});

test('bucketRowsByMonth groups rows by calendar month', () => {
  const buckets = bucketRowsByMonth([
    row('1/2/2026', { income: 1000, food: 40 }),
    row('1/10/2026', { gas: 30 }),
    row('2/1/2026', { income: 500 }),
  ]);
  assert.equal(buckets.size, 2);
});

test('bucketRowsByMonth accumulates income and spending', () => {
  const buckets = bucketRowsByMonth([
    row('1/2/2026', { income: 1000, food: 40 }),
    row('1/10/2026', { income: 250, food: 10 }),
  ]);
  const january = buckets.get(toMonthKey(2026, 0));
  assert.equal(january.earned, 1250);
  assert.equal(january.totals.H, 50);
});

test('bucketRowsByMonth ignores rows without dates', () => {
  const buckets = bucketRowsByMonth([row('', { income: 1000 })]);
  assert.equal(buckets.size, 0);
});

test('aggregateMonthFromRows counts matching rows', () => {
  const month = aggregateMonthFromRows([
    row('1/2/2026'),
    row('1/10/2026'),
    row('2/1/2026'),
  ], 0, 2026);
  assert.equal(month.matchingRows, 2);
});

test('aggregateMonthFromRows totals income', () => {
  const month = aggregateMonthFromRows([
    row('1/2/2026', { income: 1000 }),
    row('1/10/2026', { income: 250 }),
  ], 0, 2026);
  assert.equal(month.earned, 1250);
});

test('aggregateMonthFromRows totals spending', () => {
  const month = aggregateMonthFromRows([
    row('1/2/2026', { food: 40 }),
    row('1/10/2026', { entertainment: 20, gas: 30 }),
  ], 0, 2026);
  assert.equal(month.spent, 90);
});

test('aggregateMonthFromRows calculates remaining income', () => {
  const month = aggregateMonthFromRows([
    row('1/2/2026', { income: 1000, food: 40 }),
  ], 0, 2026);
  assert.equal(month.remaining, 960);
});

test('aggregateMonthFromRows returns zero for an empty month', () => {
  const month = aggregateMonthFromRows([], 0, 2026);
  assert.equal(month.spent, 0);
});

test('chainMonthsThrough returns a zeroed target month', () => {
  const { months } = chainMonthsThrough([], 8, 2026);
  assert.equal(months.length, 1);
  assert.equal(months[0].month, 8);
  assert.equal(months[0].year, 2026);
  assert.equal(months[0].available, 0);
});

test('chainMonthsThrough includes inactive months', () => {
  const { months } = chainMonthsThrough([
    row('12/15/2025', { income: 1000 }),
    row('2/1/2026', { income: 500 }),
  ], 1, 2026);
  assert.equal(months.length, 3);
  assert.equal(months[1].earned, 0);
});

test('chainMonthsThrough carries spendable rollover', () => {
  const { months } = chainMonthsThrough([
    row('1/1/2026', { income: 1000, food: 100, gas: 200 }),
    row('2/1/2026', { income: 500 }),
  ], 1, 2026);
  assert.equal(months[1].rollover, 500);
});

test('chainMonthsThrough applies 50 percent to needs', () => {
  const { months } = chainMonthsThrough([
    row('1/1/2026', { income: 1000 }),
  ], 0, 2026);
  assert.equal(months[0].needs.allocated, 500);
});

test('chainMonthsThrough applies 30 percent to wants', () => {
  const { months } = chainMonthsThrough([
    row('1/1/2026', { income: 1000 }),
  ], 0, 2026);
  assert.equal(months[0].wants.allocated, 300);
});

test('chainMonthsThrough applies 20 percent to investments', () => {
  const { months } = chainMonthsThrough([
    row('1/1/2026', { income: 1000 }),
  ], 0, 2026);
  assert.equal(months[0].investments.allocated, 200);
});
