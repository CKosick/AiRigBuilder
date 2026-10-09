// Shared logic for the weekly price review: what to search for, which listings count, how a
// proposed price is worked out, and the review files that `npm run prices:apply` reads.
// Every fetcher (browser scraper, eBay API) hands its listings to priceCard() so the rules
// live in one place.
import fs from 'fs';
import path from 'path';
import { GPUS_DATA } from '../src/data/gpus.js';

/** A card needs at least this many usable listings, or it gets no proposed change. */
export const MIN_LISTINGS = 3;
/** Proposals that move the price more than this (vs the live site price) are held for review. */
export const SWING_LIMIT_PCT = 15;
/** Active Buy-It-Now asking prices sit above what cards sell for; this spread is taken off. */
export const ASKING_TO_SOLD = 0.96;

export const STATUS = {
  APPROVED: 'APPROVED',          // applied by prices:apply
  FLAGGED_SWING: 'FLAGGED_SWING', // big move: held until someone approves it
  NO_DATA: 'NO_DATA'              // not enough listings: no change proposed, never applied
};

// Terms that mark a listing as not a working card, whatever the GPU
export const GLOBAL_EXCLUDE_TERMS = [
  'not working', 'defective', 'no post', 'failed', 'partially works',
  'for parts', 'parts only', 'for repair', 'read description',
  'as is', 'as-is', 'broken', 'water damage', 'damaged',
  'board only', 'cooler only', 'box only', 'heatsink only', 'shroud only',
  'gaming pc', 'gaming desktop', 'custom pc', 'desktop pc'
];

// eBay search terms and sanity bounds per tracked GPU. Names, VRAM and the current price come
// from src/data/gpus.js, so there is no second copy of the price here to go stale.
export const SEARCH_TARGETS = [
  { id: 'rtx-3090', category: '27386', query: 'RTX 3090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system,dell,alienware)', minSensiblePrice: 450, maxSensiblePrice: 1000, excludeKeywords: ['parts', 'box only', 'broken', 'cooler only', 'shroud', 'waterblock', 'damaged', 'read description', 'for repair', 'board for', 'no fans', 'heatsink only'] },
  { id: 'rtx-4090', category: '27386', query: 'RTX 4090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system)', minSensiblePrice: 1100, maxSensiblePrice: 2200, excludeKeywords: ['parts', 'box only', 'broken', 'cooler only', 'shroud', 'waterblock', 'damaged', 'read description', 'for repair'] },
  { id: 'rx-7900-xtx', category: '27386', query: 'RX 7900 XTX 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,pc,desktop)', minSensiblePrice: 550, maxSensiblePrice: 1100, excludeKeywords: ['parts', 'box only', 'broken', 'cooler only', 'shroud', 'waterblock', 'xt ', '7900 xt -xtx'] },
  { id: 'rtx-4060-ti-16gb', category: '27386', query: 'RTX 4060 Ti 16GB -(8GB,box,broken,parts)', minSensiblePrice: 280, maxSensiblePrice: 520, excludeKeywords: ['8gb', '8 gb', 'parts', 'box only', 'broken'] },
  { id: 'rtx-3060-12gb', category: '27386', query: 'RTX 3060 12GB -(8GB,box,cooler,broken,parts)', minSensiblePrice: 150, maxSensiblePrice: 400, excludeKeywords: ['8gb', '8 gb', 'parts', 'box only', 'broken'] },
  { id: 'tesla-p40', category: '27386', query: 'Tesla P40 24GB -(cooler,fan,bracket,shroud,parts,heatsink)', minSensiblePrice: 120, maxSensiblePrice: 400, excludeKeywords: ['fan only', 'shroud only', 'bracket', 'parts only', 'heatsink', 'cooler only', 'p4 ', 'k80', 'm40', 'p100', '8gb', '16gb'] },
  { id: 'rtx-4080-super', category: '27386', query: 'RTX 4080 Super 16GB -(box,cooler,broken,parts)', minSensiblePrice: 650, maxSensiblePrice: 1400, excludeKeywords: ['parts', 'box only', 'broken', 'cooler only'] },
  { id: 'rtx-3080-10gb', category: '27386', query: 'RTX 3080 10GB -(12GB,box,cooler,broken,parts)', minSensiblePrice: 260, maxSensiblePrice: 500, excludeKeywords: ['12gb', '12 gb', 'parts', 'box only', 'broken'] },
  { id: 'rtx-a5000', category: '27386', query: 'RTX A5000 24GB -(box,cooler,broken,parts,laptop,mobile)', minSensiblePrice: 850, maxSensiblePrice: 1600, excludeKeywords: ['laptop', 'mobile', 'parts', 'box only', 'broken'] },
  { id: 'mac-studio-m2-ultra', category: '', query: 'Mac Studio M2 Ultra -(Max,broken,parts,box,m1,m3)', minSensiblePrice: 1900, maxSensiblePrice: 4200, excludeKeywords: ['m2 max', 'm1 max', 'parts only', 'box only', 'broken', 'accessory'] }
];

