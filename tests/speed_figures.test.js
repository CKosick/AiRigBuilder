import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUILDS_DATA } from '../src/data/builds.js';
import { MODELS_DATA } from '../src/data/models.js';
import {
  DUAL_3090_BANDWIDTH_GBS,
  DUAL_3090_VRAM_GB,
  estimateSpeedToks,
  formatSpeedRange,
  formatTierSpeedLine
} from '../src/utils/speedEstimate.js';
import { headlineSpeedLabel, renderModelPickerHtml } from '../src/components/modelPicker.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Speed figures are stored once', () => {
  it("every build sheet's speed is its model's typicalSpeedDual3090", () => {
    for (const m of MODELS_DATA) {
      const sheet = BUILDS_DATA[m.id];
      if (sheet) assert.equal(sheet.speedTarget, m.typicalSpeedDual3090, m.id);
    }
  });

  it('builds.js has no hand-typed speed of its own', () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, 'src', 'data', 'builds.js'), 'utf-8');
    assert.deepEqual(src.match(/speedTarget:\s*['"`]/g) || [], [], 'speedTarget must come from the model data');
  });

  it('keeps the figures chosen for the three models that used to disagree', () => {
    const speed = (id) => MODELS_DATA.find(m => m.id === id).typicalSpeedDual3090;
    assert.match(speed('llama-3.3-70b'), /^17 - 21 tokens\/sec/);
    assert.match(speed('mistral-nemo-12b'), /^50 - 85 tokens\/sec/);
    assert.match(speed('llama-3.1-8b'), /^90 - 130 tokens\/sec/);
  });

  it('distinguishes engine-typical headline figures from bandwidth-bound quant estimates on build sheets', () => {
    assert.equal(headlineSpeedLabel('17 - 21 tokens/sec (exllamav2 / llama.cpp)'), 'Typical Engine Results (Dual 3090):');
    assert.equal(
      headlineSpeedLabel('112 - 168 tokens/sec (bandwidth-bound estimate: 936 GB/s over 2.1 GB of active weights at MXFP4; real speeds often lower, especially for MoE)'),
      'Estimated Speed (Dual 3090):'
    );
    assert.equal(headlineSpeedLabel('Exceeds dual 3090 memory (needs 220 GB+ at UD-IQ1_S)'), 'Typical Speed on Dual 3090:');

    const llamaHtml = renderModelPickerHtml({ activeModelId: 'llama-3.3-70b' });
    assert.ok(llamaHtml.includes('Typical Engine Results (Dual 3090): <strong>17 - 21 tokens/sec (exllamav2 / llama.cpp)</strong>'));
    assert.ok(llamaHtml.includes('<th scope="col">Bandwidth-Bound Speed Estimate</th>'));
    assert.ok(llamaHtml.includes('<td data-label="Bandwidth-bound estimate">~11-17 tok/s on 2x 3090 (bandwidth-bound est.)</td>'));
    assert.ok(llamaHtml.includes('~20 tokens/sec (typical engine results)'));
    assert.ok(llamaHtml.includes('id="spec-badge-min-vram"') || llamaHtml.includes('>42 GB</div>'));

    const gptOssHtml = renderModelPickerHtml({ activeModelId: 'gpt-oss-20b' });
    assert.ok(gptOssHtml.includes('Estimated Speed (Dual 3090): <strong>112 - 168 tokens/sec'));
  });
});

