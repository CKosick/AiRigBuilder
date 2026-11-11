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

export const CUSTOM_UNIFIED_ID = 'custom-unified';

export const CUSTOM_UNIFIED_DEFAULTS = {
  memoryGb: 96,
  bandwidthGbs: 256
};

export const CUSTOM_BANDWIDTH_PRESETS = [
  { bandwidthGbs: 256, label: '256 (Strix Halo)' },
  { bandwidthGbs: 273, label: '273 (DGX Spark)' },
  { bandwidthGbs: 800, label: '800 (M2 Ultra)' },
  { bandwidthGbs: 819, label: '819 (M3 Ultra)' },
  { bandwidthGbs: 1200, label: '1200 (M5 Ultra)' }
];

function parseAndClamp(raw, fallback, min, max) {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'string' && raw.trim() === '') return fallback;
  if (typeof raw === 'boolean') return fallback;
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function clampCustomUnifiedConfig(rawMemory, rawBandwidth) {
  return {
    memoryGb: parseAndClamp(rawMemory, CUSTOM_UNIFIED_DEFAULTS.memoryGb, 4, 1024),
    bandwidthGbs: parseAndClamp(rawBandwidth, CUSTOM_UNIFIED_DEFAULTS.bandwidthGbs, 10, 2000)
  };
}

export const isIntegratedSystem = (gpuId) =>
  INTEGRATED_SYSTEM_IDS.includes(gpuId) || gpuId === CUSTOM_UNIFIED_ID;

/**
 * Derives a GPU's vendor ('NVIDIA' | 'AMD' | 'Intel' | null) from its name prefix,
 * covering both GPUS_DATA and OWNED_GPUS_SUPPLEMENT.
 */
export function gpuVendor(gpu) {
  const name = typeof gpu === 'string' ? gpu : gpu?.name;
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (/^NVIDIA\b/i.test(trimmed)) return 'NVIDIA';
  if (/^AMD\b/i.test(trimmed)) return 'AMD';
  if (/^Intel\b/i.test(trimmed)) return 'Intel';
  return null;
}

export function findPlaygroundGpu(id) {
  return PLAYGROUND_GPUS.find(g => g.id === id) || GPUS_DATA.find(g => g.id === 'rtx-3080-10gb') || GPUS_DATA[0];
}

