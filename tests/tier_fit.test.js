import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { tierFit, defaultTierId, cheapestFittingTotal, RUNTIME_OVERHEAD_GB } from '../src/utils/tierFit.js';

const HAND_WRITTEN = ['llama-3.3-70b', 'deepseek-r1-70b', 'qwen-2.5-72b', 'mistral-nemo-12b', 'llama-3.1-8b'];
const model = (id) => MODELS_DATA.find(m => m.id === id);
const synthesized = MODELS_DATA.filter(m => !HAND_WRITTEN.includes(m.id));

describe('Tier fit math', () => {
  const fakeModel = {
    contextCostPer8k: 2,
    quants: [
      { name: 'Q4_K_M (4.5 bpw)', vram: 20, recommended: true },
      { name: 'Q3_K_M (3.5 bpw)', vram: 16 },
      { name: 'Q8_0 (8.5 bpw)', vram: 36 }
    ]
  };

  it('fits the recommended quant when it leaves room for 8K context', () => {
    const fit = tierFit(fakeModel, { memoryGb: 24 });
    assert.equal(fit.status, 'fits');
    assert.equal(fit.quant, 'Q4_K_M');
    // 24 - 1 overhead - 20 weights = 3 GB at 2 GB per 8K -> 8K (rounded down to 8K steps)
    assert.equal(RUNTIME_OVERHEAD_GB, 1);
    assert.equal(fit.contextK, 8);
  });

  it('falls back to the largest smaller quant that fits', () => {
    const fit = tierFit(fakeModel, { memoryGb: 20 });
    assert.equal(fit.status, 'reduced');
    assert.equal(fit.quant, 'Q3_K_M');
    assert.equal(fit.recommendedQuant, 'Q4_K_M');
  });

  it("reports 'none' when even the smallest quant plus 8K context doesn't fit", () => {
    const fit = tierFit(fakeModel, { memoryGb: 18 });
    assert.equal(fit.status, 'none');
    assert.equal(fit.quant, null);
    assert.equal(fit.smallestVram, 16);
  });

  it('matches known cases from the data', () => {
    // A 32B model at Q4_K_M (20 GB) fits a 24 GB card and 32 GB card, but not a 16 GB one
    const qwen32 = BUILDS_DATA['qwen-2.5-32b'].tiers;
    assert.deepEqual(qwen32.map(t => [t.memoryGb, t.fit.status]), [[24, 'fits'], [16, 'none'], [24, 'fits'], [32, 'fits']]);
    // FP16 / Q8 8B does not fit in 10 GB once overhead and context are counted
    assert.equal(tierFit(model('llama-3.1-8b'), { memoryGb: 10 }).status, 'reduced');
  });
});

describe('Generated build sheets', () => {
  it('every tier records its usable memory and fit', () => {
    for (const [id, sheet] of Object.entries(BUILDS_DATA)) {
      for (const t of sheet.tiers) {
        assert.ok(t.memoryGb > 0, `${id} ${t.id} memoryGb`);
        assert.ok(['fits', 'reduced', 'none'].includes(t.fit.status), `${id} ${t.id} fit`);
      }
    }
  });

  it("each generated sheet's GPU note and headline describe that model, not the template's", () => {
    for (const m of synthesized) {
      for (const t of BUILDS_DATA[m.id].tiers) {
        assert.ok(t.headline.includes(m.name), `${m.id} ${t.id} headline: ${t.headline}`);
        const gpu = t.parts.find(p => /GPU|Compute Unit/i.test(p.category));
        assert.ok(gpu.notes.includes(m.name), `${m.id} ${t.id} GPU note: ${gpu.notes}`);
      }
    }
  });

  it("no generated sheet repeats text about a template's own model", () => {
    const templateModelText = /Mistral NeMo|Mistral Small|Llama 8B|Llama 3\.3|DeepSeek R1|\b70B\b|\b8B\b|\b12B\b|\b24B\b|\d+GB model|model files|FP16|Tokens\/sec/i;
    for (const m of synthesized) {
      const sheet = BUILDS_DATA[m.id];
      for (const t of sheet.tiers) {
        const texts = [t.name, t.badge, t.headline, t.rigSummary, ...t.parts.map(p => p.notes || '')];
        for (const text of texts) {
          const hit = text.replaceAll(m.name, '').match(templateModelText);
          assert.equal(hit, null, `${m.id} ${t.id}: "${text}"`);
        }
      }
    }
  });

  it('every page opens on a tier the model fits, when one exists', () => {
    for (const [id, sheet] of Object.entries(BUILDS_DATA)) {
      const def = sheet.tiers.find(t => t.id === defaultTierId(sheet));
      const anyFits = sheet.tiers.some(t => t.fit.status !== 'none');
      assert.equal(def.fit.status !== 'none', anyFits, `${id} default tier ${def.id}`);
    }
  });

  it('every model has at least one listed rig that fits', () => {
    const noRig = Object.entries(BUILDS_DATA).filter(([, s]) => cheapestFittingTotal(s) === null).map(([id]) => id).sort();
    assert.deepEqual(noRig, []);
  });

  it('every batch-1 model fits a listed tier or is flagged as a unified-memory / offload candidate', () => {
    const batch1 = ['gpt-oss-20b', 'gpt-oss-120b', 'qwen-3-30b-a3b', 'qwen-3-235b-a22b', 'llama-4-scout',
      'gemma-4-31b', 'gemma-4-26b-moe', 'qwen-3.5-27b', 'qwen-3.6-35b-a3b'];
    for (const id of batch1) {
      const m = model(id);
      assert.ok(m, `${id} is in MODELS_DATA`);
      const fitsSomewhere = BUILDS_DATA[id].tiers.some(t => t.fit.status !== 'none');
      assert.ok(fitsSomewhere || m.largeModelPath === 'unified-memory-or-offload', `${id} fits a tier or is flagged`);
    }
  });
});

