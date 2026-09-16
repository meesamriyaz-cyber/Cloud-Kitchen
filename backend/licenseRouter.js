import express from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);
const router = express.Router();
const PRODUCT_ID = String(process.env.MARKETPLACE_PRODUCT_ID || '').trim();
const LICENSE_API = (process.env.MARKETPLACE_LICENSE_API || 'https://apps.cuttingedge-enterprises.in/api').replace(/\/$/, '');
const OFFLINE_GRACE_HOURS = Math.max(1, Number(process.env.LICENSE_OFFLINE_GRACE_HOURS) || 72);
const OFFLINE_GRACE_MS = OFFLINE_GRACE_HOURS * 60 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = path.join(path.dirname(__filename), 'data');
const LICENSE_FILE = path.join(DATA_DIR, 'license.json');
const INSTALLATION_KEY_FILE = path.join(
  DATA_DIR,
  'installation.key'
);

const LICENSE_VERSION = 2;

const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
let machineFingerprintPromise = null;

async function getMachineFingerprint() {
  if (!machineFingerprintPromise) {
    machineFingerprintPromise = (async () => {
      try {
        const { stdout } = await execFileAsync(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            '(Get-CimInstance Win32_ComputerSystemProduct).UUID'
          ],
          {
            windowsHide: true,
            timeout: 5000,
          }
        );

        const systemUuid = String(stdout || '')
          .trim()
          .split(/\r?\n/)
          .map(line => line.trim())
          .find(Boolean);

        if (!systemUuid) {
          throw new Error('Windows system UUID is unavailable');
        }

        // Product-specific, privacy-preserving fingerprint.
        return hash(
          `cloud-kitchen-machine-v1:${PRODUCT_ID}:${systemUuid.toUpperCase()}`
        );
      } catch (err) {
        throw new Error('Unable to determine this computer identity');
      }
    })();
  }

  return machineFingerprintPromise;
}
async function getInstallationKey() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const existing = await fs.readFile(
      INSTALLATION_KEY_FILE,
      'utf8'
    );

    if (existing?.trim()) {
      return existing.trim();
    }
  } catch {
    // Key does not exist yet.
  }

  const key = crypto.randomBytes(32).toString('hex');

  await fs.writeFile(
    INSTALLATION_KEY_FILE,
    key,
    {
      mode: 0o600
    }
  );

  return key;
}
function licensePayload(record) {
  return {
    version: record.version || LICENSE_VERSION,

    productId: record.productId || null,

    deviceId: record.deviceId || null,

    deviceSecret: record.deviceSecret || null,

    deviceSecretHash: record.deviceSecretHash || null,

    status: record.status || null,

    trial: record.trial || null,

    license: record.license
      ? {
          status: record.license.status || null,
          expiresAt: record.license.expiresAt || null
        }
      : null,

    activatedAt: record.activatedAt || null,

    lastValidatedAt: record.lastValidatedAt || null,

    lastServerTime: record.lastServerTime || null
  };
}
function canonicalLicenseData(record) {
  return JSON.stringify(licensePayload(record));
}
async function signLicense(record) {
  const key = await getInstallationKey();

  return crypto
    .createHmac('sha256', key)
    .update(canonicalLicenseData(record))
    .digest('hex');
}
async function verifyLicenseIntegrity(record) {
  if (!record?.integrity?.signature) {
    return {
      valid: false,
      legacy: true
    };
  }

  try {
    const expected = await signLicense(record);

    const actual = record.integrity.signature;

    const valid = timingSafe(expected, actual);

    return {
      valid,
      legacy: false
    };
  } catch {
    return {
      valid: false,
      legacy: false
    };
  }
}
const timingSafe = (a, b) => Boolean(a && b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)));

async function readLicense() {
  try {
    const record = JSON.parse(
      await fs.readFile(LICENSE_FILE, 'utf8')
    );

    // Legacy licenses created before integrity protection.
    // They will be upgraded on the next legitimate write.
    if (!record.version || record.version < LICENSE_VERSION) {
      return record;
    }

    const integrity = await verifyLicenseIntegrity(record);

    if (!integrity.valid) {
      return {
        ...record,
        integrityFailed: true
      };
    }

    return record;

  } catch {
    return null;
  }
}
async function writeLicense(value) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const record = {
    ...value,
    version: LICENSE_VERSION
  };

  // Remove Marketplace payment details from local storage.
  if (record.license) {
    record.license = {
      status: record.license.status || null,
      expiresAt: record.license.expiresAt || null,
      activatedAt: record.license.activatedAt || null
    };
  }

  const signature = await signLicense(record);

  record.integrity = {
    algorithm: 'HMAC-SHA256',
    signature,
    signedAt: new Date().toISOString()
  };

  await fs.writeFile(
    LICENSE_FILE,
    JSON.stringify(record, null, 2),
    {
      mode: 0o600
    }
  );
}
function deviceIdFor(existing) { return existing || `ck_${crypto.randomUUID()}`; }
function isDevelopment() { return process.env.NODE_ENV !== 'production'; }

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
  const error = new Error(
    data?.error || `Marketplace request failed (${response.status})`
  );

  error.statusCode = response.status;
  error.marketplaceReason = data?.reason || null;

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

