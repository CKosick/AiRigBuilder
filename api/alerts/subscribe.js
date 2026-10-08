// api/alerts/subscribe.js
// Vercel Serverless Function: Registers a price drop alert (Double Opt-in)
import { registerAlert } from '../../src/services/alertService.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {}
    }

    const { email, gpuId, targetPrice } = body || {};

    // Email links use APP_URL (see alertService), never the request's Host header
    const result = await registerAlert({ email, gpuId, targetPrice });

    if (!result.success) {
      if (result.emailFailed) {
        // Upstream email failure, not bad input: log the real reason, show the user a retry message
        console.error('Confirmation email failed for /api/alerts/subscribe:', result.emailError);
        return res.status(502).json({ success: false, error: result.error });
      }
      return res.status(400).json({ success: false, error: result.error });
    }

    // Never return the alert record: it holds the confirm/unsubscribe tokens
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    console.error('API Error in /api/alerts/subscribe:', err);
    return res.status(500).json({ success: false, error: 'Internal server error processing alert subscription.' });
  }
}
