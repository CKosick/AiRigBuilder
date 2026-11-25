import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { monthLabel, recordMonthlyPrice, fillMonthGaps, historyGapBetween } from '../src/utils/priceHistory.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { renderGpuDetailHtml } from '../src/components/gpuDetail.js';

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

  it('detects gaps > 2 months between consecutive history entries', () => {
    assert.equal(historyGapBetween('Oct 2026', 'Nov 2026'), null);
    assert.equal(historyGapBetween('Jan 2025', 'Mar 2025'), null);
    assert.deepEqual(historyGapBetween('Feb 2025', 'Oct 2026'), {
      start: 'Mar 2025',
      end: 'Sep 2026',
      missingMonths: 19
    });
  });

  it('inserts a gap row strictly between >2-month gaps on RTX 3090 and omits it for continuous RTX 5090 history', () => {
    const rtx3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
    const html3090 = renderGpuDetailHtml(rtx3090);
    const tbodyMatch3090 = html3090.match(/Price History<\/h3>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);
    assert.ok(tbodyMatch3090, 'RTX 3090 history tbody rendered');
    const tbody3090 = tbodyMatch3090[1];
    assert.ok(tbody3090.includes('<tr class="history-gap-row">'), 'RTX 3090 has gap row');
    assert.ok(tbody3090.includes('No data: Mar 2025 – Sep 2026'), 'RTX 3090 states gap span');

    const firstRowIdx = tbody3090.indexOf('<tr>');
    const octIdx = tbody3090.indexOf('Oct 2026');
    const gapIdx = tbody3090.indexOf('history-gap-row');
    const febIdx = tbody3090.indexOf('Feb 2025');
    const julIdx = tbody3090.indexOf('Jul 2024');
    assert.ok(firstRowIdx < gapIdx, 'gap row is never before the first point');
    assert.ok(octIdx < gapIdx && gapIdx < febIdx, 'gap row sits strictly between Oct 2026 and Feb 2025');
    assert.ok(gapIdx < julIdx, 'gap row is never after the last point');

    const rtx5090 = GPUS_DATA.find(g => g.id === 'rtx-5090');
    const html5090 = renderGpuDetailHtml(rtx5090);
    const tbodyMatch5090 = html5090.match(/Price History<\/h3>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);
    assert.ok(tbodyMatch5090, 'RTX 5090 history tbody rendered');
    assert.ok(!tbodyMatch5090[1].includes('history-gap-row'), 'continuous GPU has no gap row');
    assert.ok(!tbodyMatch5090[1].includes('No data:'), 'continuous GPU has no "No data:" text');
  });
});