function developmentExpiredResult(record) {
  return publicLicense(record, {}, {
    status: 'expired',
    locked: true,
    offline: false,
    reason: 'dev_trial_expired',
    developmentOverride: true,
  });
}

router.get('/status', async (_req, res) => {
  if (!ensureProductConfigured(res)) return;
  const record = await readLicense();
  if (!record?.deviceId || !record?.deviceSecret) return res.json(publicLicense(record));
   if (record?.integrityFailed) {
  return res.status(423).json({
    status: 'tampered',
    productId: PRODUCT_ID,
    activated: false,
    locked: true,
    offline: false,
    reason: 'license_integrity_failed'
  });
}
  // Development-only local override. This deliberately bypasses the Marketplace
  // so Test 5 can simulate an expired trial without changing the live license.
 if (isDevelopment()) {
  if (record.devOverride?.forceStatus === 'expired') {
    return res.json(developmentExpiredResult(record));
  }

  if (record.devOverride?.forceStatus === 'offline_grace_expired') {
    return res.json(
      publicLicense(record, {}, {
        locked: true,
        offline: true,
        reason: 'offline_grace_expired',
        developmentOverride: true
      })
    );
  }
}

  try {
    const machineFingerprint = await getMachineFingerprint();

    const remote = await marketplace('/license/device-status', {
      productId: PRODUCT_ID,
      deviceId: record.deviceId,
      deviceSecret: record.deviceSecret,
      machineFingerprint,
    });
    record.status = remote.status || record.status;
    record.trial = remote.trial || record.trial || null;
    record.license = remote.license || record.license || null;
    record.lastValidatedAt = new Date().toISOString();
    record.lastServerTime = remote.serverTime || new Date().toISOString();
    await writeLicense(record);
    return res.json(publicLicense(record, remote, { offline: false, locked: remote.status === 'expired' }));
  } catch (err) {
     if (err.statusCode) {

  let reason = err.marketplaceReason || 'license_rejected';

 if (!err.marketplaceReason) {
  if (err.statusCode === 401) {
    reason = 'device_transferred';
  } else if (err.statusCode === 403) {
    reason = 'license_forbidden';
  } else if (err.statusCode === 404) {
    reason = 'license_not_found';
  } else if (err.statusCode === 409) {
    reason = 'device_conflict';
  } else if (err.statusCode === 423) {
    reason = 'machine_fingerprint_mismatch';
  }
}

  return res.json(
    publicLicense(record, {}, {
      offline: false,
      locked: true,
      reason,
    })
  );
}

  // Only genuine network / connectivity failures get offline grace.
  return res.json(offlineResult(record));
  }
});

router.post('/activate', async (req, res) => {
  if (!ensureProductConfigured(res)) return;
  const code = String(req.body?.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 10) return res.status(400).json({ detail: 'Enter the 10-character activation code from the Marketplace.' });

  const existing = await readLicense();
  if (existing?.integrityFailed) {
  return res.status(423).json({
    detail: 'Local license data failed integrity verification. Please contact support or reset this installation before activating.'
  });
}
  const deviceId = deviceIdFor(existing?.deviceId);
  try {
  const machineFingerprint = await getMachineFingerprint();

   const remote = await marketplace('/license/exchange-code', {
        productId: PRODUCT_ID,
        code,
        deviceId,
        machineFingerprint,
      });
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

// Development-only test controls. They are hard-disabled when NODE_ENV=production.
router.post('/dev/expire-trial', async (_req, res) => {
  if (!isDevelopment()) return res.status(404).json({ detail: 'Not found' });
  const record = await readLicense();
  if (!record?.deviceId || !record?.deviceSecret) {
    return res.status(400).json({ detail: 'No activated local license is available to expire.' });
  }
  record.devOverride = { forceStatus: 'expired', forcedAt: new Date().toISOString() };
  await writeLicense(record);
  return res.json(developmentExpiredResult(record));
});

router.post('/dev/clear-expiry', async (_req, res) => {
  if (!isDevelopment()) return res.status(404).json({ detail: 'Not found' });
  const record = await readLicense();
  if (!record) return res.json({ status: 'none', developmentOverride: false });
  delete record.devOverride;
  await writeLicense(record);
  return res.json({ ...publicLicense(record), developmentOverride: false });
});

router.post('/dev/expire-offline-grace', async (_req, res) => {
  if (!isDevelopment()) {
    return res.status(404).json({ detail: 'Not found' });
  }

  const record = await readLicense();

  if (!record?.deviceId || !record?.deviceSecret) {
    return res.status(400).json({
      detail: 'No activated local license is available.'
    });
  }

  record.devOverride = {
    forceStatus: 'offline_grace_expired',
    forcedAt: new Date().toISOString()
  };

  await writeLicense(record);

  return res.json(
    publicLicense(record, {}, {
      locked: true,
      offline: true,
      reason: 'offline_grace_expired',
      developmentOverride: true
    })
  );
});

export default router;
