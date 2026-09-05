import express from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const PRODUCT_ID = String(process.env.MARKETPLACE_PRODUCT_ID || '').trim();
const LICENSE_API = (process.env.MARKETPLACE_LICENSE_API || 'https://apps.cuttingedge.in/api').replace(/\/$/, '');
const OFFLINE_GRACE_HOURS = Math.max(1, Number(process.env.LICENSE_OFFLINE_GRACE_HOURS) || 72);
const OFFLINE_GRACE_MS = OFFLINE_GRACE_HOURS * 60 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = path.join(path.dirname(__filename), 'data');
const LICENSE_FILE = path.join(DATA_DIR, 'license.json');

const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const timingSafe = (a, b) => Boolean(a && b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)));

async function readLicense() {
  try { return JSON.parse(await fs.readFile(LICENSE_FILE, 'utf8')); } catch { return null; }
}
async function writeLicense(value) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LICENSE_FILE, JSON.stringify(value, null, 2), { mode: 0o600 });
}
function deviceIdFor(existing) { return existing || `ck_${crypto.randomUUID()}`; }

function ensureProductConfigured(res) {
  if (PRODUCT_ID) return true;
  res.status(503).json({ detail: 'Marketplace product is not configured for this installation.' });
  return false;
}

async function marketplace(pathname, body) {
  const response = await fetch(`${LICENSE_API}${pathname}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  let data = {}; try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data?.error || `Marketplace request failed (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

function publicLicense(record, remote = {}, extra = {}) {
  return {
    status: remote.status || record?.status || 'none',
    productId: PRODUCT_ID,
    serverTime: remote.serverTime || record?.lastServerTime || null,
    trial: remote.trial || record?.trial || null,
    license: remote.license || record?.license || null,
    activated: Boolean(record?.deviceSecret),
    deviceId: record?.deviceId || null,
    ...extra,
  };
}

function remoteExpiry(record, remote) {
  if (remote.status === 'trial') return remote.trial?.expiresAt || record?.trial?.expiresAt || null;
  if (remote.status === 'active') return remote.license?.expiresAt || record?.license?.expiresAt || null;
  return null;
}

function offlineResult(record) {
  const now = Date.now();
  const lastValidated = Date.parse(record?.lastValidatedAt || '');
  const lastServer = Date.parse(record?.lastServerTime || '');
  const lastKnownExpiry = remoteExpiry(record, { status: record?.status });
  const validationBase = Number.isFinite(lastValidated) ? lastValidated : 0;
  const graceUntil = validationBase ? validationBase + OFFLINE_GRACE_MS : 0;
  const expired = lastKnownExpiry && Number.isFinite(lastServer) && lastServer >= Date.parse(lastKnownExpiry);
  const graceExpired = !validationBase || now > graceUntil;

  if (expired) {
    return publicLicense(record, {}, { offline: true, locked: true, reason: 'license_expired', offlineGraceHours: OFFLINE_GRACE_HOURS });
  }
  if (graceExpired) {
    return publicLicense(record, {}, { offline: true, locked: true, reason: 'offline_grace_expired', offlineGraceHours: OFFLINE_GRACE_HOURS });
  }
  return publicLicense(record, {}, {
    offline: true,
    locked: false,
    offlineGraceHours: OFFLINE_GRACE_HOURS,
    offlineGraceUntil: new Date(graceUntil).toISOString(),
  });
}

router.get('/status', async (_req, res) => {
  if (!ensureProductConfigured(res)) return;
  const record = await readLicense();
  if (!record?.deviceId || !record?.deviceSecret) return res.json(publicLicense(record));
  try {
    const remote = await marketplace('/license/device-status', { productId: PRODUCT_ID, deviceId: record.deviceId, deviceSecret: record.deviceSecret });
    record.status = remote.status || record.status;
    record.trial = remote.trial || record.trial || null;
    record.license = remote.license || record.license || null;
    record.lastValidatedAt = new Date().toISOString();
    record.lastServerTime = remote.serverTime || new Date().toISOString();
    await writeLicense(record);
    return res.json(publicLicense(record, remote, { offline: false, locked: remote.status === 'expired' }));
  } catch (err) {
    return res.json(offlineResult(record));
  }
});

router.post('/activate', async (req, res) => {
  if (!ensureProductConfigured(res)) return;
  const code = String(req.body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 10) return res.status(400).json({ detail: 'Enter the 10-character activation code from the Marketplace.' });

  const existing = await readLicense();
  const deviceId = deviceIdFor(existing?.deviceId);
  try {
    const remote = await marketplace('/license/exchange-code', { productId: PRODUCT_ID, code, deviceId });
    const now = new Date().toISOString();
    const record = {
      productId: PRODUCT_ID,
      deviceId,
      deviceSecret: remote.deviceSecret,
      deviceSecretHash: hash(remote.deviceSecret),
      status: remote.status,
      trial: remote.trial || null,
      license: remote.license || null,
      activatedAt: now,
      lastValidatedAt: now,
      lastServerTime: remote.serverTime || now,
    };
    await writeLicense(record);
    return res.json(publicLicense(record, remote));
  } catch (err) {
    return res.status(err.statusCode || 502).json({ detail: err.message || 'Could not activate the application' });
  }
});

export default router;
