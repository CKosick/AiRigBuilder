import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { allRoutes, parseRoute, shortGpuName, SITE_URL } from '../src/routes.js';
import { renderPage, renderAllOgImages } from '../scripts/prerender.js';
import {
  isEntityRoute,
  ogSlugForRoute,
  ogAltForRoute,
  generateOgSvg,
  renderSvgToPng
} from '../scripts/generateOgImages.js';
import {
  estimateTextWidth,
  fitSingleLineText,
  fitBoxText,
  fitPillLabel,
  SHELL_INNER_WIDTH,
  BUILD_CARD_INNER_WIDTH,
  GPU_PRICE_CARD_INNER_WIDTH,
  GPU_EFFICIENCY_CARD_INNER_WIDTH,
  GPU_VERDICT_CARD_INNER_WIDTH,
  COMPARE_CARD_INNER_WIDTH,
  COMPARE_SPEC_VALUE_WIDTH,
  BEST_GPU_PRIMARY_INNER_WIDTH,
  BEST_GPU_SECONDARY_INNER_WIDTH
} from '../scripts/ogImageTemplates.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { COMPARISON_PAIRS, BEST_GPU_MODELS } from '../src/data/comparisons.js';
import { evaluateBestGpu } from '../src/components/bestGpu.js';
import { cheapestFittingTotal } from '../src/utils/tierFit.js';

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

/**
 * Extracts rendered verdict <text> lines and their font-size from Card 3 of a GPU SVG.
 */
