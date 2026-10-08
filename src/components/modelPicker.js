// Model Picker & Build Sheet Component
import { MODELS_DATA } from '../data/models.js';
import { BUILDS_DATA } from '../data/builds.js';
import { formatAffiliateUrl } from '../config/affiliates.js';

export function createModelPicker(container, onNavigateToCalc) {
  let activeModelId = 'llama-3.3-70b';
  let activeTierId = 'tier-budget-used';
  let activeCategory = 'all'; // 'all', '70b', 'medium', 'budget', 'coding'
  let searchQuery = '';
  let isGridView = false;
  let salesTaxRate = 7; // %
  let dailyUsageHours = 4; // hrs/day
  let kwhRate = 0.14; // $/kWh

  function getFilteredModels() {
    return MODELS_DATA.filter(m => {
      // Category filter
      if (activeCategory === '70b') {
        const isHeavy = m.recommendedVram >= 48 || m.architecture === 'moe' || m.parameters.includes('70B') || m.parameters.includes('72B') || m.parameters.includes('104B');
        if (!isHeavy) return false;
      } else if (activeCategory === 'medium') {
        const isMed = (m.recommendedVram >= 24 && m.recommendedVram < 48) && !m.parameters.includes('70B');
        if (!isMed) return false;
      } else if (activeCategory === 'budget') {
        const isBudget = m.recommendedVram <= 16;
        if (!isBudget) return false;
      } else if (activeCategory === 'coding') {
        const isCoding = m.id.includes('coder') || m.id.includes('code') || m.id.includes('vision');
        if (!isCoding) return false;
      }

      // Search query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesCreator = m.creator.toLowerCase().includes(q);
        const matchesDesc = (m.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCreator && !matchesDesc) return false;
      }

      return true;
    });
  }

  function render() {
    const currentModel = MODELS_DATA.find(m => m.id === activeModelId) || MODELS_DATA[0];
    const buildSheet = BUILDS_DATA[activeModelId] || BUILDS_DATA['llama-3.3-70b'];
    const currentTier = buildSheet.tiers.find(t => t.id === activeTierId) || buildSheet.tiers[0];
    const filteredModels = getFilteredModels();

    // Compute parts subtotal
    const partsSubtotal = currentTier.parts.reduce((sum, p) => sum + (p.price || 0), 0);
    const taxAmount = Math.round(partsSubtotal * (salesTaxRate / 100));
    
    // Compute electricity cost: (Watts / 1000) * hours/day * 30.5 days * $/kWh
    const systemWatts = currentTier.estimatedTdpWatts || 800;
    const monthlyKwh = (systemWatts / 1000) * dailyUsageHours * 30.5;
    const monthlyPowerCost = Math.round(monthlyKwh * kwhRate);
    const firstYearPowerCost = Math.round(monthlyPowerCost * 12);
    const firstYearTrueTotal = partsSubtotal + taxAmount + firstYearPowerCost;

    container.innerHTML = `
      <!-- Model Selector Bar -->
      <div class="model-selector-bar">
        <div class="selector-label">
          <span>1. Select Target AI Model</span>
          <span style="color: var(--emerald); font-family: var(--font-mono);">${MODELS_DATA.length} model profiles loaded (${filteredModels.length} shown)</span>
        </div>
        
        <!-- Filter and Search Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.85rem; flex-wrap: wrap;">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="filter-btn ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">All (${MODELS_DATA.length})</button>
            <button class="filter-btn ${activeCategory === '70b' ? 'active' : ''}" data-cat="70b">70B+ & MoE</button>
            <button class="filter-btn ${activeCategory === 'medium' ? 'active' : ''}" data-cat="medium">20B-35B</button>
            <button class="filter-btn ${activeCategory === 'budget' ? 'active' : ''}" data-cat="budget">≤14B Budget</button>
            <button class="filter-btn ${activeCategory === 'coding' ? 'active' : ''}" data-cat="coding">Coding & Vision</button>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="text" id="model-search-input" value="${searchQuery}" placeholder="🔍 Search 32 models..." style="background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-main); font-size: 0.8rem; padding: 6px 12px; border-radius: var(--radius-sm); outline: none; width: 170px;">
            <button class="btn-secondary" id="btn-toggle-model-layout" title="Toggle between Scrollable Row and Grid View" style="font-size: 0.78rem; padding: 6px 10px; display: inline-flex; align-items: center; gap: 4px;">
              <span>${isGridView ? '↔ Row' : '⊞ Grid'}</span>
            </button>
          </div>
        </div>

        <div class="model-pills-wrapper">
          ${!isGridView && filteredModels.length > 4 ? `
            <button class="pills-scroll-btn scroll-left" id="btn-pills-left" aria-label="Scroll left">‹</button>
          ` : ''}
          <div class="model-pills ${isGridView ? 'grid-view' : ''}" id="model-pills-list">
            ${filteredModels.length > 0 ? filteredModels.map(m => `
              <button class="model-pill-btn ${m.id === activeModelId ? 'active' : ''}" data-model-id="${m.id}">
                <div class="pill-title">
                  <span>${m.name.split(' ')[0]} ${m.parameters}</span>
                  <span style="font-size: 0.72rem; color: var(--emerald);">${m.recommendedVram}GB VRAM</span>
                </div>
                <div class="pill-subtitle">${m.creator} • ${m.sweetSpotQuant.split(' ')[0]}</div>
              </button>
            `).join('') : `
              <div style="color: var(--text-dim); font-size: 0.85rem; padding: 12px;">No models match your search. <button class="btn-secondary" id="btn-reset-model-filter" style="font-size: 0.75rem; padding: 3px 8px; margin-left: 8px;">Reset Filter</button></div>
            `}
          </div>
          ${!isGridView && filteredModels.length > 4 ? `
            <button class="pills-scroll-btn scroll-right" id="btn-pills-right" aria-label="Scroll right">›</button>
          ` : ''}
        </div>
      </div>

      <!-- Model Spec & VRAM Requirements Banner -->
      <div class="model-spec-panel">
        <div class="model-info-block">
          <h3>${currentModel.name}</h3>
          <p class="model-info-desc">${currentModel.description}</p>
          <div style="margin-top: 8px; font-size: 0.78rem; color: var(--cyan); font-family: var(--font-mono);">
            ⚡ Typical Speed on Dual 3090: <strong>${currentModel.typicalSpeedDual3090}</strong>
          </div>
        </div>

        <div class="spec-badge-box">
          <div class="spec-badge-label">Minimum VRAM</div>
          <div class="spec-badge-value">${currentModel.minVram} GB</div>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">Strict minimum for Q3/Q4</div>
        </div>

        <div class="spec-badge-box">
          <div class="spec-badge-label">Sweet Spot Quant</div>
          <div class="spec-badge-value" style="font-size: 1rem; color: #38bdf8;">${currentModel.sweetSpotQuant}</div>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">99% FP16 accuracy</div>
        </div>

        <div class="spec-badge-box">
          <div class="spec-badge-label">Cloud Alternative</div>
          <div class="spec-badge-value" style="font-size: 0.92rem; color: var(--amber);">${currentModel.cloudEquivalent.split('(')[1]?.replace(')', '') || '$0.88/hr'}</div>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">${currentModel.cloudEquivalent.split('(')[0]}</div>
        </div>
      </div>

      <!-- 3 Tier Selector Cards -->
      <div class="selector-label">
        <span>2. Choose Hardware Architecture Tier</span>
        <span style="color: var(--text-muted); font-size: 0.75rem;">All tiers verified for physical GPU clearance & power transients</span>
      </div>
      <div class="tier-tabs-container">
        ${buildSheet.tiers.map((tier, idx) => {
          const tierSubtotal = tier.parts.reduce((s, p) => s + (p.price || 0), 0);
          const badgeClass = tier.type === 'used' ? 'tier-badge-budget' : (tier.type === 'balanced' ? 'tier-badge-balanced' : 'tier-badge-new');
          return `
            <div class="tier-tab-card ${tier.id === activeTierId ? 'active' : ''}" data-tier-id="${tier.id}">
              <span class="tier-badge-label ${badgeClass}">${tier.badge}</span>
              <div class="tier-title-row">
                <span class="tier-name">${tier.name}</span>
                <span class="tier-price-big">$${tierSubtotal.toLocaleString()}</span>
              </div>
              <div class="tier-subtitle">${tier.headline}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Build Sheet Details & Parts List -->
      <div class="build-sheet-card">
        <div class="build-sheet-header">
          <div class="build-sheet-title">
            <h3>${currentTier.name} — Parts Manifest</h3>
            <p>${currentTier.rigSummary}</p>
          </div>
          <div class="build-quick-actions">
            <button class="btn-secondary" id="btn-copy-build-reddit">
              📋 Copy for Reddit / Discord
            </button>
            <button class="btn-primary" id="btn-send-to-calc">
              🚀 Calculate Break-Even ROI →
            </button>
          </div>
        </div>

        <div class="parts-table-wrap">
          <table class="parts-table">
            <thead>
              <tr>
                <th style="width: 14%;">Component</th>
                <th style="width: 44%;">Part Details & Gotchas</th>
                <th style="width: 14%;">Condition</th>
                <th style="width: 12%;">Price</th>
                <th style="width: 16%; text-align: right;">Merchant Link</th>
              </tr>
            </thead>
            <tbody>
              ${currentTier.parts.map(part => {
                const condClass = part.condition.includes('Used') ? 'condition-used' : (part.condition.includes('New') ? 'condition-new' : 'condition-included');
                return `
                  <tr>
                    <td>
                      <span class="part-category-tag">${part.category}</span>
                    </td>
                    <td class="part-name-cell">
                      <strong>${part.name}</strong>
                      <div class="part-spec-sub">${part.spec}</div>
                      ${part.notes ? `<div class="part-notes">💡 ${part.notes}</div>` : ''}
                    </td>
                    <td>
                      <span class="condition-badge ${condClass}">
                        ${part.condition}
                      </span>
                    </td>
                    <td class="part-price-cell">
                      ${part.price > 0 ? `$${part.price.toLocaleString()}` : '<span style="color: var(--text-dim);">Included</span>'}
                    </td>
                    <td style="text-align: right;">
                      ${part.url !== '#' ? (() => {
                        const urlLower = (part.url || '').toLowerCase();
                        const merchLower = (part.merchant || '').toLowerCase();
                        let btnLabel = '🛒 Merchant Link';
                        if (urlLower.includes('ebay.') || (!urlLower.includes('amazon.') && merchLower.includes('ebay'))) {
                          btnLabel = '🔍 Search eBay';
                        } else if (urlLower.includes('amazon.') || merchLower.includes('amazon')) {
                          btnLabel = '🛒 Amazon';
                        } else if (urlLower.includes('bhphoto') || merchLower.includes('b&h')) {
                          btnLabel = '📦 B&H Photo';
                        } else if (merchLower.includes('apple')) {
                          btnLabel = '🍎 Apple';
                        }
                        return `
                          <a href="${formatAffiliateUrl(part.url, part.merchant)}" target="_blank" rel="noopener noreferrer" class="btn-merchant">
                            ${btnLabel}
                          </a>
                        `;
                      })() : '<span style="color: var(--text-dim); font-size: 0.78rem;">Built-in</span>'}
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
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 2px;">
              ⚡ True Total Ownership Cost Engine
            </div>
            
            <div class="slider-group">
              <div class="slider-label-row">
                <span>Estimated Sales Tax</span>
                <strong>${salesTaxRate}% ($${taxAmount})</strong>
              </div>
              <input type="range" id="tax-slider" min="0" max="12" step="0.5" value="${salesTaxRate}">
            </div>

            <div class="slider-group">
              <div class="slider-label-row">
                <span>Daily AI Generation Usage</span>
                <strong>${dailyUsageHours} hrs / day</strong>
              </div>
              <input type="range" id="hours-slider" min="1" max="24" step="1" value="${dailyUsageHours}">
            </div>

            <div class="slider-group">
              <div class="slider-label-row">
                <span>Electricity Cost</span>
                <strong>$${kwhRate.toFixed(2)} / kWh</strong>
              </div>
              <input type="range" id="kwh-slider" min="0.06" max="0.38" step="0.01" value="${kwhRate}">
            </div>
          </div>

          <div class="cost-breakdown-col">
            <div class="cost-breakdown-row">
              <span>Hardware Parts:</span>
              <strong>$${partsSubtotal.toLocaleString()}</strong>
            </div>
            <div class="cost-breakdown-row">
              <span>Sales Tax (${salesTaxRate}%):</span>
              <strong>+$${taxAmount.toLocaleString()}</strong>
            </div>
            <div class="cost-breakdown-row">
              <span>Peak Power Draw:</span>
              <strong style="color: var(--amber);">${systemWatts}W under load</strong>
            </div>
            <div class="cost-breakdown-row">
              <span>Monthly Electricity:</span>
              <strong>+$${monthlyPowerCost}/mo</strong>
            </div>
            <div class="cost-breakdown-row" style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed var(--border-subtle);">
              <span>Year 1 Power Cost:</span>
              <strong style="color: var(--cyan);">+$${firstYearPowerCost}/yr</strong>
            </div>
          </div>

          <div class="total-equity-box">
            <div class="total-equity-label">True 1st-Year Total Cost</div>
            <div class="total-equity-number">$${firstYearTrueTotal.toLocaleString()}</div>
            <div class="total-equity-sub">Parts ($${partsSubtotal}) + Tax ($${taxAmount}) + 1-Yr Power ($${firstYearPowerCost})</div>
          </div>
        </div>
      </div>
    `;

    attachEvents(partsSubtotal, systemWatts);
  }

  function attachEvents(partsSubtotal, systemWatts) {
    // Category filter buttons
    container.querySelectorAll('.model-selector-bar .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat') || 'all';
        render();
      });
    });

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

    // Reset filter button
    const resetBtn = container.querySelector('#btn-reset-model-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        searchQuery = '';
        activeCategory = 'all';
        render();
      });
    }

    // Toggle between row and grid layout
    const btnToggleLayout = container.querySelector('#btn-toggle-model-layout');
    if (btnToggleLayout) {
      btnToggleLayout.addEventListener('click', () => {
        isGridView = !isGridView;
        render();
      });
    }

    // Horizontal scroll controls
    const pillsList = container.querySelector('#model-pills-list');
    const btnPillsLeft = container.querySelector('#btn-pills-left');
    const btnPillsRight = container.querySelector('#btn-pills-right');

    if (btnPillsLeft && pillsList) {
      btnPillsLeft.addEventListener('click', () => {
        pillsList.scrollBy({ left: -340, behavior: 'smooth' });
      });
    }

    if (btnPillsRight && pillsList) {
      btnPillsRight.addEventListener('click', () => {
        pillsList.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }

    // Horizontal mousewheel support on row of pills
    if (pillsList && !isGridView) {
      pillsList.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
          pillsList.scrollLeft += e.deltaY;
        }
      }, { passive: true });
    }

    // Model pill click
    container.querySelectorAll('.model-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeModelId = btn.getAttribute('data-model-id');
        activeTierId = 'tier-budget-used';
        render();
        // Keep active button visible
        const updatedBtn = container.querySelector(`.model-pill-btn[data-model-id="${activeModelId}"]`);
        if (updatedBtn && !isGridView) {
          updatedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      });
    });

    // Tier tab click
    container.querySelectorAll('.tier-tab-card').forEach(card => {
      card.addEventListener('click', () => {
        activeTierId = card.getAttribute('data-tier-id');
        render();
      });
    });

    // Tax slider
    const taxSlider = container.querySelector('#tax-slider');
    if (taxSlider) {
      taxSlider.addEventListener('input', (e) => {
        salesTaxRate = parseFloat(e.target.value);
        render();
      });
    }

    // Daily hours slider
    const hoursSlider = container.querySelector('#hours-slider');
    if (hoursSlider) {
      hoursSlider.addEventListener('input', (e) => {
        dailyUsageHours = parseInt(e.target.value, 10);
        render();
      });
    }

    // kWh rate slider
    const kwhSlider = container.querySelector('#kwh-slider');
    if (kwhSlider) {
      kwhSlider.addEventListener('input', (e) => {
        kwhRate = parseFloat(e.target.value);
        render();
      });
    }

    // Send to Break-Even Calculator
    const btnSendToCalc = container.querySelector('#btn-send-to-calc');
    if (btnSendToCalc && onNavigateToCalc) {
      btnSendToCalc.addEventListener('click', () => {
        onNavigateToCalc({
          modelId: activeModelId,
          upfrontCost: partsSubtotal,
          systemWatts: systemWatts,
          dailyHours: dailyUsageHours,
          kwhRate: kwhRate
        });
      });
    }

    // Copy Reddit Markdown
    const btnCopyReddit = container.querySelector('#btn-copy-build-reddit');
    if (btnCopyReddit) {
      btnCopyReddit.addEventListener('click', () => {
        const buildSheet = BUILDS_DATA[activeModelId];
        const currentTier = buildSheet.tiers.find(t => t.id === activeTierId);
        
        let md = `### [airigbuilder.com] ${buildSheet.title} - ${currentTier.name}\n\n`;
        md += `**Target Model:** ${MODELS_DATA.find(m => m.id === activeModelId)?.name}\n`;
        md += `**Upfront Parts Total:** $${partsSubtotal.toLocaleString()}\n`;
        md += `**Estimated System Draw:** ${systemWatts}W\n\n`;
        md += `| Component | Part | Condition | Price |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        currentTier.parts.forEach(p => {
          md += `| ${p.category} | ${p.name} | ${p.condition} | $${p.price} |\n`;
        });
        md += `\n*Calculated via airigbuilder.com — The used-hardware price layer for local AI.*`;

        navigator.clipboard.writeText(md).then(() => {
          showToast('Copied build sheet to clipboard in Reddit Markdown format!');
        });
      });
    }
  }

  function showToast(msg) {
    const existing = document.querySelector('.toast-container');
    if (existing) existing.remove();

    const toastBox = document.createElement('div');
    toastBox.className = 'toast-container';
    toastBox.innerHTML = `
      <div class="toast">
        <span>✓</span>
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
    selectModel: (modelId) => {
      activeModelId = modelId;
      activeTierId = 'tier-budget-used';
      render();
    }
  };
}
