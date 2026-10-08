import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { monthLabel, recordMonthlyPrice, fillMonthGaps } from '../src/utils/priceHistory.js';

describe('Monthly Price History', () => {
  it('labels months as "Mon YYYY"', () => {
    assert.equal(monthLabel(new Date('2026-10-07T03:56:24Z')), 'Oct 2026');
  });

  it('updates the current month and appends a new month', () => {
    const history = [{ date: 'Sep 2026', price: 700 }];
    recordMonthlyPrice(history, 710, new Date('2026-09-20T00:00:00Z'));
    assert.deepEqual(history, [{ date: 'Sep 2026', price: 710 }]);
    recordMonthlyPrice(history, 690, new Date('2026-10-03T00:00:00Z'));
    assert.deepEqual(history, [{ date: 'Sep 2026', price: 710 }, { date: 'Oct 2026', price: 690 }]);
  });

  it('fills missing months with null points across a year boundary', () => {
    const { points, missingMonths } = fillMonthGaps([
      { date: 'Nov 2024', price: 720 },
      { date: 'Feb 2025', price: 698 }
    ]);
    assert.equal(missingMonths, 2);
    assert.deepEqual(points.map(p => p.date), ['Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025']);
    assert.deepEqual(points.map(p => p.price), [720, null, null, 698]);
  });
});
