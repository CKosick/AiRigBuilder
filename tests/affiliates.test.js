import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AFFILIATE_CONFIG,
  amazonTag,
  ebayCampaignId,
  ebayCustomId,
  ebayParams,
  attachAmazonAffiliateTag,
  attachEbayAffiliateParams,
  formatAffiliateUrl
} from '../src/config/affiliates.js';

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

    it('formats eBay URLs with complete EPN parameters', () => {
      const url = 'https://www.ebay.com/sch/i.html?_nkw=RTX+3090+24GB&LH_Sold=1&LH_Complete=1';
      const formatted = formatAffiliateUrl(url, 'eBay Sold');
      const parsed = new URL(formatted);
      assert.equal(parsed.searchParams.get('mkcid'), '1');
      assert.equal(parsed.searchParams.get('mkrid'), '711-53200-19255-0');
      assert.equal(parsed.searchParams.get('siteid'), '0');
      assert.equal(parsed.searchParams.get('campid'), '5339219563');
      assert.equal(parsed.searchParams.get('toolid'), '10001');
      assert.equal(parsed.searchParams.get('mkevt'), '1');
    });

    it('passes through B&H and non-affiliate URLs unmodified', () => {
      const url = 'https://www.bhphotovideo.com/c/search?Ntt=RTX+4090';
      const formatted = formatAffiliateUrl(url, 'B&H');
      assert.equal(formatted, url);
      assert.equal(formatAffiliateUrl('#', 'Included'), '#');
    });
  });
});
