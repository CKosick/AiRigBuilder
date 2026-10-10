import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAppToken, searchUrl, searchListings, fetchReviewCards, TOKEN_URL, SEARCH_URL } from '../scripts/fetch_ebay_api.js';
import { reviewTargets, STATUS, ASKING_TO_SOLD } from '../scripts/price_review.js';
import { createCheckAlertsHandler } from '../api/cron/check-alerts.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT_DIR, p), 'utf-8');
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

/** A fake eBay: token endpoint plus search results chosen per query keyword. */
function fakeEbay({ token = 'tok', tokenStatus = 200, results = {}, failFor = [] } = {}) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url === TOKEN_URL) return tokenStatus === 200 ? json(200, { access_token: token, expires_in: 7200 }) : json(tokenStatus, { error: 'invalid_client', error_description: 'client authentication failed' });
    const q = new URL(url).searchParams.get('q');
    if (failFor.some(f => q.includes(f))) return json(500, { errors: [{ message: 'Internal error' }] });
    const prices = Object.entries(results).find(([k]) => q.includes(k))?.[1] || [];
    return json(200, { itemSummaries: prices.map((p, i) => ({ title: `${q} card ${i}`, price: { value: String(p), currency: 'USD' }, itemWebUrl: `https://ebay.com/itm/${i}` })) });
  };
  return { fetchImpl, calls };
}

describe('eBay Browse API fetcher', () => {
  const p40 = reviewTargets().find(t => t.id === 'tesla-p40');
  const mac = reviewTargets().find(t => t.id === 'mac-studio-m2-ultra');

  it('gets an application token with the client-credentials grant', async () => {
    const { fetchImpl, calls } = fakeEbay();
    assert.equal(await getAppToken({ clientId: 'id', clientSecret: 'secret', fetchImpl }), 'tok');
    const { opts } = calls[0];
    assert.equal(opts.method, 'POST');
    assert.equal(opts.headers.Authorization, `Basic ${Buffer.from('id:secret').toString('base64')}`);
    assert.match(opts.body, /^grant_type=client_credentials&scope=https%3A%2F%2Fapi\.ebay\.com%2Foauth%2Fapi_scope$/);
  });

  it('fails clearly when the keys are wrong', async () => {
    const { fetchImpl } = fakeEbay({ tokenStatus: 401 });
    await assert.rejects(getAppToken({ clientId: 'id', clientSecret: 'bad', fetchImpl }), /HTTP 401\): client authentication failed/);
  });

  it('searches used Buy-It-Now listings in the price range, category and US market', async () => {
    const url = new URL(searchUrl(p40));
    assert.equal(url.origin + url.pathname, SEARCH_URL);
    assert.equal(url.searchParams.get('q'), 'Tesla P40 24GB', 'site-search exclusions are dropped from the keywords');
    assert.equal(url.searchParams.get('filter'), `buyingOptions:{FIXED_PRICE},conditions:{USED},price:[${p40.minSensiblePrice}..${p40.maxSensiblePrice}],priceCurrency:USD`);
    assert.equal(url.searchParams.get('category_ids'), '27386');
    assert.equal(new URL(searchUrl(mac)).searchParams.get('category_ids'), null, 'no category for the Mac Studio');

    const { fetchImpl, calls } = fakeEbay({ results: { 'Tesla P40': [250, 260] } });
    const listings = await searchListings(p40, 'tok', { fetchImpl });
    assert.deepEqual(listings.map(l => l.price), [250, 260]);
    assert.equal(calls[0].opts.headers['X-EBAY-C-MARKETPLACE-ID'], 'EBAY_US');
    assert.equal(calls[0].opts.headers.Authorization, 'Bearer tok');
  });

  it('prices every GPU, giving NO_DATA where a search fails or finds too little', async () => {
    const targets = reviewTargets();
    const { fetchImpl } = fakeEbay({
      results: { 'RTX 3090': [700, 720, 740, 760, 780], 'Tesla P40': [260, 270] },
      failFor: ['RTX 4090']
    });
    const cards = await fetchReviewCards({ clientId: 'id', clientSecret: 's', fetchImpl, targets, log: () => {} });
    const byId = Object.fromEntries(cards.map(c => [c.id, c]));
    assert.equal(cards.length, targets.length);
    assert.equal(byId['rtx-3090'].proposedPrice, Math.round(740 * ASKING_TO_SOLD));
    assert.equal(byId['rtx-3090'].source, 'EBAY_BROWSE_API');
    assert.equal(byId['tesla-p40'].status, STATUS.NO_DATA, 'two listings is not enough');
    assert.equal(byId['rtx-4090'].status, STATUS.NO_DATA);
    assert.match(byId['rtx-4090'].notes, /HTTP 500: Internal error/);
  });
});