export const PLAYGROUND_DEFAULTS = {
  gpuId: 'rtx-3080-10gb',
  count: 1,
  contextK: 8,
  kvPrecision: 'FP16',
  customMemoryGb: CUSTOM_UNIFIED_DEFAULTS.memoryGb,
  customBandwidthGbs: CUSTOM_UNIFIED_DEFAULTS.bandwidthGbs
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
 * Returns partitioned lists: { runsInVram, doesNotFit }.
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
 * Upgrade engine: Evaluates adding one same-vendor card from the tracked discrete GPUs
 * (excluding integrated systems) to the currently owned configuration.
 * Mixed add sums VRAM and uses the slower card's bandwidth.
 * Ranked by: most models unlocked desc, ties broken by unlocks per dollar desc, then lower price asc.
 */
export function computeUpgradeCandidates(ownedGpu, count, { contextK = 8, kvPrecision = 'FP16' } = {}) {
  if (!ownedGpu || isIntegratedSystem(ownedGpu.id)) {
    return [];
  }
  const ownedVendor = gpuVendor(ownedGpu);
  if (!ownedVendor) {
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
    if (isIntegratedSystem(candidate.id)) continue;
    const candidateVendor = gpuVendor(candidate);
    if (!candidateVendor || candidateVendor !== ownedVendor) continue;
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
    const unlocksPer1000 = Number((unlocksPerDollar * 1000).toFixed(2));

    results.push({
      candidate,
      newMemory,
      newBandwidth,
      unlocked,
      improved,
      cost,
      unlocksPerDollar,
      unlocksPer1000,
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
 * Selects the two headline upgrade picks from a ranked candidate list:
 * - mostUnlocked: sort winner (most models unlocked, ties: unlocksPerDollar desc, cost asc)
 * - bestValue: highest unlocksPerDollar among candidates that unlock >= 1 model
 *   (ties: unlocked desc, cost asc)
 * - sameCard: true when one candidate wins both picks
 */
export function selectUpgradePicks(candidates = []) {
  const mostUnlocked = candidates[0] || null;
  const unlocking = candidates.filter(c => c.unlocked >= 1);
  const bestValue = unlocking.length > 0
    ? [...unlocking].sort((a, b) => {
      if (b.unlocksPerDollar !== a.unlocksPerDollar) return b.unlocksPerDollar - a.unlocksPerDollar;
      if (b.unlocked !== a.unlocked) return b.unlocked - a.unlocked;
      return a.cost - b.cost;
    })[0]
    : null;
  const sameCard = Boolean(
    mostUnlocked && bestValue && mostUnlocked.candidate.id === bestValue.candidate.id
  );
  return { mostUnlocked, bestValue, sameCard };
}

function renderUpgradePickCard(pick, badgesHtml, pickKind) {
  const recommendedPsu = recommendedPsuWatts(pick.totalTdp);
  const per1000 = (pick.unlocksPerDollar * 1000).toFixed(2);
  return `
    <div class="playground-best-upgrade-card" data-upgrade-pick="${pickKind}" data-candidate-id="${pick.candidate.id}">
      <div class="best-upgrade-title-row">
        ${badgesHtml}
        <h3 class="best-upgrade-heading">Add 1x ${pick.candidate.name}</h3>
      </div>

      <div class="best-upgrade-grid">
        <div class="best-upgrade-metric">
          <span class="metric-label">Models Unlocked</span>
          <strong class="metric-val is-good">+${pick.unlocked}</strong>
          <span class="metric-sub">Newly fitting models</span>
        </div>
        <div class="best-upgrade-metric">
          <span class="metric-label">Quality Improved</span>
          <strong class="metric-val">+${pick.improved}</strong>
          <span class="metric-sub">Promoted to sweet-spot quant</span>
        </div>
        <div class="best-upgrade-metric">
          <span class="metric-label">Est. Used Price</span>
          <strong class="metric-val">$${pick.cost.toLocaleString()}</strong>
          <span class="metric-sub">${per1000} models unlocked / $1,000</span>
        </div>
        <div class="best-upgrade-metric">
          <span class="metric-label">New Total VRAM</span>
          <strong class="metric-val">${pick.newMemory} GB</strong>
          <span class="metric-sub">at ${pick.newBandwidth} GB/s bandwidth</span>
        </div>
      </div>

      <div class="best-upgrade-power">
        <p><strong>Power Draw:</strong> Resulting configuration draws <strong>${pick.totalTdp}W</strong> GPU TDP. Recommended power supply: <strong>~${recommendedPsu}W PSU</strong> (total TDP + 150W system allowance, rounded up to the next 50W; rule-of-thumb estimate).</p>
      </div>
    </div>
  `;
}

/**
 * Pure HTML for the playground in a given state.
 */
export function renderRigPlaygroundHtml(state = {}) {
  const { gpuId, count, contextK, kvPrecision } = { ...PLAYGROUND_DEFAULTS, ...state };
  const isCustomUnified = gpuId === CUSTOM_UNIFIED_ID;
  const rawMem = state.customMemoryGb !== undefined ? state.customMemoryGb : state.memoryGb;
  const rawBw = state.customBandwidthGbs !== undefined ? state.customBandwidthGbs : state.bandwidthGbs;
  const clampedCustom = clampCustomUnifiedConfig(rawMem, rawBw);

  const gpu = findPlaygroundGpu(gpuId);
  const isIntegrated = isCustomUnified || isIntegratedSystem(gpu.id);
  const actualCount = isIntegrated ? 1 : count;

  const totalMemoryGb = isCustomUnified ? clampedCustom.memoryGb : gpu.vram * actualCount;
  const bandwidthGbs = isCustomUnified ? clampedCustom.bandwidthGbs : gpu.bandwidth; // per-card bandwidth for pair
  const totalTdp = isCustomUnified ? null : gpu.tdp * actualCount;
  const usableGb = totalMemoryGb - 1;

  const config = { memoryGb: totalMemoryGb, bandwidthGbs: bandwidthGbs };
  const { runsInVram, doesNotFit } = evaluatePlaygroundModels(config, { contextK, kvPrecision });

  let upgrades = [];
  let picks = { mostUnlocked: null, bestValue: null, sameCard: false };
  if (!isIntegrated) {
    upgrades = computeUpgradeCandidates(gpu, actualCount, { contextK, kvPrecision });
    picks = selectUpgradePicks(upgrades);
  }

  const memInputValue = state.customMemoryRaw !== undefined ? state.customMemoryRaw : clampedCustom.memoryGb;
  const bwInputValue = state.customBandwidthRaw !== undefined ? state.customBandwidthRaw : clampedCustom.bandwidthGbs;

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
                ${GPUS_DATA.map(g => `<option value="${g.id}" ${!isCustomUnified && g.id === gpu.id ? 'selected' : ''}>${g.name} (${g.vram} GB, ${g.bandwidth} GB/s)</option>`).join('')}
                <option value="${CUSTOM_UNIFIED_ID}"${isCustomUnified ? ' selected' : ''}>Custom unified memory (enter your own)</option>
              </optgroup>
              <optgroup label="Popular Gaming GPUs — Spec Only (${OWNED_GPUS_SUPPLEMENT.length})">
                ${OWNED_GPUS_SUPPLEMENT.map(g => `<option value="${g.id}" ${!isCustomUnified && g.id === gpu.id ? 'selected' : ''}>${g.name} (${g.vram} GB, ${g.bandwidth} GB/s)</option>`).join('')}
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

        ${isCustomUnified ? `
          <div class="playground-custom-unified" id="playground-custom-unified-panel">
            <div class="playground-custom-fields">
              <div class="playground-control-group">
                <label for="playground-custom-memory" class="model-filter-label">Usable memory (GB)</label>
                <input
                  type="number"
                  id="playground-custom-memory"
                  class="playground-custom-input"
                  min="4"
                  max="1024"
                  step="1"
                  value="${memInputValue}"
                />
              </div>
              <div class="playground-control-group playground-custom-bw-group">
                <label for="playground-custom-bandwidth" class="model-filter-label">Memory bandwidth (GB/s)</label>
                <input
                  type="number"
                  id="playground-custom-bandwidth"
                  class="playground-custom-input"
                  min="10"
                  max="2000"
                  step="1"
                  value="${bwInputValue}"
                />
                <div class="custom-bandwidth-presets" role="group" aria-label="Memory bandwidth presets">
                  ${CUSTOM_BANDWIDTH_PRESETS.map(p => `<button type="button" class="vram-pill custom-bw-chip ${clampedCustom.bandwidthGbs === p.bandwidthGbs ? 'active' : ''}" data-bandwidth="${p.bandwidthGbs}" aria-pressed="${clampedCustom.bandwidthGbs === p.bandwidthGbs}">${p.label}</button>`).join('')}
                </div>
              </div>
            </div>
            <p class="custom-unified-guidance">Build sheets on this site count about 75% of a unified system's total memory as usable by models, so enter the usable figure (a 128 GB system is about 96 GB usable).</p>
          </div>
        ` : ''}

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
          <span class="rig-status-sub">${isCustomUnified ? 'Custom unified memory' : (actualCount > 1 ? 'Per-card bandwidth for pair' : 'Vendor spec peak')}</span>
        </div>
        ${!isCustomUnified ? `
        <div class="rig-status-item">
          <span class="rig-status-label">Total GPU TDP</span>
          <strong class="rig-status-val">${totalTdp}W</strong>
          <span class="rig-status-sub">${actualCount > 1 ? `${actualCount}x ${gpu.tdp}W cards` : 'Single card peak'}</span>
        </div>
        ` : ''}
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
              <strong>Integrated Architecture:</strong> ${isCustomUnified ? 'This custom unified-memory system' : gpu.name} uses unified system memory shared between CPU and GPU. It does not accept add-in PCIe GPU upgrades.
            </div>
          </div>
        </div>
      ` : (picks.mostUnlocked ? `
        <div class="playground-upgrade-section">
          <div class="selector-label">
            <span>Upgrade Engine: Best Single-Card Additions</span>
            <span class="selector-note">Adding one same-vendor discrete card from the tracker. A mixed add sums VRAM and uses the slower card's bandwidth (conservative assumption).</span>
          </div>

          <!-- Headline Upgrade Picks -->
          <div class="playground-upgrade-picks">
            ${picks.sameCard
        ? renderUpgradePickCard(
          picks.mostUnlocked,
          `<span class="tier-badge-label tier-badge-budget">${icon('zap')} Most models unlocked</span>
                   <span class="tier-badge-label tier-badge-speed">${icon('chart')} Best value</span>`,
          'both'
        )
        : `${renderUpgradePickCard(
          picks.mostUnlocked,
          `<span class="tier-badge-label tier-badge-budget">${icon('zap')} Most models unlocked</span>`,
          'most-unlocked'
        )}${picks.bestValue ? renderUpgradePickCard(
          picks.bestValue,
          `<span class="tier-badge-label tier-badge-speed">${icon('chart')} Best value</span>`,
          'best-value'
        ) : ''}`
      }
          </div>

          ${picks.mostUnlocked.totalCards >= 2 ? `
            <div class="playground-checklist">
              <strong>Multi-Card Upgrade Checklist (General Guidance):</strong>
              <ul>
                <li><strong>PCIe Slot Spacing:</strong> Ensure at least 2 to 3 slots of motherboard clearance between GPUs for cooling fan intake airflow.</li>
                <li><strong>PCIe Lane Bifurcation:</strong> Ensure your motherboard and CPU support x8/x8 lane splitting (bifurcation) on primary PCIe slots.</li>
                <li><strong>Case Clearance & Power Cables:</strong> Check GPU card length (mm) against case interior, and verify dedicated 8-pin / 12VHPWR PCIe power cables from the PSU.</li>
              </ul>
            </div>
          ` : ''}

          <!-- Full Ranked Upgrade Candidates Table -->
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
                  <th scope="col">Models Unlocked / $1,000</th>
                </tr>
              </thead>
              <tbody>
                ${upgrades.map(c => `
                  <tr data-candidate-id="${c.candidate.id}">
                    <td class="stack-head"><strong>${c.candidate.name}</strong></td>
                    <td data-label="Added VRAM">+${c.candidate.vram} GB</td>
                    <td data-label="New Total VRAM">${c.newMemory} GB</td>
                    <td class="part-price-cell" data-label="Est. Used Price">$${c.cost.toLocaleString()}</td>
                    <td data-label="Models Unlocked"><strong class="is-good">+${c.unlocked}</strong></td>
                    <td data-label="Models Improved">+${c.improved}</td>
                    <td data-label="Models / $1,000">${(c.unlocksPerDollar * 1000).toFixed(2)} / $1,000</td>
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
                  <tr data-model-id="${m.id}">
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
                  <tr data-model-id="${m.id}">
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
  let customMemoryGb = PLAYGROUND_DEFAULTS.customMemoryGb;
  let customBandwidthGbs = PLAYGROUND_DEFAULTS.customBandwidthGbs;
  let customMemoryRaw = String(customMemoryGb);
  let customBandwidthRaw = String(customBandwidthGbs);

  function render() {
    const restoreFocus = preserveFocus(container);
    container.innerHTML = renderRigPlaygroundHtml({
      gpuId,
      count,
      contextK,
      kvPrecision,
      customMemoryGb,
      customBandwidthGbs,
      customMemoryRaw,
      customBandwidthRaw
    });
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

    // Custom unified memory input
    const memInput = container.querySelector('#playground-custom-memory');
    if (memInput) {
      memInput.addEventListener('input', (e) => {
        customMemoryRaw = e.target.value;
        const clamped = clampCustomUnifiedConfig(customMemoryRaw, customBandwidthRaw);
        customMemoryGb = clamped.memoryGb;
        render();
      });
      memInput.addEventListener('change', (e) => {
        const clamped = clampCustomUnifiedConfig(e.target.value, customBandwidthRaw);
        customMemoryGb = clamped.memoryGb;
        customMemoryRaw = String(clamped.memoryGb);
        render();
      });
    }

    // Custom unified bandwidth input
    const bwInput = container.querySelector('#playground-custom-bandwidth');
    if (bwInput) {
      bwInput.addEventListener('input', (e) => {
        customBandwidthRaw = e.target.value;
        const clamped = clampCustomUnifiedConfig(customMemoryRaw, customBandwidthRaw);
        customBandwidthGbs = clamped.bandwidthGbs;
        render();
      });
      bwInput.addEventListener('change', (e) => {
        const clamped = clampCustomUnifiedConfig(customMemoryRaw, e.target.value);
        customBandwidthGbs = clamped.bandwidthGbs;
        customBandwidthRaw = String(clamped.bandwidthGbs);
        render();
      });
    }

    // Custom bandwidth preset chips
    container.querySelectorAll('.custom-bw-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const bw = Number(btn.getAttribute('data-bandwidth'));
        if (bw) {
          customBandwidthGbs = bw;
          customBandwidthRaw = String(bw);
          render();
        }
      });
    });

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
      if (newConfig.gpuId !== undefined) gpuId = newConfig.gpuId;
      if (newConfig.count !== undefined) count = newConfig.count;
      if (newConfig.contextK !== undefined) contextK = newConfig.contextK;
      if (newConfig.kvPrecision !== undefined) kvPrecision = newConfig.kvPrecision;
      if (newConfig.customMemoryGb !== undefined || newConfig.memoryGb !== undefined) {
        const rawM = newConfig.customMemoryGb !== undefined ? newConfig.customMemoryGb : newConfig.memoryGb;
        customMemoryGb = clampCustomUnifiedConfig(rawM, customBandwidthGbs).memoryGb;
        customMemoryRaw = String(customMemoryGb);
      }
      if (newConfig.customBandwidthGbs !== undefined || newConfig.bandwidthGbs !== undefined) {
        const rawB = newConfig.customBandwidthGbs !== undefined ? newConfig.customBandwidthGbs : newConfig.bandwidthGbs;
        customBandwidthGbs = clampCustomUnifiedConfig(customMemoryGb, rawB).bandwidthGbs;
        customBandwidthRaw = String(customBandwidthGbs);
      }
      if (isIntegratedSystem(gpuId)) count = 1;
      render();
    },
    getState: () => ({ gpuId, count, contextK, kvPrecision, customMemoryGb, customBandwidthGbs })
  };
}

