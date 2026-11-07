// Model Picker & Build Sheet Component
import { MODELS_DATA } from '../data/models.js';
import { BUILDS_DATA } from '../data/builds.js';
import { isBestGpuModel, bestGpuPath } from '../data/comparisons.js';
import { CLOUD_RATES_AS_OF } from '../data/providers.js';
import { formatAffiliateUrl, AFFILIATE_LINK_REL } from '../config/affiliates.js';
import { preserveFocus } from '../utils/focus.js';
import { fillGpuPrices, cloudAlternative } from '../utils/siteFacts.js';
import { DEFAULT_MODEL_ID, SITE_URL, buildPath } from '../routes.js';
import { icon } from './icons.js';
import { tierFit, fitHeadline, fitDetail, defaultTierId, renderVramBreakdownBarHtml } from '../utils/tierFit.js';
export { renderVramBreakdownBarHtml } from '../utils/tierFit.js';
import { estimateSpeedToks, formatTierSpeedLine } from '../utils/speedEstimate.js';
import { buildPartsListMarkdown } from '../utils/markdownExport.js';
export { buildPartsListMarkdown } from '../utils/markdownExport.js';
import { renderTierCloudCalloutHtml } from '../utils/cloudCallout.js';
export { renderTierCloudCalloutHtml } from '../utils/cloudCallout.js';

export const CONTEXT_STEPS = [8, 16, 32, 64, 128];
export const KV_PRECISION_OPTIONS = ['FP16', 'FP8', 'Q4'];
export const KV_PRECISION_SCALES = {
  FP16: 1.0,
  FP8: 0.5,
  Q4: 0.25
};

const NEW_TIER_BADGES = {
  'tier-rtx-pro-6000': '96GB Workstation',
  'tier-strix-halo': 'Cheapest 96GB Fit',
  'tier-mac-m3-ultra': '72GB Unified',
  'tier-mac-m5-ultra-256': '192GB Unified',
  'tier-mac-m5-ultra-512': '384GB Unified',
  'tier-rtx-5090': '32GB Flagship',
  'tier-ram-offload': 'RAM Offload'
};

const GENERIC_BADGES = {
  used: 'Best Value',
  balanced: 'Balanced Pick',
  new: 'Premium Pick'
};

export const MODEL_PICKER_DEFAULTS = {
  activeModelId: DEFAULT_MODEL_ID,
  activeTierId: null, // null = the model's default tier (first one it fits)
  contextK: 8,
  kvPrecision: 'FP16',
  vramBudget: null, // GB; null = any. Shows models whose recommended VRAM fits
  codingOnly: false,
  searchQuery: '',
  showAllModels: false,
  isHome: false, // the home hero is the page's h1, so the model name drops to h2 there
  salesTaxRate: 7, // %
  dailyUsageHours: 4, // hrs/day
  kwhRate: 0.14 // $/kWh
};

// "Runs well in" choices, compared with each model's recommendedVram (its sweet-spot quant)
export const VRAM_BUDGETS = [12, 16, 24, 48, 96];
// The chooser lists this many models until "Show all" is pressed
export const VISIBLE_MODELS = 10;

const isCodingOrVision = (m) => Boolean(m.useCases && (m.useCases.includes('coding') || m.useCases.includes('vision')));

/** '70 Billion' -> '70B', '46.7B MoE (12.9B active)' -> '46.7B MoE' */
export const paramsShort = (m) => /Billion/.test(m.parameters) ? `${parseFloat(m.parameters)}B` : m.parameters.split(' (')[0];

export function filterModels({ vramBudget = null, codingOnly = false, searchQuery = '' } = {}) {
  return MODELS_DATA.filter(m => {
    if (vramBudget && m.recommendedVram > vramBudget) return false;
    if (codingOnly && !isCodingOrVision(m)) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = m.name.toLowerCase().includes(q);
      const matchesCreator = m.creator.toLowerCase().includes(q);
      const matchesDesc = fillGpuPrices(m.description || '').toLowerCase().includes(q);
      if (!matchesName && !matchesCreator && !matchesDesc) return false;
    }

    return true;
  });
}

