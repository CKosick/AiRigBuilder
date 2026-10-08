// tests/alerts.test.js
// Tests Price-Drop Alert System: Validation, Double Opt-In, Evaluation, and Unsubscribe lifecycle

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isValidEmail,
  validateAlertInput,
  registerAlert,
  confirmAlert,
  unsubscribeAlert,
  evaluateAndTriggerAlerts,
  loadAlerts
} from '../src/services/alertService.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { getAlertStore, FileAlertStore, RedisAlertStore } from '../src/services/alertStore.js';
import subscribeHandler from '../api/alerts/subscribe.js';

// Lifecycle tests use the mock email sender; the "Resend Delivery" tests switch to production mode
process.env.NODE_ENV = 'test';

// Fake network for production-mode tests: Upstash REST plus the Resend API.
// resend: { status, body } controls the Resend reply; calls records every Resend request.
function mockNetwork({ resend = { status: 200, body: { id: 'email_123' } } } = {}) {
  const redis = mockRedisFetch();
  const calls = [];
  const fetchImpl = async (url, init) => {
    if (String(url).startsWith('https://api.resend.com/')) {
      calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
      return { ok: resend.status >= 200 && resend.status < 300, status: resend.status, json: async () => resend.body };
    }
    return redis(url, init);
  };
  return { fetchImpl, calls };
}

