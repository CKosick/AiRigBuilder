import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { allRoutes, parseRoute, SITE_URL } from '../src/routes.js';
import { renderPage, renderAllOgImages } from '../scripts/prerender.js';
import {
  isEntityRoute,
  ogSlugForRoute,
  ogAltForRoute,
  generateOgSvg,
  renderSvgToPng
} from '../scripts/generateOgImages.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { COMPARISON_PAIRS, BEST_GPU_MODELS } from '../src/data/comparisons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

function parsePngDimensions(buffer) {
  assert.ok(buffer.length >= 24, 'Buffer too small for PNG header');
  const magic = buffer.subarray(0, 8);
  const expectedMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(magic, expectedMagic, 'Must have valid PNG magic bytes');
  const ihdr = buffer.subarray(12, 16).toString('ascii');
  assert.equal(ihdr, 'IHDR', 'First chunk must be IHDR');
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe('Dynamic Open Graph Images', () => {
  it('identifies exactly 93 entity routes', () => {
    const routes = allRoutes();
    const entityRoutes = routes.filter(isEntityRoute);
    assert.equal(entityRoutes.length, 93);
    assert.equal(MODELS_DATA.length, 56);
    assert.equal(GPUS_DATA.length, 19);
    assert.equal(COMPARISON_PAIRS.length, 10);
    assert.equal(BEST_GPU_MODELS.length, 8);
    assert.equal(56 + 19 + 10 + 8, 93);
  });

  describe('Pre-raster SVG figure assertions across page families', () => {
    it('RTX 3090 GPU card carries $860 and range $512 - $1,000', () => {
      const route = { view: 'gpu', path: '/gpu/rtx-3090', gpuId: 'rtx-3090' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('GeForce RTX 3090'));
      assert.ok(svg.includes('$860'), 'Should contain tracked used price $860');
      assert.ok(svg.includes('$512') && svg.includes('$1,000'), 'Should contain low and high price range');
      assert.ok(svg.includes('24 GB') && svg.includes('936 GB/s'), 'Should contain specs');
    });

    it('Llama 3.3 70B build card carries cheapest tier total $2,554 and min VRAM', () => {
      const route = { view: 'builds', path: '/builds/llama-3.3-70b', modelId: 'llama-3.3-70b' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('Llama 3.3 70B'));
      assert.ok(svg.includes('$2,554'), 'Should display cheapest fitting build total $2,554');
      assert.ok(svg.includes('40 GB'), 'Should display minimum required VRAM (40 GB)');
    });

    it('Llama 3.3 70B best-GPU card carries 2x Tesla P40 and computed pick price', () => {
      const route = { view: 'best-gpu', path: '/best-gpu/llama-3.3-70b', modelId: 'llama-3.3-70b' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('Llama 3.3 70B'));
      assert.ok(svg.includes('2x Tesla P40'), 'Should pick 2x Tesla P40 as cheapest that runs it');
      assert.ok(svg.includes('$580'), 'Should display price $580 for 2x Tesla P40');
    });

    it('RTX 3090 vs RTX 4090 comparison card carries both cards and their used prices', () => {
      const route = { view: 'compare', path: '/compare/rtx-3090-vs-rtx-4090', gpuIdA: 'rtx-3090', gpuIdB: 'rtx-4090' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('RTX 3090') && svg.includes('RTX 4090'));
      assert.ok(svg.includes('vs'));
      assert.ok(svg.includes('$860'), 'Should include RTX 3090 price');
      assert.ok(svg.includes('$1,550'), 'Should include RTX 4090 price');
    });
  });

  describe('Prerender meta wiring', () => {
    it('sets dynamic OG and Twitter image meta tags on all 93 entity pages', () => {
      const routes = allRoutes().filter(isEntityRoute);
      for (const route of routes) {
        const html = renderPage(template, route);
        const slug = ogSlugForRoute(route);
        const expectedOgImage = `${SITE_URL}/og/${slug}.png`;
        const alt = ogAltForRoute(route);

        assert.ok(
          html.includes(`<meta property="og:image" content="${expectedOgImage}" />`),
          `Missing or incorrect og:image on ${route.path}`
        );
        assert.ok(
          html.includes('<meta property="og:image:type" content="image/png" />'),
          `Missing image/png og:image:type on ${route.path}`
        );
        assert.ok(
          html.includes(`<meta name="twitter:image" content="${expectedOgImage}" />`),
          `Missing or incorrect twitter:image on ${route.path}`
        );
        assert.ok(
          html.includes(`content="${alt}"`),
          `Missing alt description on ${route.path}`
        );
      }
    });

    it('keeps static fallback og-image.jpg and image/jpeg on non-entity pages', () => {
      const nonEntityPaths = ['/', '/builds', '/tracker', '/calculator', '/guide', '/playground'];
      for (const p of nonEntityPaths) {
        const route = parseRoute(p);
        const html = renderPage(template, route);
        assert.ok(
          html.includes('<meta property="og:image" content="https://airigbuilder.com/og-image.jpg" />'),
          `Non-entity page ${p} should keep static og-image.jpg`
        );
        assert.ok(
          html.includes('<meta property="og:image:type" content="image/jpeg" />'),
          `Non-entity page ${p} should keep image/jpeg`
        );
        assert.ok(
          html.includes('<meta name="twitter:image" content="https://airigbuilder.com/og-image.jpg" />'),
          `Non-entity page ${p} should keep static twitter:image`
        );
      }
    });
  });

  describe('Layout safety on long model and GPU names', () => {
    it('handles longest model and GPU names without throwing and renders valid SVGs', () => {
      const longModel = MODELS_DATA.reduce((a, b) => (a.name.length > b.name.length ? a : b));
      const longGpu = GPUS_DATA.reduce((a, b) => (a.name.length > b.name.length ? a : b));

      const modelRoute = { view: 'builds', path: `/builds/${longModel.id}`, modelId: longModel.id };
      const modelSvg = generateOgSvg(modelRoute);
      assert.ok(modelSvg.length > 0);
      const modelPng = renderSvgToPng(modelSvg);
      assert.ok(modelPng.length > 0 && modelPng.length < 200 * 1024);

      const gpuRoute = { view: 'gpu', path: `/gpu/${longGpu.id}`, gpuId: longGpu.id };
      const gpuSvg = generateOgSvg(gpuRoute);
      assert.ok(gpuSvg.length > 0);
      const gpuPng = renderSvgToPng(gpuSvg);
      assert.ok(gpuPng.length > 0 && gpuPng.length < 200 * 1024);
    });
  });

  describe('Rasterized PNG generation (all 93 images)', () => {
    it('generates 93 cards with exact 1200x630 dimensions and under 200KB size', () => {
      const allOg = renderAllOgImages();
      assert.equal(allOg.length, 93);

      for (const img of allOg) {
        assert.ok(img.slug, 'Must have slug');
        assert.ok(img.fileName.startsWith('og/'), `Filename must start with og/: ${img.fileName}`);
        assert.ok(img.fileName.endsWith('.png'), `Filename must end with .png: ${img.fileName}`);
        assert.ok(img.buffer instanceof Uint8Array, 'Buffer must be Uint8Array');

        // Verify dimensions from PNG header
        const { width, height } = parsePngDimensions(img.buffer);
        assert.equal(width, 1200, `Width must be 1200 for ${img.slug}`);
        assert.equal(height, 630, `Height must be 630 for ${img.slug}`);

        // Verify size limit < 200 KB
        const kb = img.buffer.length / 1024;
        assert.ok(kb < 200, `Image size for ${img.slug} (${kb.toFixed(1)} KB) must be under 200 KB`);
      }
    });
  });
});
