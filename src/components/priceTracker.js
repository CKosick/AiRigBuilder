// Used GPU Price Tracker Component (airigbuilder.com)
// The SEO moat tracking street prices for the 10 GPUs that matter for local AI
import { GPUS_DATA } from '../data/gpus.js';
import { formatAffiliateUrl, AFFILIATE_LINK_REL } from '../config/affiliates.js';
import { preserveFocus } from '../utils/focus.js';
import { gpuPath } from '../routes.js';
import { drawPriceHistoryChart } from './priceHistoryChart.js';

function sortGpus(sortBy, sortAsc) {
  return [...GPUS_DATA].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'pricePerGb') {
      valA = a.pricePerGb;
      valB = b.pricePerGb;
    } else if (sortBy === 'price') {
      valA = a.usedStreetPrice;
      valB = b.usedStreetPrice;
    } else if (sortBy === 'vram') {
      valA = a.vram;
      valB = b.vram;
    } else if (sortBy === 'bandwidth') {
      valA = a.bandwidth;
      valB = b.bandwidth;
    }

    if (sortAsc) return valA - valB;
    return valB - valA;
  });
}

/**
 * Pure HTML for the tracker. The component renders it in the browser and
 * scripts/prerender.js renders it at build time, so both produce the same markup.
 */
