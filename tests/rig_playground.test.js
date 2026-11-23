import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { TIER_MAC_M5_ULTRA_256, TIER_MAC_M5_ULTRA_512 } from '../src/data/builds.js';
import { OWNED_GPUS_SUPPLEMENT } from '../src/data/ownedGpus.js';
import {
  ALL_PLAYGROUND_GPUS,
  CUSTOM_UNIFIED_ID,
  CUSTOM_UNIFIED_DEFAULTS,
  CUSTOM_BANDWIDTH_PRESETS,
  VISIBLE_PLAYGROUND_MODELS,
  clampCustomUnifiedConfig,
  getUnifiedTierPresets,
  isIntegratedSystem,
  gpuVendor,
  evaluatePlaygroundModels,
  computeUpgradeCandidates,
  selectUpgradePicks,
  recommendedPsuWatts,
  renderUpgradePickCard,
  renderRigPlaygroundHtml
} from '../src/components/rigPlayground.js';
import { AFFILIATE_LINK_REL } from '../src/config/affiliates.js';
import { tierFit } from '../src/utils/tierFit.js';

describe('Rig Playground: Owned GPUs Supplement Data', () => {
  it('contains exactly the 7 specified vendor-spec gaming GPUs', () => {
    assert.equal(OWNED_GPUS_SUPPLEMENT.length, 7);
    const ids = OWNED_GPUS_SUPPLEMENT.map(g => g.id);
    assert.deepEqual(ids, [
      'rtx-4070',
      'rtx-4070-ti',
      'rtx-3080-12gb',
      'rtx-3070',
      'rtx-2080-ti',
      'rx-7800-xt',
      'rx-6800-xt'
    ]);
  });

  it('contains vendor-spec VRAM, bandwidth, and TDP with no pricing fields', () => {
    for (const g of OWNED_GPUS_SUPPLEMENT) {
      assert.ok(g.vram > 0, `${g.id} has positive vram`);
      assert.ok(g.bandwidth > 0, `${g.id} has positive bandwidth`);
      assert.ok(g.tdp > 0, `${g.id} has positive tdp`);
      assert.equal(isIntegratedSystem(g.id), false);

      // Must not have tracker or pricing fields
      assert.equal(g.usedStreetPrice, undefined, `${g.id} has no usedStreetPrice`);
      assert.equal(g.usedPriceLow, undefined, `${g.id} has no usedPriceLow`);
      assert.equal(g.usedPriceHigh, undefined, `${g.id} has no usedPriceHigh`);
      assert.equal(g.pricePerGb, undefined, `${g.id} has no pricePerGb`);
      assert.equal(g.history, undefined, `${g.id} has no history`);
    }
  });

  it('combines 19 tracked GPUs and 7 supplement GPUs into 26 playground GPUs', () => {
    assert.equal(ALL_PLAYGROUND_GPUS.length, 26);
    const trackedIds = new Set(GPUS_DATA.map(g => g.id));
    const suppIds = new Set(OWNED_GPUS_SUPPLEMENT.map(g => g.id));
    for (const g of ALL_PLAYGROUND_GPUS) {
      assert.ok(trackedIds.has(g.id) || suppIds.has(g.id), `${g.id} is from tracked or supplement`);
    }
  });
});

describe('Rig Playground: Equivalence Test (Dual RTX 3090)', () => {
  it('reproduces site dual-3090 tier verdicts across all 70 models', () => {
    const rtx3090 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3090');
    assert.ok(rtx3090, 'rtx-3090 found');

    const playgroundResult = evaluatePlaygroundModels(rtx3090, 2, { contextK: 8, kvPrecision: 'FP16' });

    // Check against canonical tierFit with memoryGb: 48, bandwidthGbs: 936
    const syntheticTier = {
      id: 'dual-3090-test',
      name: 'Dual RTX 3090 (48GB)',
      memoryGb: 48,
      bandwidthGbs: 936
    };

    let checked = 0;
    for (const model of MODELS_DATA) {
      const canonical = tierFit(model, syntheticTier, { contextK: 8, kvScale: 1 });
      if (canonical.status === 'fits' || canonical.status === 'reduced') {
        const found = playgroundResult.runsInVram.find(r => r.model.id === model.id);
        assert.ok(found, `${model.id} should run in dual 3090 VRAM`);
        assert.equal(found.fit.quant, canonical.quant, `${model.id} quant matches`);
        assert.equal(found.fit.status, canonical.status, `${model.id} status matches`);
      } else {
        const found = playgroundResult.doesNotFit.find(r => r.model.id === model.id);
        assert.ok(found, `${model.id} should be in doesNotFit`);
        assert.equal(found.fit.smallestQuant, canonical.smallestQuant, `${model.id} smallestQuant matches`);
      }
      checked++;
    }
    assert.equal(checked, 70);
  });
});

