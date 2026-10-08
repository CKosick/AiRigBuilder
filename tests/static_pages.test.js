import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { allRoutes, pageMeta, parseRoute, legacyHashRoute, buildPath, isCanonical, DEFAULT_MODEL_ID, SITE_URL } from '../src/routes.js';
import { renderAllPages, renderPage, renderNotFound, renderSitemap, outputFileFor } from '../scripts/prerender.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { MODELS_DATA } from '../src/data/models.js';
import { BUILDS_DATA } from '../src/data/builds.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (html, re) => decode((html.match(re) || [])[1] || '');
const titleOf = (html) => decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');

// What a crawler without JavaScript reads inside #app
function visibleAppText(html) {
  const app = html.slice(html.indexOf('<div id="app">'));
  return decode(app.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
}

const pages = renderAllPages(template);
const byPath = Object.fromEntries(pages.map(p => [p.route.path, p.html]));
// The default model's /builds page duplicates the home page, so its canonical is /
const canonicalFor = (route) => `${SITE_URL}${route.modelId ? buildPath(route.modelId) : route.path}`;
const canonicalPages = pages.filter(p => isCanonical(p.route));

describe('URL structure', () => {
  it('has a page for home, each section, each GPU and each model build sheet', () => {
    const paths = allRoutes().map(r => r.path);
    for (const p of ['/', '/builds', '/calculator', '/tracker', '/guide']) assert.ok(paths.includes(p), p);
    for (const g of GPUS_DATA) assert.ok(paths.includes(`/gpu/${g.id}`), g.id);
    for (const m of MODELS_DATA) assert.ok(paths.includes(`/builds/${m.id}`), m.id);
    assert.equal(paths.length, 5 + GPUS_DATA.length + MODELS_DATA.length);
    assert.equal(new Set(paths).size, paths.length, 'paths are unique');
  });

  it('parses paths, trailing slashes and .html, and rejects unknown pages', () => {
    assert.deepEqual(parseRoute('/'), { view: 'builds', path: '/', home: true });
    assert.deepEqual(parseRoute('/builds'), { view: 'builds', path: '/builds', index: true });
    assert.equal(parseRoute('/tracker/').path, '/tracker');
    assert.equal(parseRoute('/guide.html').path, '/guide');
    assert.equal(parseRoute('/gpu/rtx-3090').gpuId, 'rtx-3090');
    assert.equal(parseRoute('/builds/llama-3.3-70b').modelId, 'llama-3.3-70b');
    assert.equal(parseRoute('/gpu/not-a-gpu'), null);
    assert.equal(parseRoute('/builds/not-a-model'), null);
    assert.equal(parseRoute('/random'), null);
    assert.equal(parseRoute('/%E0%A4%A'), null, 'malformed escapes do not throw');
  });

  it('maps the old #hash sections to their new paths', () => {
    assert.equal(legacyHashRoute('#builds').path, '/builds');
    assert.equal(legacyHashRoute('#calculator').path, '/calculator');
    assert.equal(legacyHashRoute('#tracker').path, '/tracker');
    assert.equal(legacyHashRoute('#guide').path, '/guide');
    assert.equal(legacyHashRoute('#main-content'), null);
    assert.equal(legacyHashRoute(''), null);
  });

  it('writes each page to the file Vercel cleanUrls serves at that path', () => {
    assert.equal(outputFileFor(parseRoute('/')), 'index.html');
    assert.equal(outputFileFor(parseRoute('/tracker')), 'tracker.html');
    assert.equal(outputFileFor(parseRoute('/gpu/rtx-3090')), 'gpu/rtx-3090.html');
    assert.equal(outputFileFor(parseRoute('/builds/qwen-2.5-72b')), 'builds/qwen-2.5-72b.html');
  });
});

describe('Generated page <head> SEO', () => {
  it('home page head matches index.html (the hand-written copy is kept)', () => {
    const meta = pageMeta(parseRoute('/'));
    assert.equal(titleOf(template), meta.title);
    assert.equal(attr(template, /<meta\s+name="description"\s+content="([^"]+)"/), meta.description);
  });

  for (const page of pages) {
    const { route, html } = page;
    it(`${route.path} has its own title, description, canonical and Open Graph URL`, () => {
      const title = titleOf(html);
      assert.ok(title.length >= 30 && title.length <= 80, `title length ${title.length}: ${title}`);
      const desc = attr(html, /<meta\s+name="description"\s+content="([^"]+)"/);
      assert.ok(desc.length >= 80 && desc.length <= 165, `description length ${desc.length}: ${desc}`);
      const canonical = canonicalFor(route);
      assert.equal(attr(html, /<link\s+rel="canonical"\s+href="([^"]+)"/), canonical);
      assert.equal(attr(html, /<meta\s+property="og:url"\s+content="([^"]+)"/), canonical);
      assert.equal((html.match(/rel="canonical"/g) || []).length, 1, 'exactly one canonical');
      assert.ok(html.includes('name="robots" content="index, follow'), 'indexable');
      assert.ok(html.includes('property="og:image" content="https://airigbuilder.com/og-image.jpg"'), 'og:image kept');
      assert.ok(html.includes("<meta name='impact-site-verification'"), 'EPN verification tag kept');
      assert.ok(/<script type="module"[^>]*src="\/src\/main\.js"/.test(html), 'app script kept so the page stays interactive');
    });

    it(`${route.path} has valid JSON-LD`, () => {
      const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.equal(json['@context'], 'https://schema.org');
      if (route.home) {
        assert.ok(json['@graph'].some(n => n['@type'] === 'FAQPage'), 'home keeps the FAQ');
      } else {
        const crumbs = json['@graph'].find(n => n['@type'] === 'BreadcrumbList');
        assert.ok(crumbs, 'BreadcrumbList');
        assert.equal(crumbs.itemListElement.at(-1).item, `${SITE_URL}${route.path}`);
        assert.equal(json['@graph'].find(n => n['@type'] === 'WebPage').url, canonicalFor(route));
      }
    });
  }

  it('only the default model build page points its canonical elsewhere (to the home page)', () => {
    assert.deepEqual(pages.filter(p => !isCanonical(p.route)).map(p => p.route.path), [`/builds/${DEFAULT_MODEL_ID}`]);
    assert.ok(byPath[`/builds/${DEFAULT_MODEL_ID}`].includes(`<link rel="canonical" href="${SITE_URL}/" />`));
  });

  it('titles, descriptions and canonicals are unique across canonical pages', () => {
    for (const pick of [titleOf, (h) => attr(h, /<meta\s+name="description"\s+content="([^"]+)"/), (h) => attr(h, /rel="canonical"\s+href="([^"]+)"/)]) {
      const values = canonicalPages.map(p => pick(p.html));
      assert.equal(new Set(values).size, values.length);
    }
  });
});

