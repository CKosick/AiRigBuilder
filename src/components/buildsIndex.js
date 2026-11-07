// Build sheet index (/builds): every model in one comparison table, grouped by the VRAM it needs,
// linking to each model's build sheet. Pure HTML shared by the browser and scripts/prerender.js.
import { MODELS_DATA } from '../data/models.js';
import { BUILDS_DATA } from '../data/builds.js';
import { buildPath } from '../routes.js';
import { icon } from './icons.js';
import { cheapestFittingTotal } from '../utils/tierFit.js';

const VRAM_GROUPS = [
  { min: 48, title: '48 GB+ VRAM: 70B, MoE and Larger', blurb: 'Dual-GPU and bigger rigs. A pair of used RTX 3090s is the cheapest way into this class.' },
  { min: 20, title: '24–32 GB VRAM: 22B–35B Models', blurb: 'One 24 GB card (a used RTX 3090 or Tesla P40) runs these at Q4 with room for context.' },
  { min: 13, title: '16 GB VRAM: 11B–15B Models', blurb: 'A 16 GB card such as the RTX 4060 Ti 16GB, or a used 3090 for long context.' },
  { min: 0, title: '8–12 GB VRAM: 3B–9B Starter Models', blurb: 'Budget single-GPU builds around an RTX 3060 12GB.' }
];

const partsTotal = (tier) => tier.parts.reduce((sum, p) => sum + (p.price || 0), 0);

// Models in a group often share the same three rigs; say so instead of hiding it
const rigSignature = (sheet) => sheet.tiers.map(t => `${t.name}:${partsTotal(t)}`).join('|');

export const BUILDS_INDEX_PRESETS = [
  {
    id: 'vram-16',
    label: 'Runs well in 16 GB',
    match: (m) => m.recommendedVram <= 16
  },
  {
    id: 'vram-24',
    label: 'Runs well in 24 GB',
    match: (m) => m.recommendedVram <= 24
  },
  {
    id: 'under-1500',
    label: 'Builds under $1,500',
    match: (m) => {
      const sheet = BUILDS_DATA[m.id];
      if (!sheet) return false;
      const cheapest = cheapestFittingTotal(sheet);
      return cheapest !== null && cheapest <= 1500;
    }
  },
  {
    id: 'moe',
    label: 'MoE models',
    match: (m) => m.activeParamsB < m.totalParamsB
  },
  {
    id: 'coding',
    label: 'Coding',
    match: (m) => Array.isArray(m.useCases) && m.useCases.includes('coding')
  },
  {
    id: 'reasoning',
    label: 'Reasoning',
    match: (m) => Array.isArray(m.useCases) && m.useCases.includes('reasoning')
  },
  {
    id: 'vision',
    label: 'Vision',
    match: (m) => Array.isArray(m.useCases) && m.useCases.includes('vision')
  }
];

const PRESET_BY_ID = new Map(BUILDS_INDEX_PRESETS.map(p => [p.id, p]));

export function filterBuildsIndexModels(activePresetIds = [], models = MODELS_DATA.filter(m => BUILDS_DATA[m.id])) {
  const active = [...activePresetIds].map(id => PRESET_BY_ID.get(id)).filter(Boolean);
  if (!active.length) return models;
  return models.filter(m => active.every(preset => preset.match(m)));
}

