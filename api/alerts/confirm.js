// api/alerts/confirm.js
// Vercel Serverless Function: Activates alert on double opt-in click
import { confirmAlert } from '../../src/services/alertService.js';

export default async function handler(req, res) {
  const token = req.query.token || (req.url && new URL(req.url, 'http://localhost').searchParams.get('token'));

  if (!token) {
    return sendHtmlResponse(res, 400, 'Invalid Token', 'Missing alert confirmation token.', false);
  }

  let result;
  try {
    result = await confirmAlert(token);
  } catch (err) {
    console.error('API Error in /api/alerts/confirm:', err);
    return sendHtmlResponse(res, 500, 'Something Went Wrong', 'We could not confirm your alert right now. Please try the link again later.', false);
  }

  if (!result.success) {
    return sendHtmlResponse(res, 400, 'Confirmation Failed', result.error, false);
  }

  const alert = result.alert;
  return sendHtmlResponse(
    res,
    200,
    'Alert Confirmed & Activated! 🚀',
    `Your price drop alert for <strong>${alert.gpuName}</strong> at <strong>$${alert.targetPrice}</strong> or lower is now active. We'll send you an email the instant verified eBay sold averages drop to your target!`,
    true,
    alert
  );
}

function sendHtmlResponse(res, statusCode, title, message, isSuccess, alert = null) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(statusCode).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} — AiRigBuilder</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #0b0f17;
          color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .card {
          background-color: #121824;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          padding: 36px 32px;
          max-width: 500px;
          margin: 20px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }
        .icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          color: ${isSuccess ? '#10b981' : '#f43f5e'};
          margin: 0 0 12px 0;
        }
        p {
          font-size: 15px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }
        .details-box {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: left;
          font-size: 14px;
        }
        .btn {
          display: inline-block;
          background: #10b981;
          color: #042f2e;
          font-weight: 700;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #34d399;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${isSuccess ? '✅' : '⚠️'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        ${alert ? `
          <div class="details-box">
            <div style="color: #cbd5e1; margin-bottom: 4px;"><strong>Target GPU:</strong> ${alert.gpuName}</div>
            <div style="color: #cbd5e1; margin-bottom: 4px;"><strong>Trigger Price:</strong> ≤ $${alert.targetPrice}</div>
            <div style="color: #cbd5e1;"><strong>Subscriber:</strong> ${alert.email}</div>
          </div>
        ` : ''}
        <a href="/" class="btn">← Back to AiRigBuilder</a>
      </div>
    </body>
    </html>
  `);
}
