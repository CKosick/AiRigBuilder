// Main Application Entrypoint for airigbuilder.com
import './style.css';
import { createModelPicker } from './components/modelPicker.js';
import { createBreakEvenCalc } from './components/breakEvenCalc.js';
import { createPriceTracker } from './components/priceTracker.js';
import { createHardwareGuide } from './components/hardwareGuide.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');

  app.innerHTML = `
    <!-- Top Market Ticker -->
    <header class="header-container">
      <div class="market-ticker">
        <div class="ticker-item">
          <span class="ticker-tag">Live Market</span>
          <span>RTX 3090 24GB Avg:</span>
          <span class="ticker-val">$695</span>
          <span class="ticker-drop">▼ 2.1% (7d)</span>
        </div>
        <div class="ticker-item">
          <span>Dual-3090 70B Rig:</span>
          <span class="ticker-val">~$1,780</span>
          <span style="color: var(--text-dim);">[Q4_K_M @ ~20 tok/s]</span>
        </div>
        <div class="ticker-item">
          <span>Cloud 70B Break-Even:</span>
          <span class="ticker-val" style="color: var(--cyan);">5.8 Months</span>
          <span style="color: var(--text-dim);">(vs RunPod $0.88/hr)</span>
        </div>
        <div class="ticker-item">
          <span>Cheapest 24GB:</span>
          <span class="ticker-val" style="color: #34d399;">Tesla P40 ($175)</span>
          <span style="color: var(--text-dim);">[$7.29/GB]</span>
        </div>
      </div>

      <!-- Main Navigation Bar -->
      <nav class="nav-bar">
        <div class="brand-wrapper" id="brand-logo-btn">
          <div class="brand-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        </div>

        <!-- Navigation Tabs -->
        <div class="nav-tabs">
          <button class="nav-tab-btn active" data-view="view-builds">
            <span>🖥️ Build Sheets</span>
          </button>
          <button class="nav-tab-btn" data-view="view-calculator">
            <span>⚡ Break-Even ROI</span>
          </button>
          <button class="nav-tab-btn" data-view="view-tracker">
            <span>📊 GPU Price Tracker</span>
          </button>
          <button class="nav-tab-btn" data-view="view-guide">
            <span>🛠️ Hardware Guide</span>
          </button>
        </div>

        <div class="header-actions">
          <button class="btn-secondary" id="btn-why-used">
            💡 Why Used 3090?
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
            <div class="hero-stat-val">~$1,780</div>
            <div class="hero-stat-lbl">Full 70B Rig Cost</div>
          </div>
          <div class="hero-stat-pill">
            <div class="hero-stat-val">~5.8 Mo</div>
            <div class="hero-stat-lbl">Cloud Payoff</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Workspace Container -->
    <main class="main-wrapper">
      <div id="view-builds" class="view-section active"></div>
      <div id="view-calculator" class="view-section"></div>
      <div id="view-tracker" class="view-section"></div>
      <div id="view-guide" class="view-section"></div>
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
        <div style="display: flex; gap: 1.5rem; font-family: var(--font-mono); font-size: 0.78rem;">
          <a href="#builds" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Build Sheets</a>
          <a href="#calculator" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Break-Even Calc</a>
          <a href="#tracker" class="footer-link" style="color: var(--text-muted); text-decoration: none;">GPU Tracker</a>
          <a href="#guide" class="footer-link" style="color: var(--text-muted); text-decoration: none;">Hardware Gotchas</a>
        </div>
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

  function switchView(targetViewId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === targetViewId);
    });

    views.forEach(v => {
      v.el.classList.toggle('active', v.id === targetViewId);
    });

    const activeView = views.find(v => v.id === targetViewId);
    if (activeView) {
      history.replaceState(null, '', `#${activeView.hash}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-view');
      switchView(target);
    });
  });

  document.getElementById('brand-logo-btn').addEventListener('click', () => {
    switchView('view-builds');
  });

  document.getElementById('btn-why-used').addEventListener('click', () => {
    switchView('view-guide');
  });

  // Handle URL hash on load
  const currentHash = window.location.hash.replace('#', '');
  if (currentHash === 'calculator') switchView('view-calculator');
  else if (currentHash === 'tracker') switchView('view-tracker');
  else if (currentHash === 'guide') switchView('view-guide');
});