describe('Rig Playground: Known Answers from Brief', () => {
  it('single RTX 3080 10GB places Llama 3.3 70B in doesNotFit with exact shortfall', () => {
    const rtx3080 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3080-10gb');
    const result = evaluatePlaygroundModels(rtx3080, 1, { contextK: 8, kvPrecision: 'FP16' });

    const llama70b = result.doesNotFit.find(r => r.model.id === 'llama-3.3-70b');
    assert.ok(llama70b, 'Llama 3.3 70B does not fit on 10GB RTX 3080');
    assert.equal(llama70b.fit.smallestQuant, 'Q4_K_M');
    assert.equal(llama70b.fit.smallestVram, 42);

    // Usable = 10 - 1 = 9 GB.
    // Llama 3.3 70B at 8K FP16 context: weights 42 GB + 2.7 GB KV = 44.7 GB.
    // Shortfall vs 9 GB usable = 35.7 GB.
    assert.equal(llama70b.needed, 44.7);
    assert.equal(llama70b.shortfall, 35.7);
  });

  it('single RTX 3060 12GB evaluates catalog fit and upgrade engine properly', () => {
    const rtx3060 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3060-12gb');
    const result = evaluatePlaygroundModels(rtx3060, 1, { contextK: 8, kvPrecision: 'FP16' });

    // 14 models run in VRAM, 56 models do not fit
    assert.equal(result.runsInVram.length, 14);
    assert.equal(result.doesNotFit.length, 56);

    const upgrades = computeUpgradeCandidates(rtx3060, 1, { contextK: 8, kvPrecision: 'FP16' });
    assert.ok(upgrades.length > 0, 'generates upgrade candidates');

    // Best upgrade for discrete cards pool is RTX PRO 6000 (45 unlocks, 5 improved)
    const topUpgrade = upgrades[0];
    assert.equal(topUpgrade.candidate.id, 'rtx-pro-6000-blackwell');
    assert.equal(topUpgrade.unlocked, 45);
    assert.equal(topUpgrade.improved, 5);

    // Tesla P40 unlocks 26 at $299
    const p40 = upgrades.find(u => u.candidate.id === 'tesla-p40');
    assert.ok(p40);
    assert.equal(p40.unlocked, 26);
    assert.equal(p40.cost, 299);

    // A second RTX 3060 unlocks 23 (14 run today, 37 total)
    const second3060 = upgrades.find(u => u.candidate.id === 'rtx-3060-12gb');
    assert.ok(second3060);
    assert.equal(second3060.unlocked, 23);
  });

  it('excludes all integrated system IDs from upgrade candidate pool for discrete owned GPUs', () => {
    const discreteIds = ['rtx-3060-12gb', 'rtx-3080-10gb', 'rtx-4090', 'rx-7800-xt'];
    for (const id of discreteIds) {
      const gpu = ALL_PLAYGROUND_GPUS.find(g => g.id === id);
      const candidates = computeUpgradeCandidates(gpu, 1, { contextK: 8, kvPrecision: 'FP16' });
      for (const u of candidates) {
        assert.equal(
          isIntegratedSystem(u.candidate.id),
          false,
          `Integrated system ${u.candidate.id} must not appear in upgrade candidates for ${id}`
        );
      }
    }

    // Verify rendered HTML for RTX 3060 has RTX PRO 6000 in callout and no system in upgrade section
    const html = renderRigPlaygroundHtml({ gpuId: 'rtx-3060-12gb', count: 1 });
    assert.ok(
      html.includes('Add 1x <a href="/gpu/rtx-pro-6000-blackwell">NVIDIA RTX PRO 6000 Blackwell'),
      'Rendered best-upgrade callout links RTX PRO 6000'
    );
    const upgradeSection = html.slice(
      html.indexOf('playground-upgrade-section'),
      html.indexOf('playground-results-grid')
    );
    for (const sysId of ['mac-studio-m2-ultra', 'mac-studio-m3-ultra', 'strix-halo-128gb', 'dgx-spark']) {
      assert.ok(
        !upgradeSection.includes(sysId),
        `Upgrade section must not mention integrated system ${sysId}`
      );
    }
  });
});