describe('Price-drop alert cron', () => {
  const res = () => {
    const r = { code: null, body: null };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
  };
  const evaluate = async () => ({ store: 'redis', totalAlerts: 3, activeAlerts: 2, firedCount: 1, firedAlerts: [{ email: 'a@b.c' }], failedAlerts: [] });

  it('refuses to run without CRON_SECRET, and refuses callers without it', async () => {
    let ran = false;
    const spy = async () => { ran = true; return evaluate(); };
    const noSecret = res();
    await createCheckAlertsHandler({ evaluate: spy, env: {} })({ headers: { authorization: 'Bearer x' } }, noSecret);
    assert.equal(noSecret.code, 500);
    const wrong = res();
    await createCheckAlertsHandler({ evaluate: spy, env: { CRON_SECRET: 's3cret' } })({ headers: { authorization: 'Bearer nope' } }, wrong);
    assert.equal(wrong.code, 401);
    assert.equal(ran, false);
  });

  it("checks alerts against the deployed prices for Vercel's cron call, returning counts only", async () => {
    const r = res();
    await createCheckAlertsHandler({ evaluate, env: { CRON_SECRET: 's3cret' } })({ headers: { authorization: 'Bearer s3cret' } }, r);
    assert.equal(r.code, 200);
    assert.deepEqual(r.body, { ok: true, store: 'redis', totalAlerts: 3, activeAlerts: 2, fired: 1, failed: 0 });
    assert.ok(!JSON.stringify(r.body).includes('@'), 'no subscriber addresses in the response');
  });

  it('is scheduled daily in vercel.json', () => {
    const crons = JSON.parse(read('vercel.json')).crons;
    assert.deepEqual(crons, [{ path: '/api/cron/check-alerts', schedule: '0 14 * * *' }]);
  });
});

describe('Weekly price workflow', () => {
  const wf = read('.github/workflows/weekly-prices.yml').replace(/\r\n/g, '\n');

  it('runs Tuesdays at 23:00 UTC and on demand', () => {
    assert.match(wf, /- cron: '0 23 \* \* 2'/);
    assert.match(wf, /workflow_dispatch:/);
  });

  it('fetches with the eBay API keys, applies, tests, then opens a pull request instead of pushing to main', () => {
    const order = ['npm run prices:fetch', 'node scripts/apply_prices.js', 'npm test', 'gh pr create --base main'].map(s => wf.indexOf(s));
    assert.ok(order.every(i => i > 0) && order.every((v, i) => i === 0 || v > order[i - 1]), 'steps in order');
    assert.match(wf, /EBAY_CLIENT_ID: \$\{\{ secrets\.EBAY_CLIENT_ID \}\}/);
    assert.match(wf, /EBAY_CLIENT_SECRET: \$\{\{ secrets\.EBAY_CLIENT_SECRET \}\}/);
    assert.ok(!/git push[^\n]*\bmain\b/.test(wf), 'never pushes to main');
    assert.match(wf, /branch="prices\/\$\{day\}-run\$\{\{ github\.run_number \}\}"/);
  });

  it('skips cleanly (success, no branch or PR) until both eBay keys are set', () => {
    const steps = wf.split(/\n      - /).slice(1);
    assert.match(steps[0], /^name: Check for eBay keys\n\s+id: keys/, 'the key check runs first');
    assert.match(steps[0], /if \[ -z "\$EBAY_CLIENT_ID" \] \|\| \[ -z "\$EBAY_CLIENT_SECRET" \]; then/);
    assert.match(steps[0], /echo "eBay keys not set, skipping price update"/);
    assert.match(steps[0], /echo "ready=false" >> "\$GITHUB_OUTPUT"/);
    assert.ok(!/exit 1/.test(steps[0]), 'a missing key is not a failure');
    for (const step of steps.slice(1)) {
      assert.match(step, /\n\s+if: steps\.keys\.outputs\.ready == 'true'\n/, `gated: ${step.split('\n')[0]}`);
    }
  });

  it('keeps email and alert-storage secrets out of GitHub', () => {
    assert.ok(!/RESEND|KV_REST|CRON_SECRET|alerts:check/.test(wf));
  });
});
