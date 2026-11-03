// Rig Playground Component: "I Already Own" GPU fit checker and upgrade engine
import { GPUS_DATA } from '../data/gpus.js';
import { OWNED_GPUS_SUPPLEMENT } from '../data/ownedGpus.js';
import { MODELS_DATA } from '../data/models.js';
import { tierFit } from '../utils/tierFit.js';
import { estimateSpeedToks } from '../utils/speedEstimate.js';
import { buildPath } from '../routes.js';
import { icon } from './icons.js';
import { preserveFocus } from '../utils/focus.js';
import { CONTEXT_STEPS, KV_PRECISION_OPTIONS, KV_PRECISION_SCALES } from './modelPicker.js';

export const PLAYGROUND_GPUS = [...GPUS_DATA, ...OWNED_GPUS_SUPPLEMENT];
export const ALL_PLAYGROUND_GPUS = PLAYGROUND_GPUS;

export const INTEGRATED_SYSTEM_IDS = [
  'mac-studio-m2-ultra',
  'mac-studio-m3-ultra',
  'strix-halo-128gb',
  'dgx-spark'
];

export const isIntegratedSystem = (gpuId) => INTEGRATED_SYSTEM_IDS.includes(gpuId);

export function findPlaygroundGpu(id) {
  return PLAYGROUND_GPUS.find(g => g.id === id) || GPUS_DATA.find(g => g.id === 'rtx-3080-10gb') || GPUS_DATA[0];
}

export const PLAYGROUND_DEFAULTS = {
  gpuId: 'rtx-3080-10gb',
  count: 1,
  contextK: 8,
  kvPrecision: 'FP16'
};

/**
 * Calculates rule-of-thumb recommended PSU wattage:
 * Total TDP + 150W system allowance, rounded up to the nearest 50W.
 */
export function recommendedPsuWatts(totalTdpWatts, systemAllowanceWatts = 150) {
  const raw = totalTdpWatts + systemAllowanceWatts;
  return Math.ceil(raw / 50) * 50;
}

/**
 * Evaluates all 56 models in MODELS_DATA against a synthetic rig configuration.
 * Accepts either (config, options) or (gpu, count, options).
 * Returns partitioned lists: { runsInVram, doesNotFit, config }.
 */
export function evaluatePlaygroundModels(gpuOrConfig, countOrOptions = {}, options = {}) {
  let config;
  let opts;
  if (typeof countOrOptions === 'number') {
    const gpu = gpuOrConfig;
    const count = countOrOptions;
    const isIntegrated = isIntegratedSystem(gpu.id);
    const actualCount = isIntegrated ? 1 : count;
    config = {
      memoryGb: gpu.vram * actualCount,
      bandwidthGbs: gpu.bandwidth
    };
    opts = options || {};
  } else {
    config = gpuOrConfig;
    opts = countOrOptions || {};
  }
  const { contextK = 8, kvPrecision = 'FP16' } = opts;
  const kvScale = KV_PRECISION_SCALES[kvPrecision] ?? 1.0;
  const usable = config.memoryGb - 1; // 1 GB CUDA/runtime overhead

  const runsInVram = [];
  const doesNotFit = [];

  for (const model of MODELS_DATA) {
    const fit = tierFit(model, config, { contextK, kvScale });
    if (fit.status === 'fits' || fit.status === 'reduced') {
      const quantObj = model.quants.find(q => q.name.split(' ')[0] === fit.quant);
      const speed = estimateSpeedToks(model, quantObj, config.bandwidthGbs);
      runsInVram.push({ model, fit, speed });
    } else {
      const perK = ((model.contextCostPer8k || 0) * kvScale) / 8;
      const contextCost = contextK * perK;
      const needed = Number((fit.smallestVram + contextCost).toFixed(1));
      const shortfall = Math.max(0, Number((needed - usable).toFixed(1)));
      doesNotFit.push({ model, fit, shortfall, needed });
    }
  }

  return { runsInVram, doesNotFit, config };
}

/**
 * Upgrade engine: Evaluates adding one card from the 19 tracked GPUS_DATA rows
 * to the currently owned configuration.
 * Mixed add sums VRAM and uses the slower card's bandwidth.
 * Ranked by: most models unlocked desc, ties broken by unlocks per dollar desc, then lower price asc.
 */