describe('Generated page content without JavaScript', () => {
  it('each section page shows only its own section, already rendered', () => {
    const sections = { '/builds': 'view-builds', '/calculator': 'view-calculator', '/tracker': 'view-tracker', '/guide': 'view-guide' };
    for (const [p, id] of Object.entries(sections)) {
      const html = byPath[p];
      assert.ok(new RegExp(`id="${id}" class="view-section active"[^>]*>`).test(html), `${p} active panel`);
      assert.ok(new RegExp(`id="tab-${id.slice(5)}" role="tab" aria-selected="true"`).test(html), `${p} selected tab`);
      const hiddenPanels = (html.match(/role="tabpanel"[^>]* hidden>/g) || []).length;
      assert.equal(hiddenPanels, 3, `${p}: other panels hidden`);
    }
  });

  it('tracker lists every GPU with price and $/GB, linking to each GPU page', () => {
    const text = visibleAppText(byPath['/tracker']);
    for (const g of GPUS_DATA) {
      assert.ok(text.includes(g.name), g.name);
      assert.ok(text.includes(`$${g.pricePerGb.toFixed(2)}`), `${g.id} $/GB`);
      assert.ok(byPath['/tracker'].includes(`href="/gpu/${g.id}"`), `${g.id} link`);
    }
  });

  it('each GPU page shows price, range, $/GB, pros, cons, history and an affiliate eBay link', () => {
    for (const g of GPUS_DATA) {
      const html = byPath[`/gpu/${g.id}`];
      const text = visibleAppText(html);
      assert.ok(text.includes(`${g.name} Used Price`), `${g.id} heading`);
      assert.ok(text.includes(`$${g.usedStreetPrice.toLocaleString('en-US')}`), `${g.id} price`);
      assert.ok(text.includes(`$${g.usedPriceLow}–$${g.usedPriceHigh}`), `${g.id} range`);
      assert.ok(text.includes(`$${g.pricePerGb.toFixed(2)}`), `${g.id} $/GB`);
      for (const p of [...g.pros, ...g.cons]) assert.ok(text.includes(decode(p)), `${g.id}: ${p}`);
      for (const h of g.history) assert.ok(text.includes(h.date), `${g.id} history ${h.date}`);
      const ebay = attr(html, /href="([^"]*ebay[^"]*)"[^>]*rel="sponsored/);
      assert.ok(ebay.includes('campid='), `${g.id} eBay link carries EPN attribution`);
      assert.ok(html.includes('id="gpu-detail-root">'), `${g.id} detail panel visible`);
    }
  });

  it('/builds is an index of every build sheet, not a copy of the home page', () => {
    const html = byPath['/builds'];
    const text = visibleAppText(html);
    assert.ok(text.includes(`Local AI Build Sheets for ${MODELS_DATA.length} Models`));
    for (const m of MODELS_DATA) {
      assert.ok(html.includes(`href="${buildPath(m.id)}"><`) || html.includes(`<a href="${buildPath(m.id)}">${m.name}</a>`), `${m.id} linked`);
      assert.ok(text.includes(BUILDS_DATA[m.id].vramTarget), `${m.id} VRAM target`);
    }
    assert.ok(!html.includes('model-pill-btn'), 'the interactive picker is not pre-rendered on the index');
    assert.ok(byPath['/'].includes('model-pill-btn') && !byPath['/'].includes('builds-index-group'), 'home shows the picker, not the index');
  });

  it('build sheet pages that share a parts list still differ: each shows its own quant table', () => {
    for (const m of MODELS_DATA) {
      const text = visibleAppText(byPath[`/builds/${m.id}`]);
      assert.ok(text.includes(`${m.name}: Quantization Options`), `${m.id} quant heading`);
      for (const q of m.quants) {
        assert.ok(text.includes(`${q.vram} GB`) && text.includes(q.speed) && text.includes(decode(q.quality)), `${m.id} ${q.name}`);
      }
    }
  });

  it('every outbound merchant link is marked rel=sponsored', () => {
    let checked = 0;
    for (const { route, html } of pages) {
      for (const [tag] of html.matchAll(/<a\s[^>]*href="https?:\/\/(?!airigbuilder\.com)[^"]*"[^>]*>/g)) {
        if (/fonts\.|cloudflare/.test(tag)) continue;
        assert.match(tag, /rel="[^"]*\bsponsored\b/, `${route.path}: ${tag}`);
        checked++;
      }
      assert.ok(!/id="modal-ebay-link"/.test(html) || /rel="sponsored[^"]*" id="modal-ebay-link"/.test(html), `${route.path}: tracker modal eBay link`);
    }
    assert.ok(checked > 100, `checked ${checked} merchant links`);
  });

  it('each build sheet page shows its model, its tiers and the parts list', () => {
    for (const m of MODELS_DATA) {
      const text = visibleAppText(byPath[`/builds/${m.id}`]);
      const sheet = BUILDS_DATA[m.id];
      assert.ok(text.includes(m.name), `${m.id} name`);
      assert.ok(text.includes(decode(m.description)), `${m.id} description`);
      for (const t of sheet.tiers) assert.ok(text.includes(t.name), `${m.id} tier ${t.name}`);
      for (const part of sheet.tiers[0].parts) assert.ok(text.includes(decode(part.name)), `${m.id} part ${part.name}`);
    }
  });

  it('calculator and guide pages carry their real content', () => {
    assert.ok(visibleAppText(byPath['/calculator']).includes('Break-Even Point'));
    assert.ok(visibleAppText(byPath['/calculator']).includes('pays for itself'));
    assert.ok(visibleAppText(byPath['/guide']).includes('The Exact VRAM Math Formula'));
  });

  it('every page links to every build sheet and GPU page (crawlable internal links)', () => {
    const html = byPath['/guide'];
    for (const m of MODELS_DATA) assert.ok(html.includes(`href="${buildPath(m.id)}"`), m.id);
    for (const g of GPUS_DATA) assert.ok(html.includes(`href="/gpu/${g.id}"`), g.id);
    assert.ok(!/href="#(builds|calculator|tracker|guide)"/.test(html), 'no #hash navigation links left');
  });

  it('keeps the accessible tabs markup', () => {
    const html = byPath['/'];
    assert.ok(html.includes('role="tablist" aria-label="Site sections"'));
    assert.equal((html.match(/role="tab" /g) || []).length, 4);
    assert.ok(html.includes('href="#main-content" class="skip-link"'));
  });
});

