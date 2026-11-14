import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFFILIATE_CONFIG,
  AFFILIATE_LINK_REL,
  RUNPOD_REFERRAL_URL,
  VAST_REFERRAL_URL,
  getCloudReferralUrl,
  amazonTag,
  ebayCampaignId,
  ebayCustomId,
  ebayParams,
  EPN_CUSTOMID_MAX_LEN,
  sanitizeEpnCustomId,
  attachAmazonAffiliateTag,
  attachEbayAffiliateParams,
  formatAffiliateUrl
} from '../src/config/affiliates.js';
import { BUILDS_DATA } from '../src/data/builds.js';
import { GPUS_DATA } from '../src/data/gpus.js';
import { renderGpuDetailHtml } from '../src/components/gpuDetail.js';
import { renderPriceTrackerHtml } from '../src/components/priceTracker.js';
import { renderShell } from '../src/components/shell.js';
import { parseRoute } from '../src/routes.js';

// Explicit exception list for Amazon parts that intentionally remain /s?k= search URLs:
// - Multi-item bundles (no single retail ASIN)
// - Generic GPU chip rows sold across rotating AIB partner listings
// - Dual-option ("X or Y" / "X / Y") rows naming multiple products
// - Discontinued SKUs whose original Amazon ASIN now 404s or redirects to a different variation/capacity
export const AMAZON_SEARCH_LINK_EXCEPTIONS = new Map([
  ['EVGA SuperNOVA 1000 G6 (or Corsair RM1000e 1000W 80+ Gold)', 'Dual-option PSU row (EVGA or Corsair)'],
  ['Fractal Design Meshify 2 or Phanteks Enthoo Pro 2', 'Dual-option Case row (Fractal or Phanteks)'],
  ['Thermalright Peerless Assassin 120 SE + PCIe 4.0 Riser cable', 'Multi-item bundle (CPU cooler + PCIe 4.0 riser cable)'],
  ['Arctic Liquid Freezer III 360 AIO + 3x P12 PWM Max Fans', 'Multi-item bundle (360mm AIO + 3x P12 PWM Max fans)'],
  ['Teamgroup T-Create Expert 64GB (2x32GB) DDR4-3600', 'Discontinued variation: original ASIN B091FLPCTM now redirects on Amazon to the 16GB DDR4-3200 kit'],
  ['Montech TITAN GOLD 1000W 80+ Gold (ATX 3.0)', 'Discontinued SKU: original ASIN B0BPXQZJV4 was repurposed on Amazon into Montech APX 550W'],
  ['DeepCool CC560 V2 / Montech X3 Mesh', 'Dual-option Case row (DeepCool or Montech)'],
  ['NVIDIA GeForce RTX 4060 Ti 16GB', 'Generic GPU chip row across rotating AIB partner listings'],
  ['NVIDIA GeForce RTX 4090 24GB', 'Generic GPU chip row across rotating AIB partner listings'],
  ['AMD Ryzen 5 3600 / 5500 (6C / 12T)', 'Dual-option CPU row (Ryzen 5 3600 or 5500)'],
  ['Gigabyte A520M S2H / B450M', 'Dual-option Motherboard row (A520M or B450M)'],
  ['Apevia Prestige 600W 80+ Gold (or EVGA 500W)', 'Dual-option PSU row (Apevia or EVGA)'],
  ['Zalman T6 or Cooler Master Q300L', 'Dual-option Case row (Zalman or Cooler Master)'],
  ['Thermaltake Toughpower GX2 700W 80+ Gold', 'No 700W GX2 SKU exists on Amazon (B087CDR14Z is the 600W GX2 model)'],
  ['Montech AIR 100 Lite', 'Discontinued SKU: original ASIN B094C2M45H returns HTTP 404 on US Amazon']
]);