describe('Rig Playground: Integrated Systems', () => {
  it('integrated systems cannot have card count > 1 and return no upgrades', () => {
    const integratedGpus = ALL_PLAYGROUND_GPUS.filter(g => isIntegratedSystem(g.id));
    assert.equal(integratedGpus.length, 4);

    for (const sys of integratedGpus) {
      // Evaluate with requested count = 2, should clamp to 1 in actualCount
      const result = evaluatePlaygroundModels(sys, 2, { contextK: 8, kvPrecision: 'FP16' });
      assert.equal(result.config.memoryGb, sys.vram);

      const upgrades = computeUpgradeCandidates(sys, 1, { contextK: 8, kvPrecision: 'FP16' });
      assert.deepEqual(upgrades, []);
    }
  });

  it('renders integrated system architecture note and no upgrade table for integrated rigs', () => {
    const html = renderRigPlaygroundHtml({ gpuId: 'mac-studio-m2-ultra', count: 1 });
    assert.ok(html.includes('Integrated Architecture:'));
    assert.ok(html.includes('does not accept add-in PCIe GPU upgrades'));
    assert.ok(!html.includes('Upgrade Engine: Best Single-Card Additions'));
  });
});

describe('Rig Playground: Power & PSU Sizing Rules', () => {
  it('correctly calculates recommended PSU wattage: total TDP + 150W system allowance rounded up to 50W', () => {
    assert.equal(recommendedPsuWatts(170), 350); // 170 + 150 = 320 -> ceil to 350
    assert.equal(recommendedPsuWatts(200), 350); // 200 + 150 = 350 -> 350
    assert.equal(recommendedPsuWatts(250), 400); // 250 + 150 = 400 -> 400
    assert.equal(recommendedPsuWatts(350), 500); // 350 + 150 = 500 -> 500
    assert.equal(recommendedPsuWatts(450), 600); // 450 + 150 = 600 -> 600
    assert.equal(recommendedPsuWatts(700), 850); // 700 + 150 = 850 -> 850
    assert.equal(recommendedPsuWatts(355), 550); // 355 + 150 = 505 -> 550
  });
});

describe('Rig Playground: Context Length & KV Cache Precision Sensitivity', () => {
  it('changing context length and KV precision changes fitting models count', () => {
    const rtx3090 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3090');

    // At 8K FP16
    const base = evaluatePlaygroundModels(rtx3090, 1, { contextK: 8, kvPrecision: 'FP16' });
    // At 128K FP16 (much larger KV footprint)
    const longCtx = evaluatePlaygroundModels(rtx3090, 1, { contextK: 128, kvPrecision: 'FP16' });
    // At 128K Q4 (compressed KV footprint)
    const q4Ctx = evaluatePlaygroundModels(rtx3090, 1, { contextK: 128, kvPrecision: 'Q4' });

    assert.ok(longCtx.runsInVram.length < base.runsInVram.length, 'fewer models fit at 128K FP16');
    assert.ok(q4Ctx.runsInVram.length > longCtx.runsInVram.length, 'more models fit at 128K Q4 than 128K FP16');
  });
});

describe('Rig Playground: Prerendered HTML Output', () => {
  it('renders complete playground HTML with all 26 GPU options and the custom unified option', () => {
    const html = renderRigPlaygroundHtml();
    assert.ok(html.includes('class="playground-container"'));
    assert.ok(html.includes('id="playground-gpu-select"'));
    for (const g of ALL_PLAYGROUND_GPUS) {
      assert.ok(html.includes(`value="${g.id}"`), `${g.id} option present`);
    }
    assert.ok(html.includes(`value="${CUSTOM_UNIFIED_ID}">Custom unified memory (enter your own)</option>`));
    assert.ok(html.includes('Runs on your rig ('));
    assert.ok(html.includes("Doesn't fit ("));
    assert.ok(html.includes('Upgrade Engine: Best Single-Card Additions'));
  });
});

