// scripts/fetch_ebay_api.js
// Weekly price review fetcher using eBay's official Browse API (npm run prices:fetch).
// Needs an eBay developer app's keys in EBAY_CLIENT_ID / EBAY_CLIENT_SECRET (application access,
// no eBay account login). It collects active used Buy-It-Now listings per tracked GPU and hands
// them to scripts/price_review.js, which works out the proposed prices and writes the review.
import path from 'path';
import { fileURLToPath } from 'url';
import { reviewTargets, priceCard, writeReview, STATUS } from './price_review.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
export const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE = 'https://api.ebay.com/oauth/api_scope';
const SOURCE = 'EBAY_BROWSE_API';

/** Application access token (client credentials). Throws with eBay's message if the keys are wrong. */
export async function getAppToken({ clientId, clientSecret, fetchImpl = fetch }) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE)}`
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`eBay token request failed (HTTP ${res.status}): ${body.error_description || body.error || 'no access_token'}`);
  }
  return body.access_token;
}

/**
 * Browse API search for one target: used, Buy-It-Now, US marketplace, within the target's sensible
 * price range. The site-search exclusion syntax "-(a,b)" is dropped from the keywords; the same
 * terms are filtered out by isUsableListing() in price_review.js.
 */
export function searchUrl(target, { limit = 100 } = {}) {
  const keywords = target.query.split(' -(')[0].trim();
  const params = new URLSearchParams({
    q: keywords,
    filter: `buyingOptions:{FIXED_PRICE},conditions:{USED},price:[${target.minSensiblePrice}..${target.maxSensiblePrice}],priceCurrency:USD`,
    limit: String(limit)
  });
  if (target.category) params.set('category_ids', target.category);
  return `${SEARCH_URL}?${params}`;
}

/** Listings [{ title, price }] for one target. Throws on an HTTP error. */
export async function searchListings(target, token, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(searchUrl(target), {
    headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', Accept: 'application/json' }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.errors && body.errors[0] ? body.errors[0].message : '';
    throw new Error(`HTTP ${res.status}${msg ? `: ${msg}` : ''}`);
  }
  const body = await res.json();
  return (body.itemSummaries || [])
    .filter(item => item.price && item.price.currency === 'USD')
    .map(item => ({ title: item.title, price: Number(item.price.value), url: item.itemWebUrl }));
}

/**
 * Fetches every target and returns the review cards. A failed search gives that GPU a NO_DATA card;
 * a failed token request throws, since nothing could be fetched.
 */
export async function fetchReviewCards({ clientId, clientSecret, fetchImpl = fetch, targets = reviewTargets(), log = console.log }) {
  const token = await getAppToken({ clientId, clientSecret, fetchImpl });
  const cards = [];
  for (const [i, target] of targets.entries()) {
    log(`[${i + 1}/${targets.length}] ${target.name}`);
    try {
      const listings = await searchListings(target, token, { fetchImpl });
      cards.push(priceCard(target, listings, SOURCE));
    } catch (err) {
      log(`  search failed: ${err.message}`);
      cards.push(priceCard(target, [], SOURCE, { error: err.message }));
    }
  }
  return cards;
}

async function main() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set (eBay developer app keys). For the browser scraper instead, run: npm run prices:scrape');
    process.exit(1);
  }

  const cards = await fetchReviewCards({ clientId, clientSecret });
  writeReview(cards, { rootDir: ROOT_DIR, fetchedWith: 'ebay-browse-api' });
  console.table(cards.map(c => ({ GPU: c.name, Current: c.currentPrice, Proposed: c.proposedPrice, Listings: c.sampleCount, Status: c.status })));

  // Every card empty means the fetch itself is broken; fail loudly rather than open an empty review
  if (cards.every(c => c.status === STATUS.NO_DATA)) {
    console.error('No GPU got enough listings. Failing the run so no pull request is opened; check the eBay API keys and quota.');
    process.exit(1);
  }
  console.log('Review written: PENDING_PRICE_REVIEW.md and data/pending_price_review.json');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
