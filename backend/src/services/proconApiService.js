const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
const api = axios.create({
  baseURL: process.env.PROCON_API_URL,
  headers: { 'x-api-key': process.env.PROCON_API_KEY || '' }
});

const TIMEOUT_MS = 60000;
const MAX_RETRIES = 3;

/**
 * Helper to perform axios requests with retry logic
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  try {
    const config = { ...options, timeout: TIMEOUT_MS };
    return await axios.get(url, config);
  } catch (error) {
    if (retries > 0) {
      console.warn(`API request failed, retrying... (${retries} attempts left). Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (MAX_RETRIES - retries + 1))); // Exponential backoff-ish
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Poll events from the reports endpoint. If start/end not provided, default to last 24h.
async function pollEvents({ accountId, startDate, endDate } = {}) {
  const acc = accountId || process.env.PROCON_ACCOUNT_ID;
  const baseReportsUrl = process.env.PROCON_EVENTS_URL || '';
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const url = `${baseReportsUrl}?accountId=${encodeURIComponent(acc || '')}&startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`;
  const eventsKey = process.env.PROCON_EVENTS_API_KEY || process.env.PROCON_API_KEY || '';

  const r = await fetchWithRetry(url, { headers: { 'x-api-key': eventsKey } });
  if (!Array.isArray(r.data)) return [];
  return r.data;
}
// Poll devices metadata with optional accountId and rowLimit
async function pollDevices({ accountId, rowLimit } = {}) {
  const acc = accountId || process.env.PROCON_ACCOUNT_ID || '';
  const limit = rowLimit || '';
  const baseDevicesUrl = process.env.PROCON_DEVICES_URL || (process.env.PROCON_API_URL ? `${process.env.PROCON_API_URL.replace(/\/$/, '')}/devices` : '');
  const qp = [];
  if (acc) qp.push(`accountId=${encodeURIComponent(acc)}`);
  if (limit) qp.push(`rowLimit=${encodeURIComponent(String(limit))}`);
  const url = qp.length ? `${baseDevicesUrl}?${qp.join('&')}` : baseDevicesUrl;
  const devicesKey = process.env.PROCON_DEVICES_API_KEY || process.env.PROCON_API_KEY || '';

  const r = await fetchWithRetry(url, { headers: { 'x-api-key': devicesKey } });
  if (!Array.isArray(r.data)) return [];
  return r.data;
}
async function sendDeviceCommand(deviceId, action) {
  return { deviceId, action };
}
module.exports = { pollEvents, pollDevices, sendDeviceCommand };
