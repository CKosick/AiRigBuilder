import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPriceTrackerHtml } from '../src/components/priceTracker.js';
import { sparklineSvg } from '../src/utils/sparkline.js';
import { GPUS_DATA } from '../src/data/gpus.js';

/** Runs fn with every GPU's 7d trend temporarily replaced. */
function withTrends(value, fn) {
  const saved = GPUS_DATA.map(g => g.trend7d);
  GPUS_DATA.forEach(g => { g.trend7d = value; });
  try { return fn(); } finally { GPUS_DATA.forEach((g, i) => { g.trend7d = saved[i]; }); }
}

describe('Tracker ranking', () => {
  it('hides the 7d trend column while no GPU has a trend, and shows it once one does', () => {
    const none = withTrends(null, () => renderPriceTrackerHtml());
    assert.ok(!none.includes('7d Trend'), 'no header');
    assert.ok(!none.includes('data-label="7d trend"'), 'no cells');

    const some = withTrends(-2.5, () => renderPriceTrackerHtml());
    assert.ok(some.includes('<th scope="col">7d Trend</th>'));
    assert.equal((some.match(/data-label="7d trend"/g) || []).length, GPUS_DATA.length, 'one trend cell per GPU');
    assert.ok(some.includes('▼ 2.5%'));
  });

  it('marks the lowest price per GB as best value, whatever the sort', () => {
    const best = [...GPUS_DATA].sort((a, b) => a.pricePerGb - b.pricePerGb)[0];
    for (const sortBy of ['pricePerGb', 'price', 'vram', 'bandwidth']) {
      const html = renderPriceTrackerHtml({ sortBy, sortAsc: false });
      assert.equal((html.match(/class="is-best-value"/g) || []).length, 1, `${sortBy}: one best-value row`);
      const row = html.match(/<tr class="is-best-value">[\s\S]*?<\/tr>/)[0];
      assert.ok(row.includes(`>${best.name}</a>`), `${sortBy}: best value is ${best.name}`);
      assert.ok(row.includes('Best value per GB'));
    }
  });

  it('shows a price history line for every GPU', () => {
    const html = renderPriceTrackerHtml();
    assert.equal((html.match(/<svg class="sparkline"/g) || []).length, GPUS_DATA.length);
    assert.equal((html.match(/data-label="Price history"/g) || []).length, GPUS_DATA.length);
  });

  it('puts the price-alert form after the price table', () => {
    const html = renderPriceTrackerHtml();
    assert.ok(html.indexOf('class="gpu-table-card"') < html.indexOf('class="price-alert-banner"'));
  });
});

describe('Price history sparkline', () => {
  it('draws one line per run of months and a dashed join across missing months', () => {
    const svg = sparklineSvg([
      { date: 'Jan 2025', price: 700 },
      { date: 'Feb 2025', price: 690 },
      { date: 'May 2025', price: 720 },
      { date: 'Jun 2025', price: 710 }
    ]);
    assert.equal((svg.match(/<g class="sparkline-line"><path/g) || []).length, 1);
    assert.equal((svg.match(/<path /g) || []).length, 3, 'two solid runs and one dashed join');
    assert.match(svg, /<g class="sparkline-gap"><path d="M[\d.]+ [\d.]+ L[\d.]+ [\d.]+" \/><\/g>/);
    assert.match(svg, /aria-label="Monthly price history: Jan 2025 \$700 to Jun 2025 \$710, 2 months without data"/);
  });

  it('puts the highest price at the top and the lowest at the bottom', () => {
    const svg = sparklineSvg([{ date: 'Jan 2025', price: 100 }, { date: 'Feb 2025', price: 200 }], { width: 100, height: 30, pad: 0 });
    assert.match(svg, /<path d="M0 30 L100 0" \/>/);
  });

  it('draws a lone month as a dot, and nothing for no data', () => {
    const svg = sparklineSvg([{ date: 'Jan 2025', price: 500 }]);
    assert.ok(!svg.includes('<path'));
    assert.match(svg, /<circle cx="[\d.]+" cy="[\d.]+" r="1.6" \/>/);
    assert.equal(sparklineSvg([]), '');
  });
});
