import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { OWNED_GPUS_SUPPLEMENT } from '../src/data/ownedGpus.js';
import {
  ALL_PLAYGROUND_GPUS,
  isIntegratedSystem,
  evaluatePlaygroundModels,
  computeUpgradeCandidates,
  recommendedPsuWatts,
  renderRigPlaygroundHtml
} from '../src/components/rigPlayground.js';
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
  it('reproduces site dual-3090 tier verdicts across all 56 models', () => {
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
    assert.equal(checked, 56);
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

    // 12 models run in VRAM, 44 models do not fit
    assert.equal(result.runsInVram.length, 12);
    assert.equal(result.doesNotFit.length, 44);

    const upgrades = computeUpgradeCandidates(rtx3060, 1, { contextK: 8, kvPrecision: 'FP16' });
    assert.ok(upgrades.length > 0, 'generates upgrade candidates');

    // Top upgrade by models unlocked is tied between strix-halo-128gb, dgx-spark, m3 ultra, and rtx-pro-6000
    // Tie-break: highest unlocksPerDollar, then lowest price.
    // strix-halo-128gb has 37 unlocks at $3,100 (0.01193 unlocks/$), beating dgx-spark ($6,900) and m3 ultra ($4,575) and pro 6000 ($15,750).
    const topUpgrade = upgrades[0];
    assert.equal(topUpgrade.candidate.id, 'strix-halo-128gb');
    assert.equal(topUpgrade.unlocked, 37);
    assert.equal(topUpgrade.improved, 5);

    // Check PCIe discrete add-in card rankings
    const discreteUpgrades = upgrades.filter(u => !isIntegratedSystem(u.candidate.id));
    assert.ok(discreteUpgrades.length > 0);
    // Highest unlocks on PCIe discrete is RTX PRO 6000 (37 unlocks)
    const pro6000 = discreteUpgrades.find(u => u.candidate.id === 'rtx-pro-6000-blackwell');
    assert.ok(pro6000);
    assert.equal(pro6000.unlocked, 37);

    // Best budget/value discrete add-in card is Tesla P40 ($290, 24 unlocks)
    const p40 = discreteUpgrades.find(u => u.candidate.id === 'tesla-p40');
    assert.ok(p40);
    assert.equal(p40.unlocked, 24);
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
  it('renders complete playground HTML with all 26 GPU options', () => {
    const html = renderRigPlaygroundHtml();
    assert.ok(html.includes('class="playground-container"'));
    assert.ok(html.includes('id="playground-gpu-select"'));
    for (const g of ALL_PLAYGROUND_GPUS) {
      assert.ok(html.includes(`value="${g.id}"`), `${g.id} option present`);
    }
    assert.ok(html.includes('Runs in VRAM'));
    assert.ok(html.includes('Does Not Fit'));
    assert.ok(html.includes('Upgrade Engine: Best Single-Card Additions'));
  });
});
