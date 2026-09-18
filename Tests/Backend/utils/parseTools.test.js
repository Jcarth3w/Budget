import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateMonthFromRows,
  breakdownFromTotals,
  chainMonthsThrough,
  parseClientDate,
  parseSheetDate,
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

test('parses sheet and client dates as local calendar dates', () => {
  const sheet = parseSheetDate('12/31/2025');
  const client = parseClientDate('2026-01-02');

  assert.deepEqual(
    { year: sheet.year, month: sheet.month, day: sheet.day },
    { year: 2025, month: 11, day: 31 },
  );
  assert.deepEqual(
    { year: client.getFullYear(), month: client.getMonth(), day: client.getDate() },
    { year: 2026, month: 0, day: 2 },
  );
  assert.equal(parseSheetDate('not-a-date'), null);
});

test('maps sheet totals to the public category breakdown', () => {
  assert.deepEqual(
    breakdownFromTotals({ G: 10.129, H: 20, I: 3, J: 4, K: 5, L: 6, M: 7, N: 8 }),
    {
      entertainment: 10.13,
      food: 20,
      gas: 3,
      phone: 4,
      medical: 5,
      car: 6,
      apartment: 7,
      groceries: 8,
    },
  );
});

test('aggregates only rows in the requested month', () => {
  const rows = [
    row('1/2/2026', { income: 1000, food: 40 }),
    row('1/10/2026', { entertainment: 20, gas: 30 }),
    row('2/1/2026', { income: 500, food: 99 }),
  ];

  const month = aggregateMonthFromRows(rows, 0, 2026);
  assert.equal(month.matchingRows, 2);
  assert.equal(month.earned, 1000);
  assert.equal(month.spent, 90);
  assert.equal(month.remaining, 910);
});

test('chains cash and 50/30/20 bucket balances across empty months and years', () => {
  const rows = [
    row('12/15/2025', { income: 1000, food: 100, gas: 200 }),
    row('2/1/2026', { income: 500, food: 250, gas: 100 }),
  ];

  const { months } = chainMonthsThrough(rows, 1, 2026);
  assert.equal(months.length, 3);

  const december = months[0];
  assert.equal(december.available, 800);
  assert.equal(december.remaining, 500);
  assert.equal(december.needs.remaining, 300);
  assert.equal(december.wants.remaining, 200);
  assert.equal(december.investments.remaining, 200);

  const january = months[1];
  assert.equal(january.earned, 0);
  assert.equal(january.remaining, 500);

  const february = months[2];
  assert.equal(february.rollover, 500);
  assert.equal(february.available, 900);
  assert.equal(february.spent, 350);
  assert.equal(february.remaining, 550);
  assert.equal(february.investments.remaining, 300);
});

test('returns a zeroed target month when there is no activity', () => {
  const { months } = chainMonthsThrough([], 8, 2026);
  assert.equal(months.length, 1);
  assert.equal(months[0].month, 8);
  assert.equal(months[0].year, 2026);
  assert.equal(months[0].available, 0);
  assert.equal(months[0].needs.remaining, 0);
});