/** Search targets joined with the live name, VRAM and current price from gpus.js. */
export function reviewTargets(gpus = GPUS_DATA) {
  return SEARCH_TARGETS.map(t => {
    const gpu = gpus.find(g => g.id === t.id);
    if (!gpu) throw new Error(`price review: ${t.id} is not in GPUS_DATA`);
    return { ...t, name: gpu.name, vram: gpu.vram, currentPrice: gpu.usedStreetPrice };
  });
}

/** True when a listing looks like a working card within the target's sensible price range. */
export function isUsableListing(listing, target) {
  const title = String(listing.title || '').toLowerCase();
  const price = Number(listing.price);
  if (!title || !Number.isFinite(price)) return false;
  if (title.includes('shop on ebay')) return false;
  if (GLOBAL_EXCLUDE_TERMS.some(term => title.includes(term))) return false;
  if (target.excludeKeywords.some(kw => title.includes(kw.toLowerCase()))) return false;
  return price >= target.minSensiblePrice && price <= target.maxSensiblePrice;
}

const pick = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

/**
 * The review card for one GPU.
 * source: 'REAL_EBAY_SOLD' (sold prices, used as they are) or an active-listings source
 * ('EBAY_BROWSE_API', 'REAL_EBAY_ACTIVE_COMPS'), whose asking prices get the ASKING_TO_SOLD spread.
 * Fewer than MIN_LISTINGS usable listings gives a NO_DATA card that proposes no change.
 */
export function priceCard(target, rawListings, source, { error } = {}) {
  const listings = (rawListings || []).filter(l => isUsableListing(l, target));
  const base = { id: target.id, name: target.name, vram: target.vram, currentPrice: target.currentPrice, sampleCount: listings.length };

  if (listings.length < MIN_LISTINGS) {
    return {
      ...base,
      proposedPrice: target.currentPrice,
      priceLow: null,
      priceHigh: null,
      changePct: 0,
      status: STATUS.NO_DATA,
      source: 'NO_DATA',
      notes: `Only ${listings.length} usable listing${listings.length === 1 ? '' : 's'}${error ? ` (${error})` : ''}; no change proposed. Needs at least ${MIN_LISTINGS}.`,
      recentSamples: listings.slice(0, 5)
    };
  }

  const sorted = listings.map(l => Number(l.price)).sort((a, b) => a - b);
  const spread = source === 'REAL_EBAY_SOLD' ? 1 : ASKING_TO_SOLD;
  const median = pick(sorted, 0.5);
  const proposedPrice = Math.round(median * spread);
  const priceLow = Math.round(pick(sorted, 0.15) * spread);
  const priceHigh = Math.round(pick(sorted, 0.85) * spread);
  const changePct = parseFloat((((proposedPrice - target.currentPrice) / target.currentPrice) * 100).toFixed(1)); // vs the live site price

  return {
    ...base,
    proposedPrice,
    priceLow,
    priceHigh,
    changePct,
    status: Math.abs(changePct) > SWING_LIMIT_PCT ? STATUS.FLAGGED_SWING : STATUS.APPROVED,
    source,
    notes: spread === 1
      ? `${listings.length} sold listings (median $${median}).`
      : `${listings.length} active Buy-It-Now listings (median asking $${median}, -${Math.round((1 - ASKING_TO_SOLD) * 100)}% to estimate sold price).`,
    recentSamples: listings.slice(0, 5)
  };
}

