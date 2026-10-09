import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { computePriceTrends, priceObservations, trendBadgeHtml } from '../src/utils/priceTrends.js';
import { GPUS_DATA } from '../src/data/gpus.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT_LOG = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'price_history_log.json'), 'utf-8'));

const DAY = 24 * 60 * 60 * 1000;
const LATEST = Date.parse('2026-10-20T00:00:00Z');
// One apply run `daysAgo` before LATEST that set the given prices
const run = (daysAgo, prices) => ({
  appliedAt: new Date(LATEST - daysAgo * DAY).toISOString(),
  updates: Object.entries(prices).map(([id, newPrice]) => ({ id, newPrice }))
});

describe('7d / 30d price trends from the apply log', () => {
  it('is null for both windows when the log has no price from about a week or a month earlier', () => {
    const log = [run(0.1, { a: 700 }), run(0, { a: 720 })];
    assert.deepEqual(computePriceTrends(log, 'a', 720), { trend7d: null, trend30d: null });
    assert.deepEqual(computePriceTrends([], 'a', 720), { trend7d: null, trend30d: null });
    assert.deepEqual(computePriceTrends([run(0, { a: 720 })], 'a', 720), { trend7d: null, trend30d: null });
  });

  it('compares against the price from about 7 and about 30 days before the latest run', () => {
    const log = [run(30, { a: 800 }), run(7, { a: 750 }), run(0, { a: 720 })];
    assert.deepEqual(computePriceTrends(log, 'a', 720), { trend7d: -4, trend30d: -10 });
  });

  it('picks the observation closest to the target age inside the window', () => {
    const log = [run(9, { a: 600 }), run(6.5, { a: 650 }), run(0, { a: 700 })];
    // 6.5 days old is closer to 7 than 9 days old
    assert.equal(computePriceTrends(log, 'a', 700).trend7d, 7.7);
  });

  it('ignores prices outside each window instead of stretching it', () => {
    const log = [run(15, { a: 500 }), run(2, { a: 690 }), run(0, { a: 700 })];
    assert.deepEqual(computePriceTrends(log, 'a', 700), { trend7d: null, trend30d: null });
  });

  it('only uses observations for the requested GPU', () => {
    const log = [run(7, { b: 100 }), run(0, { a: 700, b: 200 })];
    assert.equal(computePriceTrends(log, 'a', 700).trend7d, null);
    assert.equal(computePriceTrends(log, 'b', 200).trend7d, 100);
    assert.deepEqual(priceObservations(log, 'a').map(p => p.price), [700]);
  });

  it('gpus.js trends match what the committed apply log supports', () => {
    for (const gpu of GPUS_DATA) {
      assert.deepEqual(
        { trend7d: gpu.trend7d, trend30d: gpu.trend30d },
        computePriceTrends(AUDIT_LOG, gpu.id, gpu.usedStreetPrice),
        `${gpu.id} trends must come from data/price_history_log.json (null when there is no ~7/30-day gap)`
      );
    }
  });

  it('apply_prices.js recomputes trends instead of copying the scraper\'s change vs current price', () => {
    const apply = fs.readFileSync(path.join(ROOT_DIR, 'scripts', 'apply_prices.js'), 'utf-8');
    assert.ok(!/update\.trend7d/.test(apply), 'the scraper delta is not a 7-day trend');
    assert.ok(apply.includes('computePriceTrends('), 'trends come from the audit log');
  });

  it('renders "n/a" for an unavailable trend and an arrow badge for a number', () => {
    assert.match(trendBadgeHtml(null), /trend-na[^>]*>n\/a</);
    assert.match(trendBadgeHtml(undefined), /n\/a/);
    assert.match(trendBadgeHtml(-2.5), /trend-down">▼ 2\.5%/);
    assert.match(trendBadgeHtml(0), /trend-down">▼ 0%/);
    assert.match(trendBadgeHtml(3.1), /trend-up">▲ 3\.1%/);
  });
});