export function computeUpgradeCandidates(ownedGpu, count, { contextK = 8, kvPrecision = 'FP16' } = {}) {
  if (isIntegratedSystem(ownedGpu.id)) {
    return [];
  }
  const kvScale = KV_PRECISION_SCALES[kvPrecision] ?? 1.0;
  const currentMemory = ownedGpu.vram * count;
  const currentBandwidth = ownedGpu.bandwidth;
  const currentConfig = { memoryGb: currentMemory, bandwidthGbs: currentBandwidth };

  const currentStatusMap = new Map();
  for (const m of MODELS_DATA) {
    const f = tierFit(m, currentConfig, { contextK, kvScale });
    currentStatusMap.set(m.id, f.status);
  }

  const results = [];
  for (const candidate of GPUS_DATA) {
    const newMemory = currentMemory + candidate.vram;
    const newBandwidth = Math.min(currentBandwidth, candidate.bandwidth);
    const newConfig = { memoryGb: newMemory, bandwidthGbs: newBandwidth };

    let unlocked = 0;
    let improved = 0;

    for (const m of MODELS_DATA) {
      const oldStatus = currentStatusMap.get(m.id);
      const newFit = tierFit(m, newConfig, { contextK, kvScale });
      if (oldStatus === 'none' && (newFit.status === 'fits' || newFit.status === 'reduced')) {
        unlocked++;
      }
      if (oldStatus === 'reduced' && newFit.status === 'fits') {
        improved++;
      }
    }

    const cost = candidate.usedStreetPrice;
    const unlocksPerDollar = cost > 0 ? (unlocked / cost) : 0;

    results.push({
      candidate,
      newMemory,
      newBandwidth,
      unlocked,
      improved,
      cost,
      unlocksPerDollar,
      totalTdp: (ownedGpu.tdp * count) + candidate.tdp,
      totalCards: count + 1
    });
  }

  // Sort: most models unlocked desc, ties broken by unlocks per dollar desc, then by lower price asc
  results.sort((a, b) => {
    if (b.unlocked !== a.unlocked) return b.unlocked - a.unlocked;
    if (b.unlocksPerDollar !== a.unlocksPerDollar) return b.unlocksPerDollar - a.unlocksPerDollar;
    return a.cost - b.cost;
  });

  return results;
}

/**
 * Pure HTML for the playground in a given state.
 */
