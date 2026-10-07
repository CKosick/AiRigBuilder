// src/services/alertService.js
// Handles Price-Drop Alert subscriptions, double opt-in confirmation,
// unsubscribe tokens, Resend email dispatch, and price evaluation triggers.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GPUS_DATA } from '../data/gpus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const ALERTS_FILE = path.join(ROOT_DIR, 'data', 'alerts.json');

// Configuration from environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
// Verified domain: harfordtreepros.com (configured in Resend)
const DEFAULT_FROM = 'AiRigBuilder <alerts@harfordtreepros.com>';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
const APP_URL = process.env.APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://airigbuilder.com';

/**
 * Standard email validation
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compliant regex for web form validation
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email.trim());
}

/**
 * Load alerts from file or return empty list
 */
export function loadAlerts(filePath = ALERTS_FILE) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(data.alerts) ? data.alerts : [];
  } catch (err) {
    console.error(`Error loading alerts from ${filePath}:`, err.message);
    return [];
  }
}

/**
 * Save alerts back to file safely
 */
export function saveAlerts(alerts, filePath = ALERTS_FILE) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const payload = { alerts };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

/**
 * Send an email using Resend HTTP API (supports Node 18+ and edge/serverless)
 */
export async function sendEmail({ to, subject, html, text }) {
  // If no API key is provided or test mode is detected, log and return mock response
  if (!RESEND_API_KEY || process.env.NODE_ENV === 'test') {
    return {
      success: true,
      mock: true,
      id: `mock_email_${Date.now()}`,
      to,
      subject
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
        text
      })
    });

    const body = await res.json();
    if (!res.ok) {
      console.error('Resend API error response:', body);
      return { success: false, error: body };
    }
    return { success: true, id: body.id };
  } catch (err) {
    console.error('Failed to send email via Resend:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Validate alert input parameters
 */
export function validateAlertInput({ email, gpuId, targetPrice }) {
  if (!isValidEmail(email)) {
    return { valid: false, error: 'Please provide a valid email address.' };
  }

  const gpu = GPUS_DATA.find(g => g.id === gpuId);
  if (!gpu) {
    return { valid: false, error: `Invalid GPU ID. Must be one of the 10 tracked GPUs.` };
  }

  const price = Number(targetPrice);
  if (isNaN(price) || price <= 0 || price > 5000) {
    return { valid: false, error: 'Target price must be a valid dollar amount greater than $0.' };
  }

  return { valid: true, gpu, price };
}

/**
 * Register a new alert (Double Opt-in: PENDING_CONFIRMATION)
 */
export async function registerAlert({ email, gpuId, targetPrice, filePath = ALERTS_FILE, appUrl = APP_URL }) {
  const validation = validateAlertInput({ email, gpuId, targetPrice });
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const alerts = loadAlerts(filePath);

  // Check if an identical active or pending alert already exists
  const existing = alerts.find(a => 
    a.email.toLowerCase() === normalizedEmail && 
    a.gpuId === gpuId && 
    a.targetPrice === validation.price &&
    a.status !== 'UNSUBSCRIBED'
  );

  if (existing) {
    if (existing.status === 'ACTIVE') {
      return { 
        success: true, 
        message: `You are already subscribed to alerts for ${validation.gpu.name} at $${validation.price}!`, 
        alert: existing 
      };
    } else if (existing.status === 'PENDING_CONFIRMATION') {
      // Re-send confirmation email
      await sendConfirmationEmail(existing, appUrl);
      return { 
        success: true, 
        message: 'A confirmation link has been re-sent to your email. Please check your inbox.', 
        alert: existing 
      };
    }
  }

  const confirmToken = crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID();

  const newAlert = {
    id: `alt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: normalizedEmail,
    gpuId,
    gpuName: validation.gpu.name,
    targetPrice: validation.price,
    currentPriceAtSignup: validation.gpu.usedStreetPrice,
    status: 'PENDING_CONFIRMATION',
    confirmToken,
    unsubscribeToken,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    fired: false,
    firedAt: null,
    lastNotifiedPrice: null
  };

  alerts.push(newAlert);
  saveAlerts(alerts, filePath);

  // Send double opt-in confirmation email
  await sendConfirmationEmail(newAlert, appUrl);

  return {
    success: true,
    message: `Confirmation email sent to ${normalizedEmail}! Please click the link in your email to activate your alert.`,
    alert: newAlert
  };
}

/**
 * Send Double Opt-In confirmation email
 */
export async function sendConfirmationEmail(alert, appUrl = APP_URL) {
  const confirmUrl = `${appUrl}/api/alerts/confirm?token=${alert.confirmToken}`;
  const subject = `Confirm your price alert: ${alert.gpuName} under $${alert.targetPrice}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f1f5f9; padding: 32px 16px; margin: 0;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #121824; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 20px; font-weight: 800; color: #10b981; margin: 0 0 8px 0;">⚡ AiRigBuilder Price Alerts</h1>
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">Verified used GPU price intelligence for local AI rigs.</p>
        </div>
        
        <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="font-size: 15px; margin: 0 0 12px 0; color: #e2e8f0;">
            Please confirm your request to receive a one-time price drop alert:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            <li><strong>GPU:</strong> ${alert.gpuName}</li>
            <li><strong>Target Price:</strong> <span style="color: #10b981; font-weight: bold;">$${alert.targetPrice}</span> or lower</li>
            <li><strong>Current Market Avg:</strong> $${alert.currentPriceAtSignup}</li>
          </ul>
        </div>

        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${confirmUrl}" style="display: inline-block; background-color: #10b981; color: #042f2e; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
            ✓ Confirm Price Alert
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 16px 0;">
          If button doesn't work, copy and paste this URL into your browser:<br>
          <a href="${confirmUrl}" style="color: #38bdf8; word-break: break-all;">${confirmUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 24px 0;">

        <p style="font-size: 11px; color: #64748b; margin: 0;">
          If you did not request this alert, you can safely ignore this email. No spam, ever.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `AiRigBuilder Price Alert Confirmation\n\nPlease confirm your alert for ${alert.gpuName} under $${alert.targetPrice} by visiting:\n${confirmUrl}\n\nIf you did not request this, please ignore.`;

  return sendEmail({ to: alert.email, subject, html, text });
}

/**
 * Confirm alert by token (Sets status to ACTIVE)
 */
export function confirmAlert(token, filePath = ALERTS_FILE) {
  if (!token) return { success: false, error: 'Missing confirmation token.' };

  const alerts = loadAlerts(filePath);
  const alert = alerts.find(a => a.confirmToken === token);

  if (!alert) {
    return { success: false, error: 'Invalid or expired confirmation token.' };
  }

  if (alert.status === 'ACTIVE') {
    return { success: true, alreadyConfirmed: true, alert };
  }

  alert.status = 'ACTIVE';
  alert.confirmedAt = new Date().toISOString();
  saveAlerts(alerts, filePath);

  return { success: true, alert };
}

/**
 * Unsubscribe alert by token (Sets status to UNSUBSCRIBED)
 */
export function unsubscribeAlert(token, filePath = ALERTS_FILE) {
  if (!token) return { success: false, error: 'Missing unsubscribe token.' };

  const alerts = loadAlerts(filePath);
  const alert = alerts.find(a => a.unsubscribeToken === token || a.confirmToken === token);

  if (!alert) {
    return { success: false, error: 'Invalid unsubscribe token.' };
  }

  alert.status = 'UNSUBSCRIBED';
  alert.unsubscribedAt = new Date().toISOString();
  saveAlerts(alerts, filePath);

  return { success: true, alert };
}

/**
 * Send Price Drop Notification Email
 */
export async function sendPriceDropNotificationEmail(alert, currentGpu, appUrl = APP_URL) {
  const unsubscribeUrl = `${appUrl}/api/alerts/unsubscribe?token=${alert.unsubscribeToken}`;
  const trackerUrl = `${appUrl}/#tracker`;
  const subject = `🔔 Price Drop Alert: ${alert.gpuName} hit $${currentGpu.usedStreetPrice}! (Target: $${alert.targetPrice})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f17; color: #f1f5f9; padding: 32px 16px; margin: 0;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #121824; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="margin-bottom: 24px;">
          <h1 style="font-size: 22px; font-weight: 800; color: #10b981; margin: 0 0 8px 0;">🎉 Price Drop Alert Triggered!</h1>
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">The market moved in your favor on eBay sold listings.</p>
        </div>
        
        <div style="background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin: 0 0 12px 0; color: #f1f5f9;">${alert.gpuName}</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">New Average Street Price:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #10b981; font-size: 18px; text-align: right;">$${currentGpu.usedStreetPrice}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Your Target Price:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #f1f5f9; text-align: right;">$${alert.targetPrice}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Price / GB VRAM:</td>
              <td style="padding: 6px 0; font-family: monospace; color: #38bdf8; text-align: right;">$${currentGpu.pricePerGb.toFixed(2)} / GB</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Recent Price Range:</td>
              <td style="padding: 6px 0; text-align: right;">$${currentGpu.usedPriceLow} - $${currentGpu.usedPriceHigh}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${trackerUrl}" style="display: inline-block; background-color: #10b981; color: #042f2e; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 8px; margin-right: 8px;">
            📊 View Tracker & Comps
          </a>
          <a href="${currentGpu.ebaySoldUrl || 'https://www.ebay.com'}" target="_blank" style="display: inline-block; background-color: #1e293b; color: #f1f5f9; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
            🔍 eBay Sold Listings →
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">
          This alert has now fulfilled its mission and marked as completed. We will not email you again unless you create a new target alert.
        </p>

        <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 24px 0;">

        <p style="font-size: 11px; color: #64748b; margin: 0; text-align: center;">
          Sent by AiRigBuilder Price Alerts • <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">Unsubscribe from this alert</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `AiRigBuilder Price Drop Alert!\n\n${alert.gpuName} has dropped to $${currentGpu.usedStreetPrice} (your target: $${alert.targetPrice})!\n\nView tracker: ${trackerUrl}\nUnsubscribe: ${unsubscribeUrl}`;

  return sendEmail({ to: alert.email, subject, html, text });
}

/**
 * Evaluate all active alerts against current GPU prices.
 * Fired when currentPrice <= targetPrice.
 * Ensures no repeat emails for the same drop (marks fired: true).
 */
export async function evaluateAndTriggerAlerts(gpus = GPUS_DATA, options = {}) {
  const filePath = options.filePath || ALERTS_FILE;
  const appUrl = options.appUrl || APP_URL;
  const alerts = loadAlerts(filePath);

  let firedCount = 0;
  const firedAlerts = [];

  for (const alert of alerts) {
    // Only process ACTIVE alerts that have not already fired
    if (alert.status !== 'ACTIVE' || alert.fired) {
      continue;
    }

    const gpu = gpus.find(g => g.id === alert.gpuId);
    if (!gpu) continue;

    // Check condition: current price dropped to or below target price
    if (gpu.usedStreetPrice <= alert.targetPrice) {
      console.log(`🎯 Alert fired for ${alert.email}: ${gpu.name} ($${gpu.usedStreetPrice} <= target $${alert.targetPrice})`);
      
      const emailResult = await sendPriceDropNotificationEmail(alert, gpu, appUrl);
      
      alert.fired = true;
      alert.firedAt = new Date().toISOString();
      alert.lastNotifiedPrice = gpu.usedStreetPrice;
      alert.notificationEmailId = emailResult?.id || null;

      firedCount++;
      firedAlerts.push({
        id: alert.id,
        email: alert.email,
        gpuId: alert.gpuId,
        gpuName: alert.gpuName,
        targetPrice: alert.targetPrice,
        droppedPrice: gpu.usedStreetPrice
      });
    }
  }

  if (firedCount > 0) {
    saveAlerts(alerts, filePath);
    console.log(`✓ Triggered ${firedCount} price-drop alert email(s) and saved updated state.`);
  }

  return {
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter(a => a.status === 'ACTIVE' && !a.fired).length,
    firedCount,
    firedAlerts
  };
}
