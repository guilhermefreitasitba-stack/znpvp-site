const { put } = require('@vercel/blob');
const { method, requireStaff } = require('../../lib/vercel-shared');
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  if (!requireStaff(req, res)) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Conecte o Vercel Blob e configure BLOB_READ_WRITE_TOKEN para enviar imagens. Você pode usar uma URL HTTPS enquanto isso.' });
  try {
    const { data, mimeType, name } = req.body || {};
    if (!TYPES[mimeType]) return res.status(400).json({ error: 'Formato inválido. Use JPG, PNG, WEBP, GIF ou AVIF.' });
    if (typeof data !== 'string' || !data || data.length > 4_000_000) return res.status(400).json({ error: 'Imagem inválida ou maior que 3 MB.' });
    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'A imagem deve ter no máximo 3 MB.' });
    const safeName = String(name || 'znpvp-image').replace(/[^a-z0-9._-]/gi, '-').slice(0, 80);
    const blob = await put(`${Date.now()}-${safeName}.${TYPES[mimeType]}`, buffer, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, contentType: mimeType, addRandomSuffix: true });
    res.status(200).json({ ok: true, path: blob.url, url: blob.url, filename: safeName, size: buffer.length });
  } catch (e) { res.status(500).json({ error: 'Falha ao enviar imagem. Confira a configuração do Vercel Blob.' }); }
};
module.exports.config = { api: { bodyParser: { sizeLimit: '5mb' } } };
