// Local rig vs cloud GPU break-even math.
// Shared by the Break-Even calculator, the header/hero headline numbers, and tests,
// so every figure on the site comes from the same formula.

export const DAYS_PER_MONTH = 30.5;

export function computeBreakEven({
  rigUpfrontCost,
  dailyUsageHours,
  hourlyCloudRate,
  monthlyDiskFee = 7.00,
  systemWatts,
  kwhRate = 0.14,
  resaleRetentionPct = 65
}) {
  const monthlyCloudRun = hourlyCloudRate * dailyUsageHours * DAYS_PER_MONTH;
  const monthlyCloudTotal = monthlyCloudRun + monthlyDiskFee;
  const monthlyLocalPower = (systemWatts / 1000) * dailyUsageHours * DAYS_PER_MONTH * kwhRate;
  const monthlyNetSavings = monthlyCloudTotal - monthlyLocalPower;

  const breakEvenMonths = monthlyNetSavings > 0 ? rigUpfrontCost / monthlyNetSavings : Infinity;

  const cloud24Mo = monthlyCloudTotal * 24;
  const local24Mo = rigUpfrontCost + (monthlyLocalPower * 24);
  const netCashSavings24Mo = cloud24Mo - local24Mo;
  const estimatedResaleValue = Math.round(rigUpfrontCost * (resaleRetentionPct / 100));
  const netEquitySavings24Mo = netCashSavings24Mo + estimatedResaleValue;

  const localHourlyPower = (systemWatts / 1000) * kwhRate;
  const pctCheaper = Math.round(((hourlyCloudRate - localHourlyPower) / hourlyCloudRate) * 100);

  return {
    monthlyCloudTotal,
    monthlyLocalPower,
    monthlyNetSavings,
    breakEvenMonths,
    breakEvenDays: Math.round(breakEvenMonths * DAYS_PER_MONTH),
    cloud24Mo,
    local24Mo,
    netCashSavings24Mo,
    estimatedResaleValue,
    netEquitySavings24Mo,
    localHourlyPower,
    pctCheaper
  };
}
