// api/alerts/unsubscribe.js
// Vercel Serverless Function: Deactivates alert on unsubscribe link click
import { unsubscribeAlert } from '../../src/services/alertService.js';

export default async function handler(req, res) {
  const token = req.query.token || (req.url && new URL(req.url, 'http://localhost').searchParams.get('token'));

  if (!token) {
    return sendHtmlResponse(res, 400, 'Invalid Token', 'Missing unsubscribe token.', false);
  }

  const result = unsubscribeAlert(token);

  if (!result.success) {
    return sendHtmlResponse(res, 400, 'Unsubscribe Failed', result.error, false);
  }

  const alert = result.alert;
  return sendHtmlResponse(
    res,
    200,
    'Unsubscribed Successfully',
    `You will no longer receive price-drop notifications for <strong>${alert.gpuName}</strong> at ${alert.email}.`,
    true
  );
}

function sendHtmlResponse(res, statusCode, title, message, isSuccess) {
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
          color: #f1f5f9;
          margin: 0 0 12px 0;
        }
        p {
          font-size: 15px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }
        .btn {
          display: inline-block;
          background: #334155;
          color: #f1f5f9;
          font-weight: 600;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
        }
        .btn:hover {
          background: #475569;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${isSuccess ? '👋' : '⚠️'}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">Return to AiRigBuilder</a>
      </div>
    </body>
    </html>
  `);
}
