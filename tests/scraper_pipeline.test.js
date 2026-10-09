import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  reviewTargets, isUsableListing, priceCard, selectApplicable, writeReview, reviewMarkdown,
  SEARCH_TARGETS, STATUS, MIN_LISTINGS, SWING_LIMIT_PCT, ASKING_TO_SOLD
} from '../scripts/price_review.js';
import { parsePrice } from '../scripts/scrape_ebay_prices.js';
import { GPUS_DATA } from '../src/data/gpus.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT_DIR, p), 'utf-8');
const target = (overrides = {}) => ({ ...reviewTargets().find(t => t.id === 'rtx-3090'), ...overrides });
const listings = (...prices) => prices.map((price, i) => ({ title: `EVGA RTX 3090 24GB working #${i}`, price }));

describe('Weekly price review pipeline', () => {
  describe('Search targets', () => {
    it('take the current price, name and VRAM from gpus.js, not a copy in the scraper', () => {
      const targets = reviewTargets();
      assert.equal(targets.length, GPUS_DATA.length);
      for (const t of targets) {
        const gpu = GPUS_DATA.find(g => g.id === t.id);
        assert.equal(t.currentPrice, gpu.usedStreetPrice, t.id);
        assert.equal(t.name, gpu.name);
      }
      for (const t of SEARCH_TARGETS) assert.equal(t.currentPrice, undefined, `${t.id} has no typed-in price`);
      assert.ok(!/currentPrice|TRACKED_GPUS/.test(read('scripts/fetch_ebay.py')), 'fetch_ebay.py has no GPU list or prices of its own');
      assert.ok(!/currentPrice:\s*\d/.test(read('scripts/scrape_ebay_prices.js')), 'scrape_ebay_prices.js has no typed-in prices');
    });

    it("keeps each GPU's live price inside its sensible range, so the search can find it", () => {
      for (const t of reviewTargets()) {
        assert.ok(t.currentPrice >= t.minSensiblePrice && t.currentPrice <= t.maxSensiblePrice * 0.85,
          `${t.id}: $${t.currentPrice} vs range $${t.minSensiblePrice}-$${t.maxSensiblePrice}`);
      }
    });

    it('parses eBay price strings', () => {
      assert.equal(parsePrice('$1,149.99'), 1149.99);
      assert.equal(parsePrice('US $275.00 /ea'), 275);
      assert.equal(parsePrice('No price found'), null);
    });
  });

  describe('Listing filter', () => {
    const t = target();
    it('rejects parts, junk and out-of-range listings', () => {
      assert.equal(isUsableListing({ title: 'NVIDIA RTX 3090 24GB FOR PARTS ONLY NO POST', price: 700 }, t), false);
      assert.equal(isUsableListing({ title: 'RTX 3090 Original Box Only', price: 700 }, t), false);
      assert.equal(isUsableListing({ title: 'Custom Gaming PC with RTX 3090', price: 900 }, t), false);
      assert.equal(isUsableListing({ title: 'EVGA RTX 3090 FTW3 24GB', price: t.maxSensiblePrice + 1 }, t), false);
      assert.equal(isUsableListing({ title: 'EVGA RTX 3090 FTW3 24GB', price: 'n/a' }, t), false);
    });
    it('accepts working cards in range', () => {
      assert.equal(isUsableListing({ title: 'EVGA GeForce RTX 3090 FTW3 ULTRA 24GB Tested', price: 720 }, t), true);
    });
  });

  describe('Proposed price', () => {
    it('uses the median of active listings minus the asking-to-sold spread, with a 15-85% range', () => {
      const card = priceCard(target({ currentPrice: 700 }), listings(600, 650, 700, 720, 750, 800, 850), 'EBAY_BROWSE_API');
      assert.equal(card.proposedPrice, Math.round(720 * ASKING_TO_SOLD));
      assert.equal(card.priceLow, Math.round(650 * ASKING_TO_SOLD));
      assert.equal(card.priceHigh, Math.round(800 * ASKING_TO_SOLD)); // floor(7 * 0.85) = index 5
      assert.equal(card.sampleCount, 7);
      assert.equal(card.status, STATUS.APPROVED);
    });

    it('uses sold prices as they are', () => {
      const card = priceCard(target({ currentPrice: 700 }), listings(680, 700, 720), 'REAL_EBAY_SOLD');
      assert.equal(card.proposedPrice, 700);
    });

    it('measures the change against the live site price and holds big swings', () => {
      const live = target();
      const up = priceCard(live, listings(...Array(5).fill(Math.round(live.currentPrice * 1.3 / ASKING_TO_SOLD))), 'EBAY_BROWSE_API');
      assert.ok(up.changePct > SWING_LIMIT_PCT);
      assert.equal(up.status, STATUS.FLAGGED_SWING);
      assert.equal(up.currentPrice, live.currentPrice);
    });

    it(`gives NO_DATA (no change, never applied) below ${MIN_LISTINGS} usable listings`, () => {
      const t = target();
      for (const few of [[], listings(700), listings(700, 710), [...listings(700, 710), { title: 'RTX 3090 for parts', price: 300 }]]) {
        const card = priceCard(t, few, 'EBAY_BROWSE_API', { error: 'HTTP 403' });
        assert.equal(card.status, STATUS.NO_DATA);
        assert.equal(card.proposedPrice, t.currentPrice, 'proposes the live price, not an old baseline');
        assert.equal(card.changePct, 0);
        assert.equal(card.priceLow, null);
      }
      assert.match(priceCard(t, [], 'EBAY_BROWSE_API', { error: 'HTTP 403' }).notes, /HTTP 403/);
    });
  });

  describe('What prices:apply may apply', () => {
    const live = GPUS_DATA.find(g => g.id === 'rtx-3090');
    const good = { id: live.id, name: live.name, currentPrice: live.usedStreetPrice, proposedPrice: live.usedStreetPrice + 10, priceLow: 600, priceHigh: 800, status: STATUS.APPROVED };

    it('applies approved cards priced against the live price', () => {
      assert.deepEqual(selectApplicable([good]).apply, [good]);
    });

    it('holds NO_DATA and flagged cards, stale reviews and broken numbers, with the reason', () => {
      const { apply, held } = selectApplicable([
        { ...good, status: STATUS.NO_DATA },
        { ...good, status: STATUS.FLAGGED_SWING },
        { ...good, currentPrice: 175 },
        { ...good, priceLow: null },
        { ...good, id: 'no-such-gpu' }
      ]);
      assert.deepEqual(apply, []);
      assert.deepEqual(held.map(h => h.reason.split(':')[0]), ['NO_DATA', 'FLAGGED_SWING', 'stale review', 'invalid price or range', 'unknown GPU']);
    });

    it('apply_prices.js uses this rule and no longer sends alert emails', () => {
      const apply = read('scripts/apply_prices.js');
      assert.ok(apply.includes('selectApplicable('));
      assert.ok(!/evaluateAndTriggerAlerts|alertService/.test(apply), 'alerts are not sent from an unreviewed apply');
    });
  });

  describe('Review files', () => {
    it('writes JSON and markdown that show held and no-data cards plainly', () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-'));
      const t = target();
      const cards = [
        priceCard(t, listings(700, 720, 740, 760), 'EBAY_BROWSE_API'),
        priceCard({ ...t, id: 'tesla-p40', name: 'NVIDIA Tesla P40 24GB' }, [], 'EBAY_BROWSE_API', { error: 'HTTP 403' })
      ];
      const payload = writeReview(cards, { rootDir: dir, date: new Date('2026-10-13T23:00:00Z'), fetchedWith: 'test' });
      assert.equal(payload.reviewStatus, 'PENDING_REVIEW');
      const md = fs.readFileSync(path.join(dir, 'PENDING_PRICE_REVIEW.md'), 'utf-8');
      assert.match(md, /^# Weekly Used GPU Price Review — Oct 13, 2026/);
      assert.match(md, /NVIDIA Tesla P40 24GB \| \$[\d,]+ \| — \| — \| — \| 0 \| No data \| No change: not enough listings/);
      assert.equal(reviewMarkdown(cards).split('\n').filter(l => l.startsWith('| NVIDIA')).length, 2);
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it('the committed review file has a valid shape', () => {
      const data = JSON.parse(read('data/pending_price_review.json'));
      assert.ok(data.scrapedAt && Array.isArray(data.cards) && data.cards.length === 10);
      for (const card of data.cards) {
        assert.ok(card.id && card.name && card.proposedPrice > 0, card.id);
        assert.ok(Object.values(STATUS).includes(card.status) || card.status === 'HELD_FOR_REVIEW', `${card.id}: ${card.status}`);
      }
    });
  });
});
