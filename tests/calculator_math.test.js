import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure computation helper mirroring breakEvenCalc.js logic
function computeBreakEven({
  rigUpfrontCost,
  dailyUsageHours,
  hourlyCloudRate,
  monthlyDiskFee = 7.00,
  systemWatts,
  kwhRate = 0.14,
  resaleRetentionPct = 65
}) {
  const monthlyCloudRun = hourlyCloudRate * dailyUsageHours * 30.5;
  const monthlyCloudTotal = monthlyCloudRun + monthlyDiskFee;
  const monthlyLocalPower = (systemWatts / 1000) * dailyUsageHours * 30.5 * kwhRate;
  const monthlyNetSavings = monthlyCloudTotal - monthlyLocalPower;

  let breakEvenMonths = 0;
  if (monthlyNetSavings > 0) {
    breakEvenMonths = rigUpfrontCost / monthlyNetSavings;
  } else {
    breakEvenMonths = Infinity;
  }

  const cloud24Mo = monthlyCloudTotal * 24;
  const local24Mo = rigUpfrontCost + (monthlyLocalPower * 24);
  const netCashSavings24Mo = cloud24Mo - local24Mo;
  const estimatedResaleValue = Math.round(rigUpfrontCost * (resaleRetentionPct / 100));
  const netEquitySavings24Mo = netCashSavings24Mo + estimatedResaleValue;

  return {
    monthlyCloudTotal,
    monthlyLocalPower,
    monthlyNetSavings,
    breakEvenMonths,
    breakEvenDays: Math.round(breakEvenMonths * 30.5),
    cloud24Mo,
    local24Mo,
    netCashSavings24Mo,
    estimatedResaleValue,
    netEquitySavings24Mo
  };
}

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