function extractRenderedVerdictLines(svg) {
  const card3Split = svg.split('COMMUNITY CLASS</text>')[1] || '';
  const beforeBw = card3Split.split('GB/s bandwidth</text>')[0] || '';
  const matches = [...beforeBw.matchAll(/<text[^>]*font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)];
  return matches.map(m => ({
    fontSize: Number(m[1]),
    text: m[2]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }));
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
    it('RTX 3090 GPU card carries $879 and range $511 - $1,000', () => {
      const route = { view: 'gpu', path: '/gpu/rtx-3090', gpuId: 'rtx-3090' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('GeForce RTX 3090'));
      assert.ok(svg.includes('$879'), 'Should contain tracked used price $879');
      assert.ok(svg.includes('$511') && svg.includes('$1,000'), 'Should contain low and high price range');
      assert.ok(svg.includes('24 GB') && svg.includes('936 GB/s'), 'Should contain specs');
    });

    it('Llama 3.3 70B build card carries cheapest tier total $2,592 and min VRAM', () => {
      const route = { view: 'builds', path: '/builds/llama-3.3-70b', modelId: 'llama-3.3-70b' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('Llama 3.3 70B'));
      assert.ok(svg.includes('$2,592'), 'Should display cheapest fitting build total $2,592');
      assert.ok(svg.includes('40 GB'), 'Should display minimum required VRAM (40 GB)');
    });

    it('Llama 3.3 70B best-GPU card carries 2x Tesla P40 and computed pick price', () => {
      const route = { view: 'best-gpu', path: '/best-gpu/llama-3.3-70b', modelId: 'llama-3.3-70b' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('Llama 3.3 70B'));
      assert.ok(svg.includes('2x Tesla P40'), 'Should pick 2x Tesla P40 as cheapest that runs it');
      assert.ok(svg.includes('$598'), 'Should display price $598 for 2x Tesla P40');
    });

    it('RTX 3090 vs RTX 4090 comparison card carries both cards and their used prices', () => {
      const route = { view: 'compare', path: '/compare/rtx-3090-vs-rtx-4090', gpuIdA: 'rtx-3090', gpuIdB: 'rtx-4090' };
      const svg = generateOgSvg(route);
      assert.ok(svg.includes('RTX 3090') && svg.includes('RTX 4090'));
      assert.ok(svg.includes('vs'));
      assert.ok(svg.includes('$879'), 'Should include RTX 3090 price');
      assert.ok(svg.includes('$1,750'), 'Should include RTX 4090 price');
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

  describe('Template-level text fitting across catalog strings and pills', () => {
    it('fits verdict string inside its box for every GPU in GPUS_DATA (including Strix Halo and RTX 3090)', () => {
      // Named case 1: Strix Halo ("Cheapest 96GB-Class System")
      const strix = GPUS_DATA.find(g => g.id === 'strix-halo-128gb');
      assert.ok(strix, 'Strix Halo must exist in GPUS_DATA');
      assert.equal(strix.aiRating, 'Cheapest 96GB-Class System');
      const strixSvg = generateOgSvg({ view: 'gpu', path: `/gpu/${strix.id}`, gpuId: strix.id });
      const strixLines = extractRenderedVerdictLines(strixSvg);
      assert.ok(strixLines.length >= 1 && strixLines.length <= 2, 'Strix Halo verdict renders in 1-2 lines');
      assert.equal(strixLines.map(l => l.text).join(' '), strix.aiRating, 'Full Strix Halo verdict string is preserved');
      for (const line of strixLines) {
        const w = estimateTextWidth(line.text, line.fontSize);
        assert.ok(
          w <= GPU_VERDICT_CARD_INNER_WIDTH,
          `Strix Halo line "${line.text}" at ${line.fontSize}px (${w.toFixed(1)}px) must fit within ${GPU_VERDICT_CARD_INNER_WIDTH}px`
        );
      }

      // Named case 2: RTX 3090 ("King of Local 70B")
      const rtx3090 = GPUS_DATA.find(g => g.id === 'rtx-3090');
      assert.ok(rtx3090, 'RTX 3090 must exist in GPUS_DATA');
      assert.equal(rtx3090.aiRating, 'King of Local 70B');
      const rtx3090Svg = generateOgSvg({ view: 'gpu', path: `/gpu/${rtx3090.id}`, gpuId: rtx3090.id });
      const rtx3090Lines = extractRenderedVerdictLines(rtx3090Svg);
      assert.equal(rtx3090Lines.map(l => l.text).join(' '), rtx3090.aiRating, 'Full RTX 3090 verdict string is preserved');
      for (const line of rtx3090Lines) {
        const w = estimateTextWidth(line.text, line.fontSize);
        assert.ok(
          w <= GPU_VERDICT_CARD_INNER_WIDTH,
          `RTX 3090 line "${line.text}" at ${line.fontSize}px (${w.toFixed(1)}px) must fit within ${GPU_VERDICT_CARD_INNER_WIDTH}px`
        );
      }

      // Catalog-wide assertion across all 19 GPUs
      for (const gpu of GPUS_DATA) {
        const fit = fitBoxText(gpu.aiRating, GPU_VERDICT_CARD_INNER_WIDTH);
        assert.ok(
          fit.width <= GPU_VERDICT_CARD_INNER_WIDTH,
          `${gpu.id} verdict "${gpu.aiRating}" width (${fit.width.toFixed(1)}px) exceeds ${GPU_VERDICT_CARD_INNER_WIDTH}px`
        );
        const svg = generateOgSvg({ view: 'gpu', path: `/gpu/${gpu.id}`, gpuId: gpu.id });
        const renderedLines = extractRenderedVerdictLines(svg);
        assert.equal(
          renderedLines.map(l => l.text).join(' '),
          gpu.aiRating,
          `${gpu.id} rendered verdict text must match full aiRating`
        );
        for (const line of renderedLines) {
          const lineW = estimateTextWidth(line.text, line.fontSize);
          assert.ok(
            lineW <= GPU_VERDICT_CARD_INNER_WIDTH,
            `${gpu.id} rendered line "${line.text}" at ${line.fontSize}px (${lineW.toFixed(1)}px) exceeds ${GPU_VERDICT_CARD_INNER_WIDTH}px`
          );
        }

        // Also check price and pricePerGb fit their boxes
        const priceFit = fitSingleLineText(`Used $${gpu.usedStreetPrice.toLocaleString('en-US')}`, GPU_PRICE_CARD_INNER_WIDTH, 52, 24);
        assert.ok(priceFit.width <= GPU_PRICE_CARD_INNER_WIDTH, `${gpu.id} street price fits box`);
        const ppgFit = fitSingleLineText(`$${gpu.pricePerGb.toFixed(2)}/GB`, GPU_EFFICIENCY_CARD_INNER_WIDTH, 46, 20);
        assert.ok(ppgFit.width <= GPU_EFFICIENCY_CARD_INNER_WIDTH, `${gpu.id} pricePerGb fits box`);
      }
    });

    it('fits all pill labels inside their pill boxes with symmetric padding and within card inner widths', () => {
      const pills = [
        { label: 'CHEAPEST FIT', maxWidth: BUILD_CARD_INNER_WIDTH },
        { label: 'REQUIREMENT', maxWidth: BUILD_CARD_INNER_WIDTH },
        { label: 'RECOMMENDED', maxWidth: BUILD_CARD_INNER_WIDTH },
        { label: 'MARKET PRICE', maxWidth: GPU_PRICE_CARD_INNER_WIDTH },
        { label: 'EFFICIENCY', maxWidth: GPU_EFFICIENCY_CARD_INNER_WIDTH },
        { label: 'VERDICT', maxWidth: GPU_VERDICT_CARD_INNER_WIDTH },
        { label: 'CHEAPEST TO RUN IT', maxWidth: BEST_GPU_PRIMARY_INNER_WIDTH },
        { label: 'BEST VALUE FULL FIT', maxWidth: BEST_GPU_SECONDARY_INNER_WIDTH }
      ];
      for (const { label, maxWidth } of pills) {
        const pill = fitPillLabel(label, { maxWidth });
        assert.ok(
          pill.textWidth + pill.padX * 2 <= pill.pillWidth,
          `Pill "${label}" text (${pill.textWidth.toFixed(1)}px) + 2*padX (${pill.padX * 2}px) must fit within pillWidth (${pill.pillWidth}px)`
        );
        assert.ok(
          pill.pillWidth <= maxWidth,
          `Pill "${label}" width (${pill.pillWidth}px) must fit within card inner width (${maxWidth}px)`
        );
      }
    });

    it('fits build sheet, comparison, and best-GPU catalog strings within their box inner widths across all pages', () => {
      // Build sheets (56 models)
      for (const model of MODELS_DATA) {
        const sheet = BUILDS_DATA[model.id];
        if (!sheet) continue;
        const specLine = `${model.parameters} · ${model.architecture}`;
        const subFit = fitSingleLineText(specLine, SHELL_INNER_WIDTH, 24, 14);
        assert.ok(subFit.width <= SHELL_INNER_WIDTH, `${model.id} specLine fits shell inner width`);

        const cheapest = cheapestFittingTotal(sheet);
        const cheapestStr = cheapest !== null ? `$${cheapest.toLocaleString('en-US')}` : 'N/A';
        const cheapFit = fitSingleLineText(cheapestStr, BUILD_CARD_INNER_WIDTH, 52, 24);
        assert.ok(cheapFit.width <= BUILD_CARD_INNER_WIDTH, `${model.id} cheapest total fits box`);

        const sweetSpot = model.sweetSpotQuant ? model.sweetSpotQuant.split(' ')[0] : 'Q4_K_M';
        const quantFit = fitSingleLineText(sweetSpot, BUILD_CARD_INNER_WIDTH, 44, 20);
        assert.ok(quantFit.width <= BUILD_CARD_INNER_WIDTH, `${model.id} sweetSpot quant "${sweetSpot}" fits box`);
      }

      // Comparisons (10 pairs)
      for (const [a, b] of COMPARISON_PAIRS) {
        const gpuA = GPUS_DATA.find(g => g.id === a);
        const gpuB = GPUS_DATA.find(g => g.id === b);
        for (const gpu of [gpuA, gpuB]) {
          const nameFit = fitSingleLineText(shortGpuName(gpu), COMPARE_CARD_INNER_WIDTH, 28, 18);
          assert.ok(nameFit.width <= COMPARE_CARD_INNER_WIDTH, `${gpu.id} compare name fits`);
          const vramFit = fitSingleLineText(`${gpu.vram} GB ${gpu.vramType}`, COMPARE_SPEC_VALUE_WIDTH, 16, 12);
          assert.ok(vramFit.width <= COMPARE_SPEC_VALUE_WIDTH, `${gpu.id} compare vram spec fits`);
        }
      }

      // Best-GPU pages (8 models)
      for (const modelId of BEST_GPU_MODELS) {
        const pick = evaluateBestGpu(modelId);
        const cheapName = pick?.cheapestThatRuns?.name || 'None';
        const bestName = pick?.bestValueFullFit?.name || 'None';

        const cheapFit = fitSingleLineText(cheapName, BEST_GPU_PRIMARY_INNER_WIDTH, 30, 16);
        assert.ok(
          cheapFit.width <= BEST_GPU_PRIMARY_INNER_WIDTH,
          `${modelId} cheapest pick "${cheapName}" (${cheapFit.width.toFixed(1)}px) fits primary box (${BEST_GPU_PRIMARY_INNER_WIDTH}px)`
        );

        const bestFit = fitSingleLineText(bestName, BEST_GPU_SECONDARY_INNER_WIDTH, 30, 16);
        assert.ok(
          bestFit.width <= BEST_GPU_SECONDARY_INNER_WIDTH,
          `${modelId} best-value pick "${bestName}" (${bestFit.width.toFixed(1)}px) fits secondary box (${BEST_GPU_SECONDARY_INNER_WIDTH}px)`
        );
      }
    });

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
