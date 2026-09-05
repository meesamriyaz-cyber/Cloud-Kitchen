import express from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const PRODUCT_ID = String(process.env.MARKETPLACE_PRODUCT_ID || '').trim();
const LICENSE_API = (process.env.MARKETPLACE_LICENSE_API || 'https://apps.cuttingedge.in/api').replace(/\/$/, '');
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

function publicLicense(record, remote = {}) {
  return {
    status: remote.status || record?.status || 'none',
    productId: PRODUCT_ID,
    serverTime: remote.serverTime || null,
    trial: remote.trial || null,
    license: remote.license || null,
    activated: Boolean(record?.deviceSecret),
    deviceId: record?.deviceId || null,
  };
}

router.get('/status', async (_req, res) => {
  if (!ensureProductConfigured(res)) return;
  const record = await readLicense();
  if (!record?.deviceId || !record?.deviceSecret) return res.json(publicLicense(record));
  try {
    const remote = await marketplace('/license/device-status', { productId: PRODUCT_ID, deviceId: record.deviceId, deviceSecret: record.deviceSecret });
    if (remote.status) { record.status = remote.status; record.lastValidatedAt = new Date().toISOString(); await writeLicense(record); }
    return res.json(publicLicense(record, remote));
  } catch (err) {
    const cached = publicLicense(record);
    cached.offline = true;
    cached.error = err.message;
    return res.json(cached);
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
    const record = {
      productId: PRODUCT_ID,
      deviceId,
      deviceSecret: remote.deviceSecret,
      deviceSecretHash: hash(remote.deviceSecret),
      status: remote.status,
      activatedAt: new Date().toISOString(),
      lastValidatedAt: new Date().toISOString(),
    };
    await writeLicense(record);
    return res.json(publicLicense(record, remote));
  } catch (err) {
    return res.status(err.statusCode || 502).json({ detail: err.message || 'Could not activate the application' });
  }
});

export default router;
