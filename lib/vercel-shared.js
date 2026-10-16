'use strict';
const crypto = require('node:crypto');
const { Redis } = require('@upstash/redis');
const defaultContent = require('../content-default.json');
let redisClient;
function redis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}
async function getContent() {
  const r = redis();
  if (!r) return defaultContent;
  const saved = await r.get('znpvp:site:content');
  if (!saved) return defaultContent;
  const obj = typeof saved === 'string' ? JSON.parse(saved) : saved;
  return { ...defaultContent, ...obj };
}
async function saveContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('O conteúdo precisa ser um objeto JSON.');
  const raw = JSON.stringify(input);
  if (raw.length > 1500000) throw new Error('Conteúdo muito grande (máximo 1,5 MB).');
  const r = redis();
  if (!r) throw new Error('Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN na Vercel para salvar alterações.');
  await r.set('znpvp:site:content', raw);
  return { ok: true, savedAt: new Date().toISOString() };
}
function secret() { return process.env.SESSION_SECRET || process.env.STAFF_PASSWORD || ''; }
function makeToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 4 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function isStaff(req) {
  const key = secret(); if (!key) return false;
  const cookies = String(req.headers.cookie || '').split(';').map(v => v.trim());
  const raw = cookies.find(v => v.startsWith('znpvp_staff='))?.slice('znpvp_staff='.length);
  if (!raw) return false;
  const [payload, sig] = raw.split('.'); if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', key).update(payload).digest('base64url');
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
function setStaffCookie(res) {
  res.setHeader('Set-Cookie', `znpvp_staff=${makeToken()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400`);
}
function clearStaffCookie(res) {
  res.setHeader('Set-Cookie', 'znpvp_staff=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}
function method(req, res, allowed) {
  if (req.method !== allowed) { res.setHeader('Allow', allowed); res.status(405).json({ error: 'Método não permitido.' }); return false; }
  return true;
}
function requireStaff(req, res) {
  if (!isStaff(req)) { res.status(401).json({ error: 'Faça login na Área Staff.' }); return false; }
  return true;
}
module.exports = { defaultContent, getContent, saveContent, redis, isStaff, setStaffCookie, clearStaffCookie, method, requireStaff };
