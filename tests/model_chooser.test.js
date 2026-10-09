import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderModelPickerHtml, filterModels, paramsShort, VRAM_BUDGETS, VISIBLE_MODELS } from '../src/components/modelPicker.js';
import { MODELS_DATA } from '../src/data/models.js';

const optionIds = (html) => [...html.matchAll(/<button class="model-option[^"]*" data-model-id="([^"]+)"/g)].map(m => m[1]);

describe('Model chooser', () => {
  it('labels every model with its full name and a size, VRAM and quant line', () => {
    const html = renderModelPickerHtml({ showAllModels: true });
    for (const m of MODELS_DATA) {
      assert.ok(html.includes(`<span class="model-option-name">${m.name}</span>`), `${m.id} shows its full name`);
      assert.ok(html.includes(`${paramsShort(m)} · ${m.recommendedVram} GB · ${m.sweetSpotQuant.split(' ')[0]}`), `${m.id} meta line`);
    }
  });

  it('tells similar models apart (no more "Llama 70 Billion" vs "Llama 70.6 Billion")', () => {
    const html = renderModelPickerHtml({ showAllModels: true });
    assert.ok(html.includes('>Llama 3.3 70B Instruct<') && html.includes('>Llama 3.1 70B Instruct<'));
    assert.ok(!/ \d+(\.\d+)? Billion</.test(html), 'no first-word + parameter labels');
    assert.equal(paramsShort({ parameters: '70.6 Billion' }), '70.6B');
    assert.equal(paramsShort({ parameters: '46.7B MoE (12.9B active)' }), '46.7B MoE');
  });

  it('"Runs well in" keeps models whose recommended VRAM fits', () => {
    for (const v of VRAM_BUDGETS) {
      const ids = filterModels({ vramBudget: v }).map(m => m.id);
      const expected = MODELS_DATA.filter(m => m.recommendedVram <= v).map(m => m.id);
      assert.deepEqual(ids, expected, `${v} GB`);
    }
    const html = renderModelPickerHtml({ vramBudget: 24 });
    assert.match(html, /data-vram="24" aria-pressed="true"/);
    assert.ok(html.includes(`${filterModels({ vramBudget: 24 }).length} of ${MODELS_DATA.length} models run well in 24 GB of VRAM`));
  });

  it('"Coding & vision" and search narrow the list; no match offers a reset', () => {
    const coding = filterModels({ codingOnly: true }).map(m => m.id);
    assert.ok(coding.length > 0 && coding.every(id => /code|coder|vision/.test(id)));
    assert.deepEqual(filterModels({ searchQuery: 'gemma' }).map(m => m.id), MODELS_DATA.filter(m => /gemma/i.test(m.name)).map(m => m.id));
    assert.match(renderModelPickerHtml({ searchQuery: 'no-such-model' }), /No models match these filters\.[\s\S]*id="btn-reset-model-filter"/);
  });

  it(`shows ${VISIBLE_MODELS} models until "Show all", always including the selected one`, () => {
    const collapsed = renderModelPickerHtml();
    assert.equal(optionIds(collapsed).length, VISIBLE_MODELS);
    assert.match(collapsed, /Show all 32 models/);
    assert.match(collapsed, /class="model-options is-collapsed"/);

    const last = MODELS_DATA[MODELS_DATA.length - 1];
    const withLast = optionIds(renderModelPickerHtml({ activeModelId: last.id }));
    assert.equal(withLast.length, VISIBLE_MODELS + 1);
    assert.equal(withLast.at(-1), last.id);

    const all = renderModelPickerHtml({ showAllModels: true });
    assert.equal(optionIds(all).length, MODELS_DATA.length);
    assert.match(all, /aria-expanded="true"[^>]*>\s*Show fewer models/);
  });

  it('has no carousel, scroll arrows or row/grid toggle left', () => {
    const html = renderModelPickerHtml();
    for (const gone of ['model-pill-btn', 'btn-pills-left', 'btn-pills-right', 'btn-toggle-model-layout']) {
      assert.ok(!html.includes(gone), gone);
    }
  });
});
