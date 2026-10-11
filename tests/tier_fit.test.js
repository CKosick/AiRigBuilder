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
    // A 32B model at Q4_K_M (20 GB) fits a 24 GB card but not a 16 GB one
    const qwen32 = BUILDS_DATA['qwen-2.5-32b'].tiers;
    assert.deepEqual(qwen32.map(t => [t.memoryGb, t.fit.status]), [[24, 'fits'], [16, 'none'], [24, 'fits']]);
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

  it('only the 671B DeepSeek models have no listed rig that fits', () => {
    const noRig = Object.entries(BUILDS_DATA).filter(([, s]) => cheapestFittingTotal(s) === null).map(([id]) => id).sort();
    assert.deepEqual(noRig, ['deepseek-r1-full', 'deepseek-v3-moe']);
  });
});
