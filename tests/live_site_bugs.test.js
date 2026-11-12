import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { parseRoute, pageMeta } from '../src/routes.js';
import { GPUS_DATA } from '../src/data/gpus.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Item 5: GPU page titles and descriptions carry $ and thousands separators', () => {
  it('formats RTX 5090 (> $1,000) with dollar signs and thousands separators in title and description', () => {
    const meta = pageMeta(parseRoute('/gpu/rtx-5090'));
    assert.ok(meta.title.includes('($5,999)'), `Expected ($5,999) in title, got: ${meta.title}`);
    assert.ok(meta.description.includes('about $5,999 on eBay'), `Expected 'about $5,999 on eBay' in description, got: ${meta.description}`);
    assert.ok(meta.description.includes('(range $5,400–$7,000, $187.47/GB VRAM)'), `Expected formatted range and $/GB in description, got: ${meta.description}`);
  });

  it('formats every GPU page title and description with dollar signs and thousands separators', () => {
    for (const gpu of GPUS_DATA) {
      const meta = pageMeta(parseRoute(`/gpu/${gpu.id}`));
      const expectedPrice = `$${gpu.usedStreetPrice.toLocaleString('en-US')}`;
      const expectedLow = `$${gpu.usedPriceLow.toLocaleString('en-US')}`;
      const expectedHigh = `$${gpu.usedPriceHigh.toLocaleString('en-US')}`;
      const expectedPerGb = `$${gpu.pricePerGb.toFixed(2)}/GB VRAM`;
      assert.ok(meta.title.includes(`(${expectedPrice})`), `${gpu.id} title missing (${expectedPrice}): ${meta.title}`);
      assert.ok(meta.description.includes(`about ${expectedPrice} on eBay (range ${expectedLow}–${expectedHigh}, ${expectedPerGb})`), `${gpu.id} description mismatch: ${meta.description}`);
    }
  });
});