/** The first VISIBLE_MODELS of the filtered list, plus the selected model if it is further down. */
function visibleModels(filtered, activeModelId, showAll) {
  if (showAll) return filtered;
  return filtered.filter((m, i) => i < VISIBLE_MODELS || m.id === activeModelId);
}

/** Sub-note under the sweet-spot quant: that quant's own quality note, so it fits every format (e.g. MXFP4). */
export function sweetSpotNote(model) {
  const rec = model.quants.find(q => q.recommended);
  return rec ? rec.quality : '';
}

export function findBuild(modelId, tierId) {
  const buildSheet = BUILDS_DATA[modelId] || BUILDS_DATA[DEFAULT_MODEL_ID];
  const currentTier = buildSheet.tiers.find(t => t.id === tierId) || buildSheet.tiers.find(t => t.id === defaultTierId(buildSheet));
  return { buildSheet, currentTier };
}

export function computeTierCosts(currentTier, { salesTaxRate, dailyUsageHours, kwhRate }) {
  const partsSubtotal = currentTier.parts.reduce((sum, p) => sum + (p.price || 0), 0);
  const taxAmount = Math.round(partsSubtotal * (salesTaxRate / 100));

  // Electricity: (Watts / 1000) * hours/day * 30.5 days * $/kWh
  const systemWatts = currentTier.estimatedTdpWatts || 800;
  const monthlyKwh = (systemWatts / 1000) * dailyUsageHours * 30.5;
  const monthlyPowerCost = Math.round(monthlyKwh * kwhRate);
  const firstYearPowerCost = Math.round(monthlyPowerCost * 12);
  const firstYearTrueTotal = partsSubtotal + taxAmount + firstYearPowerCost;
  return { partsSubtotal, taxAmount, systemWatts, monthlyPowerCost, firstYearPowerCost, firstYearTrueTotal };
}

function costBreakdownHtml(c, salesTaxRate) {
  return `
          <div class="cost-breakdown-row">
            <span>Hardware Parts:</span>
            <strong>$${c.partsSubtotal.toLocaleString()}</strong>
          </div>
          <div class="cost-breakdown-row">
            <span>Sales Tax (${salesTaxRate}%):</span>
            <strong>+$${c.taxAmount.toLocaleString()}</strong>
          </div>
          <div class="cost-breakdown-row">
            <span>Peak Power Draw:</span>
            <strong class="is-warn">${c.systemWatts}W under load</strong>
          </div>
          <div class="cost-breakdown-row">
            <span>Monthly Electricity:</span>
            <strong>+$${c.monthlyPowerCost}/mo</strong>
          </div>
          <div class="cost-breakdown-row is-total">
            <span>Year 1 Power Cost:</span>
            <strong>+$${c.firstYearPowerCost}/yr</strong>
          </div>
  `;
}

function totalHtml(c) {
  return `
          <div class="total-equity-label">True 1st-Year Total Cost</div>
          <div class="total-equity-number">$${c.firstYearTrueTotal.toLocaleString()}</div>
          <div class="total-equity-sub">Parts ($${c.partsSubtotal}) + Tax ($${c.taxAmount}) + 1-Yr Power ($${c.firstYearPowerCost})</div>
  `;
}

const escapeAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Pure HTML for the picker in a given state. The component renders it in the browser
 * and scripts/prerender.js renders it at build time, so both produce the same markup.
 */