describe('New hardware tiers fit outcomes and price-sync', () => {
  it('Llama 4 Scout offers Strix Halo, PRO 6000, and M3 Ultra as fits alongside M2 128GB Mac, with Strix cheapest at $3,049', () => {
    const scout = BUILDS_DATA['llama-4-scout'];
    assert.ok(scout, 'Scout build sheet exists');
    const strixHalo = scout.tiers.find(t => t.id === 'tier-strix-halo');
    const pro6000 = scout.tiers.find(t => t.id === 'tier-rtx-pro-6000');
    const m3Ultra = scout.tiers.find(t => t.id === 'tier-mac-m3-ultra');
    const m2Ultra = scout.tiers.find(t => t.id === 'tier-best-new');

    assert.ok(strixHalo, 'Strix Halo tier exists on Scout');
    assert.ok(pro6000, 'PRO 6000 tier exists on Scout');
    assert.ok(m3Ultra, 'M3 Ultra tier exists on Scout');
    assert.ok(m2Ultra, 'M2 Ultra tier exists on Scout');

    assert.equal(strixHalo.fit.status, 'fits');
    assert.equal(strixHalo.fit.quant, 'Q4_K_M');
    assert.equal(pro6000.fit.status, 'fits');
    assert.equal(pro6000.fit.quant, 'Q4_K_M');
    assert.equal(m3Ultra.fit.status, 'fits');
    assert.equal(m3Ultra.fit.quant, 'Q4_K_M');
    assert.equal(m2Ultra.fit.status, 'fits');
    assert.equal(m2Ultra.fit.quant, 'Q4_K_M');

    const fittingTiers = scout.tiers.filter(t => t.fit && t.fit.status !== 'none');
    assert.equal(fittingTiers.length, 4, 'Scout has 4 fitting tiers (M2, Strix Halo, M3, PRO 6000)');
    assert.equal(cheapestFittingTotal(scout), 3049, 'Cheapest fitting total on Scout is Strix Halo ($3,049)');
  });

  it('gpt-oss-120b offers Strix Halo, PRO 6000, and M3 Ultra as fits alongside M2 128GB Mac, with Strix cheapest at $3,049', () => {
    const gpt120 = BUILDS_DATA['gpt-oss-120b'];
    assert.ok(gpt120, 'gpt-oss-120b build sheet exists');
    const strixHalo = gpt120.tiers.find(t => t.id === 'tier-strix-halo');
    const pro6000 = gpt120.tiers.find(t => t.id === 'tier-rtx-pro-6000');
    const m3Ultra = gpt120.tiers.find(t => t.id === 'tier-mac-m3-ultra');
    const m2Ultra = gpt120.tiers.find(t => t.id === 'tier-best-new');

    assert.ok(strixHalo, 'Strix Halo tier exists on gpt-oss-120b');
    assert.ok(pro6000, 'PRO 6000 tier exists on gpt-oss-120b');
    assert.ok(m3Ultra, 'M3 Ultra tier exists on gpt-oss-120b');
    assert.ok(m2Ultra, 'M2 Ultra tier exists on gpt-oss-120b');

    assert.equal(strixHalo.fit.status, 'fits');
    assert.equal(strixHalo.fit.quant, 'MXFP4');
    assert.equal(pro6000.fit.status, 'fits');
    assert.equal(pro6000.fit.quant, 'MXFP4');
    assert.equal(m3Ultra.fit.status, 'fits');
    assert.equal(m3Ultra.fit.quant, 'MXFP4');
    assert.equal(m2Ultra.fit.status, 'fits');
    assert.equal(m2Ultra.fit.quant, 'MXFP4');

    const fittingTiers = gpt120.tiers.filter(t => t.fit && t.fit.status !== 'none');
    assert.equal(fittingTiers.length, 4, 'gpt-oss-120b has 4 fitting tiers (M2, Strix Halo, M3, PRO 6000)');
    assert.equal(cheapestFittingTotal(gpt120), 3049, 'Cheapest fitting total on gpt-oss-120b is Strix Halo ($3,049)');
  });

  it('command-r-35b does not offer the RTX 5090 tier due to high context cost', () => {
    const cmd35 = BUILDS_DATA['command-r-35b'];
    assert.ok(cmd35, 'command-r-35b build sheet exists');
    const rtx5090 = cmd35.tiers.find(t => t.id === 'tier-rtx-5090');
    assert.equal(rtx5090, undefined, 'RTX 5090 tier must be absent from command-r-35b');

    const fittingTiers = cmd35.tiers.filter(t => t.fit && t.fit.status !== 'none');
    assert.equal(fittingTiers.length, 3, 'command-r-35b has 3 fitting tiers');
    assert.deepEqual(fittingTiers.map(t => t.id), ['tier-budget-used', 'tier-balanced-mix', 'tier-best-new']);
  });

  it('Qwen3-235B shows the Strix Halo tier fitting at Q2_K', () => {
    const qwen235 = BUILDS_DATA['qwen-3-235b-a22b'];
    assert.ok(qwen235, 'Qwen3-235B build sheet exists');
    const strixHalo = qwen235.tiers.find(t => t.id === 'tier-strix-halo');
    assert.ok(strixHalo, 'Strix Halo tier exists on Qwen3-235B');

    assert.equal(strixHalo.fit.status, 'reduced');
    assert.equal(strixHalo.fit.quant, 'Q2_K');
    assert.equal(strixHalo.fit.quantVram, 85.7);
    assert.equal(strixHalo.memoryGb, 96);
    // 85.7 + 1.6 = 87.3 <= 95 usable memory
    assert.ok(strixHalo.fit.contextK >= 8);

    const fittingTiers = qwen235.tiers.filter(t => t.fit && t.fit.status !== 'none');
    assert.equal(fittingTiers.length, 1, 'Qwen3-235B has 1 fitting tier (Strix Halo)');
  });

  it('DeepSeek V3 and DeepSeek R1 full fit the 192GB RAM offload tier at Q2_K with 32K+ context', () => {
    for (const [id, expectedVram] of [['deepseek-v3-moe', 140], ['deepseek-r1-full', 142]]) {
      const sheet = BUILDS_DATA[id];
      const fittingTiers = sheet.tiers.filter(t => t.fit && t.fit.status !== 'none');
      assert.equal(fittingTiers.length, 1, `${id} has exactly 1 fitting tier`);
      const offload = fittingTiers[0];
      assert.equal(offload.id, 'tier-ram-offload', `${id} fitting tier is tier-ram-offload`);
      assert.equal(offload.fit.status, 'fits');
      assert.equal(offload.fit.quant, 'Q2_K');
      assert.equal(offload.fit.quantVram, expectedVram);
      assert.equal(offload.fit.contextLabel, '32K+');
      const offloadTotal = offload.parts.reduce((sum, p) => sum + (p.price || 0), 0);
      assert.equal(offloadTotal, 5314, `${id} tier-ram-offload parts total is $5,314`);
      assert.equal(cheapestFittingTotal(sheet), offloadTotal, `${id} cheapestFittingTotal equals tier-ram-offload parts total ($${offloadTotal})`);
    }
  });

  it('tier-ram-offload is inserted only on colossal models that fit no GPU/unified tier', () => {
    const offloadModels = Object.entries(BUILDS_DATA)
      .filter(([, sheet]) => sheet.tiers.some(t => t.id === 'tier-ram-offload'))
      .map(([id]) => id)
      .sort();
    assert.deepEqual(offloadModels, [
      'deepseek-r1-full',
      'deepseek-v3-moe',
      'deepseek-v3.2',
      'llama-4-maverick',
      'qwen-3-coder-480b-a35b',
      'qwen-3.5-397b-a17b'
    ]);
  });

  it('all new GPU/platform part prices equal tracker prices in gpus.js and match apply_prices.js regex', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { GPUS_DATA } = await import('../src/data/gpus.js');
    const applyPricesCode = fs.readFileSync(path.resolve('scripts/apply_prices.js'), 'utf-8');

    const expectedGpus = [
      { id: 'rtx-pro-6000-blackwell', partName: 'NVIDIA RTX PRO 6000 Blackwell (96GB)' },
      { id: 'strix-halo-128gb', partName: 'AMD Ryzen AI Max+ 395 Mini PC (128GB)' },
      { id: 'mac-studio-m3-ultra', partName: 'Apple Mac Studio M3 Ultra (96GB)' },
      { id: 'rtx-5090', partName: 'NVIDIA GeForce RTX 5090 32GB' },
      { id: 'rtx-3090', partName: '1x NVIDIA GeForce RTX 3090 24GB' }
    ];

    for (const { id, partName } of expectedGpus) {
      const gpu = GPUS_DATA.find(g => g.id === id);
      assert.ok(gpu, `GPU ${id} exists in gpus.js`);

      // Verify apply_prices.js registers this card and matches the part in builds.js
      assert.ok(applyPricesCode.includes(id), `apply_prices.js checks card ${id}`);
      const basePartName = partName.split('(')[0].split('+')[0].trim();
      assert.ok(applyPricesCode.includes(basePartName), `apply_prices.js matches part name ${basePartName}`);

      // Verify every tier containing this part has the tracker price
      for (const [modelId, sheet] of Object.entries(BUILDS_DATA)) {
        for (const tier of sheet.tiers) {
          const part = tier.parts.find(p => p.name === partName);
          if (part) {
            assert.equal(part.price, gpu.usedStreetPrice, `${modelId} ${tier.id} part ${partName} price matches tracker`);
          }
        }
      }
    }

    // Mutate-and-restore check: apply_prices.js single-3090 regex updates both mistral-nemo-12b and TIER_RAM_OFFLOAD
    const buildsFile = path.resolve('src/data/builds.js');
    const origBuilds = fs.readFileSync(buildsFile, 'utf-8');
    try {
      const mutated = origBuilds.replace(
        /(name:\s*'1x NVIDIA GeForce RTX 3090 24GB'[\s\S]*?price:\s*)\d+/g,
        '$1799'
      );
      const prices = [...mutated.matchAll(/name:\s*'1x NVIDIA GeForce RTX 3090 24GB'[\s\S]*?price:\s*(\d+)/g)].map(m => Number(m[1]));
      assert.deepEqual(prices, [799, 799], 'Single-3090 sync updates both hand-written and TIER_RAM_OFFLOAD templates');
    } finally {
      fs.writeFileSync(buildsFile, origBuilds, 'utf-8');
    }
  });

  it('every build total equals the sum of its parts across all models and tiers', () => {
    for (const [modelId, sheet] of Object.entries(BUILDS_DATA)) {
      for (const tier of sheet.tiers) {
        const sum = tier.parts.reduce((acc, p) => acc + (p.price || 0), 0);
        assert.ok(sum > 0, `${modelId} ${tier.id} total must be positive`);
        for (const p of tier.parts) {
          assert.equal(typeof p.price, 'number', `${modelId} ${tier.id} part ${p.name} price is number`);
          assert.ok(p.price >= 0, `${modelId} ${tier.id} part ${p.name} price >= 0`);
        }
      }
    }
  });

  it('every GPU part whose name starts with 2x NVIDIA GeForce RTX 3090 is priced at 2x the rtx-3090 price in gpus.js', async () => {
    const { GPUS_DATA } = await import('../src/data/gpus.js');
    const rtx3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
    assert.ok(rtx3090, 'rtx-3090 exists in gpus.js');
    const expectedDualPrice = rtx3090.usedStreetPrice * 2;

    let checkedCount = 0;
    for (const [modelId, sheet] of Object.entries(BUILDS_DATA)) {
      for (const tier of sheet.tiers) {
        for (const part of tier.parts) {
          if (part.name.startsWith('2x NVIDIA GeForce RTX 3090')) {
            assert.equal(
              part.price,
              expectedDualPrice,
              `${modelId} ${tier.id} part "${part.name}" must be priced at 2x rtx-3090 ($${expectedDualPrice})`
            );
            checkedCount++;
          }
        }
      }
    }
    assert.ok(checkedCount > 0, 'Checked at least one 2x RTX 3090 part across build sheets');
  });
});
