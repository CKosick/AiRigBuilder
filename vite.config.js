import path from 'path';
import { pathToFileURL } from 'url';
import { defineConfig, loadEnv } from 'vite';

/**
 * After Vite builds index.html, writes a static page per route (sections, GPUs, build sheets),
 * plus sitemap.xml and 404.html, all from the current data files (see scripts/prerender.js).
 */
function prerenderPages() {
  return {
    name: 'airigbuilder:prerender',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index || index.type !== 'asset') this.error('prerender: index.html was not built');
      const template = String(index.source);

      // Imported at build time (not bundled into the config) so it reads the data files as they are now
      const prerender = await import(pathToFileURL(path.resolve(import.meta.dirname, 'scripts/prerender.js')).href);

      for (const page of prerender.renderAllPages(template)) {
        if (page.fileName === 'index.html') index.source = page.html;
        else this.emitFile({ type: 'asset', fileName: page.fileName, source: page.html });
      }
      this.emitFile({ type: 'asset', fileName: '404.html', source: prerender.renderNotFound(template) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: prerender.renderSitemap() });
    }
  };
}

export default defineConfig(({ mode }) => {
  // The browser bundle reads affiliate IDs from import.meta.env; the prerender runs in Node
  // and reads process.env, so expose the same .env values there.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [prerenderPages()]
  };
});
