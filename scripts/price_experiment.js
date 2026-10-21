// scripts/price_experiment.js
// Search experiment for thin price cards (npm run prices:experiment). Runs each query variant for the
// cards below as a sold-only search through the headless-Chrome engine (fetch_ebay.py), then reports,
// per variant and for the variants combined: raw listings, eBay "fewer words" padding, how many each
// filter stage removed, usable listings, the median and range priceCard would propose, and sample
// titles. Writes docs/price-search-experiment.md. Nothing is priced or applied.
//
//   npm run prices:experiment                 fetch and report
//   npm run prices:experiment -- --from FILE  report from a saved run (.cache/price_experiment_listings.json)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { reviewTargets, listingRejection, dedupeListings, priceCard } from './price_review.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache');
const TARGETS_FILE = path.join(CACHE_DIR, 'price_experiment_targets.json');
const LISTINGS_FILE = path.join(CACHE_DIR, 'price_experiment_listings.json');
const REPORT_FILE = path.join(ROOT_DIR, 'docs', 'price-search-experiment.md');

const PAGE_SIZE = 240;
const CLEAN = '-(box,cooler,broken,parts,shroud,waterblock,damaged,read)';

// Usable sold listings each card must reach in the live validation scrape
export const GATES = { 'rtx-3090': 20, 'rtx-4090': 15, 'rtx-a5000': 8 };

// variant key -> { query, pages }. "baseline" is the search on main before this branch.
export const VARIANTS = {
  'rtx-3090': {
    baseline: { query: 'RTX 3090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system,dell,alienware)', pages: 1 },
    'no-system-terms': { query: `RTX 3090 24GB -ti ${CLEAN}`, pages: 1 },
    minimal: { query: 'RTX 3090 -ti', pages: 2 },
    'exact-phrase': { query: '"RTX 3090" -ti', pages: 1 },
    geforce: { query: 'GeForce RTX 3090 24GB -ti', pages: 1 },
    brands: { query: '3090 24GB (EVGA,ASUS,MSI,Gigabyte,Zotac,Founders) -ti', pages: 1 }
  },
  'rtx-4090': {
    baseline: { query: 'RTX 4090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read,pc,desktop,system)', pages: 1 },
    'no-system-terms': { query: `RTX 4090 24GB ${CLEAN}`, pages: 1 },
    minimal: { query: 'RTX 4090', pages: 2 },
    'exact-phrase': { query: '"RTX 4090"', pages: 1 },
    geforce: { query: 'GeForce RTX 4090 24GB', pages: 1 },
    brands: { query: '4090 24GB (ASUS,MSI,Gigabyte,Zotac,PNY,Founders)', pages: 1 }
  },
  'rtx-a5000': {
    baseline: { query: 'RTX A5000 24GB -(box,cooler,broken,parts,laptop,mobile)', pages: 1 },
    minimal: { query: 'RTX A5000', pages: 2 },
    nvidia: { query: 'NVIDIA RTX A5000', pages: 1 },
    pny: { query: 'PNY RTX A5000', pages: 1 },
    quadro: { query: 'Quadro RTX A5000', pages: 1 },
    gddr6: { query: 'A5000 24GB GDDR6', pages: 1 },
    'dell-hp-lenovo': { query: 'RTX A5000 (Dell,HP,Lenovo)', pages: 1 }
  }
};

const STAGES = ['excluded-term', 'excluded-keyword', 'title-mismatch', 'wrong-variant', 'complete-system', 'out-of-range'];
const pseudoId = (cardId, key) => `${cardId}::${key}`;

/** Fetch targets: one per variant, carrying the card's own filters. */
export function experimentTargets(cards = reviewTargets()) {
  const out = [];
  for (const [cardId, variants] of Object.entries(VARIANTS)) {
    const card = cards.find(c => c.id === cardId);
    for (const [key, v] of Object.entries(variants)) {
      out.push({ ...card, id: pseudoId(cardId, key), query: v.query, queries: [v.query], pageSize: PAGE_SIZE, pages: v.pages });
    }
  }
  return out;
}

/** Stage counts, price and samples for one set of raw listings against a card. */
export function analyse(card, rawListings) {
  const listings = dedupeListings(rawListings);
  const removed = Object.fromEntries(STAGES.map(st => [st, []]));
  const usable = [];
  for (const l of listings) {
    const why = listingRejection(l, card);
    if (why === null) usable.push(l);
    else if (removed[why]) removed[why].push(l);
  }
  const priced = priceCard(card, listings, 'REAL_EBAY_SOLD');
  return {
    raw: listings.length,
    fewerWords: listings.filter(l => l.fewerWords).length,
    removed,
    usable,
    usableFewerWords: usable.filter(l => l.fewerWords).length,
    proposedPrice: priced.status === 'NO_DATA' ? null : priced.proposedPrice,
    priceLow: priced.priceLow,
    priceHigh: priced.priceHigh
  };
}

