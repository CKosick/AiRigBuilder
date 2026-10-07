// src/config/affiliates.js
// Affiliate program configuration and link attribution utilities

/**
 * Resolves an environment variable across browser/Vite (import.meta.env)
 * and Node/test/serverless environments (process.env).
 */
const getEnv = (key, fallback = '') => {
  // Check Vite client-side bundle / browser environment
  try {
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      if (import.meta.env[key] !== undefined && import.meta.env[key] !== '') {
        return import.meta.env[key];
      }
    }
  } catch {
    // Ignore in non-Vite environments
  }

  // Check Node.js process.env (scripts, tests, SSR)
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      if (process.env[key] !== undefined && process.env[key] !== '') {
        return process.env[key];
      }
    }
  } catch {
    // Ignore in non-Node environments
  }

  return fallback;
};

export const AFFILIATE_CONFIG = {
  // Amazon Associates Tracking ID
  // Defaults to 'airigbuilder-20', overrideable via VITE_AMAZON_TAG or AMAZON_TAG
  amazonTag:
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_AMAZON_TAG || import.meta.env?.AMAZON_TAG)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_AMAZON_TAG || process.env?.AMAZON_TAG)) ||
    'airigbuilder-20',

  // eBay Partner Network (EPN) - pending approval, placeholder left empty
  ebayCampaignId:
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_EBAY_CAMPAIGN_ID || import.meta.env?.EBAY_CAMPAIGN_ID)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_EBAY_CAMPAIGN_ID || process.env?.EBAY_CAMPAIGN_ID)) ||
    '',

  // Optional custom tracking ID for eBay
  ebayCustomId:
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_EBAY_CUSTOM_ID || import.meta.env?.EBAY_CUSTOM_ID)) ||
    (typeof process !== 'undefined' && (process.env?.VITE_EBAY_CUSTOM_ID || process.env?.EBAY_CUSTOM_ID)) ||
    ''
};

// Direct export of individual tags for convenience
export const amazonTag = AFFILIATE_CONFIG.amazonTag;
export const ebayCampaignId = AFFILIATE_CONFIG.ebayCampaignId;
export const ebayCustomId = AFFILIATE_CONFIG.ebayCustomId;

/**
 * Attaches the Amazon Associates tracking tag to an Amazon URL.
 * Preserves existing search params and updates or adds the 'tag' parameter.
 *
 * @param {string} url - Target URL
 * @param {string} [tag] - Optional tag override (defaults to AFFILIATE_CONFIG.amazonTag)
 * @returns {string} URL with affiliate tag attached
 */
export function attachAmazonAffiliateTag(url, tag = AFFILIATE_CONFIG.amazonTag) {
  if (!url || url === '#' || !tag) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('amazon.')) {
      parsed.searchParams.set('tag', tag);
      return parsed.toString();
    }
    return url;
  } catch {
    // Fallback if URL parsing fails on a relative or custom string
    if (url.includes('amazon.')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}tag=${encodeURIComponent(tag)}`;
    }
    return url;
  }
}

/**
 * Formats any merchant URL with the appropriate affiliate tracking parameter.
 *
 * @param {string} url - Target product or search URL
 * @param {string} [merchant] - Merchant name (e.g. 'Amazon', 'eBay Sold', 'B&H')
 * @returns {string} Fully attributed affiliate link
 */
export function formatAffiliateUrl(url, merchant = '') {
  if (!url || url === '#') return url;

  // Format Amazon links
  if ((merchant && merchant.toLowerCase().includes('amazon')) || url.includes('amazon.')) {
    return attachAmazonAffiliateTag(url, AFFILIATE_CONFIG.amazonTag);
  }

  // Format eBay links (when EPN campaign ID is configured)
  if ((merchant && merchant.toLowerCase().includes('ebay')) || url.includes('ebay.')) {
    if (AFFILIATE_CONFIG.ebayCampaignId) {
      try {
        const parsed = new URL(url);
        parsed.searchParams.set('campid', AFFILIATE_CONFIG.ebayCampaignId);
        if (AFFILIATE_CONFIG.ebayCustomId) {
          parsed.searchParams.set('customid', AFFILIATE_CONFIG.ebayCustomId);
        }
        return parsed.toString();
      } catch {
        return url;
      }
    }
    // EPN pending: return clean URL
    return url;
  }

  return url;
}

export default AFFILIATE_CONFIG;
