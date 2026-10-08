// Cloud Break-Even Calculator Component (airigbuilder.com)
// The backlink and traffic engine comparing used local AI rigs vs RunPod/Vast.ai
import { CLOUD_PROVIDERS } from '../data/providers.js';
import { computeBreakEven } from '../utils/breakEven.js';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export function createBreakEvenCalc(container) {
  let rigUpfrontCost = 1780; // $ (Dual used 3090 rig baseline)
  let dailyUsageHours = 4; // hrs/day
  let selectedProviderId = 'runpod-dual-3090';
  let hourlyCloudRate = 0.88; // $/hr
  let monthlyDiskFee = 7.00; // $/mo
  let systemWatts = 820; // Watts
  let kwhRate = 0.14; // $/kWh
  let resaleRetentionPct = 65; // % residual value after 2 years

  let chartInstance = null;

  function calculate() {
    return computeBreakEven({
      rigUpfrontCost,
      dailyUsageHours,
      hourlyCloudRate,
      monthlyDiskFee,
      systemWatts,
      kwhRate,
      resaleRetentionPct
    });
  }

  function render() {
    const stats = calculate();

    container.innerHTML = `
      <div class="calc-grid">
        <!-- Inputs Column -->
        <div class="calc-inputs-card">
          <div class="calc-section-title">
            <span>⚙️ Hardware & Usage Parameters</span>
          </div>
          <div class="calc-section-desc">
            Compare your local AI hardware investment against rented GPU cloud hours.
          </div>

          <!-- Rig Upfront Purchase Cost -->
          <div class="calc-input-block">
            <div class="calc-input-label">
              <span>Local AI Rig Total Build Cost</span>
              <span class="calc-badge-val" id="badge-rig-cost">$${rigUpfrontCost.toLocaleString()}</span>
            </div>
            <input type="range" id="input-rig-cost" min="400" max="4500" step="50" value="${rigUpfrontCost}">
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">
              Includes used GPUs, motherboard, PSU, RAM, storage
            </div>
          </div>

          <!-- Daily Usage Hours -->
          <div class="calc-input-block">
            <div class="calc-input-label">
              <span>Average Daily Usage</span>
              <span class="calc-badge-val" id="badge-daily-hours">${dailyUsageHours} hrs / day</span>
            </div>
            <input type="range" id="input-daily-hours" min="1" max="24" step="0.5" value="${dailyUsageHours}">
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">
              Active prompt eval + token streaming + batch agents
            </div>
          </div>

          <!-- Cloud Provider Preset -->
          <div class="calc-input-block">
            <div class="calc-input-label">
              <span>Cloud Provider Comparison</span>
            </div>
            <select class="calc-select" id="select-provider">
              ${CLOUD_PROVIDERS.map(p => `
                <option value="${p.id}" ${p.id === selectedProviderId ? 'selected' : ''}>
                  ${p.name} ($${p.hourlyRate.toFixed(2)}/hr)
                </option>
              `).join('')}
              <option value="custom">Custom Hourly Rate...</option>
            </select>
          </div>

          <!-- Hourly Rate & Disk Fee -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
            <div>
              <div class="calc-input-label">
                <span>Cloud $/hr</span>
              </div>
              <input type="number" class="calc-text-input" id="input-hourly-rate" step="0.05" min="0.10" max="10.00" value="${hourlyCloudRate.toFixed(2)}">
            </div>
            <div>
              <div class="calc-input-label">
                <span>Storage $/mo</span>
              </div>
              <input type="number" class="calc-text-input" id="input-disk-fee" step="1" min="0" max="50" value="${monthlyDiskFee.toFixed(2)}">
            </div>
          </div>

          <!-- Rig Power Draw & Electricity Rate -->
          <div class="calc-input-block">
            <div class="calc-input-label">
              <span>Rig Load Power Draw</span>
              <span class="calc-badge-val" id="badge-watts">${systemWatts} Watts</span>
            </div>
            <input type="range" id="input-system-watts" min="150" max="1400" step="25" value="${systemWatts}">
          </div>

          <div class="calc-input-block">
            <div class="calc-input-label">
              <span>Electricity Cost</span>
              <span class="calc-badge-val" id="badge-kwh">$${kwhRate.toFixed(2)} / kWh</span>
            </div>
            <input type="range" id="input-kwh" min="0.06" max="0.38" step="0.01" value="${kwhRate}">
          </div>

          <!-- Resale Equity Retention -->
          <div class="calc-input-block">
            <div class="calc-input-label">
              <span>Used Hardware Resale Value (2 Yrs)</span>
              <span class="calc-badge-val" id="badge-resale">${resaleRetentionPct}%</span>
            </div>
            <input type="range" id="input-resale" min="30" max="85" step="5" value="${resaleRetentionPct}">
            <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">
              Used RTX 3090 cards historically hold ~65-75% value over 24 months
            </div>
          </div>
        </div>

        <!-- Results & Chart Column -->
        <div class="calc-results-card">
          <!-- KPI Row -->
          <div class="kpi-row">
            <div class="kpi-card hero-kpi">
              <div class="kpi-label">Break-Even Point</div>
              <div class="kpi-value">${stats.breakEvenMonths < 100 ? `${stats.breakEvenMonths.toFixed(1)} mo` : '> 5 yrs'}</div>
              <div class="kpi-sub">${stats.breakEvenMonths < 100 ? `~${stats.breakEvenDays} calendar days` : 'Low usage'}</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Monthly Cloud Bill</div>
              <div class="kpi-value" style="color: var(--amber);">$${Math.round(stats.monthlyCloudTotal)}/mo</div>
              <div class="kpi-sub">Rent + persistent disk</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">Monthly Local Power</div>
              <div class="kpi-value" style="color: var(--cyan);">$${Math.round(stats.monthlyLocalPower)}/mo</div>
              <div class="kpi-sub">Just $${stats.localHourlyPower.toFixed(2)}/hr active</div>
            </div>

            <div class="kpi-card">
              <div class="kpi-label">2-Year Net Savings</div>
              <div class="kpi-value" style="color: var(--emerald);">+$${Math.round(stats.netCashSavings24Mo).toLocaleString()}</div>
              <div class="kpi-sub">+$${Math.round(stats.netEquitySavings24Mo).toLocaleString()} with resale equity</div>
            </div>
          </div>

          <!-- Chart Area -->
          <div class="chart-header">
            <div class="chart-title">Cumulative Spend Timeline: Local Rig vs Cloud (24 Months)</div>
            <div class="chart-legend-row">
              <div class="legend-item">
                <div class="legend-dot" style="background: #f59e0b;"></div>
                <span>Cloud Rental</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background: #10b981;"></div>
                <span>Local Rig Cash Outlay</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background: #06b6d4;"></div>
                <span>Net After Resale Equity</span>
              </div>
            </div>
          </div>

          <div class="chart-canvas-container">
            <canvas id="break-even-chart"></canvas>
          </div>

          <!-- Bottom Narrative & Sharing -->
          <div class="calc-narrative-box">
            <div class="calc-narrative-text">
              Running at <strong>${dailyUsageHours} hrs/day</strong>, your <strong>$${rigUpfrontCost.toLocaleString()}</strong> home rig pays for itself in <strong>${stats.breakEvenMonths.toFixed(1)} months</strong>. Over 2 years, you pocket <strong>$${Math.round(stats.netCashSavings24Mo).toLocaleString()} in cash</strong> while maintaining 100% data privacy and offline autonomy.
            </div>
            <button class="btn-secondary" id="btn-copy-calc-reddit" style="white-space: nowrap;">
              📋 Copy Summary
            </button>
          </div>
        </div>
      </div>
    `;

    attachEvents();
    renderChart(stats);
  }

  function renderChart(stats) {
    const canvas = container.querySelector('#break-even-chart');
    if (!canvas) return;

    if (chartInstance) {
      chartInstance.destroy();
    }

    const months = Array.from({ length: 25 }, (_, i) => `M${i}`);
    
    // Cloud cumulative data: monthlyCloudTotal * month
    const cloudData = months.map((_, i) => Math.round(stats.monthlyCloudTotal * i));

    // Local cumulative data: upfront + (monthlyLocalPower * month)
    const localData = months.map((_, i) => Math.round(rigUpfrontCost + (stats.monthlyLocalPower * i)));

    // Net Equity data: local cumulative - (resale value amortized)
    const equityData = months.map((_, i) => {
      const depreciationFactor = Math.max(0.3, 1 - (i / 24) * (1 - resaleRetentionPct / 100));
      const currentAssetValue = rigUpfrontCost * depreciationFactor;
      return Math.round(rigUpfrontCost + (stats.monthlyLocalPower * i) - currentAssetValue);
    });

    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Cloud Rental Cumulative',
            data: cloudData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2.5,
            pointRadius: 2,
            tension: 0.1
          },
          {
            label: 'Local Rig Cumulative Spend',
            data: localData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2.5,
            pointRadius: 2,
            tension: 0.1
          },
          {
            label: 'Net Outlay (After Hardware Equity)',
            data: equityData,
            borderColor: '#06b6d4',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#121824',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => ` ${context.dataset.label}: $${context.parsed.y.toLocaleString()}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `$${val}`
            }
          }
        }
      }
    });
  }

  function attachEvents() {
    // Sliders
    const inputRigCost = container.querySelector('#input-rig-cost');
    if (inputRigCost) {
      inputRigCost.addEventListener('input', (e) => {
        rigUpfrontCost = parseInt(e.target.value, 10);
        render();
      });
    }

    const inputHours = container.querySelector('#input-daily-hours');
    if (inputHours) {
      inputHours.addEventListener('input', (e) => {
        dailyUsageHours = parseFloat(e.target.value);
        render();
      });
    }

    const selectProvider = container.querySelector('#select-provider');
    if (selectProvider) {
      selectProvider.addEventListener('change', (e) => {
        selectedProviderId = e.target.value;
        const prov = CLOUD_PROVIDERS.find(p => p.id === selectedProviderId);
        if (prov) {
          hourlyCloudRate = prov.hourlyRate;
          monthlyDiskFee = prov.storageCostPerMonth;
        }
        render();
      });
    }

    const inputHourly = container.querySelector('#input-hourly-rate');
    if (inputHourly) {
      inputHourly.addEventListener('change', (e) => {
        hourlyCloudRate = parseFloat(e.target.value) || 0.88;
        selectedProviderId = 'custom';
        render();
      });
    }

    const inputDisk = container.querySelector('#input-disk-fee');
    if (inputDisk) {
      inputDisk.addEventListener('change', (e) => {
        monthlyDiskFee = parseFloat(e.target.value) || 0;
        render();
      });
    }

    const inputWatts = container.querySelector('#input-system-watts');
    if (inputWatts) {
      inputWatts.addEventListener('input', (e) => {
        systemWatts = parseInt(e.target.value, 10);
        render();
      });
    }

    const inputKwh = container.querySelector('#input-kwh');
    if (inputKwh) {
      inputKwh.addEventListener('input', (e) => {
        kwhRate = parseFloat(e.target.value);
        render();
      });
    }

    const inputResale = container.querySelector('#input-resale');
    if (inputResale) {
      inputResale.addEventListener('input', (e) => {
        resaleRetentionPct = parseInt(e.target.value, 10);
        render();
      });
    }

    // Copy Reddit Summary
    const btnCopyReddit = container.querySelector('#btn-copy-calc-reddit');
    if (btnCopyReddit) {
      btnCopyReddit.addEventListener('click', () => {
        const stats = calculate();
        let md = `### [airigbuilder.com] Local AI vs Cloud GPU Break-Even Analysis\n\n`;
        md += `* **Local AI Rig Upfront Cost:** $${rigUpfrontCost.toLocaleString()}\n`;
        md += `* **Daily Usage:** ${dailyUsageHours} hrs/day\n`;
        md += `* **Cloud Provider Baseline:** $${hourlyCloudRate.toFixed(2)}/hr + $${monthlyDiskFee}/mo disk\n`;
        md += `* **Monthly Cloud Cost:** $${Math.round(stats.monthlyCloudTotal)}/mo\n`;
        md += `* **Monthly Local Electricity (${systemWatts}W @ $${kwhRate}/kWh):** $${Math.round(stats.monthlyLocalPower)}/mo\n`;
        md += `* **Break-Even Payoff Point:** **${stats.breakEvenMonths.toFixed(1)} Months** (~${stats.breakEvenDays} days)\n`;
        md += `* **2-Year Net Cash Savings:** **$${Math.round(stats.netCashSavings24Mo).toLocaleString()}**\n\n`;
        md += `*Generated via airigbuilder.com — The used-hardware price layer for local AI.*`;

        navigator.clipboard.writeText(md).then(() => {
          showToast('Copied break-even analysis to clipboard!');
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
    preloadRig: (params) => {
      if (params.upfrontCost) rigUpfrontCost = params.upfrontCost;
      if (params.systemWatts) systemWatts = params.systemWatts;
      if (params.dailyHours) dailyUsageHours = params.dailyHours;
      if (params.kwhRate) kwhRate = params.kwhRate;
      render();
    }
  };
}
