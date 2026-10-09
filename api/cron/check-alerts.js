// api/cron/check-alerts.js
// Vercel Cron (see "crons" in vercel.json): emails price-drop alerts against the prices in the
// deployed site. Runs after prices are reviewed, merged and deployed, so no one is alerted about a
// price that isn't live. Vercel calls it with "Authorization: Bearer $CRON_SECRET"; any other
// caller is refused. Email (RESEND_*) and alert storage (KV_*) secrets stay in Vercel.
import { GPUS_DATA } from '../../src/data/gpus.js';
import { evaluateAndTriggerAlerts } from '../../src/services/alertService.js';

/** Handler factory, so tests can supply the evaluator and environment. */
export function createCheckAlertsHandler({ evaluate = evaluateAndTriggerAlerts, gpus = GPUS_DATA, env = process.env } = {}) {
  return async function handler(req, res) {
    const secret = env.CRON_SECRET;
    if (!secret) {
      console.error('CRON_SECRET is not set; refusing to run the alert check.');
      return res.status(500).json({ ok: false, error: 'CRON_SECRET is not configured' });
    }
    if (req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    try {
      const result = await evaluate(gpus);
      // Counts only: subscriber addresses stay out of the HTTP response
      const summary = { ok: true, store: result.store, totalAlerts: result.totalAlerts, activeAlerts: result.activeAlerts, fired: result.firedCount, failed: (result.failedAlerts || []).length };
      console.log('Price-drop alert check:', JSON.stringify(summary));
      return res.status(200).json(summary);
    } catch (err) {
      console.error('Price-drop alert check failed:', err);
      return res.status(500).json({ ok: false, error: 'Alert check failed' });
    }
  };
}

export default createCheckAlertsHandler();
