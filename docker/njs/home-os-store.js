import fs from 'fs';
import authStore from './auth-store.js';
import providerSessionStore from './provider-session-store.js';

const CONFIG_PATH = '/data/home-os/config.json';
const BACKUP_PATH = '/data/home-os/config.backup.json';
const MAX_BYTES = 1024 * 1024;
const REVISION_HEADER = 'X-Home-OS-Revision';

let fsModule = fs;
let principalResolver = function (r, options) {
  return authStore.resolveAuthenticatedPrincipal(r, options);
};

function setHomeOsStoreFsForTests(mockFs) {
  fsModule = mockFs;
}

function setHomeOsStorePrincipalResolverForTests(resolver) {
  principalResolver = resolver;
}

function resetHomeOsStoreForTests() {
  fsModule = fs;
  principalResolver = function (r, options) {
    return authStore.resolveAuthenticatedPrincipal(r, options);
  };
}

function emptyConfig() {
  return {
    schemaVersion: 2,
    revision: 0,
    updatedAt: new Date().toISOString(),
    mappings: [],
    physicalDevices: [],
    alertRules: [],
    cardPreferences: {},
  };
}

function validConfig(value) {
  const validEnvelope =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.schemaVersion === 2 &&
    Number.isInteger(value.revision) &&
    value.revision >= 0 &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.mappings) &&
    Array.isArray(value.physicalDevices) &&
    Array.isArray(value.alertRules) &&
    value.cardPreferences &&
    typeof value.cardPreferences === 'object' &&
    !Array.isArray(value.cardPreferences);
  if (!validEnvelope) return false;
  return value.mappings.every(function (mapping) {
    return (
      mapping &&
      typeof mapping === 'object' &&
      !Array.isArray(mapping) &&
      mapping.schemaVersion === 2 &&
      typeof mapping.entityId === 'string' &&
      mapping.source === 'manual' &&
      typeof mapping.updatedAt === 'string' &&
      (mapping.semanticRoles === undefined ||
        (Array.isArray(mapping.semanticRoles) &&
          mapping.semanticRoles.every(function (role) {
            return typeof role === 'string';
          })))
    );
  });
}

function readFile(path) {
  try {
    if (fsModule.statSync(path).size > MAX_BYTES) return null;
    const value = JSON.parse(fsModule.readFileSync(path, 'utf8'));
    return validConfig(value) ? value : null;
  } catch (_error) {
    return null;
  }
}

function readConfig() {
  const primary = readFile(CONFIG_PATH);
  if (primary) return { config: primary, recovered: false };
  const backup = readFile(BACKUP_PATH);
  return { config: backup || emptyConfig(), recovered: Boolean(backup) };
}

function ensureDirectory() {
  try {
    fsModule.mkdirSync('/data/home-os', { recursive: true });
  } catch (_error) {
    // The production image creates this path; test doubles may not implement mkdirSync.
  }
}

function writeJson(path, value) {
  ensureDirectory();
  const temporaryPath = path + '.tmp';
  fsModule.writeFileSync(temporaryPath, JSON.stringify(value), 'utf8');
  fsModule.renameSync(temporaryPath, path);
}

function headerValue(r, name) {
  const expected = name.toLowerCase();
  const key = Object.keys(r.headersIn || {}).find((candidate) => candidate.toLowerCase() === expected);
  return key ? r.headersIn[key] : '';
}

function sendJson(r, status, value) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(status, JSON.stringify(value));
}

function route(r) {
  const current = readConfig();
  r.headersOut[REVISION_HEADER] = String(current.config.revision);
  if (r.method === 'GET') {
    sendJson(r, 200, { config: current.config, recovered: current.recovered });
    return;
  }
  if (!providerSessionStore.isStrictSameOriginMutation(r)) {
    sendJson(r, 403, { error: 'Cross-origin Home OS configuration mutation is not allowed' });
    return;
  }
  if (r.method === 'DELETE') {
    writeJson(BACKUP_PATH, current.config);
    const reset = emptyConfig();
    reset.revision = current.config.revision + 1;
    writeJson(CONFIG_PATH, reset);
    r.headersOut[REVISION_HEADER] = String(reset.revision);
    sendJson(r, 200, { config: reset, recovered: false });
    return;
  }
  if (r.method !== 'PUT') {
    r.headersOut.Allow = 'GET, PUT, DELETE';
    sendJson(r, 405, { error: 'Method not allowed' });
    return;
  }
  const body = r.requestText || '';
  if (Buffer.byteLength(body, 'utf8') > MAX_BYTES) {
    sendJson(r, 413, { error: 'Home OS configuration is too large' });
    return;
  }
  const baseRevision = Number.parseInt(headerValue(r, REVISION_HEADER), 10);
  if (baseRevision !== current.config.revision) {
    sendJson(r, 409, { error: 'Home OS configuration changed on another client' });
    return;
  }
  let proposed;
  try {
    proposed = JSON.parse(body);
  } catch (_error) {
    sendJson(r, 400, { error: 'Invalid Home OS configuration JSON' });
    return;
  }
  if (!validConfig(proposed)) {
    sendJson(r, 400, { error: 'Unsupported Home OS configuration schema' });
    return;
  }
  const next = Object.assign({}, proposed, {
    revision: current.config.revision + 1,
    updatedAt: new Date().toISOString(),
  });
  writeJson(BACKUP_PATH, current.config);
  writeJson(CONFIG_PATH, next);
  r.headersOut[REVISION_HEADER] = String(next.revision);
  sendJson(r, 200, { config: next, recovered: false });
}

function handleWithOptions(r, options) {
  let principal = null;
  try {
    principal = principalResolver(r, options);
  } catch (_error) {
    principal = null;
  }
  if (!principal) {
    sendJson(r, 401, { error: 'Authentication required' });
    return;
  }
  try {
    route(r);
  } catch (_error) {
    sendJson(r, 503, { error: 'Home OS configuration storage is unavailable' });
  }
}

function handle(r) {
  handleWithOptions(r, { trustIngressHeaders: false });
}

function handleIngress(r) {
  handleWithOptions(r, { trustIngressHeaders: true });
}

export default {
  handle,
  handleIngress,
  resetHomeOsStoreForTests,
  route,
  setHomeOsStoreFsForTests,
  setHomeOsStorePrincipalResolverForTests,
};