describe('Items 1 to 4: Live-site browser regression suite', () => {
  let outDir;
  let server;
  let baseUrl;
  let browser;

  before(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airigbuilder-live-bugs-'));
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

  it('Item 1: loads comparison page with JS running, shows comparison and hides tracker table, and handles compare -> tracker -> compare navigation', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/compare/rtx-3090-vs-rtx-4090`, { waitUntil: 'networkidle' });

    const initialView = await page.evaluate(() => {
      const compareRoot = document.getElementById('compare-root');
      const trackerRoot = document.getElementById('tracker-root');
      return {
        compareHidden: compareRoot.hidden,
        compareVisible: compareRoot.offsetParent !== null,
        compareText: compareRoot.textContent,
        trackerHidden: trackerRoot.hidden,
        trackerVisible: trackerRoot.offsetParent !== null,
      };
    });

    assert.equal(initialView.compareHidden, false, 'compareRoot should not be hidden on /compare/rtx-3090-vs-rtx-4090');
    assert.equal(initialView.compareVisible, true, 'compareRoot should be visible on /compare/rtx-3090-vs-rtx-4090');
    assert.ok(initialView.compareText.includes('RTX 3090 vs RTX 4090'), 'compareRoot should contain comparison heading');
    assert.equal(initialView.trackerHidden, true, 'trackerRoot should be hidden on /compare/rtx-3090-vs-rtx-4090');
    assert.equal(initialView.trackerVisible, false, 'trackerRoot should not be visible on /compare/rtx-3090-vs-rtx-4090');

    // Navigate compare -> tracker inside the app
    await page.click('#compare-root a[href="/tracker"]');
    await page.waitForFunction(() => window.location.pathname === '/tracker');

    const trackerView = await page.evaluate(() => {
      const compareRoot = document.getElementById('compare-root');
      const trackerRoot = document.getElementById('tracker-root');
      return {
        compareHidden: compareRoot.hidden,
        compareVisible: compareRoot.offsetParent !== null,
        trackerHidden: trackerRoot.hidden,
        trackerVisible: trackerRoot.offsetParent !== null,
      };
    });

    assert.equal(trackerView.trackerHidden, false, 'trackerRoot should be unhidden after navigating to /tracker');
    assert.equal(trackerView.trackerVisible, true, 'trackerRoot should be visible on /tracker');
    assert.equal(trackerView.compareHidden, true, 'compareRoot should be hidden on /tracker');
    assert.equal(trackerView.compareVisible, false, 'compareRoot should not be visible on /tracker');

    // Navigate tracker -> compare inside the app via Command Palette (Cmd+K)
    await page.click('#btn-search');
    await page.fill('#cmdk-input', '3090 vs 4090');
    await page.click('#cmdk-list a[href="/compare/rtx-3090-vs-rtx-4090"]');
    await page.waitForFunction(() => window.location.pathname === '/compare/rtx-3090-vs-rtx-4090');

    const backToCompareView = await page.evaluate(() => {
      const compareRoot = document.getElementById('compare-root');
      const trackerRoot = document.getElementById('tracker-root');
      return {
        compareHidden: compareRoot.hidden,
        compareVisible: compareRoot.offsetParent !== null,
        compareText: compareRoot.textContent,
        trackerHidden: trackerRoot.hidden,
        trackerVisible: trackerRoot.offsetParent !== null,
      };
    });

    assert.equal(backToCompareView.compareHidden, false, 'compareRoot should be unhidden after navigating back to /compare/rtx-3090-vs-rtx-4090');
    assert.equal(backToCompareView.compareVisible, true, 'compareRoot should be visible after navigating back');
    assert.ok(backToCompareView.compareText.includes('RTX 3090 vs RTX 4090'));
    assert.equal(backToCompareView.trackerHidden, true, 'trackerRoot should be hidden after navigating back to compare');
    assert.equal(backToCompareView.trackerVisible, false, 'trackerRoot should not be visible after navigating back to compare');

    await context.close();
  });

  it('Item 1: loads best-GPU page with JS running, shows best-GPU view and keeps model picker hidden', async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/best-gpu/llama-3.3-70b`, { waitUntil: 'networkidle' });

    const bestGpuView = await page.evaluate(() => {
      const bestGpuRoot = document.getElementById('best-gpu-root');
      const modelPickerRoot = document.getElementById('model-picker-root');
      const buildsIndexRoot = document.getElementById('builds-index-root');
      return {
        bestGpuHidden: bestGpuRoot.hidden,
        bestGpuVisible: bestGpuRoot.offsetParent !== null,
        bestGpuText: bestGpuRoot.textContent,
        modelPickerHidden: modelPickerRoot.hidden,
        modelPickerVisible: modelPickerRoot.offsetParent !== null,
        buildsIndexHidden: buildsIndexRoot.hidden,
      };
    });

    assert.equal(bestGpuView.bestGpuHidden, false, 'bestGpuRoot should not be hidden on /best-gpu/llama-3.3-70b');
    assert.equal(bestGpuView.bestGpuVisible, true, 'bestGpuRoot should be visible on /best-gpu/llama-3.3-70b');
    assert.ok(bestGpuView.bestGpuText.includes('Best GPU for Llama 3.3 70B'), 'bestGpuRoot should contain Best GPU heading');
    assert.equal(bestGpuView.modelPickerHidden, true, 'modelPickerRoot should stay hidden on /best-gpu/llama-3.3-70b');
    assert.equal(bestGpuView.modelPickerVisible, false, 'modelPickerRoot should not be visible on /best-gpu/llama-3.3-70b');
    assert.equal(bestGpuView.buildsIndexHidden, true, 'buildsIndexRoot should stay hidden on /best-gpu/llama-3.3-70b');

    await context.close();
  });

  it('Items 2 to 4: at 375px viewport, zero horizontal overflow across all 8 page families, no header overlap, and dark-themed playground select', async () => {
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
        const headerBoxes = await page.evaluate(() => {
          const rect = (el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };
          const brandBtn = document.getElementById('brand-logo-btn');
          const brandName = document.querySelector('.brand-name');
          const searchBtn = document.getElementById('btn-search');
          return {
            brandBtn: rect(brandBtn),
            brandName: rect(brandName),
            searchBtn: rect(searchBtn),
          };
        });

        const intersects = (a, b) =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

        assert.equal(
          intersects(headerBoxes.brandBtn, headerBoxes.searchBtn),
          false,
          `#btn-search (${JSON.stringify(headerBoxes.searchBtn)}) must not intersect #brand-logo-btn (${JSON.stringify(headerBoxes.brandBtn)})`
        );
        assert.equal(
          intersects(headerBoxes.brandName, headerBoxes.searchBtn),
          false,
          `#btn-search (${JSON.stringify(headerBoxes.searchBtn)}) must not intersect .brand-name (${JSON.stringify(headerBoxes.brandName)})`
        );
      }

      if (route === '/playground') {
        const selectStyle = await page.evaluate(() => {
          const select = document.getElementById('playground-gpu-select');
          const cs = getComputedStyle(select);
          const r = select.getBoundingClientRect();
          return {
            backgroundColor: cs.backgroundColor,
            color: cs.color,
            right: r.right,
            width: r.width,
          };
        });
        assert.ok(selectStyle.right <= 375, `playground select right edge (${selectStyle.right}) must fit within 375px`);
        assert.notEqual(selectStyle.backgroundColor, 'rgb(255, 255, 255)', 'playground select must use dark theme background, not unstyled white');
      }
    }

    await context.close();
  });
});

