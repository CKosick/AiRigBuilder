// Build-time prerender: turns the built index.html into one static HTML file per page,
// each with its own <title>, description, canonical, Open Graph tags, JSON-LD and the page's
// content already in #app (readable without JavaScript). The browser app then takes over the
// same markup. Called from the Vite plugin in vite.config.js; the tests call it directly.
import { allRoutes, pageMeta, parseRoute, SECTIONS, SITE_URL, SITE_NAME } from '../src/routes.js';
import { renderShell } from '../src/components/shell.js';
import { renderModelPickerHtml } from '../src/components/modelPicker.js';
import { renderBreakEvenHtml } from '../src/components/breakEvenCalc.js';
import { renderPriceTrackerHtml } from '../src/components/priceTracker.js';
import { renderHardwareGuideHtml } from '../src/components/hardwareGuide.js';
import { renderGpuDetailHtml } from '../src/components/gpuDetail.js';
import { GPUS_DATA, GPUS_UPDATED_AT } from '../src/data/gpus.js';

const escapeHtml = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON inside <script> must not be able to close the tag
const jsonForScript = (obj) => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');

/** '/' -> 'index.html', '/tracker' -> 'tracker.html', '/gpu/rtx-3090' -> 'gpu/rtx-3090.html' */
export function outputFileFor(route) {
  return route.path === '/' ? 'index.html' : `${route.path.slice(1)}.html`;
}

function panelsFor(route) {
  switch (route.view) {
    case 'builds': return { builds: renderModelPickerHtml({ activeModelId: route.modelId }) };
    case 'calculator': return { calculator: renderBreakEvenHtml() };
    case 'tracker': return { tracker: renderPriceTrackerHtml() };
    case 'guide': return { guide: renderHardwareGuideHtml() };
    case 'gpu': return { gpu: renderGpuDetailHtml(GPUS_DATA.find(g => g.id === route.gpuId)) };
    default: return {};
  }
}

// Fails the build if index.html drifts away from what the prerender expects
function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`prerender: index.html template is missing ${label}`);
  return html.replace(pattern, () => replacement);
}

function structuredData(route, meta) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${meta.canonical}#webpage`,
        url: meta.canonical,
        name: meta.title,
        description: meta.description,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
        dateModified: GPUS_UPDATED_AT
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: meta.breadcrumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: `${SITE_URL}${c.path}`
        }))
      }
    ]
  };
}

/** Full HTML for one route, built from the (Vite-built or source) index.html. */
export function renderPage(template, route) {
  const meta = pageMeta(route);
  const title = escapeHtml(meta.title);
  const desc = escapeHtml(meta.description);
  let html = template;

  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, '<title>');
  html = replaceRequired(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${desc}" />`, 'meta description');
  html = replaceRequired(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${meta.canonical}" />`, 'canonical link');
  html = replaceRequired(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${meta.canonical}" />`, 'og:url');

  // The home page keeps its hand-written social copy, WebApplication and FAQ markup
  if (!route.home) {
    html = replaceRequired(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}" />`, 'og:title');
    html = replaceRequired(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${desc}" />`, 'og:description');
    html = replaceRequired(html, /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${title}" />`, 'twitter:title');
    html = replaceRequired(html, /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${desc}" />`, 'twitter:description');
    html = replaceRequired(
      html,
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script type="application/ld+json">\n${jsonForScript(structuredData(route, meta))}\n    </script>`,
      'JSON-LD block'
    );
  }

  html = replaceRequired(html, /<div id="app"><\/div>/, `<div id="app">${renderShell(route, panelsFor(route))}</div>`, '<div id="app"></div>');
  return html;
}

/** Every page: [{ route, fileName, html }] */
export function renderAllPages(template) {
  return allRoutes().map(route => ({ route, fileName: outputFileFor(route), html: renderPage(template, route) }));
}

/**
 * Static 404 page (Vercel serves dist/404.html for unknown paths). It has no app script,
 * so it can't show the home view at a wrong URL; plain links lead back into the site.
 */
export function renderNotFound(template) {
  let html = template;
  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/, `<title>Page Not Found | ${SITE_NAME}</title>`, '<title>');
  html = replaceRequired(html, /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex" />', 'robots meta');
  html = replaceRequired(html, /\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '', 'canonical link');
  html = html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
  html = html.replace(/\s*<script type="module"[^>]*><\/script>/g, '');
  const links = [parseRoute('/'), ...SECTIONS.map(s => parseRoute(s.path))]
    .map(r => `<li><a href="${r.path}">${r.home ? 'Home' : SECTIONS.find(s => s.path === r.path).label}</a></li>`).join('');
  return replaceRequired(html, /<div id="app"><\/div>/, `<div id="app">
    <main class="main-wrapper not-found" id="main-content">
      <h1>Page not found</h1>
      <p>That page doesn't exist on airigbuilder.com. It may have moved when the site switched from <code>#section</code> links to real pages.</p>
      <ul>${links}</ul>
    </main>
  </div>`, '<div id="app"></div>');
}

const SITEMAP_HINTS = { home: ['daily', '1.0'], tracker: ['daily', '0.9'], gpu: ['weekly', '0.8'], builds: ['weekly', '0.9'], calculator: ['weekly', '0.9'], guide: ['monthly', '0.8'], buildSheet: ['weekly', '0.7'] };

/** sitemap.xml listing every real URL; lastmod is the last weekly price update. */
export function renderSitemap(routes = allRoutes()) {
  const lastmod = GPUS_UPDATED_AT.slice(0, 10);
  const urls = routes.map(route => {
    const key = route.home ? 'home' : (route.modelId ? 'buildSheet' : route.view);
    const [changefreq, priority] = SITEMAP_HINTS[key];
    return `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}
