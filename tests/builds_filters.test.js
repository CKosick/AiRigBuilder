import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_INDEX_PRESETS, filterBuildsIndexModels, renderBuildsIndexHtml, createBuildsIndex } from '../src/components/buildsIndex.js';
import { filterModels } from '../src/components/modelPicker.js';

const EXPECTED_CODING = [
  'qwen-2.5-coder-32b',
  'codestral-22b',
  'starcoder2-15b',
  'qwen-3-coder-480b-a35b',
  'north-mini-code-1.0',
  'granite-4.2-30b',
  'minimax-m3',
  'kimi-k2.7-code',
  'beam-1.0-501b-a23b',
  'laguna-s-2.1'
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
  'glm-5.3-flash',
  'mistral-large-4-1t-a52b',
  'muse-spark-open-816b-a42b',
  'inkling-small',
  'nemotron-3.5-bolt-e4b',
  'nemotron-3.5-bolt-74b-a9b',
  'nemotron-3.5-super-vl-120b-a12b',
  'command-a-plus'
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
    assert.equal(allTaggedSet.size, 38);

    for (const m of MODELS_DATA) {
      if (allTaggedSet.has(m.id)) {
        assert.ok(Array.isArray(m.useCases) && m.useCases.length === 1, `${m.id} has single useCases tag`);
      } else {
        assert.equal('useCases' in m, false, `${m.id} must have no useCases field`);
      }
    }
  });

  it('reproduces exact preset filter counts and AND combinations', () => {
    assert.equal(filterBuildsIndexModels([]).length, 70);
    assert.equal(filterBuildsIndexModels(['vram-16']).length, 18);
    assert.equal(filterBuildsIndexModels(['vram-24']).length, 35);
    assert.equal(filterBuildsIndexModels(['under-1500']).length, 36);
    assert.equal(filterBuildsIndexModels(['moe']).length, 35);
    assert.equal(filterBuildsIndexModels(['coding']).length, 10);
    assert.equal(filterBuildsIndexModels(['reasoning']).length, 8);
    assert.equal(filterBuildsIndexModels(['vision']).length, 20);

    // AND combinations
    const vram24AndCoding = filterBuildsIndexModels(['vram-24', 'coding']);
    assert.ok(vram24AndCoding.length > 0 && vram24AndCoding.length < 10);
    assert.ok(vram24AndCoding.every(m => m.recommendedVram <= 24 && m.useCases?.includes('coding')));

    const moeAndVision = filterBuildsIndexModels(['moe', 'vision']);
    assert.ok(moeAndVision.length > 0 && moeAndVision.length < 20);
    assert.ok(moeAndVision.every(m => m.activeParamsB < m.totalParamsB && m.useCases?.includes('vision')));

    const disjoint = filterBuildsIndexModels(['coding', 'vision']);
    assert.equal(disjoint.length, 0);

    // Filter-by-name search
    const gemmaMatches = filterBuildsIndexModels([], undefined, '  GeMmA ');
    assert.deepEqual(gemmaMatches.map(m => m.id), MODELS_DATA.filter(m => /gemma/i.test(m.name)).map(m => m.id));
    assert.equal(filterBuildsIndexModels(['moe'], undefined, 'gemma').every(m => m.activeParamsB < m.totalParamsB && /gemma/i.test(m.name)), true);
    assert.equal(filterBuildsIndexModels([], undefined, '   ').length, 70);
  });

  it('prerendered /builds HTML contains all 70 model rows and the preset chip row', () => {
    const html = renderBuildsIndexHtml();
    const rowIds = [...html.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);
    assert.equal(rowIds.length, 70);
    assert.equal(new Set(rowIds).size, 70);

    assert.match(html, /data-preset="all" aria-pressed="true">\s*All models\s*<\/button>/);
    for (const preset of BUILDS_INDEX_PRESETS) {
      assert.ok(
        html.includes(`data-preset="${preset.id}" aria-pressed="false">${preset.label}</button>`),
        `chip present for ${preset.id}`
      );
    }
    assert.ok(html.includes('id="builds-search-input"'));
    assert.ok(html.includes('70 of 70 models'));
    assert.match(html, /id="btn-reset-builds-filter"[^>]*hidden/);
  });

  it('prerendered /builds HTML splits top group into 128 GB+ Colossal MoE and 48-96 GB workstation groups, both populated', () => {
    const html = renderBuildsIndexHtml();
    assert.ok(html.includes('128 GB+ VRAM: Colossal MoE'));
    assert.ok(html.includes('48–96 GB VRAM: Dual-GPU & Workstation'));

    const sections = [...html.matchAll(/<section class="builds-index-group"[\s\S]*?<\/section>/g)].map(m => m[0]);
    assert.equal(sections.length, 5, '5 populated VRAM groups');

    const countRows = (sec) => [...sec.matchAll(/<tr data-model-id="([^"]+)">/g)].map(m => m[1]);
    assert.equal(countRows(sections[0]).length, 19, '128 GB+ Colossal MoE group has 19 models');
    assert.equal(countRows(sections[1]).length, 14, '48-96 GB group has 14 models');
    assert.equal(sections.reduce((sum, s) => sum + countRows(s).length, 0), 70, 'all 70 models distributed across 5 groups');
  });

  it('createBuildsIndex filters rows and hides empty groups on search input, restores on clear/reset', () => {
    const html = renderBuildsIndexHtml();
    const makeClassList = () => {
      const set = new Set();
      return {
        toggle(cls, force) {
          if (force) set.add(cls);
          else set.delete(cls);
        },
        contains(cls) {
          return set.has(cls);
        }
      };
    };

    const countEl = { textContent: '70 of 70 models' };
    const resetBtn = { hidden: true };
    const searchListeners = [];
    const searchInput = {
      value: '',
      addEventListener(type, fn) {
        if (type === 'input') searchListeners.push(fn);
      }
    };
    const presetBtns = [...html.matchAll(/data-preset="([^"]+)"/g)].map(m => ({
      dataset: { preset: m[1] },
      attrs: {},
      classList: makeClassList(),
      setAttribute(k, v) { this.attrs[k] = v; }
    }));
    const sections = [...html.matchAll(/<section class="builds-index-group"[\s\S]*?<\/section>/g)].map(m => {
      const rows = [...m[0].matchAll(/<tr data-model-id="([^"]+)">/g)].map(r => ({
        dataset: { modelId: r[1] },
        hidden: false
      }));
      return {
        hidden: false,
        rows,
        querySelectorAll(sel) {
          return sel === 'tbody tr[data-model-id]' ? this.rows : [];
        }
      };
    });

    const clickListeners = [];
    const root = {
      querySelector(sel) {
        if (sel === '#builds-index-count') return countEl;
        if (sel === '#btn-reset-builds-filter') return resetBtn;
        if (sel === '#builds-search-input') return searchInput;
        return null;
      },
      querySelectorAll(sel) {
        if (sel === '.builds-preset-btn') return presetBtns;
        if (sel === '.builds-index-group') return sections;
        return [];
      },
      addEventListener(type, fn) {
        if (type === 'click') clickListeners.push(fn);
      }
    };

    const container = {
      querySelector(sel) {
        return sel === '.builds-index' ? root : null;
      }
    };

    createBuildsIndex(container);

    // Type 'kimi' -> only Kimi K2.7 Code matches (in 128 GB+ group), remaining 4 groups hide
    const expectedKimi = MODELS_DATA.filter(m => /kimi/i.test(m.name)).length;
    searchInput.value = 'kimi';
    searchListeners.forEach(fn => fn());
    assert.equal(countEl.textContent, `${expectedKimi} of 70 models`);
    assert.equal(resetBtn.hidden, false);
    assert.equal(sections[0].hidden, false, '128 GB+ group stays visible');
    assert.equal(sections.slice(1).every(s => s.hidden), true, 'all empty groups hide when zero rows match');

    // Clear search -> all 70 models and all 5 groups visible again
    searchInput.value = '';
    searchListeners.forEach(fn => fn());
    assert.equal(countEl.textContent, '70 of 70 models');
    assert.equal(resetBtn.hidden, true);
    assert.equal(sections.every(s => !s.hidden), true);

    // Search + Reset button clears and restores everything
    searchInput.value = 'no-such-model';
    searchListeners.forEach(fn => fn());
    assert.equal(countEl.textContent, '0 of 70 models');
    assert.equal(sections.every(s => s.hidden), true);
    assert.equal(resetBtn.hidden, false);

    clickListeners.forEach(fn => fn({
      target: {
        closest(sel) {
          return sel === '#btn-reset-builds-filter' ? resetBtn : null;
        }
      }
    }));
    assert.equal(searchInput.value, '');
    assert.equal(countEl.textContent, '70 of 70 models');
    assert.equal(resetBtn.hidden, true);
    assert.equal(sections.every(s => !s.hidden), true);
  });

  it('home chooser "Coding & vision" toggle matches 30 models from useCases', () => {
    const matched = filterModels({ codingOnly: true });
    assert.equal(matched.length, 30);
    const expectedIds = new Set([...EXPECTED_CODING, ...EXPECTED_VISION]);
    assert.deepEqual(new Set(matched.map(m => m.id)), expectedIds);
  });
});