export function renderModelPickerHtml(state = {}) {
  const {
    activeModelId, activeTierId, contextK, kvPrecision, vramBudget, codingOnly, searchQuery, showAllModels, isHome, salesTaxRate, dailyUsageHours, kwhRate
  } = { ...MODEL_PICKER_DEFAULTS, ...state };
  const isDefaultSettings = contextK === 8 && kvPrecision === 'FP16';
  const kvScale = KV_PRECISION_SCALES[kvPrecision] ?? 1.0;
  const titleTag = isHome ? 'h2' : 'h1';
  const currentModel = MODELS_DATA.find(m => m.id === activeModelId) || MODELS_DATA[0];
  const effectiveCostPer8k = currentModel.contextCostPer8k
    ? (isDefaultSettings ? currentModel.contextCostPer8k : Math.round(currentModel.contextCostPer8k * kvScale * 100) / 100)
    : null;
  const cloud = cloudAlternative(currentModel);
  const smallestQuantName = currentModel.quants.reduce((a, b) => (b.vram < a.vram ? b : a), currentModel.quants[0]).name.split(' (')[0];
  const { buildSheet, currentTier } = findBuild(activeModelId, activeTierId);
  const filteredModels = filterModels({ vramBudget, codingOnly, searchQuery });
  const shownModels = visibleModels(filteredModels, activeModelId, showAllModels);
  const costs = computeTierCosts(currentTier, { salesTaxRate, dailyUsageHours, kwhRate });
  const { partsSubtotal, taxAmount } = costs;

  return `
    <!-- Model chooser: VRAM and use filters, search, then the matching models by full name -->
    <div class="model-selector-bar">
      <div class="selector-label">
        <span>1. Pick the model you want to run</span>
        <a href="/builds" class="builds-index-link">Compare all ${MODELS_DATA.length} build sheets →</a>
      </div>

      <div class="model-filters">
        <div class="vram-filter" role="group" aria-label="Show models that run well in this much VRAM">
          <span class="model-filter-label">Runs well in</span>
          <button class="filter-btn ${!vramBudget ? 'active' : ''}" data-vram="" aria-pressed="${!vramBudget}">Any VRAM</button>
          ${VRAM_BUDGETS.map(v => `<button class="filter-btn ${vramBudget === v ? 'active' : ''}" data-vram="${v}" aria-pressed="${vramBudget === v}">${v} GB</button>`).join('')}
        </div>
        <div class="model-filters-side">
          <button class="filter-btn ${codingOnly ? 'active' : ''}" id="btn-coding-only" aria-pressed="${codingOnly}">Coding & vision</button>
          <input type="search" id="model-search-input" class="model-search" aria-label="Search models" value="${escapeAttr(searchQuery)}" placeholder="Search models">
        </div>
      </div>

      <p class="model-results-count">${filteredModels.length === MODELS_DATA.length ? `All ${MODELS_DATA.length} models` : `${filteredModels.length} of ${MODELS_DATA.length} models`}${vramBudget ? ` run well in ${vramBudget} GB of VRAM` : ''}</p>

      ${filteredModels.length > 0 ? `
      <div class="model-options${showAllModels ? '' : ' is-collapsed'}" id="model-options-list">
        ${shownModels.map(m => `
          <button class="model-option ${m.id === activeModelId ? 'active' : ''}" data-model-id="${m.id}" aria-pressed="${m.id === activeModelId}">
            <span class="model-option-name">${m.name}</span>
            <span class="model-option-meta">${paramsShort(m)} · ${m.recommendedVram} GB · ${m.sweetSpotQuant.split(' ')[0]}</span>
          </button>`).join('')}
      </div>
      ${filteredModels.length > VISIBLE_MODELS ? `
        <button class="btn-secondary model-options-toggle" id="btn-show-all-models" aria-expanded="${showAllModels}" aria-controls="model-options-list">
          ${showAllModels ? 'Show fewer models' : `Show all ${filteredModels.length} models`}
        </button>` : ''}
      ` : `
      <div class="model-options-empty">No models match these filters. <button class="btn-secondary" id="btn-reset-model-filter">Reset filters</button></div>
      `}
    </div>

    <!-- Model Spec & VRAM Requirements Banner -->
    <div class="model-spec-panel">
      <div class="model-info-block">
        <${titleTag} class="model-info-title">${currentModel.name}</${titleTag}>
        <p class="model-info-desc">${fillGpuPrices(currentModel.description)}</p>
        <div class="model-speed-line">
          ${icon('zap')}Typical Speed on Dual 3090: <strong>${currentModel.typicalSpeedDual3090}</strong>
        </div>
        ${isBestGpuModel(currentModel.id) ? `
        <div class="model-best-gpu-link">
          <a href="${bestGpuPath(currentModel.id)}" class="best-gpu-cta-link">Best GPU for ${currentModel.name}: Compare 15 GPUs &amp; Multi-GPU Rigs →</a>
        </div>` : ''}
      </div>

      <div class="spec-badge-box">
        <div class="spec-badge-label">Minimum VRAM</div>
        <div class="spec-badge-value">${currentModel.minVram} GB</div>
        <div class="sub-note">Strict minimum at ${smallestQuantName}</div>
      </div>

      <div class="spec-badge-box">
        <div class="spec-badge-label">Sweet Spot Quant</div>
        <div class="spec-badge-value spec-badge-quant">${currentModel.sweetSpotQuant}</div>
        ${sweetSpotNote(currentModel) ? `<div class="sub-note">${sweetSpotNote(currentModel)}</div>` : ''}
      </div>

      <div class="spec-badge-box">
        <div class="spec-badge-label">Cloud Alternative</div>
        <div class="spec-badge-value spec-badge-cost">${cloud.rate}</div>
        <div class="sub-note">${cloud.label} · Cloud rates checked ${CLOUD_RATES_AS_OF}</div>
      </div>
    </div>

    <!-- Model-specific quantization options -->
    ${currentModel.quants && currentModel.quants.length ? `
    <div class="quant-options">
      <div class="selector-label">
        <span>${currentModel.name}: Quantization Options</span>
        ${effectiveCostPer8k ? `<span class="context-cost-note">Context adds ~${effectiveCostPer8k} GB VRAM per 8K tokens</span>` : ''}
      </div>
      <div class="parts-table-wrap">
        <table class="parts-table stack-table">
          <thead>
            <tr>
              <th scope="col">Quant</th>
              <th scope="col">VRAM for Weights</th>
              <th scope="col">Typical Speed</th>
              <th scope="col">Quality Notes</th>
            </tr>
          </thead>
          <tbody>
            ${currentModel.quants.map(q => `
              <tr>
                <td class="stack-head"><strong>${q.name}</strong>${q.recommended ? ' <span class="condition-badge condition-new">Recommended</span>' : ''}</td>
                <td class="part-price-cell" data-label="VRAM for weights">${q.vram} GB</td>
                <td data-label="Typical speed">${q.speed}</td>
                <td class="stack-wide" data-label="Quality notes">${q.quality}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <!-- 3 Tier Selector Cards -->
    <div class="selector-label">
      <span>2. Choose Hardware Architecture Tier</span>
      <span class="selector-note">All tiers verified for physical GPU clearance & power transients</span>
    </div>

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

    <div class="tier-tabs-container">
      ${buildSheet.tiers.map((tier) => {
        const tierSubtotal = tier.parts.reduce((s, p) => s + (p.price || 0), 0);
        const fit = isDefaultSettings ? tier.fit : tierFit(currentModel, tier, { contextK, kvScale });
        const noFit = fit && fit.status === 'none';
        let badge = tier.badge;
        if (!isDefaultSettings) {
          if (noFit) {
            badge = "Won't Fit This Model";
          } else {
            badge = tier.badge !== "Won't Fit This Model" ? tier.badge : (NEW_TIER_BADGES[tier.id] || GENERIC_BADGES[tier.type] || 'Best Value');
          }
        }
        const badgeClass = noFit ? 'tier-badge-nofit' : tier.type === 'used' ? 'tier-badge-budget' : (tier.type === 'balanced' ? 'tier-badge-balanced' : 'tier-badge-new');
        const headline = isDefaultSettings ? tier.headline : fitHeadline(currentModel, fit);
        let speedLine = tier.speedLine;
        if (!isDefaultSettings) {
          if (noFit || tier.bandwidthGbs === null) {
            speedLine = null;
          } else {
            const fittedQuant = currentModel.quants.find(q => q.name.split(' ')[0] === fit.quant);
            const speed = estimateSpeedToks(currentModel, fittedQuant, tier.bandwidthGbs);
            speedLine = formatTierSpeedLine(fit.quant, speed);
          }
        }
        return `
          <div class="tier-tab-card ${tier.id === currentTier.id ? 'active' : ''}${noFit ? ' tier-no-fit' : ''}" data-tier-id="${tier.id}" role="button" tabindex="0" aria-pressed="${tier.id === currentTier.id}">
            <span class="tier-badge-label ${badgeClass}">${badge}</span>
            <div class="tier-title-row">
              <span class="tier-name">${tier.name}</span>
              <span class="tier-price-big">${tierSubtotal.toLocaleString()}</span>
            </div>
            <div class="tier-subtitle">${headline}</div>
            ${speedLine ? `<div class="tier-speed-line">${speedLine}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    <p class="tier-speed-method-note">Speeds shown on each tier are bandwidth-bound estimates from the model's active parameters and the rig's memory bandwidth; real results vary, and they are not benchmarks.</p>

    <!-- Build Sheet Details & Parts List -->
    <div class="build-sheet-card" id="parts-list">
      <div class="build-sheet-header">
        <div class="build-sheet-title">
          <h3>${currentTier.name} — Parts Manifest</h3>
          <p>${(() => {
            if (isDefaultSettings) return currentTier.rigSummary;
            const currentTierFit = tierFit(currentModel, currentTier, { contextK, kvScale });
            if (currentTier.id === 'tier-ram-offload') {
              return `${currentTier.name} with ${currentTier.memoryGb} GB of DDR5 system RAM used for CPU offload, plus an RTX 3090 24 GB for partial-offload acceleration (a speed bonus, not added to model capacity). ${fitDetail(currentModel, currentTierFit)} Most layers are computed from system RAM, so expect single-digit tokens per second, roughly 3 to 8 tok/s on this class of rig (estimate), versus the far higher speeds of a GPU-resident fit.`;
            }
            let summary = `${currentTier.name} with ${currentTier.memoryGb} GB of usable GPU memory. ${fitDetail(currentModel, currentTierFit)}`;
            if (currentTier.id === 'tier-rtx-5090') {
              summary += ' (Alternative: AMD Radeon AI PRO R9700 32GB offers 32GB VRAM in a dual-slot blower for less, at 640 GB/s without CUDA).';
            }
            return summary;
          })()}</p>
        </div>
        <div class="build-quick-actions">
          <button class="btn-secondary" id="btn-copy-parts-list">
            ${icon('copy')}<span>Copy parts list</span>
          </button>
          <button class="btn-primary" id="btn-send-to-calc">
            ${icon('calculator')}Calculate Break-Even ROI →
          </button>
        </div>
      </div>

      ${renderVramBreakdownBarHtml(tierFit(currentModel, currentTier, { contextK, kvScale }), currentTier)}

      <div class="parts-table-wrap">
        <table class="parts-table stack-table">
          <thead>
            <tr>
              <th class="col-component">Component</th>
              <th class="col-part">Part Details & Gotchas</th>
              <th class="col-condition">Condition</th>
              <th class="col-price">Price</th>
              <th class="col-merchant">Merchant Link</th>
            </tr>
          </thead>
          <tbody>
            ${currentTier.parts.map(part => {
              const condClass = part.condition.includes('Used') ? 'condition-used' : (part.condition.includes('New') ? 'condition-new' : 'condition-included');
              return `
                <tr>
                  <td class="stack-head">
                    <span class="part-category-tag">${part.category}</span>
                  </td>
                  <td class="part-name-cell stack-head">
                    <strong>${part.name}</strong>
                    <div class="part-spec-sub">${part.spec}</div>
                    ${part.notes ? `<div class="part-notes">${icon('bulb')}<span>${part.notes}</span></div>` : ''}
                  </td>
                  <td data-label="Condition">
                    <span class="condition-badge ${condClass}">
                      ${part.condition}
                    </span>
                  </td>
                  <td class="part-price-cell" data-label="Price">
                    ${part.price > 0 ? `$${part.price.toLocaleString()}` : '<span class="text-dim">Included</span>'}
                  </td>
                  <td class="stack-action col-merchant">
                    ${part.url !== '#' ? (() => {
                      const urlLower = (part.url || '').toLowerCase();
                      const merchLower = (part.merchant || '').toLowerCase();
                      let btnLabel = `${icon('cart')}Merchant Link`;
                      if (urlLower.includes('ebay.') || (!urlLower.includes('amazon.') && merchLower.includes('ebay'))) {
                        btnLabel = `${icon('search')}Search eBay`;
                      } else if (urlLower.includes('amazon.') || merchLower.includes('amazon')) {
                        btnLabel = `${icon('cart')}Amazon`;
                      } else if (urlLower.includes('bhphoto') || merchLower.includes('b&h')) {
                        btnLabel = `${icon('package')}B&H Photo`;
                      } else if (merchLower.includes('apple')) {
                        btnLabel = `${icon('cart')}Apple`;
                      }
                      return `
                        <a href="${formatAffiliateUrl(part.url, part.merchant, `build-${activeModelId}-${currentTier.id}`)}" target="_blank" rel="${AFFILIATE_LINK_REL}" class="btn-merchant" data-click-merchant="${escapeAttr(part.merchant)}" data-click-id="${escapeAttr(`build:${activeModelId}:${currentTier.id}:${part.name}`)}" data-model-id="${escapeAttr(activeModelId)}" data-tier-id="${escapeAttr(currentTier.id)}" data-part-name="${escapeAttr(part.name)}">
                          ${btnLabel}
                        </a>
                      `;
                    })() : '<span class="text-dim text-sm">Built-in</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- True Total Cost Calculation Panel -->
      <div class="true-cost-panel">
        <div class="cost-adjusters">
          <div class="cost-engine-title">
            ${icon('calculator')}True Total Ownership Cost Engine
          </div>
          
          <div class="slider-group">
            <div class="slider-label-row">
              <span>Estimated Sales Tax</span>
              <strong id="tax-label">${salesTaxRate}% ($${taxAmount})</strong>
            </div>
            <input type="range" id="tax-slider" aria-label="Estimated sales tax (%)" min="0" max="12" step="0.5" value="${salesTaxRate}">
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>Daily AI Generation Usage</span>
              <strong id="hours-label">${dailyUsageHours} hrs / day</strong>
            </div>
            <input type="range" id="hours-slider" aria-label="Daily AI usage (hours per day)" min="1" max="24" step="1" value="${dailyUsageHours}">
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>Electricity Cost</span>
              <strong id="kwh-label">$${kwhRate.toFixed(2)} / kWh</strong>
            </div>
            <input type="range" id="kwh-slider" aria-label="Electricity cost (dollars per kWh)" min="0.06" max="0.38" step="0.01" value="${kwhRate}">
          </div>
        </div>

        <div class="cost-breakdown-col" id="cost-breakdown">${costBreakdownHtml(costs, salesTaxRate)}</div>

        <div class="total-equity-box" id="cost-total">${totalHtml(costs)}</div>${renderTierCloudCalloutHtml(currentTier)}
      </div>
    </div>
  `;
}

export function createModelPicker(container, onNavigateToCalc, { initialModelId, isHome: initialIsHome = false, onModelChange } = {}) {
  let activeModelId = BUILDS_DATA[initialModelId] ? initialModelId : MODEL_PICKER_DEFAULTS.activeModelId;
  let activeTierId = MODEL_PICKER_DEFAULTS.activeTierId;
  let contextK = MODEL_PICKER_DEFAULTS.contextK;
  let kvPrecision = MODEL_PICKER_DEFAULTS.kvPrecision;
  let vramBudget = MODEL_PICKER_DEFAULTS.vramBudget;
  let codingOnly = MODEL_PICKER_DEFAULTS.codingOnly;
  let searchQuery = MODEL_PICKER_DEFAULTS.searchQuery;
  let showAllModels = MODEL_PICKER_DEFAULTS.showAllModels;
  let isHome = initialIsHome;
  let salesTaxRate = MODEL_PICKER_DEFAULTS.salesTaxRate;
  let dailyUsageHours = MODEL_PICKER_DEFAULTS.dailyUsageHours;
  let kwhRate = MODEL_PICKER_DEFAULTS.kwhRate;

  const currentBuild = () => findBuild(activeModelId, activeTierId);
  const computeCosts = (tier) => computeTierCosts(tier, { salesTaxRate, dailyUsageHours, kwhRate });

  // Refreshes only the cost panel, so the sliders keep working mid-drag
  function updateCosts() {
    const c = computeCosts(currentBuild().currentTier);
    container.querySelector('#tax-label').textContent = `${salesTaxRate}% ($${c.taxAmount})`;
    container.querySelector('#hours-label').textContent = `${dailyUsageHours} hrs / day`;
    container.querySelector('#kwh-label').textContent = `$${kwhRate.toFixed(2)} / kWh`;
    container.querySelector('#cost-breakdown').innerHTML = costBreakdownHtml(c, salesTaxRate);
    container.querySelector('#cost-total').innerHTML = totalHtml(c);
  }

  function render() {
    const restoreFocus = preserveFocus(container);
    container.innerHTML = renderModelPickerHtml({
      activeModelId, activeTierId, contextK, kvPrecision, vramBudget, codingOnly, searchQuery, showAllModels, isHome, salesTaxRate, dailyUsageHours, kwhRate
    });

    attachEvents();
    restoreFocus();
  }

  function attachEvents() {
    // Context length filter buttons
    container.querySelectorAll('.context-filter .context-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = parseInt(btn.getAttribute('data-context'), 10);
        if (c && c !== contextK) {
          contextK = c;
          render();
        }
      });
    });

    // KV cache precision filter buttons
    container.querySelectorAll('.kv-precision-filter .kv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const kv = btn.getAttribute('data-kv');
        if (kv && kv !== kvPrecision) {
          kvPrecision = kv;
          render();
        }
      });
    });

    // "Runs well in" VRAM buttons
    container.querySelectorAll('.vram-filter .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-vram');
        vramBudget = v ? Number(v) : null;
        render();
      });
    });

    const codingBtn = container.querySelector('#btn-coding-only');
    if (codingBtn) {
      codingBtn.addEventListener('click', () => {
        codingOnly = !codingOnly;
        render();
      });
    }

    // Search input
    const searchInput = container.querySelector('#model-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        const updatedInput = container.querySelector('#model-search-input');
        if (updatedInput) {
          updatedInput.focus();
          updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
        }
      });
    }

    const resetBtn = container.querySelector('#btn-reset-model-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchQuery = '';
        vramBudget = null;
        codingOnly = false;
        render();
      });
    }

    const showAllBtn = container.querySelector('#btn-show-all-models');
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        showAllModels = !showAllModels;
        render();
      });
    }

    // Picking a model
    container.querySelectorAll('.model-option').forEach(btn => {
      btn.addEventListener('click', () => {
        activeModelId = btn.getAttribute('data-model-id');
        activeTierId = null;
        render();
        if (onModelChange) onModelChange(activeModelId);
      });
    });

    // Tier tab click
    container.querySelectorAll('.tier-tab-card').forEach(card => {
      const select = () => {
        activeTierId = card.getAttribute('data-tier-id');
        render();
      };
      card.addEventListener('click', select);
      // Cards are role="button", so Enter and Space must activate them
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
    });

    // Tax slider
    const taxSlider = container.querySelector('#tax-slider');
    if (taxSlider) {
      taxSlider.addEventListener('input', (e) => {
        salesTaxRate = parseFloat(e.target.value);
        updateCosts();
      });
    }

    // Daily hours slider
    const hoursSlider = container.querySelector('#hours-slider');
    if (hoursSlider) {
      hoursSlider.addEventListener('input', (e) => {
        dailyUsageHours = parseInt(e.target.value, 10);
        updateCosts();
      });
    }

    // kWh rate slider
    const kwhSlider = container.querySelector('#kwh-slider');
    if (kwhSlider) {
      kwhSlider.addEventListener('input', (e) => {
        kwhRate = parseFloat(e.target.value);
        updateCosts();
      });
    }

    // Send to Break-Even Calculator
    const btnSendToCalc = container.querySelector('#btn-send-to-calc');
    if (btnSendToCalc && onNavigateToCalc) {
      btnSendToCalc.addEventListener('click', () => {
        const { partsSubtotal, systemWatts } = computeCosts(currentBuild().currentTier);
        onNavigateToCalc({
          modelId: activeModelId,
          upfrontCost: partsSubtotal,
          systemWatts: systemWatts,
          dailyHours: dailyUsageHours,
          kwhRate: kwhRate
        });
      });
    }

    // Copy Parts List Markdown
    const btnCopyPartsList = container.querySelector('#btn-copy-parts-list');
    if (btnCopyPartsList) {
      btnCopyPartsList.addEventListener('click', () => {
        const { currentTier } = currentBuild();
        const currentModel = MODELS_DATA.find(m => m.id === activeModelId);
        const isDefaultSettings = contextK === 8 && kvPrecision === 'FP16';
        const kvScale = KV_PRECISION_SCALES[kvPrecision] || 1.0;
        const fit = isDefaultSettings ? currentTier.fit : tierFit(currentModel, currentTier, { contextK, kvScale });
        let speedLine = currentTier.speedLine;
        if (!isDefaultSettings) {
          if (fit.status === 'none' || currentTier.bandwidthGbs === null) {
            speedLine = null;
          } else {
            const fittedQuant = currentModel.quants.find(q => q.name.split(' ')[0] === fit.quant);
            const speed = estimateSpeedToks(currentModel, fittedQuant, currentTier.bandwidthGbs);
            speedLine = formatTierSpeedLine(fit.quant, speed);
          }
        }
        const tierToExport = { ...currentTier, fit, speedLine };
        const canonicalUrl = `${SITE_URL}${buildPath(activeModelId)}`;
        const md = buildPartsListMarkdown(currentModel, tierToExport, canonicalUrl);

        const doFallbackCopy = () => {
          try {
            const ta = document.createElement('textarea');
            ta.value = md;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          } catch {
            // ignore
          }
          return Promise.resolve();
        };

        const copyPromise = (navigator.clipboard && navigator.clipboard.writeText)
          ? navigator.clipboard.writeText(md).catch(doFallbackCopy)
          : doFallbackCopy();

        Promise.resolve(copyPromise).finally(() => {
          btnCopyPartsList.innerHTML = `${icon('check')}<span>Copied</span>`;
          setTimeout(() => {
            if (btnCopyPartsList) {
              btnCopyPartsList.innerHTML = `${icon('copy')}<span>Copy parts list</span>`;
            }
          }, 2000);
        });
      });
    }
  }

  function showToast(msg) {
    const existing = document.querySelector('.toast-container');
    if (existing) existing.remove();

    const toastBox = document.createElement('div');
    toastBox.className = 'toast-container';
    toastBox.setAttribute('role', 'status');
    toastBox.innerHTML = `
      <div class="toast">
        ${icon('check')}
        <span>${msg}</span>
      </div>
    `;
    document.body.appendChild(toastBox);
    setTimeout(() => {
      toastBox.remove();
    }, 3200);
  }

  render();

  return {
    getModelId: () => activeModelId,
    // home: whether the page is / (the model name is then an h2 under the hero's h1)
    selectModel: (modelId, { home = isHome } = {}) => {
      if (modelId === activeModelId && home === isHome) return;
      if (modelId !== activeModelId) activeTierId = null;
      activeModelId = modelId;
      isHome = home;
      render();
    }
  };
}