/** Per card: every variant, plus all non-baseline variants combined (one count per eBay item). */
export function buildReport(runResults, cards = reviewTargets()) {
  const report = {};
  for (const [cardId, variants] of Object.entries(VARIANTS)) {
    const card = cards.find(c => c.id === cardId);
    const rows = {};
    let combinedRaw = [];
    for (const key of Object.keys(variants)) {
      const got = runResults.find(r => r.id === pseudoId(cardId, key));
      const raw = got ? (got.rawListings || got.listings || []) : [];
      rows[key] = { ...analyse(card, raw), error: got ? got.error : 'not fetched', query: variants[key].query, pages: variants[key].pages };
      if (key !== 'baseline') combinedRaw = combinedRaw.concat(raw);
    }
    rows.combined = { ...analyse(card, combinedRaw), query: 'all non-baseline variants, each eBay item counted once' };
    report[cardId] = { name: card.name, gate: GATES[cardId], rows };
  }
  return report;
}

const money = (n) => (n === null || n === undefined ? '—' : `$${Number(n).toLocaleString('en-US')}`);
const esc = (t) => String(t).replace(/\|/g, '/').replace(/Opens in a new window or tab/g, '');

export function reportMarkdown(report, { date = new Date(), source = 'live run' } = {}) {
  const lines = [
    `# Price search experiment: thin cards`,
    '',
    `Run: ${date.toISOString()} (${source}). Sold listings only, ${PAGE_SIZE} results per page. Nothing here is priced or applied.`,
    '',
    'Stage counts are in filter order: a listing is counted at the first stage that removes it. "Fewer words" = listings eBay added below its "Results matching fewer words" divider (padding, not an exact match).',
    ''
  ];
  for (const [cardId, c] of Object.entries(report)) {
    lines.push(`## ${c.name} (\`${cardId}\`), gate: ${c.gate} usable`, '');
    lines.push('| Variant | Query | Pages | Raw | Fewer words | Excl. term | Excl. kw | Title mismatch | Wrong variant | System | Out of range | **Usable** | Median | Range |');
    lines.push('| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |');
    for (const [key, r] of Object.entries(c.rows)) {
      const st = STAGES.map(s => r.removed[s].length).join(' | ');
      lines.push(`| ${key} | \`${esc(r.query)}\` | ${r.pages ?? '—'} | ${r.raw} | ${r.fewerWords} | ${st} | **${r.usable.length}** | ${money(r.proposedPrice)} | ${r.priceLow === null ? '—' : `${money(r.priceLow)}–${money(r.priceHigh)}`} |`);
    }
    const best = c.rows.combined;
    lines.push('', `Combined: ${best.usable.length} usable (gate ${c.gate}: ${best.usable.length >= c.gate ? 'reached' : 'NOT reached'}).`, '');
    lines.push('<details><summary>Combined: usable titles, and titles removed as wrong variant / complete system / title mismatch</summary>', '');
    lines.push('Usable:', ...best.usable.map(l => `- ${money(l.price)} ${esc(l.title)}${l.fewerWords ? ' _(fewer words)_' : ''}`), '');
    for (const st of ['wrong-variant', 'complete-system', 'title-mismatch']) {
      if (best.removed[st].length) lines.push(`Removed as ${st}:`, ...best.removed[st].map(l => `- ${money(l.price)} ${esc(l.title)}`), '');
    }
    lines.push('</details>', '');
  }
  return lines.join('\n');
}

function runEngine(targets) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(TARGETS_FILE, JSON.stringify(targets, null, 2));
  if (fs.existsSync(LISTINGS_FILE)) fs.rmSync(LISTINGS_FILE);
  for (const cmd of ['py', 'python3', 'python']) {
    const res = spawnSync(cmd, [path.join(__dirname, 'fetch_ebay.py')], {
      cwd: ROOT_DIR, stdio: 'inherit',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PRICE_TARGETS_FILE: TARGETS_FILE, PRICE_LISTINGS_FILE: LISTINGS_FILE, PRICE_SOLD_ONLY: '1' }
    });
    if (res.status === 0 && fs.existsSync(LISTINGS_FILE)) return JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf-8'));
  }
  throw new Error('fetch_ebay.py did not produce listings (is the signed-in eBay profile in .cache?)');
}

async function main() {
  const fromIdx = process.argv.indexOf('--from');
  const fromFile = fromIdx > -1 ? process.argv[fromIdx + 1] : null;
  const results = fromFile ? JSON.parse(fs.readFileSync(fromFile, 'utf-8')) : runEngine(experimentTargets());
  const report = buildReport(results);
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, reportMarkdown(report, { source: fromFile ? `from ${path.basename(fromFile)}` : 'live run' }));
  for (const [id, c] of Object.entries(report)) {
    console.log(`${id}: ${Object.entries(c.rows).map(([k, r]) => `${k} ${r.usable.length}`).join(', ')} (gate ${c.gate})`);
  }
  console.log(`\nReport: ${REPORT_FILE}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
