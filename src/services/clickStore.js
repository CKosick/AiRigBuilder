// src/services/clickStore.js
// Aggregate persistence for first-party outbound merchant click counts.
//
// - RedisClickStore: used whenever Upstash Redis credentials are present
//   (KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN).
// - FileClickStore: local development and tests (data/clicks.json).
//
// Stores ONLY aggregate counters keyed by "<day>|<linkId>|<merchant>" (one integer per bucket).
// No IP addresses, no user agents, no cookies, and no timestamps beyond the YYYY-MM-DD day bucket.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_CLICKS_FILE = path.resolve(__dirname, '../../data/clicks.json');

const REDIS_HASH_KEY = 'airigbuilder:clicks';

export const KNOWN_MERCHANTS = new Set([
  'Amazon',
  'Amazon / B&H',
  'B&H',
  'B&H / Amazon',
  'B&H / Apple',
  'eBay Sold',
  'eBay / Amazon',
  'eBay / Enterprise',
  'eBay / Retail',
  'eBay / Apple'
]);

export function formatCounterKey(day, linkId, merchant) {
  return `${day}|${linkId}|${merchant}`;
}

export function parseCounterKey(key) {
  const [day = '', linkId = '', merchant = ''] = String(key).split('|');
  return { day, linkId, merchant };
}

function countsToEntries(counts) {
  return Object.entries(counts)
    .map(([key, count]) => ({ ...parseCounterKey(key), count: Number(count) || 0 }))
    .sort((a, b) => a.day.localeCompare(b.day) || a.linkId.localeCompare(b.linkId) || a.merchant.localeCompare(b.merchant));
}

export class FileClickStore {
  constructor(filePath = DEFAULT_CLICKS_FILE) {
    this.filePath = filePath;
    this.kind = `file (${filePath})`;
  }

  _readCounts() {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      return data && typeof data.counts === 'object' && data.counts !== null ? { ...data.counts } : {};
    } catch (err) {
      console.error(`Error loading click counts from ${this.filePath}:`, err.message);
      return {};
    }
  }

  async increment(day, linkId, merchant) {
    const key = formatCounterKey(day, linkId, merchant);
    const counts = this._readCounts();
    counts[key] = (Number(counts[key]) || 0) + 1;

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify({ counts }, null, 2), 'utf-8');
    return counts[key];
  }

  async all() {
    const counts = this._readCounts();
    return { counts, entries: countsToEntries(counts) };
  }
}

export class RedisClickStore {
  constructor(url, token, fetchImpl = fetch) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.kind = 'redis (Upstash)';
  }

  async command(args) {
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
      throw new Error(`Redis ${args[0]} failed: ${body.error || res.status}`);
    }
    return body.result;
  }

  async increment(day, linkId, merchant) {
    const key = formatCounterKey(day, linkId, merchant);
    const result = await this.command(['HINCRBY', REDIS_HASH_KEY, key, 1]);
    return Number(result) || 1;
  }

  async all() {
    const flat = (await this.command(['HGETALL', REDIS_HASH_KEY])) || [];
    const counts = {};
    for (let i = 1; i < flat.length; i += 2) {
      counts[flat[i - 1]] = Number(flat[i]) || 0;
    }
    return { counts, entries: countsToEntries(counts) };
  }
}

/**
 * Picks the click store for the current environment, matching getAlertStore() in alertStore.js.
 */
export function getClickStore({ filePath, defaultFilePath = DEFAULT_CLICKS_FILE, env = process.env } = {}) {
  if (filePath) return new FileClickStore(filePath);

  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new RedisClickStore(url, token);

  if (env.VERCEL) {
    throw new Error(
      'Click storage is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN (Upstash Redis) in the Vercel project.'
    );
  }

  return new FileClickStore(defaultFilePath);
}
