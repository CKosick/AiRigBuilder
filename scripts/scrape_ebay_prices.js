// scripts/scrape_ebay_prices.js
// Semi-automated eBay market scraper for the 10 AI Rig Builder GPUs
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Attempt to run the Python SeleniumBase UC engine first to bypass Akamai WAF 403s
function runPythonEngine() {
  const pyScript = path.join(__dirname, 'fetch_ebay.py');
  if (!fs.existsSync(pyScript)) return false;

  console.log('⚡ Launching anti-bot headless engine (SeleniumBase UC)...');

  // Try 'py' launcher first (standard on Windows), then 'python'
  const commands = ['py', 'python'];
  for (const cmd of commands) {
    try {
      const res = spawnSync(cmd, [pyScript], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
      });
      if (res.status === 0) {
        return true;
      }
    } catch (e) {
      // continue to next command
    }
  }
  return false;
}

// 10 Tracked cards with targeted eBay search terms and baseline validation guards
const TRACKED_GPUS = [
  {
    id: 'rtx-3090',
    name: 'NVIDIA GeForce RTX 3090',
    vram: 24,
    currentPrice: 695,
    query: 'RTX 3090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read)',
    minSensiblePrice: 450,
    maxSensiblePrice: 1000,
    excludeKeywords: ['parts', 'box only', 'broken', 'cooler only', 'shroud', 'waterblock', 'damaged', 'read description', 'for repair']
  },
  {
    id: 'rtx-4090',
    name: 'NVIDIA GeForce RTX 4090',
    vram: 24,
    currentPrice: 1540,
    query: 'RTX 4090 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged,read)',
    minSensiblePrice: 1100,
    maxSensiblePrice: 2200,
    excludeKeywords: ['parts', 'box only', 'broken', 'cooler only', 'shroud', 'waterblock', 'damaged', 'read description']
  },
  {
    id: 'rx-7900-xtx',
    name: 'AMD Radeon RX 7900 XTX',
    vram: 24,
    currentPrice: 790,
    query: 'RX 7900 XTX 24GB -(box,cooler,broken,parts,shroud,waterblock,damaged)',
    minSensiblePrice: 550,
    maxSensiblePrice: 1100,
    excludeKeywords: ['parts', 'box only', 'broken', 'cooler only', 'shroud', 'waterblock', 'xt']
  },
  {
    id: 'rtx-4060-ti-16gb',
    name: 'NVIDIA GeForce RTX 4060 Ti 16GB',
    vram: 16,
    currentPrice: 385,
    query: 'RTX 4060 Ti 16GB -(8GB,box,cooler,broken,parts)',
    minSensiblePrice: 280,
    maxSensiblePrice: 520,
    excludeKeywords: ['8gb', '8 gb', 'parts', 'box only', 'broken']
  },
  {
    id: 'rtx-3060-12gb',
    name: 'NVIDIA GeForce RTX 3060 12GB',
    vram: 12,
    currentPrice: 225,
    query: 'RTX 3060 12GB -(8GB,box,cooler,broken,parts)',
    minSensiblePrice: 150,
    maxSensiblePrice: 310,
    excludeKeywords: ['8gb', '8 gb', 'parts', 'box only', 'broken']
  },
  {
    id: 'tesla-p40',
    name: 'NVIDIA Tesla P40 24GB',
    vram: 24,
    currentPrice: 175,
    query: 'Tesla P40 24GB -(cooler,fan,bracket,shroud,parts)',
    minSensiblePrice: 120,
    maxSensiblePrice: 260,
    excludeKeywords: ['fan only', 'shroud only', 'bracket', 'parts only', 'heatsink']
  },
  {
    id: 'rtx-4080-super',
    name: 'NVIDIA GeForce RTX 4080 Super 16GB',
    vram: 16,
    currentPrice: 880,
    query: 'RTX 4080 Super 16GB -(box,cooler,broken,parts)',
    minSensiblePrice: 650,
    maxSensiblePrice: 1150,
    excludeKeywords: ['parts', 'box only', 'broken', 'cooler only']
  },
  {
    id: 'rtx-3080-10gb',
    name: 'NVIDIA GeForce RTX 3080 10GB',
    vram: 10,
    currentPrice: 370,
    query: 'RTX 3080 10GB -(12GB,box,cooler,broken,parts)',
    minSensiblePrice: 260,
    maxSensiblePrice: 500,
    excludeKeywords: ['12gb', '12 gb', 'parts', 'box only', 'broken']
  },
  {
    id: 'rtx-a5000',
    name: 'NVIDIA RTX A5000 24GB',
    vram: 24,
    currentPrice: 1180,
    query: 'RTX A5000 24GB -(box,cooler,broken,parts,laptop,mobile)',
    minSensiblePrice: 850,
    maxSensiblePrice: 1600,
    excludeKeywords: ['laptop', 'mobile', 'parts', 'box only', 'broken']
  },
  {
    id: 'mac-studio-m2-ultra',
    name: 'Apple Mac Studio (M2/M4 Ultra 64-192GB)',
    vram: 64,
    currentPrice: 2750,
    query: 'Mac Studio M2 Ultra -(Max,broken,parts,box)',
    minSensiblePrice: 1900,
    maxSensiblePrice: 3800,
    excludeKeywords: ['m2 max', 'm1 max', 'parts only', 'box only', 'broken']
  }
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parsePrice(text) {
  if (!text) return null;
  const match = text.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

async function scrapeGpuPrices(target) {
  console.log(`\n🔍 Fetching eBay listings for: ${target.name}...`);
  const encodedQuery = encodeURIComponent(target.query);
  const url = `https://www.ebay.com/sch/27386/i.html?_nkw=${encodedQuery}&LH_BIN=1&_sop=15`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`  ⚠️ HTTP ${res.status} response from eBay. Using fallback baseline.`);
      return fallbackResult(target, `HTTP ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const validSales = [];

    $('.s-item, .s-card').each((_, el) => {
      const title = $(el).find('.s-item__title, .s-card__title').text().trim();
      const priceText = $(el).find('.s-item__price, .s-card__price').text().trim();

      if (!title || title.toLowerCase().includes('shop on ebay') || !priceText) {
        return;
      }

      const titleLower = title.toLowerCase();
      const hasExcludedKeyword = target.excludeKeywords.some(kw => titleLower.includes(kw.toLowerCase()));
      if (hasExcludedKeyword) return;

      const price = parsePrice(priceText);
      if (price && price >= target.minSensiblePrice && price <= target.maxSensiblePrice) {
        validSales.push({ title, price });
      }
    });

    if (validSales.length < 3) {
      console.warn(`  ⚠️ Only found ${validSales.length} valid listings. Falling back to calibrated baseline.`);
      return fallbackResult(target, `Low listing count (${validSales.length})`);
    }

    validSales.sort((a, b) => a.price - b.price);
    const prices = validSales.map(s => s.price);
    const median = Math.round(prices[Math.floor(prices.length / 2)]);
    const low = Math.round(prices[Math.floor(prices.length * 0.20)]);
    const high = Math.round(prices[Math.floor(prices.length * 0.80)]);
    const mean = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    const finalProposedPrice = Math.round(median * 0.96);
    const diff = finalProposedPrice - target.currentPrice;
    const pctChange = parseFloat(((diff / target.currentPrice) * 100).toFixed(1));

    console.log(`  ✓ Found ${validSales.length} live listings.`);
    console.log(`    Current: $${target.currentPrice} → Proposed: $${finalProposedPrice} (${diff >= 0 ? '+' : ''}${diff}, ${pctChange}%)`);

    return {
      id: target.id,
      name: target.name,
      vram: target.vram,
      currentPrice: target.currentPrice,
      proposedPrice: finalProposedPrice,
      priceLow: Math.round(low * 0.96),
      priceHigh: Math.round(high * 0.96),
      changePct: pctChange, // vs the current site price, not a 7-day trend
      sampleCount: validSales.length,
      status: Math.abs(pctChange) > 15 ? 'FLAGGED_SWING' : 'APPROVED',
      source: 'REAL_EBAY_ACTIVE_COMPS',
      notes: `${validSales.length} live listings analyzed. Median: $${median}, -4% spread applied.`,
      recentSamples: validSales.slice(0, 5)
    };
  } catch (err) {
    console.warn(`  ❌ Scraping error: ${err.message}. Using fallback.`);
    return fallbackResult(target, err.message);
  }
}

function fallbackResult(target, reason) {
  const proposed = target.currentPrice;
  return {
    id: target.id,
    name: target.name,
    vram: target.vram,
    currentPrice: target.currentPrice,
    proposedPrice: proposed,
    priceLow: Math.round(proposed * 0.92),
    priceHigh: Math.round(proposed * 1.08),
    changePct: 0.0,
    sampleCount: 0,
    status: 'APPROVED',
    source: 'CALIBRATED_FALLBACK',
    notes: `Fallback estimate (${reason}). Baseline retained.`,
    recentSamples: [
      { title: `${target.name} standard market baseline`, price: proposed }
    ]
  };
}

async function runFallback() {
  console.log('Running Node.js fallback scraper...');
  const results = [];
  for (let i = 0; i < TRACKED_GPUS.length; i++) {
    const gpu = TRACKED_GPUS[i];
    const result = await scrapeGpuPrices(gpu);
    results.push(result);
    if (i < TRACKED_GPUS.length - 1) await sleep(2500);
  }

  const dataDir = path.join(ROOT_DIR, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const reviewPayload = {
    scrapedAt: new Date().toISOString(),
    reviewStatus: 'PENDING_REVIEW',
    note: 'Eyeball this file before applying. Edit any proposedPrice if needed. When ready, run: npm run prices:apply',
    cards: results
  };

  const jsonPath = path.join(dataDir, 'pending_price_review.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reviewPayload, null, 2), 'utf-8');

  const mdPath = path.join(ROOT_DIR, 'PENDING_PRICE_REVIEW.md');
  let md = `# Weekly Used GPU Price Review — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n\n`;
  md += `> [!IMPORTANT]\n> **MANUAL REVIEW STEP**: Eyeball the scraped numbers below before they go live.\n\n`;
  md += `| GPU Model | VRAM | Current | Proposed | Delta | Change | Proposed Range | Data Source | Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  results.forEach(c => {
    const diff = c.proposedPrice - c.currentPrice;
    const diffStr = diff >= 0 ? `+$${diff}` : `-$${Math.abs(diff)}`;
    const trendStr = c.changePct >= 0 ? `+${c.changePct}%` : `${c.changePct}%`;
    const statusBadge = c.status === 'APPROVED' ? '✅ APPROVED' : '⚠️ FLAGGED SWING';
    const sourceBadge = c.source === 'CALIBRATED_FALLBACK' ? '🟡 Baseline' : '🟢 Live Comps';
    md += `| **${c.name}** | ${c.vram}GB | $${c.currentPrice} | **$${c.proposedPrice}** | ${diffStr} | ${trendStr} | $${c.priceLow} - $${c.priceHigh} | ${sourceBadge} | ${statusBadge} |\n`;
  });

  fs.writeFileSync(mdPath, md, 'utf-8');
}

async function main() {
  const success = runPythonEngine();
  if (!success) {
    console.warn('⚠️ Python UC engine could not run or encountered an error. Running Node fallback...');
    await runFallback();
  }
}

main();
