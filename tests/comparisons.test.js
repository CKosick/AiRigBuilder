import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COMPARISON_PAIRS, BEST_GPU_MODELS, comparePath, bestGpuPath, getComparisonsForGpu, isBestGpuModel } from '../src/data/comparisons.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { INTEGRATED_SYSTEM_IDS } from '../src/components/rigPlayground.js';
import { parseRoute, tabViewFor, buildPath, gpuPath } from '../src/routes.js';
import { renderGpuComparisonHtml } from '../src/components/gpuComparison.js';
import { renderBestGpuHtml } from '../src/components/bestGpu.js';
import { renderGpuDetailHtml } from '../src/components/gpuDetail.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';
import { tierFit } from '../src/utils/tierFit.js';

describe('Curated Comparisons & Best-GPU Data Integrity', () => {
  it('defines exactly 10 discrete GPU comparison pairs', () => {
    assert.equal(COMPARISON_PAIRS.length, 10);
    const seen = new Set();
    for (const [a, b] of COMPARISON_PAIRS) {
      assert.notEqual(a, b, 'cannot compare GPU to itself');
      const gpuA = GPUS_DATA.find(g => g.id === a);
      const gpuB = GPUS_DATA.find(g => g.id === b);
      assert.ok(gpuA, `GPU ${a} must exist in GPUS_DATA`);
      assert.ok(gpuB, `GPU ${b} must exist in GPUS_DATA`);
      assert.ok(!INTEGRATED_SYSTEM_IDS.includes(a), `${a} must be a discrete GPU`);
      assert.ok(!INTEGRATED_SYSTEM_IDS.includes(b), `${b} must be a discrete GPU`);

      const key = `${a}:${b}`;
      const reversedKey = `${b}:${a}`;
      assert.ok(!seen.has(key), `duplicate pair ${key}`);
      assert.ok(!seen.has(reversedKey), `reversed pair ${reversedKey} must not exist`);
      seen.add(key);
    }
  });

  it('defines exactly 8 models for best-GPU pages', () => {
    assert.equal(BEST_GPU_MODELS.length, 8);
    const seen = new Set();
    for (const id of BEST_GPU_MODELS) {
      assert.ok(MODELS_DATA.some(m => m.id === id), `model ${id} must exist in MODELS_DATA`);
      assert.ok(!seen.has(id), `duplicate model ${id}`);
      seen.add(id);
    }
  });
});

describe('Router & Path Resolution', () => {
  it('parses compare routes and rejects reversed pairs or invalid GPUs', () => {
    for (const [a, b] of COMPARISON_PAIRS) {
      const p = comparePath(a, b);
      assert.equal(p, `/compare/${a}-vs-${b}`);
      const route = parseRoute(p);
      assert.ok(route, `parseRoute should resolve ${p}`);
      assert.equal(route.view, 'compare');
      assert.equal(route.gpuIdA, a);
      assert.equal(route.gpuIdB, b);
      assert.equal(tabViewFor(route), 'tracker');

      // Reversed URL must not exist
      const reversed = `/compare/${b}-vs-${a}`;
      assert.equal(parseRoute(reversed), null, `reversed path ${reversed} must return null`);
    }

    assert.equal(parseRoute('/compare/unknown-vs-rtx-3090'), null);
    assert.equal(parseRoute('/compare/rtx-3090-vs-unknown'), null);
  });

  it('parses best-gpu routes and rejects uncurated models', () => {
    for (const id of BEST_GPU_MODELS) {
      const p = bestGpuPath(id);
      assert.equal(p, `/best-gpu/${id}`);
      const route = parseRoute(p);
      assert.ok(route, `parseRoute should resolve ${p}`);
      assert.equal(route.view, 'best-gpu');
      assert.equal(route.modelId, id);
      assert.equal(tabViewFor(route), 'builds');
    }

    assert.equal(parseRoute('/best-gpu/llama-3.1-8b'), null, 'uncurated model returns null');
    assert.equal(parseRoute('/best-gpu/unknown-model'), null);
  });
});

