// src/services/alertStore.js
// Persistence for price-drop alerts.
//
// - RedisAlertStore: used whenever Upstash Redis credentials are present
//   (KV_REST_API_URL/KV_REST_API_TOKEN from the Vercel Upstash integration, or
//   UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN). Required in production,
//   because Vercel serverless functions cannot persist writes to the filesystem.
// - FileAlertStore: local development and tests (data/alerts.json).
//
// Each alert is stored as one field of a Redis hash, so concurrent sign-ups
// never overwrite each other.

import fs from 'fs';
import path from 'path';

const REDIS_HASH_KEY = 'airigbuilder:alerts';

export class FileAlertStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.kind = `file (${filePath})`;
  }

  async all() {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      return Array.isArray(data.alerts) ? data.alerts : [];
    } catch (err) {
      console.error(`Error loading alerts from ${this.filePath}:`, err.message);
      return [];
    }
  }

  async put(alert) {
    const alerts = await this.all();
    const idx = alerts.findIndex(a => a.id === alert.id);
    if (idx >= 0) alerts[idx] = alert;
    else alerts.push(alert);

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify({ alerts }, null, 2), 'utf-8');
  }
}

export class RedisAlertStore {
  constructor(url, token) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
    this.kind = 'redis (Upstash)';
  }

  async command(args) {
    const res = await fetch(this.url, {
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

  async all() {
    // HGETALL returns a flat [field, value, field, value, ...] array
    const flat = (await this.command(['HGETALL', REDIS_HASH_KEY])) || [];
    const alerts = [];
    for (let i = 1; i < flat.length; i += 2) {
      try {
        alerts.push(JSON.parse(flat[i]));
      } catch {
        console.error(`Skipping unreadable alert record ${flat[i - 1]}`);
      }
    }
    return alerts.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  async put(alert) {
    await this.command(['HSET', REDIS_HASH_KEY, alert.id, JSON.stringify(alert)]);
  }
}

/**
 * Picks the alert store for the current environment.
 * An explicit filePath (tests, local scripts) always uses the file store.
 */
export function getAlertStore({ filePath, defaultFilePath, env = process.env } = {}) {
  if (filePath) return new FileAlertStore(filePath);

  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return new RedisAlertStore(url, token);

  if (env.VERCEL) {
    throw new Error(
      'Alert storage is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN (Upstash Redis) in the Vercel project.'
    );
  }

  return new FileAlertStore(defaultFilePath);
}
