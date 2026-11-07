import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_INDEX_PRESETS, filterBuildsIndexModels, renderBuildsIndexHtml } from '../src/components/buildsIndex.js';
import { filterModels } from '../src/components/modelPicker.js';

const EXPECTED_CODING = [
  'qwen-2.5-coder-32b',
  'codestral-22b',
  'starcoder2-15b',
  'qwen-3-coder-480b-a35b',
  'north-mini-code-1.0',
  'granite-4.2-30b'
];

const EXPECTED_REASONING = [
  'deepseek-r1-70b',
  'deepseek-r1-distill-32b',
  'deepseek-r1-distill-14b',
  'deepseek-r1-distill-8b',
  'deepseek-r1-full',
  'gpt-oss-20b',
  'gpt-oss-120b',
  'deepseek-v3.2'
];

const EXPECTED_VISION = [
  'llama-3.2-11b-vision',
  'llama-4-scout',
  'llama-4-maverick',
  'gemma-3-27b',
  'gemma-4-31b',
  'gemma-4-26b-moe',
  'qwen-3.5-27b',
  'qwen-3.6-35b-a3b',
  'qwen-3.5-397b-a17b',
  'qwen-3.5-122b-a10b',
  'qwen-3.8-27b',
  'muse-glimmer-30b',
  'glm-5.3-flash'
];

describe('Model useCases data and /builds preset filters', () => {
  it('pins the exact model ID sets per useCases tag and leaves untagged models without useCases', () => {
    const codingIds = MODELS_DATA.filter(m => m.useCases?.includes('coding')).map(m => m.id);
    const reasoningIds = MODELS_DATA.filter(m => m.useCases?.includes('reasoning')).map(m => m.id);
    const visionIds = MODELS_DATA.filter(m => m.useCases?.includes('vision')).map(m => m.id);

    assert.deepEqual(new Set(codingIds), new Set(EXPECTED_CODING));
    assert.equal(codingIds.length, EXPECTED_CODING.length);
    assert.deepEqual(new Set(reasoningIds), new Set(EXPECTED_REASONING));
    assert.equal(reasoningIds.length, EXPECTED_REASONING.length);
    assert.deepEqual(new Set(visionIds), new Set(EXPECTED_VISION));
    assert.equal(visionIds.length, EXPECTED_VISION.length);

    const allTaggedSet = new Set([...EXPECTED_CODING, ...EXPECTED_REASONING, ...EXPECTED_VISION]);
    assert.equal(allTaggedSet.size, 27);

    for (const m of MODELS_DATA) {
      if (allTaggedSet.has(m.id)) {
        assert.ok(Array.isArray(m.useCases) && m.useCases.length === 1, `${m.id} has single useCases tag`);
      } else {
        assert.equal('useCases' in m, false, `${m.id} must have no useCases field`);
      }
    }
  });

  it('reproduces exact preset filter counts and AND combinations', () => {
    assert.equal(filterBuildsIndexModels([]).length, 56);
    assert.equal(filterBuildsIndexModels(['vram-16']).length, 16);
    assert.equal(filterBuildsIndexModels(['vram-24']).length, 33);
    assert.equal(filterBuildsIndexModels(['under-1500']).length, 34);
    assert.equal(filterBuildsIndexModels(['moe']).length, 23);
    assert.equal(filterBuildsIndexModels(['coding']).length, 6);
    assert.equal(filterBuildsIndexModels(['reasoning']).length, 8);
    assert.equal(filterBuildsIndexModels(['vision']).length, 13);

    // AND combinations
    const vram24AndCoding = filterBuildsIndexModels(['vram-24', 'coding']);
    assert.ok(vram24AndCoding.length > 0 && vram24AndCoding.length < 6);
    assert.ok(vram24AndCoding.every(m => m.recommendedVram <= 24 && m.useCases?.includes('coding')));

    const moeAndVision = filterBuildsIndexModels(['moe', 'vision']);
    assert.ok(moeAndVision.length > 0 && moeAndVision.length < 13);
    assert.ok(moeAndVision.every(m => m.activeParamsB < m.totalParamsB && m.useCases?.includes('vision')));

    const disjoint = filterBuildsIndexModels(['coding', 'vision']);
    assert.equal(disjoint.length, 0);
  });

  it('prerendered /builds HTML contains all 56 model rows and the preset chip row', () => {
    const html = renderBuildsIndexHtml();
    const rowIds = [...html.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);
    assert.equal(rowIds.length, 56);
    assert.equal(new Set(rowIds).size, 56);

    assert.match(html, /data-preset="all" aria-pressed="true">\s*All models\s*<\/button>/);
    for (const preset of BUILDS_INDEX_PRESETS) {
      assert.ok(
        html.includes(`data-preset="${preset.id}" aria-pressed="false">${preset.label}</button>`),
        `chip present for ${preset.id}`
      );
    }
    assert.ok(html.includes('56 of 56 models'));
    assert.match(html, /id="btn-reset-builds-filter"[^>]*hidden/);
  });

  it('home chooser "Coding & vision" toggle matches 19 models from useCases', () => {
    const matched = filterModels({ codingOnly: true });
    assert.equal(matched.length, 19);
    const expectedIds = new Set([...EXPECTED_CODING, ...EXPECTED_VISION]);
    assert.deepEqual(new Set(matched.map(m => m.id)), expectedIds);
  });
});

