import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';

export const DATA = process.env.DATA_DIR || path.join(process.cwd(), 'data');

export function getEnvConfig(req) {
  const host = req?.headers?.get?.('host') || 'localhost:3000';
  const proto = req?.headers?.get?.('x-forwarded-proto') || 'http';
  const reqOrigin = `${proto}://${host}`;
  const envOrigin = process.env.ORIGIN;
  const origins = Array.from(new Set([envOrigin, reqOrigin].filter(Boolean)));
  const origin = origins.length === 1 ? origins[0] : origins;
  const hostDomain = host.split(':')[0] || 'localhost';
  const rpId = process.env.RP_ID || hostDomain;
  const rpName = process.env.RP_NAME || 'openGym';
  return { origin, rpId, rpName };
}

export const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
export const INVITE_ONLY = /^(1|true|yes|on)$/i.test(process.env.INVITE_ONLY || '');
export const ALLOW_GUEST = !/^(0|false|no|off)$/i.test(process.env.ALLOW_GUEST || '');
export const SESSION_DAYS = Math.max(1, +(process.env.SESSION_DAYS || 90) || 90);
export const MAX_BODY = 5 * 1024 * 1024;

try {
  if (!fs.existsSync(DATA)) {
    fs.mkdirSync(DATA, { recursive: true });
  }
} catch (e) {
  console.error('Warning: Unable to create DATA directory:', DATA, e.message);
}

/* ---------- secret + db ---------- */
const secretFile = path.join(DATA, 'secret');
let SECRET = 'fallback-opengym-secret-key';
try {
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  SECRET = fs.readFileSync(secretFile, 'utf8').trim();
} catch (e) {
  console.error('Warning: Unable to read/write secretFile:', e.message);
}
export { SECRET };

const dbFile = path.join(DATA, 'db.json');
export let db = { users: [], creds: [], subs: [], invites: [] };
try {
  if (fs.existsSync(dbFile)) {
    db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  }
} catch (e) {
  console.error('Failed to parse db.json', e);
}
db.users = db.users || [];
db.creds = db.creds || [];
db.subs = db.subs || [];
db.invites = db.invites || [];

export const isAdmin = user => !!user && (user.admin === true || ADMIN_UIDS.includes(user.id));

export function atomicWrite(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

export function saveDb() {
  atomicWrite(dbFile, JSON.stringify(db, null, 2));
}

export const stateFile = uid => path.join(DATA, 'state-' + uid.replace(/[^a-zA-Z0-9_-]/g, '') + '.json');

export function readState(uid) {
  try {
    return JSON.parse(fs.readFileSync(stateFile(uid), 'utf8'));
  } catch {
    return null;
  }
}

/* ---------- push notifications (Web Push / VAPID) ---------- */
const vapidFile = path.join(DATA, 'vapid.json');
let vapid;
try {
  vapid = JSON.parse(fs.readFileSync(vapidFile, 'utf8'));
} catch {
  vapid = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidFile, JSON.stringify(vapid), { mode: 0o600 });
}

export function getVapidKeys() {
  return vapid;
}

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || (process.env.ORIGIN?.startsWith('https:') ? process.env.ORIGIN : 'mailto:admin@localhost');
webpush.setVapidDetails(VAPID_SUBJECT, vapid.publicKey, vapid.privateKey);

export async function sendPush(userId, payload) {
  const subs = db.subs.filter(s => s.userId === userId);
  if (!subs.length) return;
  const body = JSON.stringify(payload);
  let dirty = false;
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, { urgency: 'high' });
    } catch (e) {
      console.error('push send failed', userId, e.statusCode, e.body || e.message);
      if (e.statusCode === 404 || e.statusCode === 410) {
        db.subs = db.subs.filter(s => s.endpoint !== sub.endpoint);
        dirty = true;
      }
    }
  }));
  if (dirty) saveDb();
}

/* ---------- rest timers ---------- */
const restTimers = globalThis._restTimers || new Map();
globalThis._restTimers = restTimers;

export function scheduleRestTimer(userId, sec) {
  const t = restTimers.get(userId);
  if (t) clearTimeout(t);
  restTimers.set(userId, setTimeout(() => {
    restTimers.delete(userId);
    sendPush(userId, { title: 'Rest over 💪', body: 'Time for your next set.', tag: 'rest-timer' });
  }, sec * 1000));
}

export function cancelRestTimer(userId) {
  const t = restTimers.get(userId);
  if (t) {
    clearTimeout(t);
    restTimers.delete(userId);
  }
}

/* ---------- sessions (signed cookie) ---------- */
export function sign(payload) {
  const mac = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return payload + '.' + mac;
}

export function verifySig(token) {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  } catch {
    return null;
  }
  return payload;
}

export const sessionVersion = user => user.sv || 0;

export function makeSession(user) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  return sign(user.id + ':' + exp + ':' + sessionVersion(user));
}

export function readSessionFromReq(req) {
  let cookieHeader = '';
  if (req?.headers?.get) {
    cookieHeader = req.headers.get('cookie') || '';
  } else if (req?.headers?.cookie) {
    cookieHeader = req.headers.cookie || '';
  }
  const cookies = Object.fromEntries(cookieHeader.split(';').map(c => {
    const i = c.indexOf('='); return i < 0 ? ['', ''] : [c.slice(0, i).trim(), c.slice(i + 1).trim()];
  }));
  const tok = cookies.gymsid;
  if (!tok) return null;
  const payload = verifySig(tok);
  if (!payload) return null;
  const [uid, exp, ver] = payload.split(':');
  if (!uid || +exp < Date.now()) return null;
  const user = db.users.find(u => u.id === uid) || null;
  if (!user || user.disabled) return null;
  const claimed = ver === undefined ? 0 : Number(ver);
  if (!Number.isInteger(claimed) || claimed !== sessionVersion(user)) return null;
  return user;
}

