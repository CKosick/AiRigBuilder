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
      const stored = loadAlerts(TEST_ALERTS_FILE);
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

      const confirmRes = confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);
      assert.equal(confirmRes.success, true);
      assert.equal(confirmRes.alert.status, 'ACTIVE');
      assert.ok(confirmRes.alert.confirmedAt, 'Must stamp confirmedAt timestamp');

      // Re-confirming should be idempotent
      const idempotencyRes = confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);
      assert.equal(idempotencyRes.success, true);
      assert.equal(idempotencyRes.alreadyConfirmed, true);
    });

    it('rejects invalid confirmation tokens', () => {
      const res = confirmAlert('non-existent-token-xyz', TEST_ALERTS_FILE);
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
      confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);

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
      confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);

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
      const updatedAlerts = loadAlerts(TEST_ALERTS_FILE);
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
      confirmAlert(reg.alert.confirmToken, TEST_ALERTS_FILE);

      // Unsubscribe via unsubscribeToken
      const unsubRes = unsubscribeAlert(reg.alert.unsubscribeToken, TEST_ALERTS_FILE);
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
      const confResult = confirmAlert(confirmToken, TEST_ALERTS_FILE);
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
      const alerts = loadAlerts(TEST_ALERTS_FILE);
      const alert = alerts.find(a => a.email === 'alex@example.com');
      assert.equal(alert.fired, true);
      assert.equal(alert.lastNotifiedPrice, 695);
      assert.ok(alert.firedAt);

      // Step 6: Next week runs at $690 -> no re-fire
      const check3 = await evaluateAndTriggerAlerts(dropGpus, { filePath: TEST_ALERTS_FILE });
      assert.equal(check3.firedCount, 0);
    });
  });
});