describe('Computed Spot Check 1: RTX 3090 vs RTX 5090', () => {
  it('matches expected model fit counts and single-card difference', () => {
    const gpu3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
    const gpu5090 = GPUS_DATA.find(g => g.id === 'rtx-5090');

    let single3090 = 0;
    let single5090 = 0;
    let dual3090 = 0;
    let dual5090 = 0;
    const diffModels = [];

    for (const model of MODELS_DATA) {
      const fit3090 = tierFit(model, { memoryGb: gpu3090.vram }, { contextK: 8, kvScale: 1 });
      const fit5090 = tierFit(model, { memoryGb: gpu5090.vram }, { contextK: 8, kvScale: 1 });
      const fitDual3090 = tierFit(model, { memoryGb: gpu3090.vram * 2 }, { contextK: 8, kvScale: 1 });
      const fitDual5090 = tierFit(model, { memoryGb: gpu5090.vram * 2 }, { contextK: 8, kvScale: 1 });

      const runs3090 = fit3090.status !== 'none';
      const runs5090 = fit5090.status !== 'none';
      if (runs3090) single3090++;
      if (runs5090) single5090++;
      if (fitDual3090.status !== 'none') dual3090++;
      if (fitDual5090.status !== 'none') dual5090++;

      if (runs3090 !== runs5090) diffModels.push(model.id);
    }

    assert.equal(single3090, 34);
    assert.equal(single5090, 35);
    assert.equal(dual3090, 41);
    assert.equal(dual5090, 43);
    assert.deepEqual(diffModels, ['mixtral-8x7b']);

    const html = renderGpuComparisonHtml('rtx-3090', 'rtx-5090');
    assert.ok(html.includes('34 of 56'));
    assert.ok(html.includes('35 of 56'));
    assert.ok(html.includes('41 of 56'));
    assert.ok(html.includes('43 of 56'));
    assert.ok(html.includes('1 of 56 catalog models run on only one of these two cards'));
  });
});

describe('Computed Spot Check 2: Best GPU for Llama 3.3 70B', () => {
  it('computes correct labeled picks and integrated systems note', () => {
    const html = renderBestGpuHtml('llama-3.3-70b');

    // Cheapest: 2x Tesla P40 ($598)
    assert.ok(html.includes('Cheapest That Runs It'));
    assert.ok(html.includes('2x NVIDIA Tesla P40 24GB'));
    assert.ok(html.includes('$598'));

    // Best Value Full Fit: 2x Tesla P40 ($598)
    assert.ok(html.includes('Best Value Full Fit'));

    // Fastest: 2x RTX 5090 ($13,000)
    assert.ok(html.includes('Fastest Discrete Rig'));
    assert.ok(html.includes('2x NVIDIA GeForce RTX 5090'));
    assert.ok(html.includes('$13,000'));

    // Integrated systems note
    assert.ok(html.includes('Integrated Unified-Memory Systems'));
    assert.ok(html.includes('Apple Mac Studio M2 Ultra'));
    assert.ok(html.includes('Apple Mac Studio M3 Ultra'));
    assert.ok(html.includes('AMD Ryzen AI Max+ 395 Mini PC'));
    assert.ok(html.includes('NVIDIA DGX Spark'));

    // Link back to build sheet
    assert.ok(html.includes('href="/"'));
  });
});

describe('Internal Links', () => {
  it('links to comparison pages on GPU detail pages', () => {
    const gpu3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
    const html3090 = renderGpuDetailHtml(gpu3090);
    assert.ok(html3090.includes('Head-to-Head Comparisons'));
    const pairs3090 = getComparisonsForGpu('rtx-3090');
    assert.ok(pairs3090.length >= 5);
    for (const [a, b] of pairs3090) {
      assert.ok(html3090.includes(comparePath(a, b)), `must link to ${comparePath(a, b)}`);
    }

    // A GPU with no comparisons does not render empty section
    const arc = GPUS_DATA.find(g => g.id === 'arc-pro-b60');
    const htmlArc = renderGpuDetailHtml(arc);
    assert.ok(!htmlArc.includes('Head-to-Head Comparisons'));
  });

  it('links to best-gpu page from build sheets in BEST_GPU_MODELS', () => {
    for (const modelId of BEST_GPU_MODELS) {
      const html = renderModelPickerHtml({ activeModelId: modelId });
      assert.ok(html.includes(bestGpuPath(modelId)), `build sheet ${modelId} must link to ${bestGpuPath(modelId)}`);
    }

    // A model not in BEST_GPU_MODELS does not link to best-gpu
    const otherHtml = renderModelPickerHtml({ activeModelId: 'llama-3.1-8b' });
    assert.ok(!otherHtml.includes('/best-gpu/llama-3.1-8b'));
  });
});
