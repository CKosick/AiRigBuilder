// Quick Switcher / Command Palette (Cmd+K) Component
// Pure index and search logic shared with unit tests; client controller wired in main.js.
import { MODELS_DATA } from '../data/models.js';
import { GPUS_DATA } from '../data/gpus.js';
import { COMPARISON_PAIRS, BEST_GPU_MODELS, comparePath, bestGpuPath } from '../data/comparisons.js';
import { SECTIONS, buildPath, gpuPath, shortGpuName } from '../routes.js';
import { icon } from './icons.js';

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Builds the searchable index (98 entries: 56 models, 19 GPUs, 10 comparisons, 8 best-GPU, 5 sections).
 * Derived at runtime from data catalogs; every path is guaranteed to resolve in parseRoute.
 */
export function buildSearchIndex() {
  const entries = [];

  // 1. 56 models
  for (const model of MODELS_DATA) {
    entries.push({
      id: model.id,
      name: model.name,
      path: buildPath(model.id),
      type: 'Model'
    });
  }

  // 2. 19 GPUs
  for (const gpu of GPUS_DATA) {
    entries.push({
      id: gpu.id,
      name: shortGpuName(gpu),
      fullName: gpu.name,
      path: gpuPath(gpu.id),
      type: 'GPU'
    });
  }

  // 3. 10 comparison pages
  for (const [a, b] of COMPARISON_PAIRS) {
    const gpuA = GPUS_DATA.find(g => g.id === a);
    const gpuB = GPUS_DATA.find(g => g.id === b);
    const nameA = gpuA ? shortGpuName(gpuA) : a;
    const nameB = gpuB ? shortGpuName(gpuB) : b;
    entries.push({
      id: `${a}-vs-${b}`,
      name: `${nameA} vs ${nameB}`,
      fullName: `${gpuA ? gpuA.name : a} vs ${gpuB ? gpuB.name : b}`,
      path: comparePath(a, b),
      type: 'Comparison'
    });
  }

  // 4. 8 best-GPU pages
  for (const modelId of BEST_GPU_MODELS) {
    const model = MODELS_DATA.find(m => m.id === modelId);
    entries.push({
      id: `best-gpu-${modelId}`,
      name: model ? model.name : modelId,
      path: bestGpuPath(modelId),
      type: 'Best GPU'
    });
  }

  // 5. 5 sections
  for (const section of SECTIONS) {
    entries.push({
      id: section.view,
      name: section.label,
      path: section.path,
      type: 'Section'
    });
  }

  return entries;
}

/**
 * Pure search function:
 * - Empty query returns the 5 sections.
 * - Non-empty query splits on whitespace tokens; every token must appear in entry's name or id.
 * - Ranking: entries whose name starts with full query first, then remaining matches in catalog order.
 * - Capped at 10 results.
 */
export function searchEntries(query, index) {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    return index.filter(e => e.type === 'Section');
  }

  const tokens = q.split(/\s+/).filter(Boolean);

  const prefixMatches = [];
  const otherMatches = [];

  for (const entry of index) {
    const nameLower = entry.name.toLowerCase();
    const idLower = (entry.id || '').toLowerCase();
    const fullLower = (entry.fullName || '').toLowerCase();

    // Every token must appear in name, id, or full name
    const matchesAll = tokens.every(token => (
      nameLower.includes(token) || idLower.includes(token) || fullLower.includes(token)
    ));

    if (!matchesAll) continue;

    // Check if name (or short name) starts with the full query
    if (nameLower.startsWith(q)) {
      prefixMatches.push(entry);
    } else {
      otherMatches.push(entry);
    }
  }

  return [...prefixMatches, ...otherMatches].slice(0, 10);
}

/**
 * Initial dialog markup for the shell. Rendered into static HTML on every page.
 */
