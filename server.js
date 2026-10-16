'use strict';
require('dotenv').config?.();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const multer = require('multer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'znpvp.sqlite');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads');
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.exec('CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY CHECK (id = 1), content_json TEXT NOT NULL, updated_at TEXT NOT NULL)');
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'], imgSrc: ["'self'", 'https:', 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: null } } }));
app.use(express.json({ limit: '5mb' }));
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-change-this-session-secret');
if (!sessionSecret) { console.error('Defina SESSION_SECRET em produção.'); process.exit(1); }
app.use(session({ name: 'znpvp.sid', secret: sessionSecret, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 4 } }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: false, maxAge: '7d', immutable: true }));

const defaultContent = require('./content-default.json');
function loadContent() { const row = db.prepare('SELECT content_json FROM site_content WHERE id = 1').get(); if (row) { try { return { ...defaultContent, ...JSON.parse(row.content_json) }; } catch (e) { console.error('Conteúdo salvo inválido:', e.message); } } const now = new Date().toISOString(); db.prepare('INSERT OR REPLACE INTO site_content (id, content_json, updated_at) VALUES (1, ?, ?)').run(JSON.stringify(defaultContent), now); return defaultContent; }
function safeContent(input) { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('O conteúdo precisa ser um objeto JSON.'); const raw = JSON.stringify(input); if (raw.length > 1500000) throw new Error('Conteúdo muito grande (máximo 1,5 MB).'); return { input, raw }; }
app.get('/api/content', (req,res) => { res.set('Cache-Control','no-store'); res.json(loadContent()); });
app.get('/api/staff/status', (req,res) => res.json({ authenticated: !!req.session.staff }));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' } });
app.post('/api/staff/login', loginLimiter, async (req,res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || password.length > 256) return res.status(400).json({error:'Informe a senha.'});
  let valid = false;
  try {
    if (process.env.STAFF_PASSWORD_HASH) valid = await bcrypt.compare(password, process.env.STAFF_PASSWORD_HASH);
    else if (process.env.STAFF_PASSWORD) { const a = Buffer.from(password); const b = Buffer.from(process.env.STAFF_PASSWORD); valid = a.length === b.length && crypto.timingSafeEqual(a,b); }
  } catch (_) { valid = false; }
  if (!valid) return res.status(401).json({error:'Senha incorreta.'});
  req.session.regenerate(err => { if (err) return res.status(500).json({error:'Não foi possível iniciar a sessão.'}); req.session.staff = true; req.session.save(e => e ? res.status(500).json({error:'Não foi possível salvar a sessão.'}) : res.json({ok:true})); });
});
app.post('/api/staff/logout', (req,res) => req.session.destroy(() => { res.clearCookie('znpvp.sid', {httpOnly:true, sameSite:'strict', secure:process.env.NODE_ENV === 'production'}); res.json({ok:true}); }));
function requireStaff(req,res,next) { if (!req.session.staff) return res.status(401).json({error:'Faça login na Área Staff.'}); next(); }
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extByMime[file.mimetype] || '.img'}`);
  }
});
const imageUpload = multer({ storage: imageStorage, limits: { fileSize: 8 * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowed.includes(file.mimetype)) return cb(new Error('Envie uma imagem JPG, PNG, WEBP, GIF ou AVIF.'));
  cb(null, true);
} });
app.post('/api/staff/upload', requireStaff, (req, res) => {
  if (req.is('application/json')) {
    try {
      const { data, mimeType, name } = req.body || {};
      const extByMime = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif' };
      if (!extByMime[mimeType] || typeof data !== 'string') return res.status(400).json({ error: 'Formato ou imagem inválida.' });
      const buffer = Buffer.from(data, 'base64');
      if (!buffer.length || buffer.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'A imagem deve ter no máximo 3 MB.' });
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extByMime[mimeType]}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
      return res.json({ ok: true, path: `/uploads/${filename}`, url: `/uploads/${filename}`, filename: String(name || filename), size: buffer.length });
    } catch (e) { return res.status(400).json({ error: 'Não foi possível processar a imagem.' }); }
  }
  imageUpload.single('image')(req, res, err => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 8 MB.' : (err.message || 'Falha ao enviar a imagem.') });
    if (!req.file) return res.status(400).json({ error: 'Escolha uma imagem antes de enviar.' });
    res.json({ ok: true, path: `/uploads/${req.file.filename}`, filename: req.file.originalname, size: req.file.size });
  });
});
app.put('/api/staff/content', requireStaff, (req,res) => { try { const { raw } = safeContent(req.body); const savedAt = new Date().toISOString(); db.prepare('INSERT OR REPLACE INTO site_content (id, content_json, updated_at) VALUES (1, ?, ?)').run(raw, savedAt); res.json({ok:true, savedAt}); } catch(e) { res.status(400).json({error:e.message || 'Não foi possível salvar.'}); } });
app.get('/staff', (req,res) => res.sendFile(path.join(__dirname,'public','staff.html')));
app.get('*', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT, () => console.log(`ZNPvP disponível em http://localhost:${PORT}`));
