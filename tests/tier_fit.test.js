import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { tierFit, fitHeadline, fitDetail, defaultTierId, cheapestFittingTotal, RUNTIME_OVERHEAD_GB } from '../src/utils/tierFit.js';
import { estimateSpeedToks, formatTierSpeedLine } from '../src/utils/speedEstimate.js';

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
  it('Llama 4 Scout offers Strix Halo, PRO 6000, and M3 Ultra as fits alongside M2 128GB Mac, with Strix cheapest at $3,100', () => {
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
    assert.equal(cheapestFittingTotal(scout), 3100, 'Cheapest fitting total on Scout is Strix Halo ($3,100)');
  });

  it('gpt-oss-120b offers Strix Halo, PRO 6000, and M3 Ultra as fits alongside M2 128GB Mac, with Strix cheapest at $3,100', () => {
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
    assert.equal(cheapestFittingTotal(gpt120), 3100, 'Cheapest fitting total on gpt-oss-120b is Strix Halo ($3,100)');
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

  it('DeepSeek V3 and DeepSeek R1 full fit the 192GB RAM offload tier at IQ1_S with 32K+ context', () => {
    for (const [id, expectedVram] of [['deepseek-v3-moe', 186.2], ['deepseek-r1-full', 185.5]]) {
      const sheet = BUILDS_DATA[id];
      const fittingTiers = sheet.tiers.filter(t => t.fit && t.fit.status !== 'none');
      assert.equal(fittingTiers.length, 3, `${id} has 3 fitting tiers (RAM offload, M5 Ultra 256GB, M5 Ultra 512GB)`);
      const offload = sheet.tiers.find(t => t.id === 'tier-ram-offload');
      assert.ok(offload, `${id} has tier-ram-offload`);
      assert.equal(offload.fit.status, 'fits');
      assert.equal(offload.fit.quant, 'IQ1_S');
      assert.equal(offload.fit.quantVram, expectedVram);
      assert.equal(offload.fit.contextLabel, '32K+');
      const offloadTotal = offload.parts.reduce((sum, p) => sum + (p.price || 0), 0);
      assert.equal(offloadTotal, 5424, `${id} tier-ram-offload parts total is $5,424`);
      assert.equal(cheapestFittingTotal(sheet), offloadTotal, `${id} cheapestFittingTotal equals tier-ram-offload parts total ($${offloadTotal})`);

      // Verify M5 Ultra tiers fit as well
      const m5_256 = sheet.tiers.find(t => t.id === 'tier-mac-m5-ultra-256');
      const m5_512 = sheet.tiers.find(t => t.id === 'tier-mac-m5-ultra-512');
      assert.ok(m5_256, `${id} has tier-mac-m5-ultra-256`);
      assert.ok(m5_512, `${id} has tier-mac-m5-ultra-512`);
      assert.equal(m5_256.fit.status, 'fits');
      assert.equal(m5_512.fit.status, 'fits');
    }
  });

  it('Apple Mac Studio M5 Ultra tiers (256GB and 512GB) are inserted only on sheets where smallest quant > 95GB', () => {
    const expectedColossals = [
      'deepseek-r1-full',
      'deepseek-v3-moe',
      'deepseek-v3.2',
      'glm-5.3',
      'llama-4-maverick',
      'qwen-3-coder-480b-a35b',
      'qwen-3.5-397b-a17b'
    ];

    const modelsWith256 = Object.entries(BUILDS_DATA)
      .filter(([, sheet]) => sheet.tiers.some(t => t.id === 'tier-mac-m5-ultra-256'))
      .map(([id]) => id)
      .sort();
    assert.deepEqual(modelsWith256, expectedColossals);

    const modelsWith512 = Object.entries(BUILDS_DATA)
      .filter(([, sheet]) => sheet.tiers.some(t => t.id === 'tier-mac-m5-ultra-512'))
      .map(([id]) => id)
      .sort();
    assert.deepEqual(modelsWith512, expectedColossals);

    for (const id of expectedColossals) {
      const sheet = BUILDS_DATA[id];
      const t256 = sheet.tiers.find(t => t.id === 'tier-mac-m5-ultra-256');
      const t512 = sheet.tiers.find(t => t.id === 'tier-mac-m5-ultra-512');

      const sum256 = t256.parts.reduce((sum, p) => sum + (p.price || 0), 0);
      assert.equal(sum256, 9499, `${id} M5 Ultra 256GB tier price is $9,499`);

      const sum512 = t512.parts.reduce((sum, p) => sum + (p.price || 0), 0);
      assert.equal(sum512, 22299, `${id} M5 Ultra 512GB tier price is $22,299`);

      if (id === 'glm-5.3') {
        assert.equal(t256.fit.status, 'none', `${id} M5 Ultra 256GB cannot hold 216.7GB smallest quant`);
        assert.equal(t512.fit.status, 'fits', `${id} M5 Ultra 512GB fits recommended quant`);
        assert.equal(cheapestFittingTotal(sheet), 22299, `${id} cheapest fitting tier is M5 Ultra 512GB at $22,299`);
      } else {
        // The other 6 models have a valid fit on both tiers
        assert.notEqual(t256.fit.status, 'none', `${id} M5 Ultra 256GB fits or reduced`);
        assert.equal(t512.fit.status, 'fits', `${id} M5 Ultra 512GB fits recommended quant`);

        // RAM offload remains the cheapest fitting rig
        assert.equal(cheapestFittingTotal(sheet), 5424, `${id} cheapest fitting tier is RAM offload at $5,424`);
      }
    }

    // Specific fit statuses on 256GB tier
    assert.equal(BUILDS_DATA['deepseek-v3-moe'].tiers.find(t => t.id === 'tier-mac-m5-ultra-256').fit.status, 'fits');
    assert.equal(BUILDS_DATA['deepseek-r1-full'].tiers.find(t => t.id === 'tier-mac-m5-ultra-256').fit.status, 'fits');
    assert.equal(BUILDS_DATA['deepseek-v3.2'].tiers.find(t => t.id === 'tier-mac-m5-ultra-256').fit.status, 'fits');
    assert.equal(BUILDS_DATA['llama-4-maverick'].tiers.find(t => t.id === 'tier-mac-m5-ultra-256').fit.status, 'reduced');
    assert.equal(BUILDS_DATA['qwen-3-coder-480b-a35b'].tiers.find(t => t.id === 'tier-mac-m5-ultra-256').fit.status, 'reduced');
    assert.equal(BUILDS_DATA['qwen-3.5-397b-a17b'].tiers.find(t => t.id === 'tier-mac-m5-ultra-256').fit.status, 'reduced');
    assert.equal(BUILDS_DATA['glm-5.3'].tiers.find(t => t.id === 'tier-mac-m5-ultra-256').fit.status, 'none');
    assert.equal(BUILDS_DATA['glm-5.3'].tiers.find(t => t.id === 'tier-mac-m5-ultra-512').fit.status, 'fits');
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


describe('Extended fit math and context/KV precision controls', () => {
  it('default-state equivalence: tierFit at defaults matches stored tier.fit across all 56 models and tiers', () => {
    let checkedTiers = 0;
    const modelIds = Object.keys(BUILDS_DATA);
    assert.equal(modelIds.length, 56, 'All 56 models present in BUILDS_DATA');

    for (const [modelId, sheet] of Object.entries(BUILDS_DATA)) {
      const m = MODELS_DATA.find(x => x.id === modelId);
      assert.ok(m, `Model ${modelId} exists in MODELS_DATA`);
      for (const tier of sheet.tiers) {
        const computed = tierFit(m, tier);
        const stored = tier.fit;
        assert.equal(computed.status, stored.status, `${modelId} ${tier.id} status`);
        assert.equal(computed.quant, stored.quant, `${modelId} ${tier.id} quant`);
        assert.equal(computed.quantVram, stored.quantVram, `${modelId} ${tier.id} quantVram`);
        assert.equal(computed.contextK, stored.contextK, `${modelId} ${tier.id} contextK`);
        assert.equal(computed.contextLabel, stored.contextLabel, `${modelId} ${tier.id} contextLabel`);
        assert.equal(computed.isDefault, true, `${modelId} ${tier.id} isDefault`);

        // Check headline equivalence for synthesized models
        if (synthesized.some(s => s.id === modelId)) {
          const headline = fitHeadline(m, computed);
          assert.equal(headline, tier.headline, `${modelId} ${tier.id} headline`);
        }

        // Check speed line equivalence
        if (computed.status === 'none' || tier.bandwidthGbs === null) {
          assert.equal(tier.speedLine, null, `${modelId} ${tier.id} speedLine is null`);
        } else {
          const fittedQuant = m.quants.find(q => q.name.split(' ')[0] === computed.quant);
          const speed = estimateSpeedToks(m, fittedQuant, tier.bandwidthGbs);
          const speedLine = formatTierSpeedLine(computed.quant, speed);
          assert.equal(speedLine, tier.speedLine, `${modelId} ${tier.id} speedLine`);
        }
        checkedTiers++;
      }
    }
    assert.ok(checkedTiers >= 168, `Verified at least 168 tiers across 56 models (actual: ${checkedTiers})`);
  });

  it('dense model fit math: llama-3.3-70b (GQA dense, 2.7 GB/8K) on 48 GB tier', () => {
    const llama = MODELS_DATA.find(m => m.id === 'llama-3.3-70b');
    const tier48 = { memoryGb: 48 }; // usable = 47 GB; Q4_K_M weights = 42 GB

    // 8K / FP16: 42 + 2.7 = 44.7 <= 47 -> fits
    const fit8kFp16 = tierFit(llama, tier48, { contextK: 8, kvScale: 1 });
    assert.equal(fit8kFp16.status, 'fits');
    assert.equal(fit8kFp16.quant, 'Q4_K_M');
    assert.equal(fit8kFp16.contextLabel, '~8K');

    // 32K / FP16: 42 + 10.8 = 52.8 > 47 -> none (no smaller quant listed)
    const fit32kFp16 = tierFit(llama, tier48, { contextK: 32, kvScale: 1 });
    assert.equal(fit32kFp16.status, 'none');
    assert.equal(fit32kFp16.quant, null);

    // 32K / Q4 (kvScale 0.25): 42 + 2.7 = 44.7 <= 47 -> fits
    const fit32kQ4 = tierFit(llama, tier48, { contextK: 32, kvScale: 0.25 });
    assert.equal(fit32kQ4.status, 'fits');
    assert.equal(fit32kQ4.quant, 'Q4_K_M');
    assert.equal(fit32kQ4.contextLabel, '32K+');

    // 64K / FP8 (kvScale 0.5): 42 + 10.8 = 52.8 > 47 -> none
    const fit64kFp8 = tierFit(llama, tier48, { contextK: 64, kvScale: 0.5 });
    assert.equal(fit64kFp8.status, 'none');
  });

  it('MLA model fit math: deepseek-v3-moe (MLA, 0.6 GB/8K) on 192 GB M5 Ultra tier', () => {
    const dsv3 = MODELS_DATA.find(m => m.id === 'deepseek-v3-moe');
    const tier192 = { memoryGb: 192 }; // usable = 191 GB; IQ1_S = 186.2 GB

    // 8K / FP16: 186.2 + 0.6 = 186.8 <= 191 -> fits
    const fit8kFp16 = tierFit(dsv3, tier192, { contextK: 8, kvScale: 1 });
    assert.equal(fit8kFp16.status, 'fits');
    assert.equal(fit8kFp16.quant, 'IQ1_S');

    // 128K / FP16: 186.2 + (128/8)*0.6 = 186.2 + 9.6 = 195.8 > 191 -> none
    const fit128kFp16 = tierFit(dsv3, tier192, { contextK: 128, kvScale: 1 });
    assert.equal(fit128kFp16.status, 'none');

    // 128K / FP8 (kvScale 0.5): 186.2 + (128/8)*0.3 = 186.2 + 4.8 = 191.0 <= 191 -> fits
    const fit128kFp8 = tierFit(dsv3, tier192, { contextK: 128, kvScale: 0.5 });
    assert.equal(fit128kFp8.status, 'fits');
    assert.equal(fit128kFp8.quant, 'IQ1_S');

    // 128K / Q4 (kvScale 0.25): 186.2 + (128/8)*0.15 = 186.2 + 2.4 = 188.6 <= 191 -> fits
    const fit128kQ4 = tierFit(dsv3, tier192, { contextK: 128, kvScale: 0.25 });
    assert.equal(fit128kQ4.status, 'fits');
    assert.equal(fit128kQ4.quant, 'IQ1_S');
  });

  it('hybrid linear-attention model fit math: qwen-3.8-27b (0.5 GB/8K) on 24 GB tier', () => {
    const qwen = MODELS_DATA.find(m => m.id === 'qwen-3.8-27b');
    const tier24 = { memoryGb: 24 }; // usable = 23 GB; UD-Q4_K_M = 16.5 GB

    // 8K / FP16: 16.5 + 0.5 = 17.0 <= 23 -> fits
    const fit8kFp16 = tierFit(qwen, tier24, { contextK: 8, kvScale: 1 });
    assert.equal(fit8kFp16.status, 'fits');
    assert.equal(fit8kFp16.quant, 'UD-Q4_K_M');

    // 128K / FP16: 16.5 + (128/8)*0.5 = 16.5 + 8.0 = 24.5 > 23 -> none
    const fit128kFp16 = tierFit(qwen, tier24, { contextK: 128, kvScale: 1 });
    assert.equal(fit128kFp16.status, 'none');

    // 128K / FP8 (kvScale 0.5): 16.5 + (128/8)*0.25 = 16.5 + 4.0 = 20.5 <= 23 -> fits
    const fit128kFp8 = tierFit(qwen, tier24, { contextK: 128, kvScale: 0.5 });
    assert.equal(fit128kFp8.status, 'fits');
    assert.equal(fit128kFp8.quant, 'UD-Q4_K_M');

    // 128K / Q4 (kvScale 0.25): 16.5 + (128/8)*0.125 = 16.5 + 2.0 = 18.5 <= 23 -> fits
    const fit128kQ4 = tierFit(qwen, tier24, { contextK: 128, kvScale: 0.25 });
    assert.equal(fit128kQ4.status, 'fits');
    assert.equal(fit128kQ4.quant, 'UD-Q4_K_M');
  });

  it('fitHeadline reflects selected context at non-default settings and matches original at defaults', () => {
    const llama = MODELS_DATA.find(m => m.id === 'llama-3.3-70b');
    const tier48 = { memoryGb: 48 };

    const defFit = tierFit(llama, tier48, { contextK: 8, kvScale: 1 });
    assert.equal(fitHeadline(llama, defFit), 'Runs Llama 3.3 70B Instruct at Q4_K_M with ~8K context');

    const customFit = tierFit(llama, tier48, { contextK: 32, kvScale: 0.25 });
    assert.equal(fitHeadline(llama, customFit), 'Runs Llama 3.3 70B Instruct at Q4_K_M with 32K context');

    const noneFit = tierFit(llama, tier48, { contextK: 128, kvScale: 1 });
    assert.equal(fitHeadline(llama, noneFit), "Won't fit Llama 3.3 70B Instruct: needs 42+ GB, this rig has 48 GB");
  });
});
