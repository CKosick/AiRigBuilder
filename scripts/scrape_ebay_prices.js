// scripts/scrape_ebay_prices.js
// Local eBay scraper for the weekly price review (npm run prices:scrape).
// Tries the headless-Chrome engine (fetch_ebay.py) first, then a plain HTTP fetch. Either way it
// only collects listings; the proposed prices and review files come from scripts/price_review.js.
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { reviewTargets, priceCard, writeReview } from './price_review.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache');
const TARGETS_FILE = path.join(CACHE_DIR, 'price_targets.json');
const LISTINGS_FILE = path.join(CACHE_DIR, 'price_listings.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function parsePrice(text) {
  const match = String(text || '').match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : null;
}

/**
 * Headless-Chrome engine (fetch_ebay.py). It reads the targets from TARGETS_FILE and writes
 * [{ id, source, listings }] to LISTINGS_FILE. Returns that array, or null if it could not run.
 */
function runPythonEngine(targets) {
  const pyScript = path.join(__dirname, 'fetch_ebay.py');
  if (!fs.existsSync(pyScript)) return null;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(TARGETS_FILE, JSON.stringify(targets, null, 2));
  if (fs.existsSync(LISTINGS_FILE)) fs.rmSync(LISTINGS_FILE);

  console.log('Launching the headless Chrome engine (fetch_ebay.py)...');
  for (const cmd of ['py', 'python3', 'python']) {
    try {
      const res = spawnSync(cmd, [pyScript], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PRICE_TARGETS_FILE: TARGETS_FILE, PRICE_LISTINGS_FILE: LISTINGS_FILE }
      });
      if (res.status === 0 && fs.existsSync(LISTINGS_FILE)) {
        return JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf-8'));
      }
    } catch {
      // try the next interpreter name
    }
  }
  return null;
}

/** Plain HTTP fetch of active Buy-It-Now listings; often blocked by eBay's bot protection. */
async function fetchActiveListings(target) {
  const catPath = target.category ? `${target.category}/` : '';
  const url = `https://www.ebay.com/sch/${catPath}i.html?_nkw=${encodeURIComponent(target.query)}&LH_BIN=1&_sop=15`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return { id: target.id, source: 'REAL_EBAY_ACTIVE_COMPS', listings: [], error: `HTTP ${res.status}` };
    const $ = cheerio.load(await res.text());
    const listings = [];
    $('.s-item, .s-card').each((_, el) => {
      const title = $(el).find('.s-item__title, .s-card__title').text().trim();
      const price = parsePrice($(el).find('.s-item__price, .s-card__price').text());
      if (title && price) listings.push({ title, price });
    });
    return { id: target.id, source: 'REAL_EBAY_ACTIVE_COMPS', listings };
  } catch (err) {
    return { id: target.id, source: 'REAL_EBAY_ACTIVE_COMPS', listings: [], error: err.message };
  }
}

async function main() {
  const targets = reviewTargets();
  let fetched = runPythonEngine(targets);
  let fetchedWith = 'headless-chrome';
  if (!fetched) {
    console.warn('The headless Chrome engine could not run. Falling back to plain HTTP fetches...');
    fetchedWith = 'http-fetch';
    fetched = [];
    for (const [i, target] of targets.entries()) {
      console.log(`[${i + 1}/${targets.length}] ${target.name}`);
      fetched.push(await fetchActiveListings(target));
      if (i < targets.length - 1) await sleep(2500);
    }
  }

  const cards = targets.map(target => {
    const got = fetched.find(f => f.id === target.id) || { listings: [], source: 'NO_DATA', error: 'not fetched' };
    return priceCard(target, got.listings, got.source, { error: got.error });
  });
  writeReview(cards, { rootDir: ROOT_DIR, fetchedWith });

  console.log('\nReview written: PENDING_PRICE_REVIEW.md and data/pending_price_review.json');
  console.table(cards.map(c => ({ GPU: c.name, Current: c.currentPrice, Proposed: c.proposedPrice, Listings: c.sampleCount, Status: c.status })));
  console.log('Check the review, then run: npm run prices:apply');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1); });
}