describe('404, sitemap and hosting config', () => {
  it('404 page is not indexable and does not boot the app', () => {
    const html = renderNotFound(template);
    assert.ok(html.includes('<meta name="robots" content="noindex" />'));
    assert.ok(!html.includes('rel="canonical"'));
    assert.ok(!html.includes('type="module"'));
    assert.ok(html.includes('href="/tracker"'));
  });

  it('sitemap lists every canonical page and nothing else', () => {
    const sitemap = renderSitemap();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    assert.deepEqual(locs, allRoutes().filter(isCanonical).map(r => `${SITE_URL}${r.path}`));
    assert.ok(!locs.includes(`${SITE_URL}/builds/${DEFAULT_MODEL_ID}`));
    assert.equal(locs.length, 4 + GPUS_DATA.length + MODELS_DATA.length);
    assert.ok(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap));
  });

  it('vercel.json serves the static pages instead of rewriting everything to index.html', () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf-8'));
    assert.equal(vercel.cleanUrls, true);
    assert.ok(!(vercel.rewrites || []).some(r => r.destination === '/index.html'), 'no SPA catch-all (unknown paths must 404)');
    for (const r of vercel.rewrites || []) assert.ok(r.destination.endsWith('.html'), `${r.source} rewrites to a static file`);
  });

  it('renderPage fails loudly if index.html loses a tag the prerender fills in', () => {
    assert.throws(() => renderPage(template.replace(/<link rel="canonical"[^>]*>/, ''), parseRoute('/tracker')), /canonical/);
  });
});

describe('npm run build output', () => {
  let outDir;
  before(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airigbuilder-build-'));
    const { build } = await import('vite');
    await build({ root: ROOT_DIR, configFile: path.join(ROOT_DIR, 'vite.config.js'), logLevel: 'silent', build: { outDir, emptyOutDir: true } });
  });
  after(() => fs.rmSync(outDir, { recursive: true, force: true }));

  it('emits a static HTML file for every page, plus sitemap.xml and 404.html', () => {
    for (const route of allRoutes()) {
      const file = path.join(outDir, outputFileFor(route));
      assert.ok(fs.existsSync(file), `missing ${outputFileFor(route)}`);
      const html = fs.readFileSync(file, 'utf-8');
      assert.ok(/<script type="module" crossorigin src="\/assets\/[^"]+\.js">/.test(html), `${route.path} loads the built bundle`);
      assert.ok(html.includes(`<link rel="canonical" href="${canonicalFor(route)}" />`), `${route.path} canonical`);
      assert.ok(html.includes('class="view-section active"'), `${route.path} has rendered content`);
    }
    assert.ok(fs.existsSync(path.join(outDir, 'sitemap.xml')));
    assert.ok(fs.existsSync(path.join(outDir, '404.html')));
  });
});
