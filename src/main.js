import './style.css';
import { createModelPicker } from './components/modelPicker.js';
import { createBreakEvenCalc } from './components/breakEvenCalc.js';
import { createPriceTracker } from './components/priceTracker.js';
import { createHardwareGuide } from './components/hardwareGuide.js';
import { GPUS_DATA } from './data/gpus.js';
import { CLOUD_PROVIDERS } from './data/providers.js';
import { computeBreakEven, BASELINE_RIG } from './utils/breakEven.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  const rtx3090 = GPUS_DATA.find(g => g.id === 'rtx-3090') || { usedStreetPrice: 718, trend7d: 3.3 };
  const teslaP40 = GPUS_DATA.find(g => g.id === 'tesla-p40') || { usedStreetPrice: 273, pricePerGb: 11.38 };
  const dual3090RigEst = BASELINE_RIG.cost;
  // Headline payoff uses the same defaults as the Break-Even calculator (4 hrs/day, $0.14/kWh)
  const runpodDual3090 = CLOUD_PROVIDERS.find(p => p.id === 'runpod-dual-3090');
  const headlinePayoff = computeBreakEven({
    rigUpfrontCost: dual3090RigEst,
    dailyUsageHours: 4,
    hourlyCloudRate: runpodDual3090.hourlyRate,
    monthlyDiskFee: runpodDual3090.storageCostPerMonth,
    systemWatts: BASELINE_RIG.watts,
    kwhRate: 0.14
  });
  const payoffMonths = Math.round(headlinePayoff.breakEvenMonths);
  const trendArrow = rtx3090.trend7d >= 0 ? `▲ ${rtx3090.trend7d}%` : `▼ ${Math.abs(rtx3090.trend7d)}%`;
  const trendClass = rtx3090.trend7d >= 0 ? 'ticker-val' : 'ticker-drop';

  app.innerHTML = `
    <a href="#main-content" class="skip-link" id="skip-link">Skip to main content</a>

    <!-- Top Market Ticker -->
    <header class="header-container">
      <div class="market-ticker">
        <div class="ticker-item">
          <span class="ticker-tag">Live Market</span>
          <span>RTX 3090 24GB Avg:</span>
          <span class="ticker-val">$${rtx3090.usedStreetPrice}</span>
          <span class="${trendClass}" style="color: ${rtx3090.trend7d >= 0 ? '#34d399' : '#f87171'}">${trendArrow} (7d)</span>
        </div>
        <div class="ticker-item">
          <span>Dual-3090 70B Rig:</span>
          <span class="ticker-val">~$${dual3090RigEst.toLocaleString()}</span>
          <span style="color: var(--text-dim);">[Q4_K_M @ ~20 tok/s]</span>
        </div>
        <div class="ticker-item">
          <span>Cloud 70B Break-Even:</span>
          <span class="ticker-val" style="color: var(--cyan);">~${payoffMonths} Months</span>
          <span style="color: var(--text-dim);">(4 hrs/day vs RunPod $${runpodDual3090.hourlyRate.toFixed(2)}/hr)</span>
        </div>
        <div class="ticker-item">
          <span>Cheapest 24GB:</span>
          <span class="ticker-val" style="color: #34d399;">Tesla P40 ($${teslaP40.usedStreetPrice})</span>
          <span style="color: var(--text-dim);">[$${teslaP40.pricePerGb}/GB]</span>
        </div>
      </div>

      <!-- Main Navigation Bar -->
      <nav class="nav-bar">
        <a href="#builds" class="brand-wrapper" id="brand-logo-btn" aria-label="AIRigBuilder.com home: Build Sheets">
          <div class="brand-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
              <rect x="9" y="9" width="6" height="6"/>
              <line x1="9" y1="1" x2="9" y2="4"/>
              <line x1="15" y1="1" x2="15" y2="4"/>
              <line x1="9" y1="20" x2="9" y2="23"/>
              <line x1="15" y1="20" x2="15" y2="23"/>
              <line x1="20" y1="9" x2="23" y2="9"/>
              <line x1="20" y1="14" x2="23" y2="14"/>
              <line x1="1" y1="9" x2="4" y2="9"/>
              <line x1="1" y1="14" x2="4" y2="14"/>
            </svg>
          </div>
          <div class="brand-title-group">
            <h1>AIRigBuilder<span class="domain-suffix">.com</span></h1>
            <div class="brand-tagline">The Used-Hardware Price Layer for Local AI</div>
          </div>
        </a>

        <!-- Navigation Tabs -->
        <div class="nav-tabs" role="tablist" aria-label="Site sections">
          <button class="nav-tab-btn active" id="tab-builds" role="tab" aria-selected="true" aria-controls="view-builds" data-view="view-builds">
            <span><span aria-hidden="true">🖥️ </span>Build Sheets</span>
          </button>
          <button class="nav-tab-btn" id="tab-calculator" role="tab" aria-selected="false" aria-controls="view-calculator" tabindex="-1" data-view="view-calculator">
            <span><span aria-hidden="true">⚡ </span>Break-Even ROI</span>
          </button>
          <button class="nav-tab-btn" id="tab-tracker" role="tab" aria-selected="false" aria-controls="view-tracker" tabindex="-1" data-view="view-tracker">
            <span><span aria-hidden="true">📊 </span>GPU Price Tracker</span>
          </button>
          <button class="nav-tab-btn" id="tab-guide" role="tab" aria-selected="false" aria-controls="view-guide" tabindex="-1" data-view="view-guide">
            <span><span aria-hidden="true">🛠️ </span>Hardware Guide</span>
          </button>
        </div>

        <div class="header-actions">
          <button class="btn-secondary" id="btn-why-used">
            <span aria-hidden="true">💡 </span>Why Used 3090?
          </button>
        </div>
      </nav>
    </header>

    <!-- Hero Banner -->
    <section class="hero-banner">
      <div class="hero-card">
        <div class="hero-text">
          <h2>The Smartest Way to Run <span class="hero-highlight">70B Local AI Models</span></h2>
          <p>
            Nobody answers <em>"what is the cheapest way to run 70B models at home"</em> with real used-market street prices, true total-build electricity costs, and the exact cloud break-even point. We track verified eBay sold prices so you never overpay.
          </p>
        </div>
        <div class="hero-stats">
          <div class="hero-stat-pill">
            <div class="hero-stat-val">48 GB</div>
            <div class="hero-stat-lbl">Dual 3090 VRAM</div>
          </div>
          <div class="hero-stat-pill">
            <div class="hero-stat-val">~$${dual3090RigEst.toLocaleString()}</div>
            <div class="hero-stat-lbl">Full 70B Rig Cost</div>
          </div>
          <div class="hero-stat-pill">
            <div class="hero-stat-val">~${payoffMonths} Mo</div>
            <div class="hero-stat-lbl">Cloud Payoff @ 4 hrs/day</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Workspace Container -->
    <main class="main-wrapper" id="main-content" tabindex="-1">
      <div id="view-builds" class="view-section active" role="tabpanel" aria-labelledby="tab-builds"></div>
      <div id="view-calculator" class="view-section" role="tabpanel" aria-labelledby="tab-calculator" hidden></div>
      <div id="view-tracker" class="view-section" role="tabpanel" aria-labelledby="tab-tracker" hidden></div>
      <div id="view-guide" class="view-section" role="tabpanel" aria-labelledby="tab-guide" hidden></div>
    </main>

    <!-- Footer -->
    <footer class="footer-container">
      <div class="footer-content">
        <div class="footer-disclaimer">
          <strong style="color: var(--text-main); display: block; margin-bottom: 4px;">
            airigbuilder.com — Independent Local AI Hardware Intelligence
          </strong>
          Used GPU prices are aggregated from real eBay sold listings. When you buy components through our merchant links (Amazon Associates, B&H Photo, eBay Partner Network), we may earn a small referral commission at no additional cost to you. True electricity costs assume continuous model evaluation cycles.
        </div>
        <nav aria-label="Footer" style="display: flex; gap: 1.5rem; font-family: var(--font-mono); font-size: 0.78rem;">
          <a href="#builds" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Build Sheets</a>
          <a href="#calculator" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Break-Even Calc</a>
          <a href="#tracker" class="footer-link" style="color: var(--text-muted); text-decoration: none;">GPU Tracker</a>
          <a href="#guide" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Hardware Gotchas</a>
        </nav>
      </div>
    </footer>
  `;

  // Views & Navigation Controller
  const viewBuilds = document.getElementById('view-builds');
  const viewCalculator = document.getElementById('view-calculator');
  const viewTracker = document.getElementById('view-tracker');
  const viewGuide = document.getElementById('view-guide');

  // Initialize Subcomponents
  let breakEvenController = null;

  const modelPickerController = createModelPicker(viewBuilds, (rigData) => {
    switchView('view-calculator');
    if (breakEvenController) {
      breakEvenController.preloadRig(rigData);
    }
  });

  breakEvenController = createBreakEvenCalc(viewCalculator);
  createPriceTracker(viewTracker);
  createHardwareGuide(viewGuide);

  // Tab switching logic
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const views = [
    { id: 'view-builds', hash: 'builds', el: viewBuilds },
    { id: 'view-calculator', hash: 'calculator', el: viewCalculator },
    { id: 'view-tracker', hash: 'tracker', el: viewTracker },
    { id: 'view-guide', hash: 'guide', el: viewGuide }
  ];

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function switchView(targetViewId) {
    tabButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-view') === targetViewId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    });

    views.forEach(v => {
      const isActive = v.id === targetViewId;
      v.el.classList.toggle('active', isActive);
      v.el.hidden = !isActive;
    });

    const activeView = views.find(v => v.id === targetViewId);
    if (activeView) {
      history.replaceState(null, '', `#${activeView.hash}`);
    }
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  tabButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view');
      switchView(target);
    });

    // Arrow keys / Home / End move between tabs (WAI-ARIA tabs pattern)
    btn.addEventListener('keydown', (e) => {
      const last = tabButtons.length - 1;
      const next = { ArrowRight: idx === last ? 0 : idx + 1, ArrowLeft: idx === 0 ? last : idx - 1, Home: 0, End: last }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      tabButtons[next].focus();
      switchView(tabButtons[next].getAttribute('data-view'));
    });
  });

  document.getElementById('brand-logo-btn').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('view-builds');
  });

  document.getElementById('skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('main-content').focus();
  });

  document.getElementById('btn-why-used').addEventListener('click', () => {
    switchView('view-guide');
  });

  // Handle URL hash on load and on in-page links (footer, back/forward)
  function showViewForHash() {
    const view = views.find(v => v.hash === window.location.hash.replace('#', ''));
    if (view) switchView(view.id);
  }
  window.addEventListener('hashchange', showViewForHash);
  showViewForHash();
});