describe('Method-based speed estimation (speedEstimate.js)', () => {
  it('reproduces the MoE validation anchor: Qwen3-30B-A3B Q4_K_M at 936 GB/s = 116-174 tok/s', () => {
    // Working:
    //   totalParamsB = 30.5, activeParamsB = 3.3 (MoE: activeParamsB < totalParamsB -> moeFactor = 0.5)
    //   quant.vram (Q4_K_M) = 18.6 GB
    //   bytesPerToken = 3.3 * (18.6 / 30.5) = 2.0124590163934427 GB/token
    //   low  = Math.round((0.50 * 936 / 2.0124590163934427) * 0.5) = Math.round(116.27568) = 116
    //   high = Math.round((0.75 * 936 / 2.0124590163934427) * 0.5) = Math.round(174.41352) = 174
    const model = MODELS_DATA.find(m => m.id === 'qwen-3-30b-a3b');
    const quant = model.quants.find(q => q.name.startsWith('Q4_K_M'));
    const est = estimateSpeedToks(model, quant, DUAL_3090_BANDWIDTH_GBS);
    assert.deepEqual(est, { low: 116, high: 174 });
    assert.equal(
      formatSpeedRange(est),
      '~116-174 tok/s on 2x 3090 (bandwidth-bound est.)'
    );
  });

  it('reproduces the dense batch-1 anchor: Gemma 4 31B Q4_K_M at 936 GB/s = 24-36 tok/s', () => {
    // Working:
    //   totalParamsB = 30.7, activeParamsB = 30.7 (dense: activeParamsB === totalParamsB -> moeFactor = 1)
    //   quant.vram (Q4_K_M) = 19.6 GB
    //   bytesPerToken = 30.7 * (19.6 / 30.7) = 19.6 GB/token
    //   low  = Math.round(0.50 * 936 / 19.6) = Math.round(468 / 19.6) = Math.round(23.87755) = 24
    //   high = Math.round(0.75 * 936 / 19.6) = Math.round(702 / 19.6) = Math.round(35.81632) = 36
    const model = MODELS_DATA.find(m => m.id === 'gemma-4-31b');
    const quant = model.quants.find(q => q.name.startsWith('Q4_K_M'));
    const est = estimateSpeedToks(model, quant, DUAL_3090_BANDWIDTH_GBS);
    assert.deepEqual(est, { low: 24, high: 36 });
    assert.equal(
      formatSpeedRange(est),
      '~24-36 tok/s on 2x 3090 (bandwidth-bound est.)'
    );
  });

  it('omits the 2x 3090 claim and flags rows whose quant weights exceed 48 GB', () => {
    const fitStr = formatSpeedRange({ low: 11, high: 17 }, { weightGb: 48 });
    assert.equal(fitStr, '~11-17 tok/s on 2x 3090 (bandwidth-bound est.)');

    const overStr = formatSpeedRange({ low: 8, high: 12 }, { weightGb: 58 });
    assert.equal(overStr, '~8-12 tok/s at 936 GB/s (bandwidth-bound est.; does not fit dual 3090)');
    assert.ok(!/on 2x 3090/i.test(overStr));
  });

  it('returns null when inputs are missing or bandwidthGbs is null/non-positive', () => {
    const model = MODELS_DATA.find(m => m.id === 'qwen-3-30b-a3b');
    const quant = model.quants[0];
    assert.equal(estimateSpeedToks(model, quant, null), null);
    assert.equal(estimateSpeedToks(model, quant, 0), null);
    assert.equal(estimateSpeedToks(model, quant, -100), null);
    assert.equal(estimateSpeedToks(null, quant, 936), null);
    assert.equal(estimateSpeedToks(model, null, 936), null);
    assert.equal(estimateSpeedToks({ totalParamsB: 10 }, quant, 936), null);
    assert.equal(formatSpeedRange(null), null);
    assert.equal(formatTierSpeedLine('Q4_K_M', null), null);
  });

  it('every model defines valid totalParamsB and activeParamsB', () => {
    for (const m of MODELS_DATA) {
      assert.equal(typeof m.totalParamsB, 'number', `${m.id} totalParamsB is number`);
      assert.equal(typeof m.activeParamsB, 'number', `${m.id} activeParamsB is number`);
      assert.ok(m.totalParamsB > 0, `${m.id} totalParamsB > 0`);
      assert.ok(m.activeParamsB > 0 && m.activeParamsB <= m.totalParamsB, `${m.id} activeParamsB in (0, totalParamsB]`);
    }
  });

  it('consistency: every model and quant stored speed string equals the util output on the 936 GB/s basis and never claims 2x 3090 above 48 GB', () => {
    for (const m of MODELS_DATA) {
      for (const q of m.quants) {
        const est = estimateSpeedToks(m, q, DUAL_3090_BANDWIDTH_GBS);
        assert.ok(est && est.low > 0 && est.high >= est.low, `${m.id} ${q.name} produces valid speed estimate`);
        const expected = formatSpeedRange(est, { weightGb: q.vram });
        assert.equal(q.speed, expected, `${m.id} ${q.name} stored speed must equal util output`);
        assert.ok(!q.speed.includes('Needs more than 48 GB'), `${m.id} ${q.name} must not contain sentinel text`);
        if (q.vram > DUAL_3090_VRAM_GB) {
          assert.ok(!/on 2x 3090/i.test(q.speed), `${m.id} ${q.name} (${q.vram} GB) must not claim dual 3090`);
          assert.ok(q.speed.includes('does not fit dual 3090'), `${m.id} ${q.name} (${q.vram} GB) must note it does not fit dual 3090`);
        } else {
          assert.ok(q.speed.includes('on 2x 3090'), `${m.id} ${q.name} (${q.vram} GB) fits dual 3090`);
        }
      }
    }
  });

  it('integrity: every tier in every sheet has bandwidthGbs set and every fitted non-offload tier has a computed speed estimate', () => {
    for (const [modelId, sheet] of Object.entries(BUILDS_DATA)) {
      const model = MODELS_DATA.find(m => m.id === modelId);
      assert.ok(model, `model ${modelId} exists`);
      const html = renderModelPickerHtml({ activeModelId: modelId });
      assert.ok(
        html.includes('bandwidth-bound estimates') && html.includes('not benchmarks'),
        `${modelId} build sheet includes the plain-words speed method note`
      );

      for (const tier of sheet.tiers) {
        assert.ok('bandwidthGbs' in tier, `${modelId} ${tier.id} has bandwidthGbs property`);
        if (tier.id === 'tier-ram-offload') {
          assert.equal(tier.bandwidthGbs, null, `${modelId} ${tier.id} bandwidthGbs must be null`);
          assert.equal(tier.speed, null, `${modelId} ${tier.id} must have no computed speed`);
          assert.equal(tier.speedLine, null, `${modelId} ${tier.id} must have no speedLine`);
        } else {
          assert.equal(typeof tier.bandwidthGbs, 'number', `${modelId} ${tier.id} bandwidthGbs must be a number`);
          assert.ok(tier.bandwidthGbs > 0, `${modelId} ${tier.id} bandwidthGbs must be positive`);

          if (tier.fit.status === 'none') {
            assert.equal(tier.speed, null, `${modelId} ${tier.id} (non-fitting) must have speed = null`);
            assert.equal(tier.speedLine, null, `${modelId} ${tier.id} (non-fitting) must have speedLine = null`);
          } else {
            const fittedQuant = model.quants.find(q => q.name.split(' ')[0] === tier.fit.quant);
            const expectedSpeed = estimateSpeedToks(model, fittedQuant, tier.bandwidthGbs);
            const expectedLine = `Estimated speed at ${tier.fit.quant}: ~${expectedSpeed.low}-${expectedSpeed.high} tok/s (bandwidth-bound estimate)`;
            assert.deepEqual(tier.speed, expectedSpeed, `${modelId} ${tier.id} computed speed matches util`);
            assert.equal(tier.speedLine, expectedLine, `${modelId} ${tier.id} speedLine format`);
            assert.ok(html.includes(expectedLine), `${modelId} ${tier.id} renders speedLine on build sheet`);
          }
        }
      }
    }
  });
});
