import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

describe('SEO & Structured Data Verification Tests', () => {
  const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  it('verifies index.html has a descriptive title within optimal length', () => {
    const titleMatch = indexHtml.match(/<title>(.*?)<\/title>/);
    assert.ok(titleMatch, 'index.html missing <title>');
    const title = titleMatch[1];
    assert.ok(title.includes('AI Rig Builder'), 'Title should mention AI Rig Builder');
    assert.ok(title.includes('Local AI'), 'Title should mention Local AI');
    assert.ok(title.length >= 30 && title.length <= 80, `Title length (${title.length}) should be between 30 and 80 chars`);
  });

  it('verifies meta description exists and falls within 80-165 characters', () => {
    const descMatch = indexHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    assert.ok(descMatch, 'index.html missing meta description');
    const desc = descMatch[1];
    assert.ok(desc.length >= 80 && desc.length <= 165, `Description length (${desc.length}) should be 80-165 chars`);
  });

  it('verifies canonical URL and robots indexing directives', () => {
    assert.ok(indexHtml.includes('<link rel="canonical" href="https://airigbuilder.com/" />'), 'Missing canonical link');
    assert.ok(indexHtml.includes('name="robots" content="index, follow'), 'Missing robots index directive');
  });

  it('verifies OpenGraph and Twitter card social metadata', () => {
    assert.ok(indexHtml.includes('property="og:image" content="https://airigbuilder.com/og-image.jpg"'), 'Missing og:image');
    assert.ok(indexHtml.includes('name="twitter:card" content="summary_large_image"'), 'Missing twitter:card');
    assert.ok(indexHtml.includes('property="og:site_name" content="AI Rig Builder"'), 'Missing og:site_name');
  });

  it('validates JSON-LD Structured Data schema.org markup', () => {
    const jsonLdMatch = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdMatch, 'Missing JSON-LD script block');
    
    const parsed = JSON.parse(jsonLdMatch[1]);
    assert.equal(parsed['@context'], 'https://schema.org');
    assert.ok(Array.isArray(parsed['@graph']), '@graph array required');

    const webApp = parsed['@graph'].find(item => item['@type'] === 'WebApplication');
    assert.ok(webApp, 'Missing WebApplication JSON-LD schema');
    assert.equal(webApp.name, 'AI Rig Builder');

    const faq = parsed['@graph'].find(item => item['@type'] === 'FAQPage');
    assert.ok(faq, 'Missing FAQPage JSON-LD schema');
    assert.ok(faq.mainEntity.length >= 3, 'FAQPage should contain at least 3 high-value Q&A entries');
  });

  it('verifies public/robots.txt allows crawling and specifies sitemap location', () => {
    const robotsPath = path.join(ROOT_DIR, 'public', 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'public/robots.txt must exist');
    const robots = fs.readFileSync(robotsPath, 'utf-8');
    assert.ok(robots.includes('User-agent: *'));
    assert.ok(robots.includes('Allow: /'));
    assert.ok(robots.includes('Sitemap: https://airigbuilder.com/sitemap.xml'));
  });

  it('verifies public/sitemap.xml is valid XML and contains canonical domain routes', () => {
    const sitemapPath = path.join(ROOT_DIR, 'public', 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
    const sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    assert.ok(sitemap.startsWith('<?xml version="1.0"'));
    assert.ok(sitemap.includes('<loc>https://airigbuilder.com/</loc>'));
    assert.ok(sitemap.includes('<changefreq>daily</changefreq>'));
  });

  it('verifies eBay Partner Network (Impact) site verification meta tag exists in <head>', () => {
    assert.ok(
      indexHtml.includes("<meta name='impact-site-verification' value='05402127-5a7e-4b92-9ee9-b640c645a147'>"),
      "index.html must contain exact impact-site-verification meta tag with value attribute"
    );
  });
});