describe('Rig Playground: Custom Unified-Memory Configuration', () => {
  it('clamps custom memory (4..1024 GB) and bandwidth (10..2000 GB/s) and falls back to defaults on empty/non-numeric', () => {
    assert.deepEqual(clampCustomUnifiedConfig(96, 256), { memoryGb: 96, bandwidthGbs: 256 });
    // Below lower bounds
    assert.deepEqual(clampCustomUnifiedConfig(1, 5), { memoryGb: 4, bandwidthGbs: 10 });
    assert.deepEqual(clampCustomUnifiedConfig(0, 0), { memoryGb: 4, bandwidthGbs: 10 });
    assert.deepEqual(clampCustomUnifiedConfig(-50, -100), { memoryGb: 4, bandwidthGbs: 10 });
    // Above upper bounds
    assert.deepEqual(clampCustomUnifiedConfig(2048, 5000), { memoryGb: 1024, bandwidthGbs: 2000 });
    // Empty or non-numeric falls back to defaults (96 GB, 256 GB/s)
    assert.deepEqual(clampCustomUnifiedConfig('', ''), CUSTOM_UNIFIED_DEFAULTS);
    assert.deepEqual(clampCustomUnifiedConfig('   ', 'abc'), CUSTOM_UNIFIED_DEFAULTS);
    assert.deepEqual(clampCustomUnifiedConfig(undefined, null), CUSTOM_UNIFIED_DEFAULTS);
    assert.deepEqual(clampCustomUnifiedConfig(NaN, Infinity), CUSTOM_UNIFIED_DEFAULTS);
  });

  it('equivalence test: custom selection at 96 GB / 256 GB/s matches evaluatePlaygroundModels({ memoryGb: 96, bandwidthGbs: 256 }) and hand-checked models', () => {
    const direct = evaluatePlaygroundModels({ memoryGb: 96, bandwidthGbs: 256 }, { contextK: 8, kvPrecision: 'FP16' });

    // Hand-check at defaults (96 GB, 256 GB/s)
    assert.ok(direct.runsInVram.some(r => r.model.id === 'llama-3.3-70b'), 'llama-3.3-70b is in runs list');
    assert.ok(direct.doesNotFit.some(r => r.model.id === 'deepseek-v3-moe'), 'deepseek-v3-moe is in does-not-fit list');

    const customHtml = renderRigPlaygroundHtml({
      gpuId: CUSTOM_UNIFIED_ID,
      customMemoryGb: 96,
      customBandwidthGbs: 256,
      contextK: 8,
      kvPrecision: 'FP16',
      showAllRuns: true,
      showAllNoFit: true
    });

    // Verify inputs, preset chips, and 75% guidance note render
    assert.ok(customHtml.includes('id="playground-custom-memory"'));
    assert.ok(customHtml.includes('id="playground-custom-bandwidth"'));
    for (const preset of CUSTOM_BANDWIDTH_PRESETS) {
      assert.ok(customHtml.includes(preset.label), `bandwidth chip ${preset.label} present`);
    }
    assert.ok(customHtml.includes('75%'));
    assert.ok(customHtml.includes('128 GB system is about 96 GB usable'));

    // Verify treated as integrated system: locked count, no upgrade engine/PSU/checklist, unified note present
    assert.ok(customHtml.includes('1 (Locked Integrated System)'));
    assert.ok(!customHtml.includes('Upgrade Engine: Best Single-Card Additions'));
    assert.ok(!customHtml.includes('Recommended power supply'));
    assert.ok(!customHtml.includes('Multi-Card Upgrade Checklist'));
    assert.ok(customHtml.includes('Integrated Architecture:'));

    // Extract rendered model links in Runs on your rig and Doesn't fit sections and compare to direct evaluation
    const runsSection = customHtml.slice(
      customHtml.indexOf('Runs on your rig ('),
      customHtml.indexOf("Doesn't fit (")
    );
    const noFitSection = customHtml.slice(customHtml.indexOf("Doesn't fit ("));

    const renderedRunsIds = [...runsSection.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);
    const renderedNoFitIds = [...noFitSection.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);

    assert.deepEqual(renderedRunsIds, direct.runsInVram.map(r => r.model.id));
    assert.deepEqual(renderedNoFitIds, direct.doesNotFit.map(r => r.model.id));
    assert.ok(renderedRunsIds.includes('llama-3.3-70b'));
    assert.ok(renderedNoFitIds.includes('deepseek-v3-moe'));
  });

  it('restores normal sections (count control and upgrades) when switching from custom entry back to a catalog GPU', () => {
    const customHtml = renderRigPlaygroundHtml({ gpuId: CUSTOM_UNIFIED_ID });
    assert.ok(customHtml.includes('id="playground-custom-unified-panel"'));
    assert.ok(!customHtml.includes('Upgrade Engine: Best Single-Card Additions'));

    const discreteHtml = renderRigPlaygroundHtml({ gpuId: 'rtx-3090', count: 1 });
    assert.ok(!discreteHtml.includes('id="playground-custom-unified-panel"'));
    assert.ok(discreteHtml.includes('aria-label="GPU card count"'));
    assert.ok(discreteHtml.includes('Upgrade Engine: Best Single-Card Additions'));
    assert.ok(discreteHtml.includes('Recommended power supply'));
  });
});

