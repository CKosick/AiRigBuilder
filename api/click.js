// api/click.js
// Vercel Serverless Function: First-party outbound merchant click counter (POST)
// and key-gated aggregate readout (GET).
import { getClickStore, KNOWN_MERCHANTS } from '../src/services/clickStore.js';

const MAX_PATH_LEN = 128;
const MAX_LINK_ID_LEN = 200;
const ALLOWED_FIELDS = new Set(['path', 'merchant', 'linkId']);
const CONTROL_OR_PIPE_RE = /[\u0000-\u001f\u007f|]/;

export function validateClickPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Payload must be a JSON object.' };
  }

  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some(k => !ALLOWED_FIELDS.has(k))) {
    return { valid: false, error: 'Unexpected or missing fields in click payload.' };
  }

  const { path, merchant, linkId } = body;

  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.length > MAX_PATH_LEN ||
    !path.startsWith('/') ||
    CONTROL_OR_PIPE_RE.test(path)
  ) {
    return { valid: false, error: 'Invalid page path.' };
  }

  if (typeof merchant !== 'string' || !KNOWN_MERCHANTS.has(merchant)) {
    return { valid: false, error: 'Unknown merchant.' };
  }

  if (
    typeof linkId !== 'string' ||
    linkId.length === 0 ||
    linkId.length > MAX_LINK_ID_LEN ||
    (!linkId.startsWith('build:') && !linkId.startsWith('gpu:')) ||
    CONTROL_OR_PIPE_RE.test(linkId)
  ) {
    return { valid: false, error: 'Invalid link identifier.' };
  }

  return { valid: true, path, merchant, linkId };
}

export function createClickHandler({ store: customStore, env = process.env, now = () => new Date() } = {}) {
  return async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method === 'GET') {
      const expectedKey = typeof env.CLICK_STATS_KEY === 'string' ? env.CLICK_STATS_KEY.trim() : '';
      if (!expectedKey) {
        return res.status(404).json({ error: 'Not found' });
      }

      let providedKey = req.query?.key;
      if (providedKey === undefined && typeof req.url === 'string') {
        try {
          providedKey = new URL(req.url, 'http://localhost').searchParams.get('key') ?? undefined;
        } catch {
          providedKey = undefined;
        }
      }

      if (typeof providedKey !== 'string' || providedKey !== expectedKey) {
        return res.status(404).json({ error: 'Not found' });
      }

      try {
        const store = customStore || getClickStore({ env });
        const stats = await store.all();
        return res.status(200).json(stats);
      } catch (err) {
        console.error('Error reading click stats:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Malformed JSON body.' });
      }
    }

    const check = validateClickPayload(body);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    try {
      const day = now().toISOString().slice(0, 10);
      const store = customStore || getClickStore({ env });
      await store.increment(day, check.linkId, check.merchant);
      res.status(204).end();
    } catch (err) {
      console.error('Error recording outbound click:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createClickHandler();