const SOURCE_LABEL = { REAL_EBAY_SOLD: 'Sold listings', REAL_EBAY_ACTIVE_COMPS: 'Active listings (scraped)', EBAY_BROWSE_API: 'Active listings (eBay API)', NO_DATA: 'No data' };
const STATUS_LABEL = { APPROVED: 'Approved', FLAGGED_SWING: `Held: moves more than ${SWING_LIMIT_PCT}%`, NO_DATA: 'No change: not enough listings' };
const money = (n) => (n === null || n === undefined ? '—' : `$${Number(n).toLocaleString('en-US')}`);

/** Markdown summary of a review, for PENDING_PRICE_REVIEW.md and pull request descriptions. */
export function reviewMarkdown(cards, date = new Date()) {
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const lines = [
    `# Weekly Used GPU Price Review — ${day}`,
    '',
    `Approved cards are applied by \`npm run prices:apply\`. Cards held for a big move are not applied until their status is changed to APPROVED in \`data/pending_price_review.json\`. Cards with no data keep their current price.`,
    '',
    '| GPU | Current | Proposed | Change | Range | Listings | Source | Status |',
    '| :--- | ---: | ---: | ---: | :--- | ---: | :--- | :--- |'
  ];
  for (const c of cards) {
    const diff = c.proposedPrice - c.currentPrice;
    const change = c.status === STATUS.NO_DATA ? '—' : `${diff >= 0 ? '+' : '-'}$${Math.abs(diff)} (${c.changePct >= 0 ? '+' : ''}${c.changePct}%)`;
    const range = c.priceLow === null ? '—' : `${money(c.priceLow)} – ${money(c.priceHigh)}`;
    lines.push(`| ${c.name} | ${money(c.currentPrice)} | ${c.status === STATUS.NO_DATA ? '—' : `**${money(c.proposedPrice)}**`} | ${change} | ${range} | ${c.sampleCount} | ${SOURCE_LABEL[c.source] || c.source} | ${STATUS_LABEL[c.status] || c.status} |`);
  }
  lines.push('', '### Sample listings');
  for (const c of cards) {
    if (!c.recentSamples || c.recentSamples.length === 0) continue;
    lines.push('', `- **${c.name}**`);
    for (const s of c.recentSamples) lines.push(`  - ${money(s.price)} — ${String(s.title).replace(/\|/g, '/')}`);
  }
  return lines.join('\n') + '\n';
}

/** Writes data/pending_price_review.json and PENDING_PRICE_REVIEW.md. */
export function writeReview(cards, { rootDir, date = new Date(), fetchedWith } = {}) {
  const payload = {
    scrapedAt: date.toISOString(),
    reviewStatus: 'PENDING_REVIEW',
    fetchedWith,
    note: 'Check this file before applying. Change a held card to APPROVED (or edit proposedPrice) to apply it. Then run: npm run prices:apply',
    cards
  };
  fs.mkdirSync(path.join(rootDir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'data', 'pending_price_review.json'), JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(path.join(rootDir, 'PENDING_PRICE_REVIEW.md'), reviewMarkdown(cards, date), 'utf-8');
  return payload;
}

/**
 * Splits review cards into the ones prices:apply may apply and the ones it must hold, with the
 * reason. A card is applied only if it is APPROVED, has a sane price and range, and was priced
 * against the price the site shows now (a review file left over from before another update is
 * stale and must not overwrite newer prices).
 */
export function selectApplicable(cards, gpus = GPUS_DATA) {
  const apply = [];
  const held = [];
  for (const card of cards) {
    const gpu = gpus.find(g => g.id === card.id);
    let reason = null;
    if (!gpu) reason = 'unknown GPU';
    else if (card.status !== STATUS.APPROVED) reason = card.status;
    else if (card.currentPrice !== gpu.usedStreetPrice) reason = `stale review: priced against $${card.currentPrice}, site is now $${gpu.usedStreetPrice}`;
    else if (!(card.proposedPrice > 0) || !(card.priceLow > 0) || !(card.priceHigh >= card.priceLow)) reason = 'invalid price or range';
    if (reason) held.push({ card, reason });
    else apply.push(card);
  }
  return { apply, held };
}
