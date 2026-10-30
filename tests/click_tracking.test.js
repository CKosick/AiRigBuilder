import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileClickStore, RedisClickStore, getClickStore, formatCounterKey } from '../src/services/clickStore.js';
import { createClickHandler, validateClickPayload } from '../api/click.js';
import { buildClickPayload, initOutboundClickTracking } from '../src/utils/clickTracker.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';
import { renderGpuDetailHtml } from '../src/components/gpuDetail.js';
import { renderPriceTrackerHtml } from '../src/components/priceTracker.js';
import { GPUS_DATA } from '../src/data/gpus.js';

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    }
  };
}

describe('First-Party Outbound Click Tracking', () => {
  let tmpDir;
  let storeFile;
  let store;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airig-clicks-'));
    storeFile = path.join(tmpDir, 'clicks.json');
    store = new FileClickStore(storeFile);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Payload validation (validateClickPayload)', () => {
    it('accepts valid build and GPU click payloads', () => {
      const buildRes = validateClickPayload({
        path: '/builds/llama-3.3-70b',
        merchant: 'Amazon',
        linkId: 'build:llama-3.3-70b:tier-budget-used:AMD Ryzen 7 5700X (8C / 16T)'
      });
      assert.equal(buildRes.valid, true);

      const gpuRes = validateClickPayload({
        path: '/gpu/rtx-3090',
        merchant: 'eBay Sold',
        linkId: 'gpu:rtx-3090:ebay-sold'
      });
      assert.equal(gpuRes.valid, true);
    });

    it('rejects missing fields, unexpected fields, unknown merchants, and overlong strings', () => {
      assert.equal(validateClickPayload(null).valid, false);
      assert.equal(validateClickPayload('not-json').valid, false);
      assert.equal(validateClickPayload({}).valid, false);

      // Unexpected field (e.g. IP or userAgent)
      const withExtra = validateClickPayload({
        path: '/',
        merchant: 'Amazon',
        linkId: 'build:llama-3.3-70b:tier-budget-used:CPU',
        ip: '1.2.3.4'
      });
      assert.equal(withExtra.valid, false);
      assert.match(withExtra.error, /Unexpected or missing fields/);

      // Unknown merchant
      const badMerchant = validateClickPayload({
        path: '/',
        merchant: 'Newegg',
        linkId: 'build:llama-3.3-70b:tier-budget-used:CPU'
      });
      assert.equal(badMerchant.valid, false);

      // Bad path (must start with /)
      const badPath = validateClickPayload({
        path: 'https://evil.example/',
        merchant: 'Amazon',
        linkId: 'build:llama-3.3-70b:tier-budget-used:CPU'
      });
      assert.equal(badPath.valid, false);

      // Bad linkId prefix
      const badLinkId = validateClickPayload({
        path: '/',
        merchant: 'Amazon',
        linkId: 'other:something'
      });
      assert.equal(badLinkId.valid, false);

      // Pipe delimiter in linkId is rejected so counter keys cannot be forged
      const pipeInLinkId = validateClickPayload({
        path: '/',
        merchant: 'Amazon',
        linkId: 'build:llama|injected'
      });
      assert.equal(pipeInLinkId.valid, false);

      // Overlong linkId
      const overlong = validateClickPayload({
        path: '/',
        merchant: 'Amazon',
        linkId: 'build:' + 'a'.repeat(250)
      });
      assert.equal(overlong.valid, false);
    });
  });

  describe('POST /api/click & GET /api/click handler', () => {
    it('rejects bad POST payloads with 400 and does not write to the store', async () => {
      const handler = createClickHandler({
        store,
        now: () => new Date('2026-10-29T12:00:00Z')
      });

      const badPayloads = [
        null,
        '{bad json',
        { path: '/', merchant: 'UnknownMerchant', linkId: 'build:m:t:p' },
        { path: '/', merchant: 'Amazon', linkId: 'build:m:t:p', userAgent: 'Mozilla/5.0' },
        { path: 'no-slash', merchant: 'Amazon', linkId: 'build:m:t:p' },
        { path: '/', merchant: 'Amazon', linkId: '' }
      ];

      for (const body of badPayloads) {
        const res = createMockRes();
        await handler({ method: 'POST', body }, res);
        assert.equal(res.statusCode, 400);
      }

      const raw = await store.all();
      assert.deepEqual(raw.counts, {});
    });

    it('increments a single counter per (day, linkId, merchant), stores no personal data, and returns 204', async () => {
      const handler = createClickHandler({
        store,
        now: () => new Date('2026-10-29T15:30:00Z')
      });

      const payload = {
        path: '/builds/llama-3.3-70b',
        merchant: 'Amazon',
        linkId: 'build:llama-3.3-70b:tier-budget-used:AMD Ryzen 7 5700X (8C / 16T)'
      };

      const res1 = createMockRes();
      await handler(
        {
          method: 'POST',
          // sendBeacon sends a string body when given JSON.stringify(...)
          body: JSON.stringify(payload),
          headers: {
            'x-forwarded-for': '203.0.113.99',
            'user-agent': 'SecretBrowser/1.0'
          }
        },
        res1
      );
      assert.equal(res1.statusCode, 204);
      assert.equal(res1.ended, true);

      const res2 = createMockRes();
      await handler({ method: 'POST', body: payload }, res2);
      assert.equal(res2.statusCode, 204);

      const raw = await store.all();
      const expectedKey = '2026-10-29|build:llama-3.3-70b:tier-budget-used:AMD Ryzen 7 5700X (8C / 16T)|Amazon';
      assert.deepEqual(raw.counts, { [expectedKey]: 2 });

      // Inspect raw file on disk to guarantee no IP, no UA, and no full timestamp are stored
      const diskText = fs.readFileSync(storeFile, 'utf-8');
      assert.ok(!diskText.includes('203.0.113.99'), 'No IP stored');
      assert.ok(!diskText.includes('SecretBrowser'), 'No UA stored');
      assert.ok(!diskText.includes('15:30:00'), 'No full timestamp stored');
    });

    it('returns 404 on GET /api/click without key, with wrong key, or when CLICK_STATS_KEY is unset', async () => {
      const unsetHandler = createClickHandler({
        store,
        env: {}
      });
      const resUnset = createMockRes();
      await unsetHandler({ method: 'GET', query: { key: 'anything' } }, resUnset);
      assert.equal(resUnset.statusCode, 404);

      const handler = createClickHandler({
        store,
        env: { CLICK_STATS_KEY: 'secret-stats-key-123' }
      });

      const resMissing = createMockRes();
      await handler({ method: 'GET', query: {} }, resMissing);
      assert.equal(resMissing.statusCode, 404);

      const resWrong = createMockRes();
      await handler({ method: 'GET', query: { key: 'wrong-key' } }, resWrong);
      assert.equal(resWrong.statusCode, 404);
    });

    it('returns 200 with JSON counters on GET /api/click when ?key= matches CLICK_STATS_KEY', async () => {
      const handler = createClickHandler({
        store,
        now: () => new Date('2026-10-29T18:00:00Z'),
        env: { CLICK_STATS_KEY: 'secret-stats-key-123' }
      });

      await handler(
        {
          method: 'POST',
          body: {
            path: '/gpu/rtx-3090',
            merchant: 'eBay Sold',
            linkId: 'gpu:rtx-3090:ebay-sold'
          }
        },
        createMockRes()
      );

      const resOk = createMockRes();
      await handler({ method: 'GET', query: { key: 'secret-stats-key-123' } }, resOk);
      assert.equal(resOk.statusCode, 200);
      assert.deepEqual(resOk.body.counts, {
        '2026-10-29|gpu:rtx-3090:ebay-sold|eBay Sold': 1
      });
      assert.deepEqual(resOk.body.entries, [
        {
          day: '2026-10-29',
          linkId: 'gpu:rtx-3090:ebay-sold',
          merchant: 'eBay Sold',
          count: 1
        }
      ]);
    });

    it('supports Upstash Redis via HINCRBY and HGETALL in production', async () => {
      const hash = {};
      const redisStore = new RedisClickStore(
        'https://fake-upstash.example.com',
        'fake-token',
        async (_url, opts) => {
          const cmd = JSON.parse(opts.body);
          if (cmd[0] === 'HINCRBY') {
            const [, , field, delta] = cmd;
            hash[field] = (hash[field] || 0) + Number(delta);
            return { ok: true, status: 200, json: async () => ({ result: hash[field] }) };
          }
          if (cmd[0] === 'HGETALL') {
            const flat = [];
            for (const [k, v] of Object.entries(hash)) flat.push(k, String(v));
            return { ok: true, status: 200, json: async () => ({ result: flat }) };
          }
          throw new Error(`Unexpected command ${cmd[0]}`);
        }
      );

      await redisStore.increment('2026-10-29', 'gpu:rtx-3090:ebay-sold', 'eBay Sold');
      await redisStore.increment('2026-10-29', 'gpu:rtx-3090:ebay-sold', 'eBay Sold');
      const key = formatCounterKey('2026-10-29', 'gpu:rtx-3090:ebay-sold', 'eBay Sold');
      assert.deepEqual((await redisStore.all()).counts, { [key]: 2 });

      // getClickStore selects Redis when credentials are provided
      const selected = getClickStore({ env: { KV_REST_API_URL: 'https://u.example.com', KV_REST_API_TOKEN: 'tok' } });
      assert.ok(selected instanceof RedisClickStore);
    });
  });

  describe('Client-side delegated listener & component markup', () => {
    it('renders data-click-merchant, data-click-id, and EPN customid on build and GPU merchant links', () => {
      const pickerHtml = renderModelPickerHtml({ activeModelId: 'llama-3.3-70b', activeTierId: 'tier-budget-used' });
      assert.match(pickerHtml, /data-click-merchant="eBay Sold"/);
      assert.match(pickerHtml, /data-click-id="build:llama-3\.3-70b:tier-budget-used:2x NVIDIA GeForce RTX 3090 24GB"/);
      assert.match(pickerHtml, /customid=build-llama-3\.3-70b-tier-budget-used/);

      const gpu = GPUS_DATA.find(g => g.id === 'rtx-3090');
      const gpuHtml = renderGpuDetailHtml(gpu);
      assert.match(gpuHtml, /data-click-merchant="eBay Sold"/);
      assert.match(gpuHtml, /data-click-id="gpu:rtx-3090:ebay-sold"/);
      assert.match(gpuHtml, /customid=gpu-rtx-3090/);

      const trackerHtml = renderPriceTrackerHtml();
      assert.match(trackerHtml, /id="modal-ebay-link"[^>]*data-click-merchant="eBay Sold"/);
    });

    it('fires navigator.sendBeacon("/api/click", ...) on sponsored link click without blocking navigation', () => {
      let listener = null;
      const root = {
        addEventListener(type, fn) {
          if (type === 'click') listener = fn;
        },
        removeEventListener() {}
      };

      const beacons = [];
      initOutboundClickTracking(root, {
        getPath: () => '/builds/llama-3.3-70b',
        sendBeacon: (url, body) => {
          beacons.push({ url, body: JSON.parse(body) });
          return true;
        }
      });

      assert.equal(typeof listener, 'function');

      const fakeAnchor = {
        getAttribute(name) {
          const attrs = {
            href: 'https://www.amazon.com/dp/B09VCHQHZ6?tag=airigbuilder-20',
            rel: 'sponsored noopener noreferrer',
            'data-click-merchant': 'Amazon',
            'data-click-id': 'build:llama-3.3-70b:tier-budget-used:AMD Ryzen 7 5700X (8C / 16T)'
          };
          return attrs[name] ?? null;
        }
      };

      let defaultPrevented = false;
      listener({
        button: 0,
        target: {
          closest(selector) {
            return selector === 'a[rel~="sponsored"]' ? fakeAnchor : null;
          }
        },
        preventDefault() {
          defaultPrevented = true;
        }
      });

      assert.equal(defaultPrevented, false, 'Click tracker must never block or delay navigation');
      assert.equal(beacons.length, 1);
      assert.equal(beacons[0].url, '/api/click');
      assert.deepEqual(beacons[0].body, {
        path: '/builds/llama-3.3-70b',
        merchant: 'Amazon',
        linkId: 'build:llama-3.3-70b:tier-budget-used:AMD Ryzen 7 5700X (8C / 16T)'
      });
    });

    it('buildClickPayload returns null for placeholder (#) links', () => {
      const placeholderAnchor = {
        getAttribute(name) {
          return name === 'href' ? '#' : 'eBay Sold';
        }
      };
      assert.equal(buildClickPayload(placeholderAnchor, '/tracker'), null);
    });
  });
});