export function renderRigPlaygroundHtml(state = {}) {
  const { gpuId, count, contextK, kvPrecision } = { ...PLAYGROUND_DEFAULTS, ...state };
  const gpu = findPlaygroundGpu(gpuId);
  const isIntegrated = isIntegratedSystem(gpu.id);
  const actualCount = isIntegrated ? 1 : count;

  const totalMemoryGb = gpu.vram * actualCount;
  const bandwidthGbs = gpu.bandwidth; // per-card bandwidth for pair
  const totalTdp = gpu.tdp * actualCount;
  const usableGb = totalMemoryGb - 1;

  const config = { memoryGb: totalMemoryGb, bandwidthGbs: bandwidthGbs };
  const { runsInVram, doesNotFit } = evaluatePlaygroundModels(config, { contextK, kvPrecision });

  let upgrades = [];
  let bestUpgrade = null;
  let recommendedPsu = 0;
  if (!isIntegrated) {
    upgrades = computeUpgradeCandidates(gpu, actualCount, { contextK, kvPrecision });
    bestUpgrade = upgrades[0];
    if (bestUpgrade) {
      recommendedPsu = recommendedPsuWatts(bestUpgrade.totalTdp);
    }
  }

  return `
    <div class="playground-container">
      <div class="playground-header">
        <h1>Local AI Rig Playground</h1>
        <p class="playground-intro">
          Select the GPU you already own (or an integrated system) to see which of our 56 local LLMs run in VRAM, your generation speeds, and the highest-impact upgrades for your setup.
        </p>
      </div>

      <!-- Configuration Bar -->
      <div class="playground-config-bar">
        <div class="playground-controls-row">
          <div class="playground-control-group">
            <label for="playground-gpu-select" class="model-filter-label">Owned Hardware</label>
            <select id="playground-gpu-select" class="playground-select" aria-label="Select owned GPU or system">
              <optgroup label="Tracked GPUs & Systems (${GPUS_DATA.length})">
                ${GPUS_DATA.map(g => `<option value="${g.id}" ${g.id === gpu.id ? 'selected' : ''}>${g.name} (${g.vram} GB, ${g.bandwidth} GB/s)</option>`).join('')}
              </optgroup>
              <optgroup label="Popular Gaming GPUs — Spec Only (${OWNED_GPUS_SUPPLEMENT.length})">
                ${OWNED_GPUS_SUPPLEMENT.map(g => `<option value="${g.id}" ${g.id === gpu.id ? 'selected' : ''}>${g.name} (${g.vram} GB, ${g.bandwidth} GB/s)</option>`).join('')}
              </optgroup>
            </select>
          </div>

          <div class="playground-control-group">
            <span class="model-filter-label">Card Count</span>
            ${isIntegrated ? `
              <span class="badge count-badge-locked">1 (Locked Integrated System)</span>
            ` : `
              <div class="count-filter" role="group" aria-label="GPU card count">
                <button class="filter-btn count-btn ${actualCount === 1 ? 'active' : ''}" data-count="1" aria-pressed="${actualCount === 1}">1 Card</button>
                <button class="filter-btn count-btn ${actualCount === 2 ? 'active' : ''}" data-count="2" aria-pressed="${actualCount === 2}">2 Cards</button>
              </div>
            `}
          </div>
        </div>

        <!-- Context Length & KV Cache Precision Controls -->
        <div class="context-kv-controls" role="group" aria-label="Fit-check context and KV precision">
          <div class="context-filter" role="group" aria-label="Fit-check context length">
            <span class="model-filter-label">Fit-check context</span>
            ${CONTEXT_STEPS.map(c => `<button class="filter-btn context-btn ${contextK === c ? 'active' : ''}" data-context="${c}" aria-pressed="${contextK === c}">${c}K</button>`).join('')}
          </div>
          <div class="kv-precision-filter" role="group" aria-label="KV cache precision">
            <span class="model-filter-label">KV cache precision</span>
            ${KV_PRECISION_OPTIONS.map(opt => `<button class="filter-btn kv-btn ${kvPrecision === opt ? 'active' : ''}" data-kv="${opt}" aria-pressed="${kvPrecision === opt}">${opt}</button>`).join('')}
          </div>
        </div>
        <p class="context-kv-helper">KV precision scales context memory (llama.cpp <code>--cache-type-k/v</code> f16, fp8, or q4_0).</p>
      </div>

      <!-- Rig Status Dashboard -->
      <div class="playground-rig-status">
        <div class="rig-status-item">
          <span class="rig-status-label">Total VRAM</span>
          <strong class="rig-status-val">${totalMemoryGb} GB</strong>
          <span class="rig-status-sub">${usableGb} GB usable for weights & context</span>
        </div>
        <div class="rig-status-item">
          <span class="rig-status-label">Memory Bandwidth</span>
          <strong class="rig-status-val">${bandwidthGbs} GB/s</strong>
          <span class="rig-status-sub">${actualCount > 1 ? 'Per-card bandwidth for pair' : 'Vendor spec peak'}</span>
        </div>
        <div class="rig-status-item">
          <span class="rig-status-label">Total GPU TDP</span>
          <strong class="rig-status-val">${totalTdp}W</strong>
          <span class="rig-status-sub">${actualCount > 1 ? `${actualCount}x ${gpu.tdp}W cards` : 'Single card peak'}</span>
        </div>
        <div class="rig-status-item">
          <span class="rig-status-label">Catalog Fit</span>
          <strong class="rig-status-val status-runs">${runsInVram.length} / 56</strong>
          <span class="rig-status-sub">${doesNotFit.length} models exceed VRAM</span>
        </div>
      </div>

      <!-- Upgrade Engine Section -->
      ${isIntegrated ? `
        <div class="playground-upgrade-section">
          <div class="integrated-system-note">
            ${icon('bulb')}
            <div>
              <strong>Integrated Architecture:</strong> ${gpu.name} uses unified system memory shared between CPU and GPU. It does not accept add-in PCIe GPU upgrades.
            </div>
          </div>
        </div>
      ` : (bestUpgrade ? `
        <div class="playground-upgrade-section">
          <div class="selector-label">
            <span>Upgrade Engine: Best Single-Card Additions</span>
            <span class="selector-note">Adding one card from the 19 tracked rows. A mixed add sums VRAM and uses the slower card's bandwidth (conservative assumption).</span>
          </div>

          <!-- Best Upgrade Callout Card -->
          <div class="playground-best-upgrade-card">
            <div class="best-upgrade-title-row">
              <span class="tier-badge-label tier-badge-budget">${icon('zap')} Best Upgrade</span>
              <h3 class="best-upgrade-heading">Add 1x ${bestUpgrade.candidate.name}</h3>
            </div>

            <div class="best-upgrade-grid">
              <div class="best-upgrade-metric">
                <span class="metric-label">Models Unlocked</span>
                <strong class="metric-val is-good">+${bestUpgrade.unlocked}</strong>
                <span class="metric-sub">Newly fitting models</span>
              </div>
              <div class="best-upgrade-metric">
                <span class="metric-label">Quality Improved</span>
                <strong class="metric-val">+${bestUpgrade.improved}</strong>
                <span class="metric-sub">Promoted to sweet-spot quant</span>
              </div>
              <div class="best-upgrade-metric">
                <span class="metric-label">Est. Used Price</span>
                <strong class="metric-val">$${bestUpgrade.cost.toLocaleString()}</strong>
                <span class="metric-sub">${(bestUpgrade.unlocksPerDollar * 1000).toFixed(2)} unlocks / $1,000</span>
              </div>
              <div class="best-upgrade-metric">
                <span class="metric-label">New Total VRAM</span>
                <strong class="metric-val">${bestUpgrade.newMemory} GB</strong>
                <span class="metric-sub">at ${bestUpgrade.newBandwidth} GB/s bandwidth</span>
              </div>
            </div>

            <!-- Power & Multi-Card Checklist -->
            <div class="best-upgrade-power">
              <p><strong>Power Draw:</strong> Resulting configuration draws <strong>${bestUpgrade.totalTdp}W</strong> GPU TDP. Recommended power supply: <strong>~${recommendedPsu}W PSU</strong> (total TDP + 150W system allowance, rounded up to the next 50W; rule-of-thumb estimate).</p>
              ${bestUpgrade.totalCards >= 2 ? `
                <div class="playground-checklist">
                  <strong>Multi-Card Upgrade Checklist (General Guidance):</strong>
                  <ul>
                    <li><strong>PCIe Slot Spacing:</strong> Ensure at least 2 to 3 slots of motherboard clearance between GPUs for cooling fan intake airflow.</li>
                    <li><strong>PCIe Lane Bifurcation:</strong> Ensure your motherboard and CPU support x8/x8 lane splitting (bifurcation) on primary PCIe slots.</li>
                    <li><strong>Case Clearance & Power Cables:</strong> Check GPU card length (mm) against case interior, and verify dedicated 8-pin / 12VHPWR PCIe power cables from the PSU.</li>
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Top 5 Upgrade Candidates Table -->
          <div class="parts-table-wrap">
            <table class="parts-table stack-table">
              <thead>
                <tr>
                  <th scope="col">Candidate GPU</th>
                  <th scope="col">Added VRAM</th>
                  <th scope="col">New Total VRAM</th>
                  <th scope="col">Est. Used Price</th>
                  <th scope="col">Models Unlocked</th>
                  <th scope="col">Models Improved</th>
                  <th scope="col">Unlocks / $1,000</th>
                </tr>
              </thead>
              <tbody>
                ${upgrades.slice(0, 5).map(c => `
                  <tr>
                    <td class="stack-head"><strong>${c.candidate.name}</strong></td>
                    <td data-label="Added VRAM">+${c.candidate.vram} GB</td>
                    <td data-label="New Total VRAM">${c.newMemory} GB</td>
                    <td class="part-price-cell" data-label="Est. Used Price">$${c.cost.toLocaleString()}</td>
                    <td data-label="Models Unlocked"><strong class="is-good">+${c.unlocked}</strong></td>
                    <td data-label="Models Improved">+${c.improved}</td>
                    <td data-label="Unlocks / $1k">${(c.unlocksPerDollar * 1000).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : '')}

      <!-- Results Grid: Runs in VRAM vs Does Not Fit -->
      <div class="playground-results-grid">
        <!-- Section 1: Runs in VRAM -->
        <div class="playground-results-col">
          <div class="selector-label">
            <span class="is-good">Runs in VRAM (${runsInVram.length} Models)</span>
            <span class="selector-note">Fits with ${contextK}K context at ${kvPrecision} KV precision</span>
          </div>

          <div class="parts-table-wrap">
            <table class="parts-table stack-table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Chosen Quant</th>
                  <th scope="col">Typical Speed</th>
                  <th scope="col">Context Room</th>
                </tr>
              </thead>
              <tbody>
                ${runsInVram.length === 0 ? `
                  <tr><td colspan="4" class="text-dim">No models in the catalog fit this configuration with ${contextK}K context.</td></tr>
                ` : runsInVram.map(({ model: m, fit, speed }) => `
                  <tr>
                    <td class="stack-head">
                      <a href="${buildPath(m.id)}" class="model-link"><strong>${m.name}</strong></a>
                      <div class="part-spec-sub">${m.parameters}</div>
                    </td>
                    <td data-label="Chosen Quant">
                      <strong>${fit.quant}</strong>
                      ${fit.status === 'reduced' ? ' <span class="condition-badge condition-used">Reduced</span>' : ' <span class="condition-badge condition-new">Sweet Spot</span>'}
                    </td>
                    <td data-label="Typical Speed">${speed ? `~${speed.low}-${speed.high} tok/s` : 'n/a'}</td>
                    <td data-label="Context Room">${fit.contextLabel}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 2: Does Not Fit -->
        <div class="playground-results-col">
          <div class="selector-label">
            <span class="is-warn">Does Not Fit (${doesNotFit.length} Models)</span>
            <span class="selector-note">Exceeds ${usableGb} GB usable VRAM (${totalMemoryGb} GB rig - 1 GB overhead)</span>
          </div>

          <div class="parts-table-wrap">
            <table class="parts-table stack-table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Smallest Quant</th>
                  <th scope="col">Shortfall vs Usable VRAM</th>
                </tr>
              </thead>
              <tbody>
                ${doesNotFit.length === 0 ? `
                  <tr><td colspan="3" class="text-dim">All 56 models fit in this configuration!</td></tr>
                ` : doesNotFit.map(({ model: m, fit, shortfall, needed }) => `
                  <tr>
                    <td class="stack-head">
                      <a href="${buildPath(m.id)}" class="model-link"><strong>${m.name}</strong></a>
                      <div class="part-spec-sub">${m.parameters}</div>
                    </td>
                    <td data-label="Smallest Quant">
                      <strong>${fit.smallestQuant}</strong> (${fit.smallestVram} GB)
                    </td>
                    <td data-label="Shortfall">
                      <span class="no-fit-note"><strong>+${shortfall} GB needed</strong></span>
                      <div class="part-spec-sub">Needs ${needed} GB with ${contextK}K context vs ${usableGb} GB usable</div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Client-side interactive controller for the Rig Playground view.
 */
export function createRigPlayground(container) {
  let gpuId = PLAYGROUND_DEFAULTS.gpuId;
  let count = PLAYGROUND_DEFAULTS.count;
  let contextK = PLAYGROUND_DEFAULTS.contextK;
  let kvPrecision = PLAYGROUND_DEFAULTS.kvPrecision;

  function render() {
    const restoreFocus = preserveFocus(container);
    container.innerHTML = renderRigPlaygroundHtml({ gpuId, count, contextK, kvPrecision });
    attachEvents();
    restoreFocus();
  }

  function attachEvents() {
    // GPU select
    const gpuSelect = container.querySelector('#playground-gpu-select');
    if (gpuSelect) {
      gpuSelect.addEventListener('change', (e) => {
        gpuId = e.target.value;
        if (isIntegratedSystem(gpuId)) {
          count = 1;
        }
        render();
      });
    }

    // Count buttons
    container.querySelectorAll('.count-filter .count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = parseInt(btn.getAttribute('data-count'), 10);
        if (c && c !== count) {
          count = c;
          render();
        }
      });
    });

    // Context length buttons
    container.querySelectorAll('.context-filter .context-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = parseInt(btn.getAttribute('data-context'), 10);
        if (c && c !== contextK) {
          contextK = c;
          render();
        }
      });
    });

    // KV precision buttons
    container.querySelectorAll('.kv-precision-filter .kv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const kv = btn.getAttribute('data-kv');
        if (kv && kv !== kvPrecision) {
          kvPrecision = kv;
          render();
        }
      });
    });
  }

  render();

  return {
    setConfig: (newConfig = {}) => {
      if (newConfig.gpuId) gpuId = newConfig.gpuId;
      if (newConfig.count) count = newConfig.count;
      if (newConfig.contextK) contextK = newConfig.contextK;
      if (newConfig.kvPrecision) kvPrecision = newConfig.kvPrecision;
      if (isIntegratedSystem(gpuId)) count = 1;
      render();
    },
    getState: () => ({ gpuId, count, contextK, kvPrecision })
  };
}