export function sessionCookie(user, req) {
  const { origin } = getEnvConfig(req);
  const secure = /^https:/i.test(origin) ? ' Secure;' : '';
  return `gymsid=${makeSession(user)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly;${secure} SameSite=Lax`;
}

export function clearCookie(req) {
  const { origin } = getEnvConfig(req);
  const secure = /^https:/i.test(origin) ? ' Secure;' : '';
  return `gymsid=; Path=/; Max-Age=0; HttpOnly;${secure} SameSite=Lax`;
}

/* ---------- challenge store ---------- */
const challenges = globalThis._challenges || new Map();
globalThis._challenges = challenges;

export function putChallenge(data) {
  const cid = crypto.randomBytes(16).toString('base64url');
  challenges.set(cid, { ...data, exp: Date.now() + 5 * 60000 });
  return cid;
}

export function takeChallenge(cid) {
  const c = challenges.get(cid);
  challenges.delete(cid);
  if (!c || c.exp < Date.now()) return null;
  return c;
}

/* ---------- live presence ---------- */
const presence = globalThis._presence || new Map();
globalThis._presence = presence;
const PRESENCE_TTL = 70000;

export function livePresence(uid) {
  const p = presence.get(uid);
  if (!p) return null;
  if (Date.now() - p.updatedAt > PRESENCE_TTL) {
    presence.delete(uid);
    return null;
  }
  return p;
}

export function updatePresence(uid, data) {
  if (data?.active) {
    presence.set(uid, {
      name: String(data.name || '').slice(0, 60),
      exIdx: +data.exIdx || 0,
      exTotal: +data.exTotal || 0,
      setsDone: +data.setsDone || 0,
      setsTotal: +data.setsTotal || 0,
      startedAt: +data.startedAt || Date.now(),
      updatedAt: Date.now()
    });
  } else {
    presence.delete(uid);
  }
}

/* ---------- audit log ---------- */
export const AUDIT_ON = !/^(0|false|no|off)$/i.test(process.env.AUDIT_LOG || '');
export const AUDIT_MAX = Math.max(0, +(process.env.AUDIT_MAX || 5000) || 0);
export const AUDIT_DAYS = Math.max(0, +(process.env.AUDIT_DAYS || 90) || 0);
export const AUDIT_IP = /^full$/i.test(process.env.AUDIT_IP || '') ? 'full'
  : /^(1|true|yes|on|net)$/i.test(process.env.AUDIT_IP || '') ? 'net' : 'off';
export const auditFile = path.join(DATA, 'audit.log');
let auditSeq = 0;
let auditCount = 0;

export function clientIp(req) {
  if (AUDIT_IP === 'off') return null;
  const headers = req?.headers;
  const getHeader = h => headers?.get ? headers.get(h) : headers?.[h];
  const raw = String(getHeader('cf-connecting-ip') || '').trim()
    || String(getHeader('x-forwarded-for') || '').split(',')[0].trim()
    || String(getHeader('x-real-ip') || '').trim();
  const ip = raw.replace(/^\[|\]$/g, '').slice(0, 45);
  if (!/^[0-9a-fA-F:.]{3,45}$/.test(ip)) return null;
  if (AUDIT_IP === 'full') return ip;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.replace(/\.\d{1,3}$/, '.0/24');
  const g = ip.split(':').filter(Boolean).slice(0, 3).join(':');
  return g ? g + '::/48' : null;
}

export function auditLines() {
  let text;
  try { text = fs.readFileSync(auditFile, 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      if (r && r.id && r.ev) rows.push(r);
    } catch {}
  }
  return rows;
}

export function auditKeep(rows) {
  let out = rows;
  if (AUDIT_DAYS) {
    const cut = Date.now() - AUDIT_DAYS * 86400000;
    out = out.filter(r => r.ts >= cut);
  }
  if (AUDIT_MAX && out.length > AUDIT_MAX) out = out.slice(out.length - AUDIT_MAX);
  return out;
}

export function compactAudit() {
  const rows = auditLines();
  for (const r of rows) if (+r.id > auditSeq) auditSeq = +r.id;
  const keep = auditKeep(rows);
  auditCount = keep.length;
  if (keep.length === rows.length) return;
  try {
    atomicWrite(auditFile, keep.map(r => JSON.stringify(r)).join('\n') + (keep.length ? '\n' : ''));
  } catch (e) {
    console.error('audit compact failed', e.message);
  }
}

export function audit(req, ev, f = {}) {
  if (!AUDIT_ON) return;
  const rec = { id: ++auditSeq, ts: Date.now(), ev, ok: f.ok !== false };
  if (f.user) { rec.uid = f.user.id; rec.name = String(f.user.name || '').slice(0, 40); }
  else {
    if (f.uid) rec.uid = f.uid;
    if (f.name) rec.name = String(f.name).slice(0, 40);
  }
  if (f.target) { rec.tgt = f.target.id; rec.tname = String(f.target.name || '').slice(0, 40); }
  if (f.msg) rec.msg = String(f.msg).slice(0, 120);
  const ip = clientIp(req);
  if (ip) rec.ip = ip;
  try { fs.appendFileSync(auditFile, JSON.stringify(rec) + '\n'); }
  catch (e) { return console.error('audit write failed', e.message); }
  if (AUDIT_MAX && ++auditCount > AUDIT_MAX * 1.25) compactAudit();
}

if (AUDIT_ON && !globalThis._auditInited) {
  globalThis._auditInited = true;
  compactAudit();
}

export const b64uToBuf = s => Buffer.from(s, 'base64url');