describe('Rig Playground: Same-Vendor Filtering & Value Headline Picks', () => {
  it('derives vendor from GPU name prefix across GPUS_DATA and OWNED_GPUS_SUPPLEMENT and excludes unknown vendors', () => {
    for (const gpu of ALL_PLAYGROUND_GPUS.filter(g => !isIntegratedSystem(g.id))) {
      const v = gpuVendor(gpu);
      assert.ok(v === 'NVIDIA' || v === 'AMD' || v === 'Intel', `${gpu.id} (${gpu.name}) resolves to a known discrete vendor`);
    }
    assert.equal(gpuVendor({ name: 'Custom Mystery Accelerator 24GB' }), null);
    assert.equal(gpuVendor(null), null);
    assert.deepEqual(
      computeUpgradeCandidates({ id: 'unknown-gpu', name: 'Mystery Accelerator 24GB', vram: 24, bandwidth: 500, tdp: 250 }, 1),
      []
    );
  });

  it('filters RTX 3080 10GB candidates to NVIDIA only (no AMD or Intel cards)', () => {
    const rtx3080 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3080-10gb');
    const candidates = computeUpgradeCandidates(rtx3080, 1, { contextK: 8, kvPrecision: 'FP16' });

    assert.equal(candidates.length, 12);
    for (const c of candidates) {
      assert.equal(gpuVendor(c.candidate), 'NVIDIA', `${c.candidate.id} must be NVIDIA`);
      assert.notEqual(c.candidate.id, 'radeon-ai-pro-r9700');
      assert.notEqual(c.candidate.id, 'rx-7900-xtx');
      assert.notEqual(c.candidate.id, 'arc-pro-b60');
    }

    // Verify AMD owned GPUs only receive AMD candidates
    const rx7800xt = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rx-7800-xt');
    const amdCandidates = computeUpgradeCandidates(rx7800xt, 1, { contextK: 8, kvPrecision: 'FP16' });
    assert.deepEqual(amdCandidates.map(c => c.candidate.id), ['radeon-ai-pro-r9700', 'rx-7900-xtx']);
  });

  it('selects RTX PRO 6000 as Most models unlocked and Tesla P40 as Best value for an RTX 3080 10GB, and renders value figures in every row', () => {
    const rtx3080 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3080-10gb');
    const candidates = computeUpgradeCandidates(rtx3080, 1, { contextK: 8, kvPrecision: 'FP16' });
    const picks = selectUpgradePicks(candidates);

    assert.equal(picks.sameCard, false);
    assert.equal(picks.mostUnlocked.candidate.id, 'rtx-pro-6000-blackwell');
    assert.equal(picks.mostUnlocked.unlocked, 49);
    assert.equal(picks.mostUnlocked.cost, 15800);

    assert.equal(picks.bestValue.candidate.id, 'tesla-p40');
    assert.equal(picks.bestValue.unlocked, 28);
    assert.equal(picks.bestValue.cost, 299);
    assert.equal(picks.bestValue.unlocksPer1000, 93.65);

    const html = renderRigPlaygroundHtml({ gpuId: 'rtx-3080-10gb', count: 1 });
    const upgradeSection = html.slice(
      html.indexOf('playground-upgrade-section'),
      html.indexOf('playground-results-grid')
    );

    const pickCards = [...upgradeSection.matchAll(/class="playground-best-upgrade-card"[^>]*data-upgrade-pick="([^"]+)"[^>]*data-candidate-id="([^"]+)"/g)];
    assert.deepEqual(pickCards.map(m => [m[1], m[2]]), [
      ['most-unlocked', 'rtx-pro-6000-blackwell'],
      ['best-value', 'tesla-p40']
    ]);
    assert.match(upgradeSection, /Most models unlocked/);
    assert.match(upgradeSection, /Best value/);
    assert.match(upgradeSection, /\$15,800/);
    assert.match(upgradeSection, /\$299/);
    assert.match(upgradeSection, /93\.65 models unlocked \/ \$1,000/);
    assert.doesNotMatch(upgradeSection, /Radeon|Arc Pro/i);

    // Every candidate row in the full ranked table renders in unlocked-first order and includes its / $1,000 figure
    const rowIds = [...upgradeSection.matchAll(/<tr data-candidate-id="([^"]+)">/g)].map(m => m[1]);
    assert.deepEqual(rowIds, candidates.map(c => c.candidate.id));
    const valueCells = [...upgradeSection.matchAll(/<td data-label="Models \/ \$1,000">([^<]+)<\/td>/g)].map(m => m[1]);
    assert.equal(valueCells.length, candidates.length);
    assert.equal(valueCells[0], '3.10 / $1,000');
    assert.ok(valueCells.includes('93.65 / $1,000'));
  });

  it('renders a single headline card carrying both labels when one candidate wins both Most models unlocked and Best value', () => {
    for (const gpuId of ['arc-pro-b60', 'radeon-ai-pro-r9700']) {
      const gpu = ALL_PLAYGROUND_GPUS.find(g => g.id === gpuId);
      const candidates = computeUpgradeCandidates(gpu, 1, { contextK: 8, kvPrecision: 'FP16' });
      const picks = selectUpgradePicks(candidates);
      assert.equal(picks.sameCard, true, `${gpuId} has a single winner for both picks`);

      const html = renderRigPlaygroundHtml({ gpuId, count: 1 });
      const upgradeSection = html.slice(
        html.indexOf('playground-upgrade-section'),
        html.indexOf('playground-results-grid')
      );
      const pickCards = [...upgradeSection.matchAll(/class="playground-best-upgrade-card"/g)];
      assert.equal(pickCards.length, 1, `${gpuId} renders exactly one headline card`);
      assert.match(upgradeSection, /data-upgrade-pick="both"/);
      assert.match(upgradeSection, /Most models unlocked/);
      assert.match(upgradeSection, /Best value/);
    }
  });
});

