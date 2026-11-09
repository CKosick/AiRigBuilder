import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { SECTIONS } from '../src/routes.js';
import { BEST_GPU_MODELS } from '../src/data/comparisons.js';
import { evaluateBestGpu, groupBestGpuPicks, renderBestGpuHtml } from '../src/components/bestGpu.js';
import { VRAM_LABEL_MIN_PCT, shouldShowVramSegmentLabel, tierFit, renderVramBreakdownBarHtml } from '../src/utils/tierFit.js';
import { MODELS_DATA } from '../src/data/models.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Item 6: Canonical section names vs short nav tab labels', () => {
  it('preserves canonical full names in SECTIONS', () => {
    assert.deepEqual(
      SECTIONS.map(s => s.label),
      ['Build Sheets', 'Rig Playground', 'Break-Even Calculator', 'GPU Price Tracker', 'Hardware Guide']
    );
  });
});

describe('Item 8: VRAM breakdown bar label threshold helper', () => {
  it('shows in-bar labels only when segment width is >= threshold (12%)', () => {
    assert.equal(VRAM_LABEL_MIN_PCT, 12);
    assert.equal(shouldShowVramSegmentLabel(0), false);
    assert.equal(shouldShowVramSegmentLabel(2.08), false);
    assert.equal(shouldShowVramSegmentLabel(5.63), false);
    assert.equal(shouldShowVramSegmentLabel(11.99), false);
    assert.equal(shouldShowVramSegmentLabel(12), true);
    assert.equal(shouldShowVramSegmentLabel(12.01), true);
    assert.equal(shouldShowVramSegmentLabel(50.12), true);
    assert.equal(shouldShowVramSegmentLabel(87.5), true);
  });

  it('hides narrow KV, overhead, and free in-bar labels on Llama 3.3 70B at 8K while keeping weights label and full legend', () => {
    const llama = MODELS_DATA.find(m => m.id === 'llama-3.3-70b');
    const dual3090 = { id: 'tier-budget-used', memoryGb: 48 };
    const fit8k = tierFit(llama, dual3090, { contextK: 8, kvScale: 1 });
    const html8k = renderVramBreakdownBarHtml(fit8k, dual3090);

    // Weights segment (87.50%) keeps its in-bar label
    assert.ok(html8k.includes('<span class="vram-segment-label">Weights 42.0 GB</span>'));
    // KV (5.63%), overhead (2.08%), free (4.79%) hide their in-bar labels
    assert.ok(!html8k.includes('<span class="vram-segment-label">KV cache 2.7 GB</span>'));
    assert.ok(!html8k.includes('<span class="vram-segment-label">Runtime overhead 1.0 GB</span>'));
    assert.ok(!html8k.includes('<span class="vram-segment-label">Free 2.3 GB</span>'));

    // Legend still shows all 4 items with full figures
    assert.ok(html8k.includes('<span class="vram-legend-label">Model weights (Q4_K_M):</span>'));
    assert.ok(html8k.includes('<span class="vram-legend-val">42.0 GB</span>'));
    assert.ok(html8k.includes('<span class="vram-legend-label">KV cache:</span>'));
    assert.ok(html8k.includes('<span class="vram-legend-val">2.7 GB</span>'));
    assert.ok(html8k.includes('<span class="vram-legend-label">Runtime overhead:</span>'));
    assert.ok(html8k.includes('<span class="vram-legend-val">1.0 GB</span>'));
    assert.ok(html8k.includes('<span class="vram-legend-label">Free memory:</span>'));
    assert.ok(html8k.includes('<span class="vram-legend-val">2.3 GB</span>'));

    // At 128K overflow, KV segment is 50.12% >= 12%, so KV in-bar label is shown
    const fit128k = tierFit(llama, dual3090, { contextK: 128, kvScale: 1 });
    const html128k = renderVramBreakdownBarHtml(fit128k, dual3090);
    assert.ok(html128k.includes('<span class="vram-segment-label">Weights 42.0 GB</span>'));
    assert.ok(html128k.includes('<span class="vram-segment-label">KV cache 43.2 GB</span>'));
    assert.ok(!html128k.includes('<span class="vram-segment-label">Runtime overhead 1.0 GB</span>'));
  });
});

