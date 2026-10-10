import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderAllPages } from '../scripts/prerender.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT_DIR, p), 'utf-8');

// Prices are estimated from current eBay listings (asking prices adjusted down), not sold prices.
// The only "sold" wording allowed is the link to eBay's own sold-listings search.
const SOLD_CLAIM = /verified eBay|sold listings(?! →)|sold price|sold avg|sold average|average sold|avg sold|sold-price/i;

describe('Copy describes the prices as estimates from current listings', () => {
  it('no rendered page claims sold prices', () => {
    for (const { route, html } of renderAllPages(read('index.html'))) {
      const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/Check eBay Sold Listings →/g, '');
      const hit = text.match(SOLD_CLAIM);
      assert.equal(hit, null, `${route.path}: "${hit && text.slice(Math.max(0, hit.index - 60), hit.index + 40)}"`);
    }
  });

  it('nor do the browser-side strings, the alert email or the confirmation page', () => {
    for (const file of ['src/components/priceTracker.js', 'src/components/priceHistoryChart.js', 'src/services/alertService.js', 'api/alerts/confirm.js']) {
      const src = read(file).replace(/eBay Sold Listings →/g, '');
      assert.equal(src.match(SOLD_CLAIM), null, `${file}: ${src.match(SOLD_CLAIM)}`);
    }
  });

  it('says how the estimate is made, and that alerts are checked daily', () => {
    const pages = renderAllPages(read('index.html'));
    const home = pages.find(p => p.route.home).html;
    assert.match(home, /Used prices estimated from current eBay listings, last updated/);
    assert.match(home, /estimated weekly from current eBay listings: asking prices, adjusted down/);
    assert.match(read('api/alerts/confirm.js'), /Alerts are checked daily\./);
  });
});