describe('Rig Playground: Phone Length & Polish (Group Split, Sticky Summary, Picker Optgroups)', () => {
  it('Item 1: splits results into "Runs on your rig (N)" and "Doesn\'t fit (M)" showing first 8 models initially and expanding on Show all', () => {
    assert.equal(VISIBLE_PLAYGROUND_MODELS, 8);

    // 1. Default prerendered state (RTX 3080 10GB: 10 run, 60 don't fit)
    const rtx3080 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3080-10gb');
    const defaultEval = evaluatePlaygroundModels(rtx3080, 1, { contextK: 8, kvPrecision: 'FP16' });
    assert.equal(defaultEval.runsInVram.length, 10);
    assert.equal(defaultEval.doesNotFit.length, 60);

    const prerenderHtml = renderRigPlaygroundHtml();
    assert.ok(prerenderHtml.includes('Runs on your rig (10)'));
    assert.ok(prerenderHtml.includes("Doesn't fit (60)"));
    assert.ok(prerenderHtml.includes('id="btn-show-all-nofit"'));
    assert.ok(prerenderHtml.includes('Show all 60 models'));

    // 2. Rig where both groups exceed 8 models (RTX 3060 12GB: 14 run, 56 don't fit)
    const rtx3060 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3060-12gb');
    const direct = evaluatePlaygroundModels(rtx3060, 1, { contextK: 8, kvPrecision: 'FP16' });
    assert.equal(direct.runsInVram.length, 14);
    assert.equal(direct.doesNotFit.length, 56);

    // Initial state: headings show full counts (14 and 56), tables show first 8 each
    const initialHtml = renderRigPlaygroundHtml({ gpuId: 'rtx-3060-12gb', count: 1 });
    assert.ok(initialHtml.includes('Runs on your rig (14)'));
    assert.ok(initialHtml.includes("Doesn't fit (56)"));
    assert.ok(initialHtml.includes('id="btn-show-all-runs"'));
    assert.ok(initialHtml.includes('Show all 14 models'));
    assert.ok(initialHtml.includes('id="btn-show-all-nofit"'));
    assert.ok(initialHtml.includes('Show all 56 models'));

    const runsPart = initialHtml.slice(
      initialHtml.indexOf('id="playground-runs-tbody"'),
      initialHtml.indexOf('id="playground-nofit-tbody"')
    );
    const noFitPart = initialHtml.slice(initialHtml.indexOf('id="playground-nofit-tbody"'));
    const initialRunsIds = [...runsPart.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);
    const initialNoFitIds = [...noFitPart.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);

    assert.equal(initialRunsIds.length, 8);
    assert.equal(initialNoFitIds.length, 8);
    assert.deepEqual(initialRunsIds, direct.runsInVram.slice(0, 8).map(r => r.model.id));
    assert.deepEqual(initialNoFitIds, direct.doesNotFit.slice(0, 8).map(r => r.model.id));

    // Expanded state: all 14 and 56 models rendered in order, headings keep full counts, buttons say Show fewer models
    const expandedHtml = renderRigPlaygroundHtml({ gpuId: 'rtx-3060-12gb', count: 1, showAllRuns: true, showAllNoFit: true });
    assert.ok(expandedHtml.includes('Runs on your rig (14)'));
    assert.ok(expandedHtml.includes("Doesn't fit (56)"));
    assert.ok(expandedHtml.includes('aria-expanded="true" aria-controls="playground-runs-tbody"'));
    assert.ok(expandedHtml.includes('aria-expanded="true" aria-controls="playground-nofit-tbody"'));

    const expRunsPart = expandedHtml.slice(
      expandedHtml.indexOf('id="playground-runs-tbody"'),
      expandedHtml.indexOf('id="playground-nofit-tbody"')
    );
    const expNoFitPart = expandedHtml.slice(expandedHtml.indexOf('id="playground-nofit-tbody"'));
    const expRunsIds = [...expRunsPart.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);
    const expNoFitIds = [...expNoFitPart.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);

    assert.deepEqual(expRunsIds, direct.runsInVram.map(r => r.model.id));
    assert.deepEqual(expNoFitIds, direct.doesNotFit.map(r => r.model.id));
  });

  it('Item 2: renders sticky summary bar with owned GPU name and "X of 70 run"', () => {
    const html = renderRigPlaygroundHtml({ gpuId: 'rtx-3090', count: 1 });
    const rtx3090 = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-3090');
    const direct = evaluatePlaygroundModels(rtx3090, 1, { contextK: 8, kvPrecision: 'FP16' });

    assert.match(html, /class="playground-sticky-summary"/);
    assert.ok(html.includes(`<span class="playground-sticky-gpu">${rtx3090.name}</span>`));
    assert.ok(html.includes(`<span class="playground-sticky-count">${direct.runsInVram.length} of 70 run</span>`));
  });

  it('Item 5: groups hardware picker select into Tracked GPUs, More cards you might own, and Integrated and unified memory (with Custom unified memory last)', () => {
    const html = renderRigPlaygroundHtml();
    const selectMatch = html.match(/<select id="playground-gpu-select"[\s\S]*?<\/select>/);
    assert.ok(selectMatch, 'playground-gpu-select present');
    const selectHtml = selectMatch[0];

    const optgroups = [...selectHtml.matchAll(/<optgroup label="([^"]+)">([\s\S]*?)<\/optgroup>/g)];
    assert.deepEqual(
      optgroups.map(m => m[1]),
      ['Tracked GPUs', 'More cards you might own', 'Integrated and unified memory']
    );

    const trackedValues = [...optgroups[0][2].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
    const ownedValues = [...optgroups[1][2].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
    const integratedValues = [...optgroups[2][2].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);

    assert.deepEqual(trackedValues, GPUS_DATA.filter(g => !isIntegratedSystem(g.id)).map(g => g.id));
    assert.deepEqual(ownedValues, OWNED_GPUS_SUPPLEMENT.map(g => g.id));
    assert.deepEqual(
      integratedValues,
      [
        ...GPUS_DATA.filter(g => isIntegratedSystem(g.id)).map(g => g.id),
        TIER_MAC_M5_ULTRA_256.id,
        TIER_MAC_M5_ULTRA_512.id,
        CUSTOM_UNIFIED_ID
      ]
    );
    assert.equal(integratedValues.at(-1), CUSTOM_UNIFIED_ID, 'Custom unified memory is last in final group');
  });

  it('adds Mac Studio M5 Ultra 256GB and 512GB presets derived from builds.js tiers without adding them to GPUS_DATA', () => {
    const presets = getUnifiedTierPresets();
    assert.deepEqual(presets.map(p => p.id), [TIER_MAC_M5_ULTRA_256.id, TIER_MAC_M5_ULTRA_512.id]);
    assert.equal(presets[0].name, 'Mac Studio M5 Ultra (256GB Unified)');
    assert.equal(presets[0].vram, TIER_MAC_M5_ULTRA_256.memoryGb);
    assert.equal(presets[0].bandwidth, TIER_MAC_M5_ULTRA_256.bandwidthGbs);
    assert.equal(presets[1].name, 'Mac Studio M5 Ultra (512GB Unified)');
    assert.equal(presets[1].vram, TIER_MAC_M5_ULTRA_512.memoryGb);
    assert.equal(presets[1].bandwidth, TIER_MAC_M5_ULTRA_512.bandwidthGbs);

    for (const p of presets) {
      assert.ok(!GPUS_DATA.some(g => g.id === p.id), `${p.id} must not be added to GPUS_DATA`);
      assert.equal(isIntegratedSystem(p.id), true);
    }

    const html256 = renderRigPlaygroundHtml({ gpuId: TIER_MAC_M5_ULTRA_256.id });
    assert.ok(html256.includes('192 GB'));
    assert.ok(html256.includes('1200 GB/s'));
    assert.ok(html256.includes(`>67 / ${MODELS_DATA.length}</strong>`));
    assert.ok(html256.includes('1 (Locked Integrated System)'));
    assert.ok(!html256.includes('Upgrade Engine: Best Single-Card Additions'));

    const html512 = renderRigPlaygroundHtml({ gpuId: TIER_MAC_M5_ULTRA_512.id });
    assert.ok(html512.includes('384 GB'));
    assert.ok(html512.includes('1200 GB/s'));
    assert.ok(html512.includes(`>${MODELS_DATA.length} / ${MODELS_DATA.length}</strong>`));
    assert.ok(html512.includes(`All ${MODELS_DATA.length} models fit in this configuration!`));
    assert.ok(html512.includes('1 (Locked Integrated System)'));
    assert.ok(!html512.includes('Upgrade Engine: Best Single-Card Additions'));
  });

  it('uses live MODELS_DATA.length in intro, Catalog Fit fraction, and empty no-fit message (no stale 56)', () => {
    const defaultHtml = renderRigPlaygroundHtml();
    assert.ok(defaultHtml.includes(`our ${MODELS_DATA.length} local LLMs`));
    assert.ok(defaultHtml.includes(`>10 / ${MODELS_DATA.length}</strong>`));
    assert.ok(!defaultHtml.includes('56 local LLMs'));
    assert.ok(!defaultHtml.includes('/ 56</strong>'));

    const allFitHtml = renderRigPlaygroundHtml({
      gpuId: CUSTOM_UNIFIED_ID,
      customMemoryGb: 1024,
      customBandwidthGbs: 1200
    });
    assert.ok(allFitHtml.includes(`>${MODELS_DATA.length} / ${MODELS_DATA.length}</strong>`));
    assert.ok(allFitHtml.includes(`All ${MODELS_DATA.length} models fit in this configuration!`));
  });

  it('links upgrade GPU names to /gpu/:id and renders tracked eBay Sold and Buy on Amazon actions in pick cards and ranked table, omitting links when no GPU page exists', () => {
    const html = renderRigPlaygroundHtml({ gpuId: 'rtx-3080-10gb', count: 1 });
    const upgradeSection = html.slice(
      html.indexOf('playground-upgrade-section'),
      html.indexOf('playground-results-grid')
    );

    // Pick cards for rtx-pro-6000-blackwell (Most models unlocked) and tesla-p40 (Best value)
    for (const id of ['rtx-pro-6000-blackwell', 'tesla-p40']) {
      const gpu = GPUS_DATA.find(g => g.id === id);
      assert.ok(upgradeSection.includes(`<a href="/gpu/${id}">${gpu.name}</a>`), `Link to /gpu/${id}`);
      assert.ok(upgradeSection.includes(`rel="${AFFILIATE_LINK_REL}" class="btn-primary" data-click-merchant="eBay Sold" data-click-id="gpu:${id}:ebay-sold" data-gpu-id="${id}" data-link-kind="ebay-sold"`), `Pick card eBay Sold click attrs for ${id}`);
      assert.ok(upgradeSection.includes(`rel="${AFFILIATE_LINK_REL}" class="btn-secondary" data-click-merchant="Amazon" data-click-id="gpu:${id}:amazon" data-gpu-id="${id}" data-link-kind="amazon"`), `Pick card Amazon click attrs for ${id}`);
    }

    // Ranked upgrade table has Check Prices column and links for every tracked candidate
    const tablePart = upgradeSection.slice(upgradeSection.indexOf('<table'));
    assert.ok(tablePart.includes('<th scope="col">Check Prices</th>'));
    for (const gpu of GPUS_DATA.filter(g => !isIntegratedSystem(g.id) && gpuVendor(g) === 'NVIDIA')) {
      assert.ok(tablePart.includes(`<a href="/gpu/${gpu.id}">${gpu.name}</a>`), `Table links ${gpu.id}`);
      assert.ok(tablePart.includes(`data-click-id="gpu:${gpu.id}:ebay-sold"`), `Table eBay Sold link for ${gpu.id}`);
      assert.ok(tablePart.includes(`data-click-id="gpu:${gpu.id}:amazon"`), `Table Amazon link for ${gpu.id}`);
    }
    assert.ok(tablePart.includes('data-label="Check Prices"'));

    // Candidate with no /gpu/:id page gets no detail link and no eBay/Amazon actions
    const noPageCandidate = ALL_PLAYGROUND_GPUS.find(g => g.id === 'rtx-4070');
    const noPageCard = renderUpgradePickCard({
      candidate: noPageCandidate,
      unlocked: 5,
      improved: 2,
      cost: 1000,
      newMemory: 34,
      newBandwidth: 760,
      unlocksPerDollar: 0.005,
      totalTdp: 770
    }, '<span class="tier-badge-label">Most models unlocked</span>', 'most-unlocked');
    assert.ok(noPageCard.includes(`Add 1x ${noPageCandidate.name}</h3>`));
    assert.ok(!noPageCard.includes('/gpu/'));
    assert.ok(!noPageCard.includes('data-click-id'));
  });
});
