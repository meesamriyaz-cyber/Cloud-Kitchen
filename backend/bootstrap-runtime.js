import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_FILE_PATH = path.join(__dirname, '.env');
const PORT = parseInt(process.env.PORT || '8002', 10);
const INTERNAL_PORT = parseInt(process.env.BOOTSTRAP_INTERNAL_PORT || String(PORT + 1), 10);
const HOST = '127.0.0.1';
const CHILD_START_TIMEOUT_MS = 30000;

let childProcess = null;
let childStarting = null;

function normalizeDbName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 63);
}

function assertValidDbName(value) {
  if (!/^[a-z0-9_-]{2,63}$/.test(value)) {
    throw new Error('Database name must be 2-63 characters and use only letters, numbers, underscore, or hyphen');
  }
}

function normalizeMongoUrl(value) {
  const url = String(value || '').trim().replace(/\r?\n/g, '');
  if (!url) throw new Error('MongoDB connection URL is required');
  if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
    throw new Error('MongoDB URL must start with mongodb:// or mongodb+srv://');
  }
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) throw new Error('Missing MongoDB host');
  } catch {
    throw new Error('Invalid MongoDB connection URL');
  }
  return url;
}

async function readEnv() {
  try {
    return await fs.readFile(ENV_FILE_PATH, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return '';
    throw err;
  }
}

function setEnvValue(text, key, value) {
  const cleanValue = String(value || '').replace(/\r?\n/g, '').trim();
  const line = `${key}=${cleanValue}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(text)
    ? text.replace(pattern, line)
    : `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`;
}

async function persistMongoConfig(mongoUrl, dbName) {
  const previousText = await readEnv();
  let nextText = setEnvValue(previousText, 'RESTAURANT_APP_MONGO_URI', mongoUrl);
  nextText = setEnvValue(nextText, 'DB_NAME', dbName);
  await fs.writeFile(ENV_FILE_PATH, nextText, 'utf8');
  process.env.RESTAURANT_APP_MONGO_URI = mongoUrl;
  process.env.DB_NAME = dbName;
  return previousText;
}

async function restoreEnv(previousText) {
  await fs.writeFile(ENV_FILE_PATH, previousText, 'utf8');
  delete process.env.RESTAURANT_APP_MONGO_URI;
  delete process.env.DB_NAME;
  await loadEnvFromText(previousText);
}

async function loadEnvFromText(text) {
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
}

function currentMongoConfig() {
  return {
    mongoUrl: process.env.RESTAURANT_APP_MONGO_URI || process.env.MONGO_URI || '',
    dbName: process.env.DB_NAME || '',
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 2 * 1024 * 1024) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function proxyRequest(req, res, bodyBuffer = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...req.headers, host: `${HOST}:${INTERNAL_PORT}` };
    if (bodyBuffer) headers['content-length'] = bodyBuffer.length;
    else delete headers['content-length'];

    const proxyReq = http.request({
      hostname: HOST,
      port: INTERNAL_PORT,
      path: req.url,
      method: req.method,
      headers,
    }, proxyRes => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
      proxyRes.on('end', resolve);
    });

    proxyReq.on('error', reject);
    if (bodyBuffer) proxyReq.write(bodyBuffer);
    else req.pipe(proxyReq);
  });
}

async function childIsReady(requireDatabase = false) {
  try {
    const status = await new Promise((resolve, reject) => {
      const request = http.get(`http://${HOST}:${INTERNAL_PORT}/api/bootstrap/status`, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Invalid bootstrap status response'));
          }
        });
      });
      request.setTimeout(3000, () => {
        request.destroy(new Error('Child backend status timeout'));
      });
      request.on('error', reject);
    });
    return !requireDatabase || status?.database === 'connected';
  } catch {
    return false;
  }
}

