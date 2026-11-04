import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchIndex, searchEntries, renderCommandPaletteHtml } from '../src/components/commandPalette.js';
import { parseRoute, SECTIONS } from '../src/routes.js';
import { renderShell } from '../src/components/shell.js';

describe('Cmd+K Quick Switcher Index Integrity', () => {
  it('builds exactly 98 entries across all 5 catalog types', () => {
    const index = buildSearchIndex();
    assert.equal(index.length, 98, 'index length must be 56 + 19 + 10 + 8 + 5 = 98');

    const counts = {
      Model: 0,
      GPU: 0,
      Comparison: 0,
      'Best GPU': 0,
      Section: 0
    };

    for (const entry of index) {
      assert.ok(entry.id, `entry must have an id: ${JSON.stringify(entry)}`);
      assert.ok(entry.name, `entry must have a name: ${JSON.stringify(entry)}`);
      assert.ok(entry.path, `entry must have a path: ${JSON.stringify(entry)}`);
      assert.ok(counts[entry.type] !== undefined, `unknown entry type: ${entry.type}`);
      counts[entry.type]++;
    }

    assert.equal(counts.Model, 56, '56 models');
    assert.equal(counts.GPU, 19, '19 GPUs');
    assert.equal(counts.Comparison, 10, '10 comparisons');
    assert.equal(counts['Best GPU'], 8, '8 best-GPU pages');
    assert.equal(counts.Section, 5, '5 sections');
  });

  it('every entry path resolves through parseRoute to a real route', () => {
    const index = buildSearchIndex();
    for (const entry of index) {
      const route = parseRoute(entry.path);
      assert.ok(route, `entry ${entry.type} (${entry.name}) path ${entry.path} must resolve`);
      assert.equal(route.path, entry.path);
    }
  });
});

