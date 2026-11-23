import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { computeBreakEven } from '../src/utils/breakEven.js';
import {
  BREAK_EVEN_DEFAULTS,
  RIG_COST_MIN,
  RIG_COST_MAX,
  CLOUD_RATE_MIN,
  CLOUD_RATE_MAX,
  SYSTEM_WATTS_MIN,
  SYSTEM_WATTS_MAX,
  clampRigCost,
  parseCalculatorCostParam,
  renderBreakEvenHtml
} from '../src/components/breakEvenCalc.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';

describe('Cloud Break-Even Calculator Logic', () => {
  it('correctly calculates break-even for Dual 3090 baseline at 4 hrs/day', () => {
    const res = computeBreakEven({
      rigUpfrontCost: 1780,
      dailyUsageHours: 4,
      hourlyCloudRate: 0.88,
      monthlyDiskFee: 7.00,
      systemWatts: 820,
      kwhRate: 0.14,
      resaleRetentionPct: 65
    });

    // Cloud: (0.88 * 4 * 30.5) + 7 = 107.36 + 7 = 114.36
    assert.ok(Math.abs(res.monthlyCloudTotal - 114.36) < 0.01);

    // Power: (820 / 1000) * 4 * 30.5 * 0.14 = 14.0056
    assert.ok(Math.abs(res.monthlyLocalPower - 14.01) < 0.05);

    // Net savings: ~100.35/mo
    assert.ok(res.monthlyNetSavings > 95 && res.monthlyNetSavings < 105);

    // Break-even months: 1780 / 100.35 = ~17.7 months
    assert.ok(res.breakEvenMonths > 15 && res.breakEvenMonths < 20);

    // 2-year cash savings should be positive
    assert.ok(res.netCashSavings24Mo > 500);

    // Resale value: 65% of 1780 = 1157
    assert.equal(res.estimatedResaleValue, 1157);
    assert.equal(res.netEquitySavings24Mo, res.netCashSavings24Mo + 1157);
  });

  it('handles heavy 12 hrs/day enterprise workloads with faster break-even', () => {
    const res = computeBreakEven({
      rigUpfrontCost: 1780,
      dailyUsageHours: 12,
      hourlyCloudRate: 0.88,
      monthlyDiskFee: 7.00,
      systemWatts: 820,
      kwhRate: 0.14
    });

    // At 12 hours/day, break-even should be achieved in under 7 months
    assert.ok(res.breakEvenMonths < 7, `Expected break-even < 7 months, got ${res.breakEvenMonths}`);
    assert.ok(res.netCashSavings24Mo > 4000, 'Expected >$4000 net savings over 24 months');
  });

  it('handles edge case: 0 hours per day', () => {
    const res = computeBreakEven({
      rigUpfrontCost: 1780,
      dailyUsageHours: 0,
      hourlyCloudRate: 0.88,
      monthlyDiskFee: 7.00,
      systemWatts: 820,
      kwhRate: 0.14
    });

    // Cloud only incurs disk storage fee ($7/mo)
    assert.equal(res.monthlyCloudTotal, 7.00);
    assert.equal(res.monthlyLocalPower, 0);
    assert.equal(res.monthlyNetSavings, 7.00);
    assert.ok(res.breakEvenMonths > 200, 'Idle rig takes hundreds of months to pay off disk fees');
  });

  it('handles edge case: power cost exceeds cloud rate (net savings <= 0)', () => {
    const res = computeBreakEven({
      rigUpfrontCost: 1780,
      dailyUsageHours: 10,
      hourlyCloudRate: 0.05, // artificially tiny cloud rate
      monthlyDiskFee: 0,
      systemWatts: 1500,
      kwhRate: 0.50 // high power cost
    });

    assert.ok(res.monthlyNetSavings < 0, 'Net savings should be negative');
    assert.equal(res.breakEvenMonths, Infinity, 'Break-even months must be Infinity when savings <= 0');
  });
});