export function renderPriceTrackerHtml({ sortBy = 'pricePerGb', sortAsc = true } = {}) {
    const gpus = sortGpus(sortBy, sortAsc);

    return `
      <div class="tracker-header-row">
        <div class="tracker-title">
          <h2>Used GPU Price Tracker for Local AI</h2>
          <p>Updated weekly from verified eBay sold listings. Sorted by the metric that actually matters: <strong>Price per GB of VRAM</strong>.</p>
        </div>
        <div class="tracker-filter-group">
          <span style="font-size: 0.75rem; color: var(--text-dim); margin-right: 4px; font-weight: 700;">SORT BY:</span>
          <button class="filter-btn ${sortBy === 'pricePerGb' ? 'active' : ''}" data-sort="pricePerGb" aria-pressed="${sortBy === 'pricePerGb'}">
            $/GB VRAM ${sortBy === 'pricePerGb' ? (sortAsc ? '▲' : '▼') : ''}
          </button>
          <button class="filter-btn ${sortBy === 'price' ? 'active' : ''}" data-sort="price" aria-pressed="${sortBy === 'price'}">
            Street Price ${sortBy === 'price' ? (sortAsc ? '▲' : '▼') : ''}
          </button>
          <button class="filter-btn ${sortBy === 'vram' ? 'active' : ''}" data-sort="vram" aria-pressed="${sortBy === 'vram'}">
            VRAM ${sortBy === 'vram' ? (sortAsc ? '▲' : '▼') : ''}
          </button>
          <button class="filter-btn ${sortBy === 'bandwidth' ? 'active' : ''}" data-sort="bandwidth" aria-pressed="${sortBy === 'bandwidth'}">
            Bandwidth ${sortBy === 'bandwidth' ? (sortAsc ? '▲' : '▼') : ''}
          </button>
        </div>
      </div>

      <!-- Price Drop Email Alerts Banner -->
      <div class="price-alert-banner">
        <div class="price-alert-content">
          <div class="price-alert-header">
            <div class="price-alert-badge">🔔 Instant Price-Drop Alerts</div>
            <h3>Never overpay for local AI VRAM</h3>
            <p>Select any tracked GPU and your target price. When weekly verified eBay sold prices drop to or below your target, we'll send a one-time notification email. Resend double opt-in, zero spam, instant unsubscribe.</p>
          </div>
          <form class="price-alert-form" id="tracker-alert-form">
            <div class="alert-input-group">
              <label for="alert-gpu-select">Target GPU</label>
              <select id="alert-gpu-select" class="alert-select">
                ${GPUS_DATA.map(g => `<option value="${g.id}" ${g.id === 'rtx-3090' ? 'selected' : ''}>${g.name} (${g.vram}GB) — Now: $${g.usedStreetPrice}</option>`).join('')}
              </select>
            </div>
            <div class="alert-input-group alert-price-group">
              <label for="alert-price-input">Target Price ($)</label>
              <div class="input-prefix-wrapper">
                <span class="currency-prefix">$</span>
                <input type="number" id="alert-price-input" min="50" max="5000" step="10" value="650" required placeholder="650" class="alert-input">
              </div>
            </div>
            <div class="alert-input-group alert-email-group">
              <label for="alert-email-input">Your Email</label>
              <input type="email" id="alert-email-input" autocomplete="email" required placeholder="you@example.com" class="alert-input">
            </div>
            <div class="alert-action-group">
              <button type="submit" class="btn-primary btn-alert-submit" id="btn-submit-tracker-alert">
                🔔 Set Price Alert
              </button>
            </div>
          </form>
          <div class="alert-status-msg" id="alert-status-msg" role="status" aria-live="polite" style="display: none;"></div>
        </div>
      </div>

      <div class="gpu-table-card">
        <table class="gpu-table">
          <thead>
            <tr>
              <th style="width: 28%;">GPU & AI Suitability</th>
              <th style="width: 14%;">VRAM & Bus</th>
              <th style="width: 14%;">Bandwidth</th>
              <th style="width: 15%;">Avg Used Street Price</th>
              <th style="width: 13%;">Price / GB</th>
              <th style="width: 8%;">7d Trend</th>
              <th style="width: 8%; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${gpus.map(gpu => {
              const trendClass = gpu.trend7d <= 0 ? 'trend-down' : 'trend-up';
              const trendIcon = gpu.trend7d <= 0 ? '▼' : '▲';
              return `
                <tr>
                  <td class="gpu-name-cell">
                    <strong><a href="${gpuPath(gpu.id)}" class="gpu-page-link">${gpu.name}</a></strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                      ${gpu.aiRating}
                    </div>
                  </td>
                  <td>
                    <span class="gpu-vram-pill">${gpu.vram} GB ${gpu.vramType}</span>
                    <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">TDP: ${gpu.tdp}W</div>
                  </td>
                  <td>
                    <strong style="font-family: var(--font-mono); color: var(--text-highlight);">${gpu.bandwidth} GB/s</strong>
                    <div style="font-size: 0.72rem; color: var(--text-dim);">Memory Bus</div>
                  </td>
                  <td>
                    <div class="price-main">$${gpu.usedStreetPrice.toLocaleString()}</div>
                    <div class="price-range-sub">Range: $${gpu.usedPriceLow} - $${gpu.usedPriceHigh}</div>
                  </td>
                  <td>
                    <div class="price-per-gb-badge">
                      <span>$${gpu.pricePerGb.toFixed(2)}</span>
                      <span style="font-size: 0.7rem; color: var(--text-dim);">/ GB</span>
                    </div>
                  </td>
                  <td>
                    <span class="trend-badge ${trendClass}">
                      ${trendIcon} ${Math.abs(gpu.trend7d)}%
                    </span>
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button class="btn-secondary btn-view-history" data-gpu-id="${gpu.id}" aria-label="Price history for ${gpu.name}" style="padding: 5px 10px; font-size: 0.75rem;">
                      📈 History
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Price History Modal -->
      <div class="modal-backdrop" id="gpu-modal-backdrop" hidden>
        <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-gpu-title" aria-describedby="modal-gpu-subtitle">
          <div class="modal-header">
            <div>
              <h3 id="modal-gpu-title" style="color: var(--text-highlight); font-size: 1.15rem; font-weight: 800;"></h3>
              <p id="modal-gpu-subtitle" style="font-size: 0.8rem; color: var(--text-muted);"></p>
            </div>
            <button class="modal-close-btn" id="modal-close-btn" aria-label="Close price history">&times;</button>
          </div>
          <div class="modal-body">
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;" id="modal-gpu-summary"></div>

            <div style="height: 240px; margin-bottom: 1.5rem; position: relative;">
              <canvas id="modal-history-chart" role="img" aria-label="Monthly average sold price chart"></canvas>
            </div>

            <!-- Pros & Cons -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.82rem;">
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 0.85rem; border-radius: var(--radius-md);">
                <strong style="color: var(--emerald); display: block; margin-bottom: 4px;">✓ AI Strengths</strong>
                <ul id="modal-pros-list" style="padding-left: 1rem; color: var(--text-muted);"></ul>
              </div>
              <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.2); padding: 0.85rem; border-radius: var(--radius-md);">
                <strong style="color: #fb7185; display: block; margin-bottom: 4px;">⚠️ Build Gotchas</strong>
                <ul id="modal-cons-list" style="padding-left: 1rem; color: var(--text-muted);"></ul>
              </div>
            </div>

            <!-- Alert Capture Box -->
            <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
              <div>
                <strong style="color: var(--text-highlight); font-size: 0.85rem; display: block;">🔔 Price Drop Notification</strong>
                <span style="font-size: 0.78rem; color: var(--text-muted);" id="modal-alert-desc">Alert me when this GPU drops below target price</span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0 8px;">
                  <span style="color: var(--text-dim); font-size: 0.8rem;">$</span>
                  <input type="number" id="modal-target-price-input" aria-label="Target price in dollars" style="width: 75px; background: transparent; border: none; color: var(--text-main); font-size: 0.8rem; padding: 6px 4px;" placeholder="Target">
                </div>
                <input type="email" id="modal-email-input" aria-label="Your email" autocomplete="email" placeholder="you@domain.com" style="background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-main); font-size: 0.8rem; padding: 6px 10px; border-radius: var(--radius-sm);">
                <button class="btn-primary" id="btn-save-alert" style="padding: 6px 14px; font-size: 0.8rem;">
                  Set Alert
                </button>
              </div>
            </div>

            <div style="margin-top: 1rem; text-align: right;">
              <a href="#" target="_blank" rel="${AFFILIATE_LINK_REL}" id="modal-ebay-link" class="btn-secondary" style="font-size: 0.82rem;">
                🔍 View Live eBay Sold Listings →
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
}