describe('Item 9: Best-GPU pages merge duplicate pick configurations', () => {
  it('renders no duplicate configuration cards across all 8 best-GPU models, and merges Llama 3.3 70B dual P40 picks with both labels', () => {
    for (const modelId of BEST_GPU_MODELS) {
      const evalResult = evaluateBestGpu(modelId);
      const grouped = groupBestGpuPicks(evalResult);
      const html = renderBestGpuHtml(modelId);

      // Extract all data-config-key attributes from rendered pick cards
      const configKeys = [...html.matchAll(/class="best-gpu-pick-card[^"]*"\s+data-config-key="([^"]+)"/g)].map(m => m[1]);
      assert.equal(
        new Set(configKeys).size,
        configKeys.length,
        `Model ${modelId} must not render two pick cards for the same GPU+count configuration (got: ${configKeys.join(', ')})`
      );

      // Also verify h3.pick-name titles inside the picks grid are unique
      const pickNames = [...html.matchAll(/<h3 class="pick-name">([^<]+)<\/h3>/g)].map(m => m[1]);
      assert.equal(
        new Set(pickNames).size,
        pickNames.length,
        `Model ${modelId} must have unique pick card headings (got: ${pickNames.join(', ')})`
      );

      assert.equal(grouped.filter(g => g.config).length, configKeys.length);
    }

    // Specific verification for Llama 3.3 70B: dual P40 card carries both Cheapest That Runs It and Best Value Full Fit labels
    const llamaHtml = renderBestGpuHtml('llama-3.3-70b');
    const llamaPickNames = [...llamaHtml.matchAll(/<h3 class="pick-name">([^<]+)<\/h3>/g)].map(m => m[1]);
    assert.deepEqual(llamaPickNames, ['2x NVIDIA Tesla P40 24GB', '2x NVIDIA GeForce RTX 5090']);

    const llamaBadges = [...llamaHtml.matchAll(/<div class="pick-badge[^"]*">([^<]+)<\/div>/g)].map(m => m[1]);
    assert.equal(llamaBadges.length, 2);
    assert.ok(
      llamaBadges[0].includes('Cheapest That Runs It') && llamaBadges[0].includes('Best Value Full Fit'),
      `Expected merged dual P40 badge to carry both labels, got: ${llamaBadges[0]}`
    );
    assert.equal(llamaBadges[1], 'Fastest Discrete Rig');
  });
});

describe('Items 6, 7, 8: Playwright browser verification at 1440px, 1024px, and 375x812', () => {
  let outDir;
  let server;
  let baseUrl;
  let browser;

  before(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airigbuilder-visual-polish-'));
    const { build } = await import('vite');
    await build({
      root: ROOT_DIR,
      configFile: path.join(ROOT_DIR, 'vite.config.js'),
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });

    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.json': 'application/json',
    };

    server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      let filePath = path.join(outDir, urlPath === '/' ? 'index.html' : urlPath);
      if (!filePath.endsWith('.html') && fs.existsSync(`${filePath}.html`)) {
        filePath = `${filePath}.html`;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(filePath));
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (outDir) fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('Item 6: at 1440px and 1024px, every nav tab displays its short label on a single line and the tab row is one line tall', async () => {
    for (const width of [1440, 1024]) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

      const navMetrics = await page.evaluate(() => {
        const navTabsRect = document.querySelector('.nav-tabs').getBoundingClientRect();
        const tabs = [...document.querySelectorAll('.nav-tab-btn')].map((btn) => {
          const span = btn.querySelector('span');
          const r = btn.getBoundingClientRect();
          let textLines = 0;
          if (span) {
            const range = document.createRange();
            for (const node of span.childNodes) {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                range.selectNodeContents(node);
                textLines = range.getClientRects().length;
              }
            }
          }
          return {
            id: btn.id,
            text: btn.textContent.trim(),
            top: Math.round(r.top * 10) / 10,
            height: Math.round(r.height * 10) / 10,
            textLines,
          };
        });
        return {
          navTabsHeight: Math.round(navTabsRect.height * 10) / 10,
          tabs,
        };
      });

      assert.deepEqual(
        navMetrics.tabs.map(t => t.text),
        ['Builds', 'Playground', 'Break-Even', 'Prices', 'Guide'],
        `Short tab labels at ${width}px`
      );

      for (const tab of navMetrics.tabs) {
        assert.equal(tab.textLines, 1, `Tab ${tab.id} ("${tab.text}") at ${width}px must render on 1 line, got ${tab.textLines}`);
        assert.equal(tab.top, navMetrics.tabs[0].top, `Tab ${tab.id} at ${width}px must share the same top y (${navMetrics.tabs[0].top}), got ${tab.top}`);
      }

      // Single-line pill container is ~41px tall (31px buttons + 2*4px padding + 2*1px border)
      assert.ok(navMetrics.navTabsHeight <= 44, `Expected single-line .nav-tabs height <= 44px at ${width}px, got ${navMetrics.navTabsHeight}px`);

      await context.close();
    }
  });

  it('Item 7: at 375x812, the stacked header block on the home page measures <= 200px, the home hero headline is visible in the first viewport, and no page overflows horizontally', async () => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();

    const routesToCheck = [
      '/',
      '/builds/qwen-2.5-coder-32b',
      '/builds',
      '/playground',
      '/tracker',
      '/gpu/rtx-3090',
      '/compare/rtx-3090-vs-rtx-4090',
      '/best-gpu/llama-3.3-70b',
    ];

    for (const route of routesToCheck) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      assert.ok(
        metrics.scrollWidth <= metrics.viewportWidth,
        `Expected scrollWidth <= ${metrics.viewportWidth} on ${route}, got ${metrics.scrollWidth}`
      );

      if (route === '/') {
        const homeLayout = await page.evaluate(() => {
          const header = document.querySelector('.header-container').getBoundingClientRect();
          const heroHeadline = document.querySelector('.hero-answer').getBoundingClientRect();
          const tabs = [...document.querySelectorAll('.nav-tab-btn')].map(b => Math.round(b.getBoundingClientRect().top * 10) / 10);
          return {
            headerHeight: Math.round(header.height * 10) / 10,
            heroTop: Math.round(heroHeadline.top * 10) / 10,
            heroBottom: Math.round(heroHeadline.bottom * 10) / 10,
            viewportHeight: window.innerHeight,
            tabTops: tabs,
          };
        });

        assert.ok(
          homeLayout.headerHeight <= 200,
          `Expected stacked phone header height <= 200px at 375x812, got ${homeLayout.headerHeight}px`
        );
        // Phone tab strip is a single horizontal row
        for (const top of homeLayout.tabTops) {
          assert.equal(top, homeLayout.tabTops[0], `All phone tabs must sit on a single row, got tops: ${homeLayout.tabTops.join(', ')}`);
        }
        // Hero headline is completely visible in the first 375x812 viewport
        assert.ok(homeLayout.heroTop >= 0 && homeLayout.heroBottom <= homeLayout.viewportHeight, `Hero headline (${homeLayout.heroTop}..${homeLayout.heroBottom}) must be visible in 812px viewport`);
      }
    }

    await context.close();
  });

  it('Item 8: Playwright spot check on a build sheet with a narrow KV segment hides the KV in-bar label, keeps the weights label, and preserves the legend', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });

    const barState = await page.evaluate(() => {
      const breakdown = document.querySelector('.vram-breakdown');
      const weightsLabel = breakdown.querySelector('.vram-segment-weights .vram-segment-label');
      const kvLabel = breakdown.querySelector('.vram-segment-kv .vram-segment-label');
      const overheadLabel = breakdown.querySelector('.vram-segment-overhead .vram-segment-label');
      const headroomLabel = breakdown.querySelector('.vram-segment-headroom .vram-segment-label');
      const legendItems = [...breakdown.querySelectorAll('.vram-legend-item')].map(el => el.textContent.replace(/\s+/g, ' ').trim());
      return {
        weightsLabelText: weightsLabel ? weightsLabel.textContent.trim() : null,
        kvLabelExists: Boolean(kvLabel),
        overheadLabelExists: Boolean(overheadLabel),
        headroomLabelExists: Boolean(headroomLabel),
        legendItems,
      };
    });

    assert.equal(barState.weightsLabelText, 'Weights 42.0 GB');
    assert.equal(barState.kvLabelExists, false, 'narrow KV segment must not render an in-bar label');
    assert.equal(barState.overheadLabelExists, false, 'narrow overhead segment must not render an in-bar label');
    assert.equal(barState.headroomLabelExists, false, 'narrow headroom segment must not render an in-bar label');
    assert.deepEqual(barState.legendItems, [
      'Model weights (Q4_K_M): 42.0 GB',
      'KV cache: 2.7 GB',
      'Runtime overhead: 1.0 GB',
      'Free memory: 2.3 GB',
    ]);

    await context.close();
  });
});