describe('Affiliate Configuration & Attribution System', () => {
  describe('AFFILIATE_CONFIG & Defaults', () => {
    it('sets default amazonTag to airigbuilder-20', () => {
      assert.equal(AFFILIATE_CONFIG.amazonTag, 'airigbuilder-20');
      assert.equal(amazonTag, 'airigbuilder-20');
    });

    it('sets default ebayCampaignId to 5339219563', () => {
      assert.equal(AFFILIATE_CONFIG.ebayCampaignId, '5339219563');
      assert.equal(ebayCampaignId, '5339219563');
      assert.equal(AFFILIATE_CONFIG.ebayCustomId, '');
      assert.equal(ebayCustomId, '');
    });

    it('defines standard EPN tracking parameters', () => {
      assert.equal(ebayParams.mkcid, '1');
      assert.equal(ebayParams.mkrid, '711-53200-19255-0');
      assert.equal(ebayParams.siteid, '0');
      assert.equal(ebayParams.toolid, '10001');
      assert.equal(ebayParams.mkevt, '1');
    });
  });

  describe('attachAmazonAffiliateTag', () => {
    it('attaches tag to search query URLs', () => {
      const original = 'https://www.amazon.com/s?k=Ryzen+7+5700X';
      const tagged = attachAmazonAffiliateTag(original);
      assert.equal(tagged, 'https://www.amazon.com/s?k=Ryzen+7+5700X&tag=airigbuilder-20');
    });

    it('attaches tag to product URLs', () => {
      const original = 'https://www.amazon.com/dp/B09VCHR1WH';
      const tagged = attachAmazonAffiliateTag(original);
      assert.equal(tagged, 'https://www.amazon.com/dp/B09VCHR1WH?tag=airigbuilder-20');
    });

    it('updates existing tag if one is already present', () => {
      const original = 'https://www.amazon.com/s?k=DDR4&tag=old-tag-20';
      const tagged = attachAmazonAffiliateTag(original);
      assert.equal(tagged, 'https://www.amazon.com/s?k=DDR4&tag=airigbuilder-20');
    });

    it('supports custom tag override parameter', () => {
      const original = 'https://www.amazon.com/s?k=RTX+3090';
      const tagged = attachAmazonAffiliateTag(original, 'custom-tag-20');
      assert.equal(tagged, 'https://www.amazon.com/s?k=RTX+3090&tag=custom-tag-20');
    });

    it('leaves non-Amazon URLs unmodified', () => {
      const ebayUrl = 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090';
      assert.equal(attachAmazonAffiliateTag(ebayUrl), ebayUrl);

      const bhUrl = 'https://www.bhphotovideo.com/c/search?Ntt=Corsair+1000W';
      assert.equal(attachAmazonAffiliateTag(bhUrl), bhUrl);

      assert.equal(attachAmazonAffiliateTag('#'), '#');
      assert.equal(attachAmazonAffiliateTag(''), '');
    });
  });

  describe('attachEbayAffiliateParams', () => {
    it('attaches EPN tracking parameters to search query URLs', () => {
      const original = 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1';
      const tagged = attachEbayAffiliateParams(original);
      const parsed = new URL(tagged);

      assert.equal(parsed.searchParams.get('_nkw'), 'RTX 3090 24GB');
      assert.equal(parsed.searchParams.get('LH_Sold'), '1');
      assert.equal(parsed.searchParams.get('LH_Complete'), '1');
      assert.equal(parsed.searchParams.get('mkcid'), '1');
      assert.equal(parsed.searchParams.get('mkrid'), '711-53200-19255-0');
      assert.equal(parsed.searchParams.get('siteid'), '0');
      assert.equal(parsed.searchParams.get('campid'), '5339219563');
      assert.equal(parsed.searchParams.get('toolid'), '10001');
      assert.equal(parsed.searchParams.get('mkevt'), '1');
      assert.equal(parsed.searchParams.get('customid'), null);
    });

    it('attaches EPN tracking parameters to base domain or item URLs', () => {
      const original = 'https://www.ebay.com/itm/123456789';
      const tagged = attachEbayAffiliateParams(original);
      assert.equal(
        tagged,
        'https://www.ebay.com/itm/123456789?mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=5339219563&toolid=10001&mkevt=1'
      );
    });

    it('supports custom campaign ID override parameter', () => {
      const original = 'https://www.ebay.com/sch/i.html?_nkw=RTX+4090';
      const tagged = attachEbayAffiliateParams(original, '9999999999');
      const parsed = new URL(tagged);
      assert.equal(parsed.searchParams.get('campid'), '9999999999');
    });

    it('sets EPN customid when customId is provided and bounds it to 256 characters', () => {
      const original = 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1';
      const tagged = attachEbayAffiliateParams(original, ebayCampaignId, 'build-llama-3.3-70b-tier-budget-used');
      const parsed = new URL(tagged);
      assert.equal(parsed.searchParams.get('customid'), 'build-llama-3.3-70b-tier-budget-used');

      const overlong = 'gpu-' + 'x'.repeat(300);
      const bounded = attachEbayAffiliateParams(original, ebayCampaignId, overlong);
      const parsedBounded = new URL(bounded);
      assert.equal(parsedBounded.searchParams.get('customid').length, EPN_CUSTOMID_MAX_LEN);
      assert.equal(sanitizeEpnCustomId('build:llama 3.3/70b?bad=1').includes('?'), false);
    });

    it('leaves non-eBay URLs unmodified', () => {
      const amazonUrl = 'https://www.amazon.com/dp/B09VCHR1WH';
      assert.equal(attachEbayAffiliateParams(amazonUrl), amazonUrl);

      const bhUrl = 'https://www.bhphotovideo.com/c/search?Ntt=Corsair+1000W';
      assert.equal(attachEbayAffiliateParams(bhUrl), bhUrl);

      assert.equal(attachEbayAffiliateParams('#'), '#');
      assert.equal(attachEbayAffiliateParams(''), '');
    });
  });

  describe('formatAffiliateUrl', () => {
    it('formats Amazon merchant URLs with Amazon Associates tracking tag', () => {
      const url = 'https://www.amazon.com/s?k=Corsair+RM1000e';
      const formatted = formatAffiliateUrl(url, 'Amazon');
      assert.equal(formatted, 'https://www.amazon.com/s?k=Corsair+RM1000e&tag=airigbuilder-20');
    });

    it('formats mixed merchant Amazon URLs with tag', () => {
      const url = 'https://www.amazon.com/s?k=B550+motherboard';
      const formatted = formatAffiliateUrl(url, 'eBay / Amazon');
      assert.equal(formatted, 'https://www.amazon.com/s?k=B550+motherboard&tag=airigbuilder-20');
    });

    it('formats mixed merchant eBay URLs with complete EPN parameters', () => {
      const url = 'https://www.ebay.com/sch/i.html?_nkw=ASUS+ROG+Strix+B550-F+Gaming';
      const formatted = formatAffiliateUrl(url, 'eBay / Amazon');
      const parsed = new URL(formatted);
      assert.equal(parsed.searchParams.get('campid'), '5339219563');
      assert.equal(parsed.searchParams.get('mkcid'), '1');
      assert.equal(parsed.searchParams.get('toolid'), '10001');
    });

    it('formats eBay URLs with complete EPN parameters and optional context as customid', () => {
      const url = 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1';
      const formatted = formatAffiliateUrl(url, 'eBay Sold', 'gpu-rtx-3090');
      const parsed = new URL(formatted);
      assert.equal(parsed.searchParams.get('mkcid'), '1');
      assert.equal(parsed.searchParams.get('mkrid'), '711-53200-19255-0');
      assert.equal(parsed.searchParams.get('siteid'), '0');
      assert.equal(parsed.searchParams.get('campid'), '5339219563');
      assert.equal(parsed.searchParams.get('toolid'), '10001');
      assert.equal(parsed.searchParams.get('mkevt'), '1');
      assert.equal(parsed.searchParams.get('customid'), 'gpu-rtx-3090');
    });

    it('passes through B&H and non-affiliate URLs unmodified', () => {
      const url = 'https://www.bhphotovideo.com/c/product/1770945-REG/apple_mqh63ll_a_mac_studio_with_m2.html';
      const formatted = formatAffiliateUrl(url, 'B&H', 'build-llama-3.3-70b-tier-best-new');
      assert.equal(formatted, url);
      assert.equal(formatAffiliateUrl('#', 'Included'), '#');
    });
  });

  describe('Build Sheet Product Link Integrity & Footer Disclosure', () => {
    it('every Amazon part URL in BUILDS_DATA is a canonical /dp/<ASIN> link or on the explicit exception list', () => {
      const canonicalDpRegex = /^https:\/\/www\.amazon\.com\/dp\/B0[A-Z0-9]{8}$/;
      const seenExceptions = new Set();

      for (const [modelId, sheet] of Object.entries(BUILDS_DATA)) {
        for (const tier of sheet.tiers) {
          for (const part of tier.parts) {
            if (!part.url || part.url === '#') continue;

            // Raw URLs in builds.js must not have pre-baked affiliate tags
            assert.ok(!part.url.includes('tag='), `${modelId}/${tier.id}/${part.name} has pre-baked Amazon tag`);
            assert.ok(!part.url.includes('campid='), `${modelId}/${tier.id}/${part.name} has pre-baked EPN campid`);

            if (part.url.includes('amazon.com')) {
              if (AMAZON_SEARCH_LINK_EXCEPTIONS.has(part.name)) {
                seenExceptions.add(part.name);
                assert.match(
                  part.url,
                  /^https:\/\/www\.amazon\.com\/s\?k=/,
                  `Exception part "${part.name}" must use an Amazon search URL`
                );
              } else {
                assert.match(
                  part.url,
                  canonicalDpRegex,
                  `Amazon part "${part.name}" in ${modelId}/${tier.id} must be a canonical https://www.amazon.com/dp/<ASIN> link (got ${part.url})`
                );
              }
            }
          }
        }
      }

      // Ensure no stale entries remain on the exception list
      for (const exceptionName of AMAZON_SEARCH_LINK_EXCEPTIONS.keys()) {
        assert.ok(seenExceptions.has(exceptionName), `Exception list entry "${exceptionName}" was not encountered in BUILDS_DATA`);
      }
    });

    it('every B&H part URL in BUILDS_DATA is a direct /c/product/ link and every eBay part URL remains a search link', () => {
      const bhProductRegex = /^https:\/\/www\.bhphotovideo\.com\/c\/product\/[0-9A-Z-]+\/[0-9A-Za-z_.-]+\.html$/;
      const ebaySearchRegex = /^https:\/\/www\.ebay\.com\/sch\/i\.html\?_nkw=/;

      let bhCount = 0;
      let ebayCount = 0;
      for (const [modelId, sheet] of Object.entries(BUILDS_DATA)) {
        for (const tier of sheet.tiers) {
          for (const part of tier.parts) {
            if (!part.url || part.url === '#') continue;
            if (part.url.includes('bhphotovideo.com')) {
              bhCount++;
              assert.match(
                part.url,
                bhProductRegex,
                `B&H part "${part.name}" in ${modelId}/${tier.id} must be a /c/product/ link (got ${part.url})`
              );
            } else if (part.url.includes('ebay.com')) {
              ebayCount++;
              assert.match(
                part.url,
                ebaySearchRegex,
                `eBay part "${part.name}" in ${modelId}/${tier.id} must remain a search link (got ${part.url})`
              );
            }
          }
        }
      }
      assert.ok(bhCount > 0, 'Checked at least one B&H link');
      assert.ok(ebayCount > 0, 'Checked at least one eBay link');
    });

    it('renders the canonical Amazon Associates disclosure and all referral partners in the footer', () => {
      const shellHtml = renderShell(parseRoute('/'));
      assert.ok(
        shellHtml.includes('As an Amazon Associate, AiRigBuilder earns from qualifying purchases.'),
        'Footer includes the required Amazon Associates Operating Agreement disclosure'
      );
      assert.ok(shellHtml.includes('Amazon Associates'), 'Footer mentions Amazon Associates');
      assert.ok(shellHtml.includes('eBay Partner Network'), 'Footer mentions eBay Partner Network');
      assert.ok(shellHtml.includes('B&H Photo'), 'Footer mentions B&H Photo');
      assert.ok(shellHtml.includes('RunPod'), 'Footer mentions RunPod');
      assert.ok(shellHtml.includes('Vast.ai'), 'Footer mentions Vast.ai');
    });
  });

  describe('Cloud Rental Referral URLs (RunPod & Vast.ai)', () => {
    it('exports the RunPod and Vast.ai referral URL constants', () => {
      assert.equal(RUNPOD_REFERRAL_URL, 'https://runpod.io?ref=2stimz9v');
      assert.equal(VAST_REFERRAL_URL, 'https://cloud.vast.ai/?ref_id=859243');
    });

    it('maps CLOUD_RATES offer ID prefixes to their referral URL and returns null otherwise', () => {
      assert.equal(getCloudReferralUrl('runpod-dual-3090'), RUNPOD_REFERRAL_URL);
      assert.equal(getCloudReferralUrl('runpod-single-4090'), RUNPOD_REFERRAL_URL);
      assert.equal(getCloudReferralUrl('vast-dual-3090'), VAST_REFERRAL_URL);
      assert.equal(getCloudReferralUrl('vast-single-3060'), VAST_REFERRAL_URL);
      assert.equal(getCloudReferralUrl('lambda-h100'), null);
      assert.equal(getCloudReferralUrl(''), null);
      assert.equal(getCloudReferralUrl(null), null);
      assert.equal(getCloudReferralUrl(undefined), null);
    });
  });

  describe('GPU Page & Tracker Modal Amazon Buy Buttons', () => {
    it('every GPUS_DATA entry defines an untagged Amazon search URL targeting the card', () => {
      assert.equal(GPUS_DATA.length, 19, 'GPUS_DATA must have exactly 19 tracked GPUs');
      for (const gpu of GPUS_DATA) {
        assert.ok(gpu.amazonSearchUrl, `GPU ${gpu.id} is missing amazonSearchUrl`);
        assert.match(
          gpu.amazonSearchUrl,
          /^https:\/\/www\.amazon\.com\/s\?k=/,
          `GPU ${gpu.id} amazonSearchUrl must be an Amazon search URL (got ${gpu.amazonSearchUrl})`
        );
        assert.ok(
          !gpu.amazonSearchUrl.includes('tag='),
          `GPU ${gpu.id} amazonSearchUrl in gpus.js must be untagged (got ${gpu.amazonSearchUrl})`
        );
      }
    });

    it('renders Buy on Amazon button carrying airigbuilder-20 tag exactly once, beside unchanged eBay button', () => {
      for (const gpu of GPUS_DATA) {
        const html = renderGpuDetailHtml(gpu);

        // eBay button remains intact and unchanged
        const expectedEbayHref = formatAffiliateUrl(gpu.ebaySoldUrl, 'eBay Sold', `gpu-${gpu.id}`);
        assert.ok(html.includes(`href="${expectedEbayHref}"`), `${gpu.id} detail page has eBay link`);
        assert.ok(html.includes('data-click-merchant="eBay Sold"'), `${gpu.id} detail page has eBay click merchant`);
        assert.ok(html.includes(`data-click-id="gpu:${gpu.id}:ebay-sold"`), `${gpu.id} detail page has eBay click id`);
        assert.ok(html.includes('Check eBay Sold Listings →'), `${gpu.id} detail page has eBay button label`);

        // Amazon button is rendered beside eBay button with exact tagging and tracking
        const expectedAmazonHref = formatAffiliateUrl(gpu.amazonSearchUrl, 'Amazon', `gpu-${gpu.id}`);
        assert.ok(html.includes(`href="${expectedAmazonHref}"`), `${gpu.id} detail page has Amazon link`);
        assert.match(expectedAmazonHref, /tag=airigbuilder-20/, `${gpu.id} Amazon link carries tag`);
        // Verify tag appears exactly once
        const tagCount = (expectedAmazonHref.match(/tag=airigbuilder-20/g) || []).length;
        assert.equal(tagCount, 1, `${gpu.id} Amazon link carries tag exactly once`);

        // Button attributes & styling family
        assert.ok(
          html.includes(`rel="${AFFILIATE_LINK_REL}"`),
          `${gpu.id} has affiliate rel`
        );
        assert.ok(
          html.includes('class="btn-secondary" data-click-merchant="Amazon"'),
          `${gpu.id} detail page has Amazon button with btn-secondary class`
        );
        assert.ok(
          html.includes(`data-click-id="gpu:${gpu.id}:amazon"`),
          `${gpu.id} detail page has Amazon click id`
        );
        assert.ok(
          html.includes('Buy on Amazon →'),
          `${gpu.id} detail page has Buy on Amazon button label`
        );

        // Position: Amazon button appears after the eBay button
        const ebayPos = html.indexOf('Check eBay Sold Listings →');
        const amazonPos = html.indexOf('Buy on Amazon →');
        assert.ok(ebayPos !== -1 && amazonPos !== -1 && amazonPos > ebayPos, `${gpu.id} Amazon button sits after eBay button`);
      }
    });

    it('renders Buy on Amazon link in price tracker modal with proper merchant attributes', () => {
      const trackerHtml = renderPriceTrackerHtml();
      assert.ok(trackerHtml.includes('id="modal-ebay-link"'), 'Tracker modal has eBay link');
      assert.ok(trackerHtml.includes('id="modal-amazon-link"'), 'Tracker modal has Amazon link');
      assert.match(
        trackerHtml,
        /id="modal-amazon-link"[^>]*class="btn-secondary btn-text-sm"[^>]*data-click-merchant="Amazon"[^>]*data-link-kind="modal-amazon"/,
        'Tracker modal Amazon link has matching styling family and tracking data attributes'
      );
    });
  });
});
