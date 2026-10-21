import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  reviewTargets, isUsableListing, listingRejection, dedupeListings, priceCard, selectApplicable, writeReview, reviewMarkdown,
  SEARCH_TARGETS, GLOBAL_EXCLUDE_TERMS, STATUS, MIN_LISTINGS, SWING_LIMIT_PCT, ASKING_TO_SOLD
} from '../scripts/price_review.js';
import { parsePrice } from '../scripts/scrape_ebay_prices.js';
import { buildReport, reportMarkdown, experimentTargets, VARIANTS } from '../scripts/price_experiment.js';
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
      // Unpriced new rows are reported by the data-integrity test instead
      for (const t of reviewTargets().filter(x => x.currentPrice !== null)) {
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

    // The 2026-10-16 scrape: eBay mixed Apple Mac mini sold listings into the RTX A5000 search.
    // They sat inside the A5000's price bounds and tripped no exclude keyword, so the A5000's whole
    // "price" came from Mac minis. A listing must name the card it is counted for.
    const a5000 = target({ ...reviewTargets().find(x => x.id === 'rtx-a5000') });
    const macMini = { title: 'Apple Mac mini 2023 M2 Pro 32GB RAM 1TB SSD Silver Excellent', price: 1170 };

    it('rejects a listing whose title never names the card, even in range with no excluded word', () => {
      assert.ok(macMini.price >= a5000.minSensiblePrice && macMini.price <= a5000.maxSensiblePrice, 'the Mac mini is inside the A5000 bounds');
      const title = macMini.title.toLowerCase();
      assert.ok(!GLOBAL_EXCLUDE_TERMS.some(term => title.includes(term)) && !a5000.excludeKeywords.some(kw => title.includes(kw)), 'and trips no exclude keyword');
      assert.equal(isUsableListing(macMini, a5000), false);
      assert.equal(isUsableListing({ title: 'PNY NVIDIA RTX A5000 24GB GDDR6 Workstation GPU', price: 1170 }, a5000), true);
    });

    it('rejects multi-card "lot of" listings', () => {
      assert.equal(isUsableListing({ title: 'Lot of 2 EVGA RTX 3090 24GB FTW3', price: 900 }, t), false);
      assert.equal(isUsableListing({ title: '(LOT OF 3) PNY RTX 3090 24GB', price: 900 }, t), false);
    });

    it("every search target's title pattern names its own GPU and rejects the Mac mini", () => {
      for (const target of reviewTargets()) {
        assert.ok(typeof target.titlePattern === 'string' && target.titlePattern.length > 0, `${target.id} has a titlePattern`);
        const re = new RegExp(target.titlePattern, 'i');
        assert.ok(re.test(target.name), `${target.id}: /${target.titlePattern}/ must match "${target.name}"`);
        assert.ok(!re.test(macMini.title), `${target.id}: /${target.titlePattern}/ must not match the Mac mini`);
      }
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

  describe('Thin-card filters (RTX 3090, 4090, A5000)', () => {
    const card = (id) => reviewTargets().find(t => t.id === id);

    it('accepts the base RTX 3090 and rejects the 3090 Ti in every spelling', () => {
      const t3090 = card('rtx-3090');
      for (const title of ['EVGA GeForce RTX 3090 FTW3 Ultra 24GB', 'NVIDIA RTX 3090 Founders Edition 24GB', 'Dell RTX 3090 24GB OEM']) {
        assert.equal(listingRejection({ title, price: 700 }, t3090), null, title);
      }
      for (const title of ['ASUS ROG Strix RTX 3090 Ti 24GB', 'MSI RTX 3090Ti Gaming X Trio', 'Gigabyte RTX 3090-Ti Vision OC']) {
        assert.equal(listingRejection({ title, price: 700 }, t3090), 'wrong-variant', title);
      }
      assert.match(t3090.query, /-\(ti,/, 'the 3090 query also excludes Ti');
    });

    it('rejects complete systems for a standalone-card target, but keeps OEM-branded cards', () => {
      const t4090 = card('rtx-4090');
      for (const title of [
        'CyberPowerPC Gamer Xtreme i9-13900K RTX 4090 32GB DDR5 2TB SSD',
        'Alienware Aurora R15 Desktop RTX 4090',
        'Custom Prebuilt Ryzen 9 7950X RTX 4090 Tower'
      ]) assert.equal(listingRejection({ title, price: 2000 }, t4090), 'complete-system', title);
      assert.equal(listingRejection({ title: 'ASUS TUF Gaming RTX 4090 24GB GDDR6X', price: 1500 }, t4090), null);
      assert.equal(listingRejection({ title: 'HP OMEN RTX 4090 24GB Graphics Card', price: 1500 }, t4090), null);
      // Regression, Oct 16 scrape: the seller wrote "RAM" for the card's own 24GB of VRAM. One of
      // only two real 4090 listings that day; RAM equal to the card's VRAM must not mark a system.
      assert.equal(listingRejection({ title: 'ASUS NVIDIA GeForce RTX 4090 24gb RAM', price: 1500 }, t4090), null);
      assert.equal(listingRejection({ title: 'RTX 4090 Build 64GB RAM', price: 2000 }, t4090), 'complete-system');

      const tA5000 = card('rtx-a5000');
      assert.equal(listingRejection({ title: 'Dell Precision 7920 Workstation Xeon RTX A5000 64GB RAM', price: 1500 }, tA5000), 'complete-system');
      assert.equal(listingRejection({ title: 'Lenovo ThinkStation P620 RTX A5000', price: 1500 }, tA5000), 'complete-system');
      assert.equal(listingRejection({ title: 'Dell NVIDIA RTX A5000 24GB GDDR6 Graphics Card', price: 1200 }, tA5000), null);
      assert.equal(listingRejection({ title: 'PNY NVIDIA RTX A5000 24GB', price: 1200 }, tA5000), null);
    });

    it('counts a sale once when several query variants or pages return it', () => {
      const t3090 = card('rtx-3090');
      const sale = (itemId, price) => ({ title: `EVGA RTX 3090 24GB #${itemId}`, price, itemId });
      const fromVariantA = [sale('1001', 700), sale('1002', 720), sale('1003', 740)];
      const fromVariantB = [sale('1002', 720), sale('1003', 740), sale('1004', 760)];
      assert.deepEqual(dedupeListings([...fromVariantA, ...fromVariantB]).map(l => l.itemId), ['1001', '1002', '1003', '1004']);
      assert.equal(priceCard(t3090, [...fromVariantA, ...fromVariantB], 'REAL_EBAY_SOLD').sampleCount, 4);
      // two real sales can share a title and price: without an item ID nothing is merged
      const noIds = [{ title: 'EVGA RTX 3090 24GB', price: 700 }, { title: 'EVGA RTX 3090 24GB', price: 700 }];
      assert.equal(dedupeListings(noIds).length, 2);
    });

    it('leaves every other card on its previous rules', () => {
      for (const t of reviewTargets().filter(x => !['rtx-3090', 'rtx-4090', 'rtx-a5000'].includes(x.id))) {
        assert.equal(t.rejectPattern, undefined, t.id);
        assert.equal(t.rejectSystems, undefined, t.id);
        assert.equal(t.queries, undefined, t.id);
        assert.equal(t.pageSize, undefined, t.id);
      }
    });
  });

  describe('Search experiment report', () => {
    const run = [
      { id: 'rtx-3090::baseline', rawListings: [
        { title: 'EVGA RTX 3090 24GB', price: 700, itemId: '1' },
        { title: 'Apple Mac mini M2 Pro 32GB', price: 700, itemId: '2', fewerWords: true }
      ] },
      { id: 'rtx-3090::minimal', rawListings: [
        { title: 'EVGA RTX 3090 24GB', price: 700, itemId: '1' },
        { title: 'MSI RTX 3090 Ti 24GB', price: 800, itemId: '3' },
        { title: 'Prebuilt i9-12900K RTX 3090 32GB DDR5', price: 900, itemId: '4' },
        { title: 'ASUS RTX 3090 24GB', price: 720, itemId: '5' }
      ] },
      { id: 'rtx-3090::geforce', rawListings: [{ title: 'ASUS RTX 3090 24GB', price: 720, itemId: '5' }, { title: 'Zotac RTX 3090 24GB', price: 2000, itemId: '6' }] }
    ];

    it('counts each filter stage and combines variants, each eBay item once', () => {
      const r = buildReport(run)['rtx-3090'];
      assert.equal(r.gate, 20);
      assert.equal(r.rows.baseline.raw, 2);
      assert.equal(r.rows.baseline.fewerWords, 1);
      assert.equal(r.rows.baseline.removed['title-mismatch'].length, 1);
      assert.equal(r.rows.minimal.removed['wrong-variant'].length, 1);
      assert.equal(r.rows.minimal.removed['complete-system'].length, 1);
      // combined = minimal + geforce + the rest (baseline excluded): items 1, 3, 4, 5, 6
      assert.equal(r.rows.combined.raw, 5);
      assert.deepEqual(r.rows.combined.usable.map(l => l.itemId).sort(), ['1', '5']);
      assert.equal(r.rows.combined.removed['out-of-range'].length, 1);
      assert.match(reportMarkdown(buildReport(run)), /\| combined \|/);
    });

    it('fetches every variant with the card\'s own filters, sold-only, 240 per page', () => {
      const targets = experimentTargets();
      const v = targets.find(t => t.id === 'rtx-3090::minimal');
      assert.deepEqual(v.queries, [VARIANTS['rtx-3090'].minimal.query]);
      assert.equal(v.pageSize, 240);
      assert.equal(v.rejectPattern, reviewTargets().find(t => t.id === 'rtx-3090').rejectPattern);
      assert.equal(targets.length, Object.values(VARIANTS).reduce((n, vs) => n + Object.keys(vs).length, 0));
      assert.match(read('scripts/price_experiment.js'), /PRICE_SOLD_ONLY: '1'/);
    });
  });

  describe('First price for a newly tracked GPU', () => {
    const fresh = target({ id: 'new-gpu', currentPrice: null });

    it('is always held for approval, with no change percentage', () => {
      const card = priceCard(fresh, listings(600, 650, 700, 720, 750), 'EBAY_BROWSE_API');
      assert.equal(card.status, STATUS.FLAGGED_FIRST_PRICE);
      assert.equal(card.changePct, null);
      assert.ok(card.proposedPrice > 0 && card.priceLow > 0 && card.priceHigh >= card.priceLow);
      assert.match(reviewMarkdown([card]), /\| first price \|[^\n]*Held: first price, needs approval/);
    });

    it('proposes nothing when there are too few listings', () => {
      const card = priceCard(fresh, listings(700), 'EBAY_BROWSE_API');
      assert.equal(card.status, STATUS.NO_DATA);
      assert.equal(card.proposedPrice, null);
    });

    it('is applied only once approved', () => {
      const gpus = [{ id: 'new-gpu', usedStreetPrice: null }];
      const card = priceCard(fresh, listings(600, 650, 700, 720, 750), 'EBAY_BROWSE_API');
      assert.deepEqual(selectApplicable([card], gpus).apply, []);
      assert.equal(selectApplicable([card], gpus).held[0].reason, STATUS.FLAGGED_FIRST_PRICE);
      const approved = { ...card, status: STATUS.APPROVED };
      assert.deepEqual(selectApplicable([approved], gpus).apply, [approved]);
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
      assert.ok(data.scrapedAt && Array.isArray(data.cards) && data.cards.length > 0);
      for (const card of data.cards) {
        assert.ok(card.id && card.name, card.id);
        assert.ok(GPUS_DATA.some(g => g.id === card.id), `${card.id} is a tracked GPU`);
        // a newly tracked GPU with too few listings has no price to propose yet
        assert.ok(card.proposedPrice > 0 || (card.status === STATUS.NO_DATA && card.currentPrice === null), card.id);
        assert.ok(Object.values(STATUS).includes(card.status) || card.status === 'HELD_FOR_REVIEW', `${card.id}: ${card.status}`);
      }
    });
  });
});