export function renderBuildsIndexHtml() {
  const models = MODELS_DATA.filter(m => BUILDS_DATA[m.id]);
  const groups = VRAM_GROUPS.map((g, i) => ({
    ...g,
    models: models.filter(m => m.recommendedVram >= g.min && (i === 0 || m.recommendedVram < VRAM_GROUPS[i - 1].min))
  })).filter(g => g.models.length);

  const presetChipsHtml = [
    `<button type="button" class="vram-pill builds-preset-btn active" data-preset="all" aria-pressed="true">All models</button>`,
    ...BUILDS_INDEX_PRESETS.map(p =>
      `<button type="button" class="vram-pill builds-preset-btn" data-preset="${p.id}" aria-pressed="false">${p.label}</button>`
    )
  ].join('\n          ');

  const groupHtml = groups.map((g, gi) => {
    const sharedRig = g.models.length > 1 && new Set(g.models.map(m => rigSignature(BUILDS_DATA[m.id]))).size === 1;
    const rows = g.models.map(m => {
      const sheet = BUILDS_DATA[m.id];
      const cheapest = cheapestFittingTotal(sheet);
      return `
              <tr data-model-id="${m.id}">
                <td class="part-name-cell stack-head">
                  <strong><a href="${buildPath(m.id)}">${m.name}</a></strong>
                  <div class="part-spec-sub">${m.creator} · ${m.parameters}</div>
                </td>
                <td data-label="VRAM target">${sheet.vramTarget}</td>
                <td data-label="Sweet spot quant">${m.sweetSpotQuant}</td>
                <td data-label="Speed on dual 3090">${m.typicalSpeedDual3090}</td>
                <td class="part-price-cell" data-label="Rigs from">${cheapest === null ? '<span class="no-fit-note">No listed rig fits</span>' : `$${cheapest.toLocaleString('en-US')}`}</td>
              </tr>`;
    }).join('');

    return `
      <section class="builds-index-group" aria-labelledby="builds-group-${gi}">
        <h3 id="builds-group-${gi}">${g.title}</h3>
        <p>${g.blurb}${sharedRig ? ' These models share the same three hardware tiers; they differ in quantization, context cost and speed.' : ''}</p>
        <div class="parts-table-wrap">
          <table class="parts-table stack-table">
            <thead>
              <tr>
                <th scope="col" class="col-model">Model</th>
                <th scope="col">VRAM Target</th>
                <th scope="col">Sweet Spot Quant</th>
                <th scope="col">Speed on Dual 3090</th>
                <th scope="col">Rigs From</th>
              </tr>
            </thead>
            <tbody>${rows}
            </tbody>
          </table>
        </div>
      </section>`;
  }).join('');

  return `
    <div class="builds-index">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="/">Home</a></li>
          <li aria-current="page">Build Sheets</li>
        </ol>
      </nav>
      <div class="tracker-header-row">
        <div class="tracker-title">
          <h1>Local AI Build Sheets for ${models.length} Models</h1>
          <p>Each build sheet has three verified rigs: <strong>Budget Used</strong>, <strong>Balanced</strong> and <strong>Best New</strong>, with full parts lists, power draw and first-year cost. Pick the model you want to run.</p>
        </div>
        <a href="/calculator" class="btn-secondary">${icon('calculator')}Compare against cloud rental →</a>
      </div>
      <div class="builds-index-filters">
        <div class="vram-filter" role="group" aria-label="Preset model filters">
          ${presetChipsHtml}
        </div>
        <div class="builds-index-status">
          <p class="model-results-count" id="builds-index-count" aria-live="polite">${models.length} of ${models.length} models</p>
          <button type="button" class="btn-secondary builds-filter-reset" id="btn-reset-builds-filter" hidden>Reset</button>
        </div>
      </div>
      ${groupHtml}
    </div>
  `;
}

export function createBuildsIndex(container) {
  if (!container.querySelector('.builds-index')) {
    container.innerHTML = renderBuildsIndexHtml();
  }

  const root = container.querySelector('.builds-index');
  if (!root) return;

  const allModels = MODELS_DATA.filter(m => BUILDS_DATA[m.id]);
  const totalCount = allModels.length;
  const activePresets = new Set();

  const countEl = root.querySelector('#builds-index-count');
  const resetBtn = root.querySelector('#btn-reset-builds-filter');
  const presetBtns = Array.from(root.querySelectorAll('.builds-preset-btn'));
  const groupSections = Array.from(root.querySelectorAll('.builds-index-group'));

  const applyFilters = () => {
    const matchedIds = new Set(filterBuildsIndexModels(activePresets, allModels).map(m => m.id));
    const hasActive = activePresets.size > 0;

    presetBtns.forEach(btn => {
      const id = btn.dataset.preset;
      const isPressed = id === 'all' ? !hasActive : activePresets.has(id);
      btn.classList.toggle('active', isPressed);
      btn.setAttribute('aria-pressed', String(isPressed));
    });

    groupSections.forEach(section => {
      const rows = Array.from(section.querySelectorAll('tbody tr[data-model-id]'));
      let visibleInGroup = 0;
      rows.forEach(row => {
        const show = matchedIds.has(row.dataset.modelId);
        row.hidden = !show;
        if (show) visibleInGroup += 1;
      });
      section.hidden = visibleInGroup === 0;
    });

    if (countEl) {
      countEl.textContent = `${matchedIds.size} of ${totalCount} models`;
    }
    if (resetBtn) {
      resetBtn.hidden = !hasActive;
    }
  };

  root.addEventListener('click', (e) => {
    const presetBtn = e.target.closest('.builds-preset-btn');
    if (presetBtn) {
      const id = presetBtn.dataset.preset;
      if (id === 'all') {
        activePresets.clear();
      } else if (activePresets.has(id)) {
        activePresets.delete(id);
      } else {
        activePresets.add(id);
      }
      applyFilters();
      return;
    }

    const reset = e.target.closest('#btn-reset-builds-filter');
    if (reset) {
      activePresets.clear();
      applyFilters();
    }
  });
}