export function createPriceTracker(container) {
  let sortBy = 'pricePerGb'; // 'pricePerGb', 'price', 'vram', 'bandwidth'
  let sortAsc = true; // default ascending for pricePerGb ($/GB cheapest first)
  let activeModalGpu = null;
  let modalChartInstance = null;
  let modalReturnFocus = null;

  function render() {
    const restoreFocus = preserveFocus(container);
    container.innerHTML = renderPriceTrackerHtml({ sortBy, sortAsc });

    attachEvents();
    restoreFocus();
  }

  function attachEvents() {
    // Sort buttons
    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.getAttribute('data-sort');
        if (sortBy === field) {
          sortAsc = !sortAsc;
        } else {
          sortBy = field;
          // default directions
          sortAsc = field === 'pricePerGb' || field === 'price';
        }
        render();
      });
    });

    // View History Modal
    container.querySelectorAll('.btn-view-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const gpuId = btn.getAttribute('data-gpu-id');
        openHistoryModal(gpuId);
      });
    });

    // Close Modal
    const backdrop = container.querySelector('#gpu-modal-backdrop');
    const closeBtn = container.querySelector('#modal-close-btn');
    if (closeBtn && backdrop) {
      closeBtn.addEventListener('click', closeHistoryModal);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeHistoryModal();
      });
      backdrop.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeHistoryModal();
        } else if (e.key === 'Tab') {
          trapFocus(e, backdrop);
        }
      });
    }

    // Tracker Alert Form Submission
    const alertForm = container.querySelector('#tracker-alert-form');
    const alertStatus = container.querySelector('#alert-status-msg');
    const submitBtn = container.querySelector('#btn-submit-tracker-alert');

    if (alertForm) {
      alertForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const gpuSelect = container.querySelector('#alert-gpu-select');
        const priceInput = container.querySelector('#alert-price-input');
        const emailInput = container.querySelector('#alert-email-input');

        const gpuId = gpuSelect?.value;
        const targetPrice = Number(priceInput?.value);
        const email = emailInput?.value?.trim();

        if (!email || !email.includes('@')) {
          showToast('Please enter a valid email address.');
          return;
        }

        if (!targetPrice || targetPrice <= 0) {
          showToast('Please enter a valid target price.');
          return;
        }

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳ Sending...</span>';

        try {
          const res = await fetch('/api/alerts/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, gpuId, targetPrice })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            alertStatus.className = 'alert-status-msg success';
            alertStatus.textContent = data.message || `✓ Confirmation email dispatched to ${email}! Check your inbox to activate your alert.`;
            alertStatus.style.display = 'block';
            showToast('✓ Double opt-in confirmation sent!');
            emailInput.value = '';
          } else {
            alertStatus.className = 'alert-status-msg error';
            alertStatus.textContent = data.error || 'Failed to create alert. Please check your inputs.';
            alertStatus.style.display = 'block';
          }
        } catch (err) {
          alertStatus.className = 'alert-status-msg error';
          alertStatus.textContent = 'Could not reach the alert service. Your alert was not saved. Please try again in a moment.';
          alertStatus.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      });
    }

    // Modal Quick Alert Button
    const btnSaveAlert = container.querySelector('#btn-save-alert');
    if (btnSaveAlert) {
      btnSaveAlert.addEventListener('click', async () => {
        const emailInput = container.querySelector('#modal-email-input');
        const targetPriceInput = container.querySelector('#modal-target-price-input');
        const email = emailInput?.value?.trim();
        const targetPrice = Number(targetPriceInput?.value) || activeModalGpu?.usedPriceLow || activeModalGpu?.usedStreetPrice;

        if (!email || !email.includes('@')) {
          showToast('Please enter a valid email address.');
          return;
        }

        btnSaveAlert.disabled = true;
        btnSaveAlert.textContent = 'Sending...';

        try {
          const res = await fetch('/api/alerts/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, gpuId: activeModalGpu?.id, targetPrice })
          });
          const data = await res.json();

          if (res.ok && data.success) {
            showToast(`✓ Confirmation link sent to ${email}!`);
            emailInput.value = '';
          } else {
            showToast(data.error || 'Failed to create alert.');
          }
        } catch (_) {
          showToast('Could not reach the alert service. Your alert was not saved.');
        } finally {
          btnSaveAlert.disabled = false;
          btnSaveAlert.textContent = 'Set Alert';
        }
      });
    }
  }

  function closeHistoryModal() {
    const backdrop = container.querySelector('#gpu-modal-backdrop');
    if (!backdrop || backdrop.hidden) return;
    backdrop.classList.remove('open');
    // Fully hide after the fade so the dialog's fields leave the tab order
    setTimeout(() => {
      if (!backdrop.classList.contains('open')) backdrop.hidden = true;
    }, 200);
    if (modalReturnFocus && document.contains(modalReturnFocus)) modalReturnFocus.focus();
    modalReturnFocus = null;
  }

  // Keeps Tab / Shift+Tab cycling inside the open dialog
  function trapFocus(e, root) {
    const focusables = [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openHistoryModal(gpuId) {
    const gpu = GPUS_DATA.find(g => g.id === gpuId);
    if (!gpu) return;

    activeModalGpu = gpu;
    const backdrop = container.querySelector('#gpu-modal-backdrop');
    if (!backdrop) return;

    container.querySelector('#modal-gpu-title').textContent = `${gpu.name} (${gpu.vram}GB)`;
    container.querySelector('#modal-gpu-subtitle').textContent = `Current eBay Sold Avg: $${gpu.usedStreetPrice} ($${gpu.pricePerGb.toFixed(2)} / GB VRAM)`;
    container.querySelector('#modal-gpu-summary').textContent = gpu.summary;
    container.querySelector('#modal-alert-desc').textContent = `Alert me when ${gpu.name} drops below $${gpu.usedPriceLow}`;
    const targetInput = container.querySelector('#modal-target-price-input');
    if (targetInput) targetInput.value = gpu.usedPriceLow;

    // Pros
    const prosList = container.querySelector('#modal-pros-list');
    prosList.innerHTML = gpu.pros.map(p => `<li>${p}</li>`).join('');

    // Cons
    const consList = container.querySelector('#modal-cons-list');
    consList.innerHTML = gpu.cons.map(c => `<li>${c}</li>`).join('');

    // eBay Link
    const ebayLink = container.querySelector('#modal-ebay-link');
    ebayLink.href = formatAffiliateUrl(gpu.ebaySoldUrl, 'eBay Sold');

    // Remember what opened the dialog so focus can return there on close
    modalReturnFocus = document.activeElement;
    backdrop.hidden = false;
    void backdrop.offsetWidth; // let the fade-in transition start from the hidden state
    backdrop.classList.add('open');
    container.querySelector('#modal-close-btn').focus();

    // Render chart
    setTimeout(() => {
      renderModalChart(gpu);
    }, 50);
  }

  function renderModalChart(gpu) {
    const canvas = container.querySelector('#modal-history-chart');
    if (!canvas) return;

    if (modalChartInstance) {
      modalChartInstance.destroy();
    }

    const { chart, missingMonths } = drawPriceHistoryChart(canvas, gpu);
    modalChartInstance = chart;

    const summaryEl = container.querySelector('#modal-gpu-summary');
    if (summaryEl) {
      summaryEl.textContent = missingMonths > 0
        ? `${gpu.summary} Gaps in the chart are months with no recorded sold-price data (${missingMonths} months).`
        : gpu.summary;
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
}
