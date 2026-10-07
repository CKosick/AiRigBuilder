import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Helper functions mirroring fetch_ebay.py
function parsePrice(text) {
  if (!text) return null;
  const m = text.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
  if (m) {
    return parseFloat(m[1].replace(/,/g, ''));
  }
  return null;
}

function parseSoldDate(text) {
  if (!text) return null;
  const m = text.match(/(?:Sold|Ended)\s+([A-Za-z]{3}\s+\d{1,2}(?:,\s*\d{4})?)/i);
  return m ? m[0] : null;
}

function computeCompsStats(prices, isLiveComps = true) {
  if (prices.length < 3) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const low = sorted[Math.floor(sorted.length * 0.15)];
  const high = sorted[Math.floor(sorted.length * 0.85)];

  if (isLiveComps) {
    return {
      proposedPrice: Math.round(median * 0.96),
      priceLow: Math.round(low * 0.96),
      priceHigh: Math.round(high * 0.96)
    };
  }
  return {
    proposedPrice: median,
    priceLow: low,
    priceHigh: high
  };
}

describe('Scraper & Price Review Pipeline Tests', () => {
  describe('Price & Date Parsing Regex', () => {
    it('parses various price formats from eBay strings', () => {
      assert.equal(parsePrice('$320.00'), 320.00);
      assert.equal(parsePrice('$1,149.99'), 1149.99);
      assert.equal(parsePrice('US $275.00 /ea'), 275.00);
      assert.equal(parsePrice('Price: $718 Free shipping'), 718.00);
      assert.equal(parsePrice('No price found'), null);
    });

    it('parses eBay sold and ended dates', () => {
      assert.equal(parseSoldDate('Sold Oct 5, 2026'), 'Sold Oct 5, 2026');
      assert.equal(parseSoldDate('Ended Sep 28, 2026 by seller'), 'Ended Sep 28, 2026');
      assert.equal(parseSoldDate('item ended Oct 1'), 'ended Oct 1');
      assert.equal(parseSoldDate('Brand new unopened'), null);
    });
  });

  describe('Outlier & Junk Exclusion Filtering', () => {
    const EXCLUDE_KEYWORDS = ['parts', 'box only', 'broken', 'cooler only', 'shroud only', 'for repair'];

    function isListingValid(title) {
      const lower = title.toLowerCase();
      return !EXCLUDE_KEYWORDS.some(kw => lower.includes(kw));
    }

    it('rejects junk and parts listings', () => {
      assert.equal(isListingValid('NVIDIA RTX 3090 24GB FOR PARTS ONLY NO POST'), false);
      assert.equal(isListingValid('Original Box Only for RTX 4090'), false);
      assert.equal(isListingValid('RTX 3080 Heatsink Shroud Only'), false);
      assert.equal(isListingValid('EVGA RTX 3090 Broken Fan For Repair'), false);
    });

    it('accepts genuine working GPU listings', () => {
      assert.equal(isListingValid('EVGA GeForce RTX 3090 FTW3 ULTRA 24GB GDDR6X Working Tested'), true);
      assert.equal(isListingValid('NVIDIA Tesla P40 24GB Server Pull Clean'), true);
      assert.equal(isListingValid('ZOTAC GAMING GeForce RTX 4080 SUPER 16GB GDDR6X'), true);
    });
  });

  describe('Comp Statistics & Swing Flagging', () => {
    it('calculates median, 15th percentile low, and 85th percentile high correctly', () => {
      const samplePrices = [255, 299, 320, 320, 320, 340, 350];
      const stats = computeCompsStats(samplePrices, true);
      assert.ok(stats);
      // Median is 320, with 4% discount = round(320 * 0.96) = 307
      assert.equal(stats.proposedPrice, 307);
      assert.ok(stats.priceLow <= stats.proposedPrice);
      assert.ok(stats.priceHigh >= stats.proposedPrice);
    });

    it('accurately identifies swings >15% from baseline', () => {
      const currentPrice = 225;
      const proposedPrice = 307;
      const pctChange = Math.round(((proposedPrice - currentPrice) / currentPrice) * 100);
      assert.equal(pctChange, 36);
      const isFlagged = Math.abs(pctChange) > 15;
      assert.equal(isFlagged, true, 'Swing > 15% should be flagged for manual review');
    });
  });

  describe('Pending Review JSON Schema', () => {
    it('validates data/pending_price_review.json has correct structure', () => {
      const reviewPath = path.join(ROOT_DIR, 'data', 'pending_price_review.json');
      assert.ok(fs.existsSync(reviewPath), 'Review file must exist');

      const data = JSON.parse(fs.readFileSync(reviewPath, 'utf-8'));
      assert.ok(data.scrapedAt, 'Must have scrapedAt timestamp');
      assert.ok(Array.isArray(data.cards), 'cards must be an array');
      assert.equal(data.cards.length, 10, 'Must have 10 cards in review file');

      for (const card of data.cards) {
        assert.ok(card.id, 'Card missing id');
        assert.ok(card.name, 'Card missing name');
        assert.ok(card.proposedPrice > 0, `Card ${card.id} proposedPrice must be > 0`);
        assert.ok(card.priceLow > 0, `Card ${card.id} priceLow must be > 0`);
        assert.ok(card.priceHigh >= card.priceLow, `Card ${card.id} priceHigh must be >= priceLow`);
        assert.ok(['APPROVED', 'FLAGGED_SWING', 'HELD_FOR_REVIEW'].includes(card.status), `Invalid status ${card.status}`);
      }
    });
  });
});