describe('Cmd+K Matching Known Answers & Ranking', () => {
  const index = buildSearchIndex();

  it('"3090" returns the RTX 3090 as the first GPU result', () => {
    const results = searchEntries('3090', index);
    assert.ok(results.length > 0);

    const firstGpu = results.find(r => r.type === 'GPU');
    assert.ok(firstGpu, 'must include at least one GPU');
    assert.equal(firstGpu.id, 'rtx-3090');
    assert.ok(firstGpu.name.includes('3090'));

    // In fact, RTX 3090 is the very first result in the list
    assert.equal(results[0].id, 'rtx-3090');
  });

  it('"qwen coder" returns only Qwen Coder models', () => {
    const results = searchEntries('qwen coder', index);
    assert.ok(results.length > 0);

    // Every returned entry must be a Coder entry
    for (const r of results) {
      assert.ok(
        r.name.toLowerCase().includes('coder') || r.id.toLowerCase().includes('coder'),
        `unexpected non-coder entry in results: ${r.name}`
      );
      assert.ok(
        r.name.toLowerCase().includes('qwen') || r.id.toLowerCase().includes('qwen'),
        `unexpected non-qwen entry in results: ${r.name}`
      );
    }

    // Must not return general Qwen non-coder models (e.g. 72B, 7B, 32B)
    assert.ok(!results.some(r => r.id === 'qwen-2.5-72b'));
    assert.ok(!results.some(r => r.id === 'qwen-2.5-7b'));
    assert.ok(!results.some(r => r.id === 'qwen-3-32b'));
  });

  it('"p40" returns the Tesla P40', () => {
    const results = searchEntries('p40', index);
    assert.ok(results.length > 0);

    const firstGpu = results.find(r => r.type === 'GPU');
    assert.ok(firstGpu);
    assert.equal(firstGpu.id, 'tesla-p40');
    assert.ok(firstGpu.name.includes('Tesla P40'));

    // First result overall is Tesla P40
    assert.equal(results[0].id, 'tesla-p40');
  });

  it('"3090 vs" or the second card\'s name surfaces the relevant comparison pages', () => {
    // "3090 vs"
    const vsResults = searchEntries('3090 vs', index);
    assert.ok(vsResults.length >= 5, 'should return at least 5 comparison pairs');
    assert.ok(vsResults.every(r => r.type === 'Comparison'));
    assert.ok(vsResults.some(r => r.id === 'rtx-3090-vs-rtx-4090'));
    assert.ok(vsResults.some(r => r.id === 'rtx-3090-vs-rtx-5090'));
    assert.ok(vsResults.some(r => r.id === 'tesla-p40-vs-rtx-3090'));

    // Second card's name: "5090"
    const r5090 = searchEntries('5090', index);
    assert.ok(r5090.some(r => r.type === 'Comparison' && r.id === 'rtx-3090-vs-rtx-5090'));
    assert.ok(r5090.some(r => r.type === 'Comparison' && r.id === 'rtx-4090-vs-rtx-5090'));

    // Second card's name: "rx 7900" or "7900 xtx"
    const r7900 = searchEntries('7900 xtx', index);
    assert.ok(r7900.some(r => r.type === 'Comparison' && r.id === 'rtx-3090-vs-rx-7900-xtx'));
    assert.ok(r7900.some(r => r.type === 'Comparison' && r.id === 'rtx-4080-super-vs-rx-7900-xtx'));
  });

  it('empty query returns exactly the 5 sections', () => {
    const emptyResults = searchEntries('', index);
    assert.equal(emptyResults.length, 5);
    assert.deepEqual(
      emptyResults.map(r => r.id),
      SECTIONS.map(s => s.view)
    );
    assert.ok(emptyResults.every(r => r.type === 'Section'));

    // Whitespace only also returns the 5 sections
    const whitespaceResults = searchEntries('   ', index);
    assert.equal(whitespaceResults.length, 5);
  });

  it('a nonsense query returns the no-results state', () => {
    const results = searchEntries('xyz999nonsenseqwerty', index);
    assert.equal(results.length, 0);
  });

  it('ranks entries whose name starts with full query first, then catalog order, capped at 10', () => {
    // "llama" should rank models starting with Llama first
    const llamaResults = searchEntries('llama', index);
    assert.equal(llamaResults.length, 10, 'capped at 10 results');

    // First results must start with "llama"
    for (let i = 0; i < 7; i++) {
      assert.ok(
        llamaResults[i].name.toLowerCase().startsWith('llama'),
        `expected prefix match at ${i}: ${llamaResults[i].name}`
      );
    }

    // Remaining matches that contain "llama" but don't start with it come after prefix matches
    const nonPrefixIndex = llamaResults.findIndex(r => !r.name.toLowerCase().startsWith('llama'));
    if (nonPrefixIndex !== -1) {
      assert.ok(llamaResults[nonPrefixIndex].name.toLowerCase().includes('llama'));
    }
  });
});

describe('Cmd+K Shell & Dialog Markup', () => {
  it('renders search button in header with Ctrl K hint', () => {
    const html = renderShell(parseRoute('/'));
    assert.ok(html.includes('id="btn-search"'), 'must include #btn-search button');
    assert.ok(html.includes('nav-search-btn'), 'must include nav-search-btn class');
    assert.ok(html.includes('Ctrl K'), 'must include desktop Ctrl K hint');
    assert.ok(html.includes('aria-keyshortcuts="Control+K Meta+K"'));
  });

  it('renders command palette dialog markup hidden by default in shell', () => {
    const html = renderShell(parseRoute('/'));
    assert.ok(html.includes('id="cmdk-dialog"'), 'must include #cmdk-dialog');
    assert.ok(html.includes('role="dialog"'));
    assert.ok(html.includes('aria-modal="true"'));
    assert.ok(html.includes('aria-label="Quick switcher"'));
    assert.ok(html.includes('hidden'), 'dialog must be hidden by default');
    assert.ok(html.includes('id="cmdk-input"'));
    assert.ok(html.includes('role="combobox"'));
    assert.ok(html.includes('aria-autocomplete="list"'));
    assert.ok(html.includes('aria-controls="cmdk-list"'));
    assert.ok(html.includes('id="cmdk-list"'));
    assert.ok(html.includes('role="listbox"'));
  });

  it('renderCommandPaletteHtml returns accessible dialog markup', () => {
    const html = renderCommandPaletteHtml();
    assert.ok(html.includes('role="dialog"'));
    assert.ok(html.includes('aria-modal="true"'));
    assert.ok(html.includes('hidden'));
    assert.ok(html.includes('data-cmdk-close'));
  });
});