async function waitForChild(requireDatabase = false) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < CHILD_START_TIMEOUT_MS) {
    if (await childIsReady(requireDatabase)) return true;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function stopChild() {
  if (!childProcess) return;
  const processToStop = childProcess;
  childProcess = null;
  await new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    processToStop.once('exit', finish);
    processToStop.kill('SIGTERM');
    setTimeout(() => {
      if (!settled) {
        processToStop.kill('SIGKILL');
        finish();
      }
    }, 5000);
  });
}

async function startChild() {
  if (childProcess && !childProcess.killed) return;
  if (childStarting) return childStarting;

  childStarting = (async () => {
    const { spawn } = await import('child_process');
    const env = {
      ...process.env,
      PORT: String(INTERNAL_PORT),
    };
    delete env.BOOTSTRAP_INTERNAL_PORT;

    childProcess = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
      cwd: __dirname,
      env,
      stdio: 'inherit',
    });

    childProcess.on('exit', () => {
      childProcess = null;
    });

    return waitForChild(false);
  })();

  try {
    return await childStarting;
  } finally {
    childStarting = null;
  }
}

async function testMongoConnection(mongoUrl, dbName) {
  let connection = null;
  try {
    connection = await mongoose.createConnection(mongoUrl, {
      dbName,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    }).asPromise();
    return true;
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}

async function handleBootstrapStatus(req, res) {
  await proxyRequest(req, res);
}

async function handleTestDatabase(req, res) {
  try {
    const body = await readRequestBody(req);
    const mongoUrl = normalizeMongoUrl(body.mongo_url);
    const dbName = normalizeDbName(body.db_name);
    assertValidDbName(dbName);
    await testMongoConnection(mongoUrl, dbName);
    sendJson(res, 200, { ok: true, database: 'connected', db_name: dbName });
  } catch (err) {
    sendJson(res, 400, {
      ok: false,
      detail: err.message === 'Database name must be 2-63 characters and use only letters, numbers, underscore, or hyphen'
        ? err.message
        : 'Could not connect to MongoDB. Check the URL, database name, credentials, and MongoDB network access settings.',
    });
  }
}

async function handleInitialize(req, res) {
  let body;
  try {
    body = await readRequestBody(req);
    const mongoUrl = normalizeMongoUrl(body.mongo_url);
    const dbName = normalizeDbName(body.db_name);
    assertValidDbName(dbName);

    const current = currentMongoConfig();
    if (current.mongoUrl && current.dbName && (current.mongoUrl !== mongoUrl || current.dbName !== dbName)) {
      return sendJson(res, 409, { detail: 'This app is already configured to use a different MongoDB connection.' });
    }

    const previousText = await readEnv();
    await persistMongoConfig(mongoUrl, dbName);
    await stopChild();
    await startChild();

    if (!(await waitForChild(true))) {
      await stopChild();
      await restoreEnv(previousText);
      await startChild();
      return sendJson(res, 503, { detail: 'Could not connect to MongoDB. Check the URL, database name, credentials, and MongoDB network access settings.' });
    }

    const bodyBuffer = Buffer.from(JSON.stringify(body));
    return await proxyRequest({ ...req, headers: { ...req.headers, 'content-length': bodyBuffer.length } }, res, bodyBuffer);
  } catch (err) {
    return sendJson(res, 400, { detail: err.message || 'MongoDB setup failed' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/bootstrap/test-database' && req.method === 'POST') {
      return await handleTestDatabase(req, res);
    }
    if (req.url === '/api/bootstrap/initialize' && req.method === 'POST') {
      return await handleInitialize(req, res);
    }
    if (req.url === '/api/bootstrap/status' && req.method === 'GET') {
      return await handleBootstrapStatus(req, res);
    }
    return await proxyRequest(req, res);
  } catch (err) {
    if (!res.headersSent) sendJson(res, 502, { detail: 'Backend unavailable' });
  }
});

server.listen(PORT, HOST, async () => {
  console.log(`[bootstrap] listening on ${HOST}:${PORT}`);
  await startChild();
});

async function shutdown() {
  server.close();
  await stopChild();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