// Runs fn with production-like env vars and a mocked fetch, restoring everything afterwards
async function withProductionEnv(env, fetchImpl, fn) {
  const keys = ['NODE_ENV', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const originalFetch = globalThis.fetch;
  for (const k of keys) delete process.env[k];
  Object.assign(process.env, { NODE_ENV: 'production', KV_REST_API_URL: 'https://r.upstash.io', KV_REST_API_TOKEN: 't' }, env);
  globalThis.fetch = fetchImpl;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
}

// In-memory stand-in for the Upstash Redis REST API (HGETALL / HSET only)
function mockRedisFetch() {
  const hash = new Map();
  return async (_url, init) => {
    const [cmd, , field, value] = JSON.parse(init.body);
    let result;
    if (cmd === 'HSET') { hash.set(field, value); result = 1; }
    else if (cmd === 'HGETALL') { result = [...hash.entries()].flat(); }
    else throw new Error(`unexpected command ${cmd}`);
    return { ok: true, status: 200, json: async () => ({ result }) };
  };
}

// Minimal Vercel-style response object
function mockRes() {
  return {
    statusCode: 200, body: undefined, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(b) { this.body = b; return this; },
    end() { return this; }
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_ALERTS_FILE = path.join(__dirname, 'test_alerts.json');

describe('Price-Drop Alerts System', () => {
  beforeEach(() => {
    // Reset test file before each test
    if (fs.existsSync(TEST_ALERTS_FILE)) {
      fs.unlinkSync(TEST_ALERTS_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_ALERTS_FILE)) {
      fs.unlinkSync(TEST_ALERTS_FILE);
    }
  });

  describe('Email & Input Validation', () => {
    it('correctly validates valid email formats', () => {
      assert.equal(isValidEmail('user@example.com'), true);
      assert.equal(isValidEmail('first.last@company.org'), true);
      assert.equal(isValidEmail('dev+alert@sub.domain.io'), true);
    });

    it('rejects invalid email formats', () => {
      assert.equal(isValidEmail(''), false);
      assert.equal(isValidEmail(null), false);
      assert.equal(isValidEmail('notanemail'), false);
      assert.equal(isValidEmail('missing@domain'), false);
      assert.equal(isValidEmail('@missinguser.com'), false);
      assert.equal(isValidEmail('spaces in@email.com'), false);
    });

    it('validates alert parameters (GPU ID, target price)', () => {
      const valid = validateAlertInput({
        email: 'test@example.com',
        gpuId: 'rtx-3090',
        targetPrice: 650
      });
      assert.equal(valid.valid, true);
      assert.equal(valid.price, 650);
      assert.equal(valid.gpu.id, 'rtx-3090');

      // Invalid GPU
      const badGpu = validateAlertInput({
        email: 'test@example.com',
        gpuId: 'fake-gpu-9999',
        targetPrice: 500
      });
      assert.equal(badGpu.valid, false);
      assert.match(badGpu.error, /Invalid GPU ID/);

      // Invalid target price
      const badPrice = validateAlertInput({
        email: 'test@example.com',
        gpuId: 'rtx-3090',
        targetPrice: -100
      });
      assert.equal(badPrice.valid, false);
      assert.match(badPrice.error, /dollar amount/);
    });
  });

  describe('Double Opt-in Registration & Confirmation', () => {
    it('creates a new alert with PENDING_CONFIRMATION status and tokens', async () => {
      const result = await registerAlert({
        email: 'subscriber@domain.com',
        gpuId: 'rtx-3090',
        targetPrice: 700,
        filePath: TEST_ALERTS_FILE,
        appUrl: 'https://test.airigbuilder.com'
      });

      assert.equal(result.success, true);
      assert.ok(result.alert);
      assert.equal(result.alert.status, 'PENDING_CONFIRMATION');
      assert.equal(result.alert.email, 'subscriber@domain.com');
      assert.equal(result.alert.targetPrice, 700);
      assert.equal(result.alert.fired, false);
      assert.ok(result.alert.confirmToken, 'Must generate confirmation token');
      assert.ok(result.alert.unsubscribeToken, 'Must generate unsubscribe token');

      // File should persist the alert
      const stored = await loadAlerts(TEST_ALERTS_FILE);
      assert.equal(stored.length, 1);
      assert.equal(stored[0].id, result.alert.id);
    });

    it('confirms alert via valid token and transitions status to ACTIVE', async () => {
      const reg = await registerAlert({
        email: 'active@domain.com',
        gpuId: 'rtx-4090',
        targetPrice: 1400,
        filePath: TEST_ALERTS_FILE
      });

      const confirmRes = await confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);
      assert.equal(confirmRes.success, true);
      assert.equal(confirmRes.alert.status, 'ACTIVE');
      assert.ok(confirmRes.alert.confirmedAt, 'Must stamp confirmedAt timestamp');

      // Re-confirming should be idempotent
      const idempotencyRes = await confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);
      assert.equal(idempotencyRes.success, true);
      assert.equal(idempotencyRes.alreadyConfirmed, true);
    });

    it('rejects invalid confirmation tokens', async () => {
      const res = await confirmAlert('non-existent-token-xyz', TEST_ALERTS_FILE);
      assert.equal(res.success, false);
      assert.match(res.error, /Invalid or expired/);
    });
  });

  describe('Alert Price Evaluation & Firing Rules', () => {
    it('does NOT fire if alert is still PENDING_CONFIRMATION even if price dropped', async () => {
      await registerAlert({
        email: 'pending@domain.com',
        gpuId: 'rtx-3090',
        targetPrice: 800, // Price is 695 (below target), but user has not confirmed opt-in
        filePath: TEST_ALERTS_FILE
      });

      const evalRes = await evaluateAndTriggerAlerts(GPUS_DATA, { filePath: TEST_ALERTS_FILE });
      assert.equal(evalRes.firedCount, 0, 'Must not fire for unconfirmed subscriptions');
    });

    it('does NOT fire if current price is above target price', async () => {
      const reg = await registerAlert({
        email: 'waiting@domain.com',
        gpuId: 'rtx-3090', // Current price: $695
        targetPrice: 500, // Target is lower than current
        filePath: TEST_ALERTS_FILE
      });
      await confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);

      const evalRes = await evaluateAndTriggerAlerts(GPUS_DATA, { filePath: TEST_ALERTS_FILE });
      assert.equal(evalRes.firedCount, 0, 'Must not fire when current price exceeds target');
    });

    it('FIRES when price drops to or below target, and marks alert fired (no re-firing)', async () => {
      // 1. Create alert: RTX 3090 target $700
      const reg = await registerAlert({
        email: 'winner@domain.com',
        gpuId: 'rtx-3090',
        targetPrice: 700,
        filePath: TEST_ALERTS_FILE
      });
      await confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);

      // Mock GPU pricing where RTX 3090 has dropped to $680
      const mockGpus = GPUS_DATA.map(g => {
        if (g.id === 'rtx-3090') {
          return { ...g, usedStreetPrice: 680 };
        }
        return g;
      });

      // 2. Evaluate alerts - should fire once
      const eval1 = await evaluateAndTriggerAlerts(mockGpus, { filePath: TEST_ALERTS_FILE });
      assert.equal(eval1.firedCount, 1);
      assert.equal(eval1.firedAlerts[0].email, 'winner@domain.com');
      assert.equal(eval1.firedAlerts[0].droppedPrice, 680);

      // Verify stored state in file
      const updatedAlerts = await loadAlerts(TEST_ALERTS_FILE);
      assert.equal(updatedAlerts[0].fired, true);
      assert.ok(updatedAlerts[0].firedAt);
      assert.equal(updatedAlerts[0].lastNotifiedPrice, 680);

      // 3. Evaluate AGAIN with same or even lower price ($650)
      const mockGpusDropFurther = GPUS_DATA.map(g => {
        if (g.id === 'rtx-3090') return { ...g, usedStreetPrice: 650 };
        return g;
      });

      const eval2 = await evaluateAndTriggerAlerts(mockGpusDropFurther, { filePath: TEST_ALERTS_FILE });
      assert.equal(eval2.firedCount, 0, 'Must NEVER re-fire an alert that was already marked fired');
    });
  });

  describe('Unsubscribe Lifecycle', () => {
    it('deactivates alert upon unsubscribe and prevents firing', async () => {
      const reg = await registerAlert({
        email: 'unsub@domain.com',
        gpuId: 'rtx-3060-12gb',
        targetPrice: 350,
        filePath: TEST_ALERTS_FILE
      });
      await confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);

      // Unsubscribe via unsubscribeToken
      const unsubRes = await unsubscribeAlert(reg.alert.unsubscribeToken, TEST_ALERTS_FILE);
      assert.equal(unsubRes.success, true);
      assert.equal(unsubRes.alert.status, 'UNSUBSCRIBED');

      // Attempt to evaluate when price is lower
      const mockGpus = GPUS_DATA.map(g => {
        if (g.id === 'rtx-3060-12gb') return { ...g, usedStreetPrice: 280 };
        return g;
      });

      const evalRes = await evaluateAndTriggerAlerts(mockGpus, { filePath: TEST_ALERTS_FILE });
      assert.equal(evalRes.firedCount, 0, 'Unsubscribed alerts must never fire');
    });
  });

  describe('End-to-End Alert Workflow Contract', () => {
    it('executes full subscriber journey: subscribe -> double opt-in -> price check below target -> email sent -> marked fired', async () => {
      // Step 1: User fills capture form for RTX 3090 at $700
      const subResult = await registerAlert({
        email: 'alex@example.com',
        gpuId: 'rtx-3090',
        targetPrice: 700,
        filePath: TEST_ALERTS_FILE,
        appUrl: 'https://airigbuilder.com'
      });
      assert.equal(subResult.success, true);
      const { confirmToken } = subResult.alert;

      // Step 2: User clicks confirmation link in email
      const confResult = await confirmAlert(confirmToken, TEST_ALERTS_FILE);
      assert.equal(confResult.success, true);
      assert.equal(confResult.alert.status, 'ACTIVE');

      // Step 3: Weekly price check runs with price above target ($710) -> no email
      const highGpus = GPUS_DATA.map(g => g.id === 'rtx-3090' ? { ...g, usedStreetPrice: 710 } : g);
      const check1 = await evaluateAndTriggerAlerts(highGpus, { filePath: TEST_ALERTS_FILE });
      assert.equal(check1.firedCount, 0);

      // Step 4: Weekly price check runs with price at $695 (below target $700) -> fires email
      const dropGpus = GPUS_DATA.map(g => g.id === 'rtx-3090' ? { ...g, usedStreetPrice: 695 } : g);
      const check2 = await evaluateAndTriggerAlerts(dropGpus, { filePath: TEST_ALERTS_FILE });
      assert.equal(check2.firedCount, 1);
      assert.equal(check2.firedAlerts[0].email, 'alex@example.com');
      assert.equal(check2.firedAlerts[0].droppedPrice, 695);

      // Step 5: Verification in database
      const alerts = await loadAlerts(TEST_ALERTS_FILE);
      const alert = alerts.find(a => a.email === 'alex@example.com');
      assert.equal(alert.fired, true);
      assert.equal(alert.lastNotifiedPrice, 695);
      assert.ok(alert.firedAt);

      // Step 6: Next week runs at $690 -> no re-fire
      const check3 = await evaluateAndTriggerAlerts(dropGpus, { filePath: TEST_ALERTS_FILE });
      assert.equal(check3.firedCount, 0);
    });
  });

  describe('Alert Storage Selection', () => {
    it('uses the file store when a filePath is given', () => {
      assert.ok(getAlertStore({ filePath: TEST_ALERTS_FILE, env: { KV_REST_API_URL: 'x', KV_REST_API_TOKEN: 'y' } }) instanceof FileAlertStore);
    });

    it('uses Redis when Upstash credentials are set', () => {
      assert.ok(getAlertStore({ defaultFilePath: TEST_ALERTS_FILE, env: { KV_REST_API_URL: 'https://r.upstash.io', KV_REST_API_TOKEN: 't' } }) instanceof RedisAlertStore);
      assert.ok(getAlertStore({ defaultFilePath: TEST_ALERTS_FILE, env: { UPSTASH_REDIS_REST_URL: 'https://r.upstash.io', UPSTASH_REDIS_REST_TOKEN: 't' } }) instanceof RedisAlertStore);
    });

    it('refuses to fall back to the read-only filesystem on Vercel', () => {
      assert.throws(() => getAlertStore({ defaultFilePath: TEST_ALERTS_FILE, env: { VERCEL: '1' } }), /not configured/);
    });

    it('round-trips alerts through the Redis store without losing concurrent writes', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockRedisFetch();
      try {
        const store = new RedisAlertStore('https://r.upstash.io', 't');
        await Promise.all([
          store.put({ id: 'a1', createdAt: '2026-01-01', email: 'a@x.com' }),
          store.put({ id: 'a2', createdAt: '2026-01-02', email: 'b@x.com' })
        ]);
        await store.put({ id: 'a1', createdAt: '2026-01-01', email: 'a@x.com', status: 'ACTIVE' });
        const all = await store.all();
        assert.deepEqual(all.map(a => a.id), ['a1', 'a2']);
        assert.equal(all[0].status, 'ACTIVE');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Subscribe API Endpoint', () => {
    it('never returns confirm or unsubscribe tokens to the browser', async () => {
      const originalFetch = globalThis.fetch;
      const saved = { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
      globalThis.fetch = mockRedisFetch();
      process.env.KV_REST_API_URL = 'https://r.upstash.io';
      process.env.KV_REST_API_TOKEN = 't';
      try {
        const res = mockRes();
        await subscribeHandler({ method: 'POST', headers: {}, body: { email: 'leak@test.com', gpuId: 'rtx-3090', targetPrice: 600 } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.alert, undefined);
        assert.doesNotMatch(JSON.stringify(res.body), /[0-9a-f]{8}-[0-9a-f]{4}-/, 'response must not contain any token');
      } finally {
        globalThis.fetch = originalFetch;
        if (saved.url === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = saved.url;
        if (saved.token === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = saved.token;
      }
    });
  });

  describe('Resend Delivery (production mode)', () => {
    const signup = { method: 'POST', headers: {}, body: { email: 'buyer@example.com', gpuId: 'rtx-3090', targetPrice: 600 } };

    it('calls the Resend API from the airigbuilder.com sender and reports success', async () => {
      const net = mockNetwork();
      const res = mockRes();
      await withProductionEnv({ RESEND_API_KEY: 're_test_key' }, net.fetchImpl, () => subscribeHandler(signup, res));

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(net.calls.length, 1, 'exactly one Resend send');
      const call = net.calls[0];
      assert.equal(call.url, 'https://api.resend.com/emails');
      assert.equal(call.headers.Authorization, 'Bearer re_test_key');
      assert.equal(call.body.from, 'AiRigBuilder <alerts@airigbuilder.com>');
      assert.deepEqual(call.body.to, ['buyer@example.com']);
      assert.match(call.body.html, /\/api\/alerts\/confirm\?token=[0-9a-f-]{36}/);
    });

    it('returns an error instead of a false success when RESEND_API_KEY is missing', async () => {
      const net = mockNetwork();
      const res = mockRes();
      await withProductionEnv({}, net.fetchImpl, () => subscribeHandler(signup, res));

      assert.equal(res.statusCode, 502);
      assert.equal(res.body.success, false);
      assert.match(res.body.error, /couldn't send your confirmation email/);
      assert.equal(net.calls.length, 0);
    });

    it('returns an error when Resend rejects the send, then re-sends on retry', async () => {
      const failing = mockNetwork({ resend: { status: 403, body: { name: 'validation_error', message: 'The airigbuilder.com domain is not verified.' } } });
      const first = mockRes();
      const retry = mockRes();
      await withProductionEnv({ RESEND_API_KEY: 're_test_key' }, failing.fetchImpl, async () => {
        await subscribeHandler(signup, first);
        await subscribeHandler(signup, retry);
      });

      assert.equal(first.statusCode, 502);
      assert.equal(first.body.success, false);
      assert.doesNotMatch(JSON.stringify(first.body), /validation_error|not verified/, 'Resend internals stay in the server log');
      // The pending alert is kept, so the retry takes the re-send path (and fails again here)
      assert.equal(retry.statusCode, 502);
      assert.equal(failing.calls.length, 2);
    });

    it('honours RESEND_FROM_EMAIL when set', async () => {
      const net = mockNetwork();
      await withProductionEnv({ RESEND_API_KEY: 're_test_key', RESEND_FROM_EMAIL: 'Alerts <hello@airigbuilder.com>' }, net.fetchImpl,
        () => subscribeHandler(signup, mockRes()));
      assert.equal(net.calls[0].body.from, 'Alerts <hello@airigbuilder.com>');
    });

    it('does not mark a price-drop alert fired when its email fails, so the next run retries', async () => {
      const reg = await registerAlert({ email: 'retry@domain.com', gpuId: 'rtx-3090', targetPrice: 700, filePath: TEST_ALERTS_FILE });
      await confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);
      const dropped = GPUS_DATA.map(g => g.id === 'rtx-3090' ? { ...g, usedStreetPrice: 650 } : g);

      const failing = mockNetwork({ resend: { status: 500, body: { message: 'internal error' } } });
      const run1 = await withProductionEnv({ RESEND_API_KEY: 're_test_key' }, failing.fetchImpl,
        () => evaluateAndTriggerAlerts(dropped, { filePath: TEST_ALERTS_FILE }));
      assert.equal(run1.firedCount, 0);
      assert.equal(run1.failedAlerts.length, 1);
      assert.equal((await loadAlerts(TEST_ALERTS_FILE))[0].fired, false);

      const working = mockNetwork();
      const run2 = await withProductionEnv({ RESEND_API_KEY: 're_test_key' }, working.fetchImpl,
        () => evaluateAndTriggerAlerts(dropped, { filePath: TEST_ALERTS_FILE }));
      assert.equal(run2.firedCount, 1);
      assert.equal(working.calls.length, 1);
    });
  });
});
