// Price-derived numbers quoted in prose: the header/hero, GPU summaries, the hardware guide and
// the home FAQ structured data. Everything is computed from the data files, so a weekly price
// update (npm run prices:apply, which rebuilds) changes the copy along with the tables.
import { GPUS_DATA } from '../data/gpus.js';
import { CLOUD_PROVIDERS } from '../data/providers.js';
import { computeBreakEven, BASELINE_RIG } from './breakEven.js';

export const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

const gpuById = (id) => {
  const gpu = GPUS_DATA.find(g => g.id === id);
  if (!gpu) throw new Error(`siteFacts: GPU '${id}' is missing from GPUS_DATA`);
  return gpu;
};

export function siteFacts() {
  const rtx3090 = gpuById('rtx-3090');
  const runpodDual3090 = CLOUD_PROVIDERS.find(p => p.id === 'runpod-dual-3090');
  // Same defaults as the Break-Even calculator ($0.14/kWh)
  const payoffMonths = (dailyUsageHours) => Math.round(computeBreakEven({
    rigUpfrontCost: BASELINE_RIG.cost,
    dailyUsageHours,
    hourlyCloudRate: runpodDual3090.hourlyRate,
    monthlyDiskFee: runpodDual3090.storageCostPerMonth,
    systemWatts: BASELINE_RIG.watts,
    kwhRate: 0.14
  }).breakEvenMonths);

  return {
    rtx3090,
    rtx4090: gpuById('rtx-4090'),
    teslaP40: gpuById('tesla-p40'),
    runpodDual3090,
    dual3090GpuCost: rtx3090.usedStreetPrice * 2,
    dual3090RigEst: BASELINE_RIG.cost,
    payoffMonths4h: payoffMonths(4),
    payoffMonths12h: payoffMonths(12)
  };
}

/** A GPU's summary with its {price} / {dualPrice} placeholders filled from the current price. */
export function gpuSummary(gpu) {
  return gpu.summary
    .replace(/\{price\}/g, usd(gpu.usedStreetPrice))
    .replace(/\{dualPrice\}/g, usd(gpu.usedStreetPrice * 2));
}

/** Text with each {price:<gpu-id>} placeholder replaced by that GPU's current used price. */
export function fillGpuPrices(text) {
  return String(text).replace(/\{price:([a-z0-9-]+)\}/g, (_, id) => usd(gpuById(id).usedStreetPrice));
}

/** Home page FAQ as [{ question, answer }], for the FAQPage JSON-LD. */
export function homeFaq() {
  const f = siteFacts();
  return [
    {
      question: 'What is the cheapest way to run a 70B model at home?',
      answer: `The community gold standard is dual used NVIDIA RTX 3090 24GB cards (~${usd(f.rtx3090.usedStreetPrice)} each on eBay), delivering 48GB total VRAM on an AM4 platform for about ${usd(f.dual3090RigEst)} for the complete build (GPUs, CPU, board, RAM, 1000W PSU, SSD and case). This runs Llama 3.3 70B at Q4_K_M quant at ~20 tokens/sec.`
    },
    {
      question: 'Why is dual used RTX 3090 better than a single RTX 4090 for local LLMs?',
      answer: 'A single RTX 4090 only has 24GB VRAM and cannot fit a 70B model without CPU offloading (which slows inference to ~1.5 tokens/sec). Dual RTX 3090s provide 48GB VRAM, allowing the entire model to fit into high-speed GDDR6X for real-time 20 tok/sec generation.'
    },
    {
      question: 'How fast does a local 70B AI build break even against cloud GPU providers?',
      answer: `At 4 hours of daily usage compared to renting 2x RTX 3090 on RunPod ($${f.runpodDual3090.hourlyRate.toFixed(2)}/hr plus storage), a ~${usd(f.dual3090RigEst)} Dual 3090 rig pays for itself in roughly ${f.payoffMonths4h} months after electricity costs. At 12 hours a day the payoff drops to about ${f.payoffMonths12h} months.`
    }
  ];
}