export function renderCommandPaletteHtml() {
  return `
    <div id="cmdk-dialog" class="cmdk-backdrop" role="dialog" aria-modal="true" aria-label="Quick switcher" hidden>
      <div class="cmdk-overlay" data-cmdk-close></div>
      <div class="cmdk-modal">
        <div class="cmdk-header">
          <div class="cmdk-search-icon">${icon('search')}</div>
          <input
            type="search"
            id="cmdk-input"
            class="cmdk-input"
            placeholder="Search models, GPUs, comparisons, sections..."
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="cmdk-list"
            aria-activedescendant=""
          />
          <kbd class="cmdk-kbd-esc">ESC</kbd>
        </div>
        <div id="cmdk-list" class="cmdk-list" role="listbox" aria-label="Search results"></div>
        <div class="cmdk-footer">
          <div class="cmdk-footer-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>ESC</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Client-side controller for the command palette.
 */
export function createCommandPalette(dialogEl, options = {}) {
  if (!dialogEl) return null;

  const triggerButton = options.triggerButton || document.getElementById('btn-search');
  const inputEl = dialogEl.querySelector('#cmdk-input');
  const listEl = dialogEl.querySelector('#cmdk-list');
  const overlayEl = dialogEl.querySelector('[data-cmdk-close]');

  const searchIndex = buildSearchIndex();
  let currentResults = [];
  let selectedIndex = 0;
  let previouslyFocusedEl = null;

  function typeSlug(type) {
    return type.toLowerCase().replace(/\s+/g, '-');
  }

  function renderList() {
    if (!listEl) return;

    if (currentResults.length === 0) {
      listEl.innerHTML = `<div class="cmdk-empty" role="status">No results found for "${escapeHtml(inputEl.value.trim())}"</div>`;
      if (inputEl) inputEl.setAttribute('aria-activedescendant', '');
      return;
    }

    listEl.innerHTML = currentResults.map((entry, idx) => {
      const isSelected = idx === selectedIndex;
      return `
        <a
          href="${entry.path}"
          class="cmdk-item${isSelected ? ' active' : ''}"
          id="cmdk-item-${idx}"
          role="option"
          aria-selected="${isSelected}"
          data-index="${idx}"
        >
          <span class="cmdk-item-type type-${typeSlug(entry.type)}">${entry.type}</span>
          <span class="cmdk-item-name">${escapeHtml(entry.name)}</span>
          <span class="cmdk-item-arrow" aria-hidden="true">→</span>
        </a>
      `;
    }).join('');

    if (inputEl) {
      inputEl.setAttribute('aria-activedescendant', `cmdk-item-${selectedIndex}`);
    }

    const activeEl = listEl.querySelector('.cmdk-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function updateSelection(newIndex) {
    if (currentResults.length === 0) return;
    selectedIndex = (newIndex + currentResults.length) % currentResults.length;

    const items = listEl.querySelectorAll('.cmdk-item');
    items.forEach((item, idx) => {
      const isSelected = idx === selectedIndex;
      item.classList.toggle('active', isSelected);
      item.setAttribute('aria-selected', String(isSelected));
    });

    if (inputEl) {
      inputEl.setAttribute('aria-activedescendant', `cmdk-item-${selectedIndex}`);
    }

    const activeEl = listEl.querySelector('.cmdk-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  function open() {
    previouslyFocusedEl = document.activeElement;
    dialogEl.hidden = false;
    dialogEl.classList.add('is-open');
    document.body.classList.add('cmdk-open');

    if (inputEl) {
      inputEl.value = '';
      currentResults = searchEntries('', searchIndex);
      selectedIndex = 0;
      renderList();
      inputEl.focus();
    }
  }

  function close({ restoreFocus = true } = {}) {
    dialogEl.hidden = true;
    dialogEl.classList.remove('is-open');
    document.body.classList.remove('cmdk-open');

    if (restoreFocus && previouslyFocusedEl && typeof previouslyFocusedEl.focus === 'function') {
      previouslyFocusedEl.focus();
    }
  }

  function toggle() {
    if (dialogEl.hidden) {
      open();
    } else {
      close();
    }
  }

  // Input event
  inputEl?.addEventListener('input', () => {
    currentResults = searchEntries(inputEl.value, searchIndex);
    selectedIndex = 0;
    renderList();
  });

  // Keyboard navigation inside input
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateSelection(selectedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateSelection(selectedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults.length > 0 && selectedIndex >= 0 && selectedIndex < currentResults.length) {
        const itemLink = listEl.querySelector(`#cmdk-item-${selectedIndex}`);
        if (itemLink) {
          close({ restoreFocus: false });
          itemLink.click();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  // Mouse selection on items
  listEl?.addEventListener('pointermove', (e) => {
    const item = e.target.closest('.cmdk-item');
    if (item && item.hasAttribute('data-index')) {
      const idx = parseInt(item.getAttribute('data-index'), 10);
      if (idx !== selectedIndex) {
        updateSelection(idx);
      }
    }
  });

  // Click on items closes the palette (navigation happens via standard a[href] router handler)
  listEl?.addEventListener('click', (e) => {
    const item = e.target.closest('.cmdk-item');
    if (item) {
      close({ restoreFocus: false });
    }
  });

  // Click overlay to close
  overlayEl?.addEventListener('click', () => {
    close();
  });

  // Trigger button click
  triggerButton?.addEventListener('click', (e) => {
    e.preventDefault();
    open();
  });

  // Global shortcut: Cmd+K or Ctrl+K
  const onGlobalKeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && !dialogEl.hidden) {
      e.preventDefault();
      close();
    }
  };

  window.addEventListener('keydown', onGlobalKeydown);

  return {
    open,
    close,
    toggle,
    destroy() {
      window.removeEventListener('keydown', onGlobalKeydown);
    }
  };
}
