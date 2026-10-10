# AI Rig Builder (`airigbuilder.com`)

> **The used-hardware price layer for local AI.**  
> Answers: *"What's the cheapest way to run a 70B model at home?"* with real used-market street prices, true total-build cost (parts + tax + power), and the cloud break-even ROI.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build optimized production distribution
npm run build
```

---

## 🌟 Core Modules

1. **Model Picker → 3-Tier Build Sheets (`src/components/modelPicker.js`)**
   - 5 flagship models: Llama 3.3 70B, DeepSeek-R1-Distill-70B, Qwen 2.5 72B, Mistral NeMo 12B/24B, Llama 3.1 8B.
   - 3 verified tiers per model:
     - **Budget Used** (Dual used RTX 3090 24GB @ ~$695 each, AM4 platform → ~$2,270 total build)
     - **Balanced New/Used Mix** (AM5 Ryzen 7000, ASUS ProArt X670E, DDR5-6000 → ~$2,850 total)
     - **Best New / Turnkey** (Apple Mac Studio M2 Ultra Unified Memory or Blackwell single GPU)
   - Real-time **True 1st-Year Total Cost** engine factoring in user-customized sales tax and daily electricity draw ($/kWh).
   - One-click copy for Reddit r/LocalLLaMA markdown formatting.

2. **Cloud Break-Even Calculator (`src/components/breakEvenCalc.js`)**
   - The traffic and backlink engine.
   - Live comparisons against RunPod ($0.88/hr) and Vast.ai ($0.72/hr).
   - Interactive 24-month cumulative cost projection chart with Chart.js showing exact payoff month and 2-year net savings.

3. **Used GPU Price Tracker (`src/components/priceTracker.js`)**
   - The SEO moat tracking street prices for the 10 GPUs that matter for local AI.
   - Sorted by **Price per GB of VRAM ($/GB)**.
   - Interactive 6-month historical price charts and email alert capture for price drops.

4. **Hardware Guide & Architecture Gotchas (`src/components/hardwareGuide.js`)**
   - Solutions for Ampere transient power spikes, ATX 3.0 requirements, motherboard slot spacing, PCIe x4 inference viability, and VRAM calculation formulas.

---

## 📈 Weekly Used GPU Price Update Workflow (Phase 2)

We maintain street prices for the 10 GPUs that matter for local AI via a **semi-automated workflow with a human-in-the-loop review step**:

### Automated weekly run
`.github/workflows/weekly-prices.yml` runs Tuesdays at 23:00 UTC (and on demand from the Actions tab). It fetches listings from the eBay Browse API, applies the approved prices on a new `prices/<date>-run<N>` branch, runs the tests and opens a pull request with the review table. Nothing reaches `main` until someone checks the numbers and merges; Vercel deploys on merge. An older unmerged price PR is closed as superseded.

Setup, once:
- Repository secrets `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` (an eBay developer app's production keys; no eBay account login is involved). Until both exist, each run logs "eBay keys not set, skipping price update" and ends successfully, with no branch or PR.
- Settings → Actions → General → Workflow permissions: allow GitHub Actions to create and approve pull requests.
- Vercel: an environment variable `CRON_SECRET` (any long random string). The daily cron in `vercel.json` calls `/api/cron/check-alerts`, which emails price-drop alerts against the deployed prices. Email and alert-storage secrets stay in Vercel.

The steps below are what the workflow does; they also work by hand.

### Step 1: Fetch eBay listings
```bash
npm run prices:fetch    # eBay Browse API (needs EBAY_CLIENT_ID / EBAY_CLIENT_SECRET in .env)
npm run prices:scrape   # or: the local browser scraper (sold listings if signed in via prices:login)
```
- Collects eBay listings per GPU (active used Buy-It-Now listings from the API; the scraper gets sold listings when a signed-in session is available) and filters out parts, boxes, coolers, waterblocks, whole PCs and other variants.
- All pricing rules live in `scripts/price_review.js`: search terms and sanity ranges, the median (minus a 4% asking-to-sold spread for active listings), the 15th-85th percentile range, and the % change against the price the site shows now (read from `gpus.js`, never a copy in the scraper).
- A GPU with fewer than 3 usable listings gets **NO_DATA**: no change is proposed and apply skips it. A move of more than 15% is **held** until someone sets it to APPROVED.
- Outputs human-readable [`PENDING_PRICE_REVIEW.md`](file:///c:/Users/Cliff/Documents/AiRigBuilder/PENDING_PRICE_REVIEW.md) and [`data/pending_price_review.json`](file:///c:/Users/Cliff/Documents/AiRigBuilder/data/pending_price_review.json).

### Step 2: Eyeball & Review
- Open [`PENDING_PRICE_REVIEW.md`](file:///c:/Users/Cliff/Documents/AiRigBuilder/PENDING_PRICE_REVIEW.md) to eyeball proposed prices, changes, and sample listings.
- Click the direct `[eBay Sold]` links in the markdown table if you want to inspect eBay in your browser.
- If an outlier slipped through, edit `proposedPrice` in `data/pending_price_review.json`, or set a held card's `status` to `APPROVED` to apply it.

### Step 3: Apply & Validate
```bash
npm run prices:apply
```
- Applies only safe cards: APPROVED, with a sane price and range, and priced against the price the site shows now (a stale review file can't overwrite newer prices). Everything else keeps its price and is listed with the reason.
- Does **not** send price-drop alert emails: prices aren't live until reviewed, merged and deployed. The daily Vercel Cron sends them after deploy (or run `npm run alerts:check` by hand).
- Applies approved updates to [`src/data/gpus.js`](file:///c:/Users/Cliff/Documents/AiRigBuilder/src/data/gpus.js).
- Recalculates `pricePerGb` ($/GB VRAM) and appends to the historical price-trajectory data.
- Automatically syncs dependent GPU parts in [`src/data/builds.js`](file:///c:/Users/Cliff/Documents/AiRigBuilder/src/data/builds.js) (e.g. dual-3090 rig totals).
- Records an audit log entry in [`data/price_history_log.json`](file:///c:/Users/Cliff/Documents/AiRigBuilder/data/price_history_log.json) and recomputes each GPU's 7d/30d trend from it: the % change since the price applied about 7 (5-10) or 30 (25-40) days before the latest run, or `null` (shown as "n/a") when the log has no price that old. A later run on the same UTC day replaces earlier ones, so a same-day correction is never used as a baseline. With weekly runs, 7d appears on the next run and 30d on the fourth.
- Price-dependent copy (GPU summaries via `{price}`/`{dualPrice}`, model descriptions via `{price:<gpu-id>}`, hardware guide, home FAQ) is generated at build time by `src/utils/siteFacts.js`, so the rebuild updates it too. The visible home FAQ and its FAQPage JSON-LD come from the same `homeFaq()` entries.
- Runs `npm run build` to guarantee zero production syntax or bundler errors.

### Step 4: Commit & Deploy
```bash
git add .
git commit -m "chore: weekly used GPU price update"
git push
```
Vercel automatically redeploys `airigbuilder.com` with the new prices. The build regenerates every static page (`/tracker`, `/gpu/:id`, `/builds/:model`, …) and `sitemap.xml` from the updated data files, so the indexed pages carry the new prices too.

### Pages & URLs

`npm run build` writes one pre-rendered HTML file per page (see `scripts/prerender.js`, run by the plugin in `vite.config.js`); the browser app then takes over the same markup. Routes are defined once in `src/routes.js`:

| URL | Page |
| --- | --- |
| `/` | Home (Build Sheets view) |
| `/builds` | Index comparing every build sheet, grouped by VRAM class |
| `/builds/:model` | One build sheet per model in `src/data/models.js` (`/builds/llama-3.3-70b` is the home page's content, so its canonical is `/`) |
| `/calculator` | Break-even calculator |
| `/tracker`, `/gpu/:id` | Price tracker, one page per GPU in `src/data/gpus.js` |
| `/guide` | Hardware guide |

Old `/#tracker`-style links redirect in the browser. Unknown paths get `404.html`. Every merchant link uses `rel="sponsored"` (`AFFILIATE_LINK_REL` in `src/config/affiliates.js`).

---

## 🌐 Deployment to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "feat: airigbuilder initial release"
gh repo create airigbuilder --public --source=. --push
```

- Connect repo on [Vercel](https://vercel.com)
- **Price alerts need Upstash Redis.** Vercel functions can't save files, so alert sign-ups are stored in Redis. In the Vercel project: Storage → Upstash Redis → connect. That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Copy both into a local `.env` so `npm run alerts:check` reads the same alerts (the script prints which store it used). Without them, local runs use `data/alerts.json`, and on Vercel the alert API returns an error instead of losing sign-ups.
- Custom domain: set up `airigbuilder.com` and point Porkbun DNS CNAME records to `cname.vercel-dns.com`.