describe('Break-Even Calculator UI Ceilings & Paired Numeric Cost Input', () => {
  it('raises rig cost, cloud rate, and power draw ceilings while preserving minimums and defaults', () => {
    assert.equal(RIG_COST_MIN, 400);
    assert.equal(RIG_COST_MAX, 35000);
    assert.equal(CLOUD_RATE_MIN, 0.10);
    assert.equal(CLOUD_RATE_MAX, 25.00);
    assert.equal(SYSTEM_WATTS_MIN, 150);
    assert.equal(SYSTEM_WATTS_MAX, 2000);
    assert.equal(BREAK_EVEN_DEFAULTS.rigUpfrontCost, 2654);
    assert.equal(BREAK_EVEN_DEFAULTS.hourlyCloudRate, 1.00);

    const html = renderBreakEvenHtml();
    assert.ok(html.includes('id="input-rig-cost" aria-label="Local AI rig total build cost (dollars)" min="400" max="35000" step="10" value="2654"'));
    assert.ok(html.includes('id="input-rig-cost-number" aria-label="Local AI rig total build cost (exact dollars)" min="400" max="35000" step="1" value="2654"'));
    assert.ok(html.includes('id="input-hourly-rate" aria-label="Cloud price (dollars per hour)" step="0.05" min="0.10" max="25.00" value="1.00"'));
    assert.ok(html.includes('id="input-system-watts" aria-label="Rig load power draw (watts)" min="150" max="2000" step="25" value="820"'));
  });

  it('holds flagship build cost $22,299 and $21.33/hr cloud rate without clamping', () => {
    assert.equal(clampRigCost(22299), 22299);
    assert.equal(clampRigCost(100), 400);
    assert.equal(clampRigCost(99999), 35000);

    const html = renderBreakEvenHtml({ rigUpfrontCost: 22299, hourlyCloudRate: 21.33 });
    assert.ok(html.includes('id="badge-rig-cost">$22,299</span>'));
    assert.ok(html.includes('id="input-rig-cost" aria-label="Local AI rig total build cost (dollars)" min="400" max="35000" step="10" value="22299"'));
    assert.ok(html.includes('id="input-rig-cost-number" aria-label="Local AI rig total build cost (exact dollars)" min="400" max="35000" step="1" value="22299"'));
    assert.ok(html.includes('id="input-hourly-rate" aria-label="Cloud price (dollars per hour)" step="0.05" min="0.10" max="25.00" value="21.33"'));
  });

  it('parses ?cost query param cleanly with clamping and links build sheet Calculate Break-Even ROI -> with build total', () => {
    assert.equal(parseCalculatorCostParam('?cost=22299'), 22299);
    assert.equal(parseCalculatorCostParam('?cost=2532'), 2532);
    assert.equal(parseCalculatorCostParam('?cost=100'), 400);
    assert.equal(parseCalculatorCostParam('?cost=99999'), 35000);
    assert.equal(parseCalculatorCostParam('?cost=abc'), null);
    assert.equal(parseCalculatorCostParam('?cost='), null);
    assert.equal(parseCalculatorCostParam('?cost=Infinity'), null);
    assert.equal(parseCalculatorCostParam('?foo=123'), null);
    assert.equal(parseCalculatorCostParam(''), null);

    const glmHtml = renderModelPickerHtml({ activeModelId: 'glm-5.3' });
    assert.match(glmHtml, /<a href="\/calculator\?cost=22299" class="btn-primary" id="btn-send-to-calc">[\s\S]*Calculate Break-Even ROI →\s*<\/a>/);

    const llamaHtml = renderModelPickerHtml({ activeModelId: 'llama-3.3-70b' });
    assert.match(llamaHtml, /<a href="\/calculator\?cost=2654" class="btn-primary" id="btn-send-to-calc">[\s\S]*Calculate Break-Even ROI →\s*<\/a>/);
  });
});
