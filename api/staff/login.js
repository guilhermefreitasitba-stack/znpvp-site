const crypto = require('node:crypto');
const { redis, setStaffCookie, method } = require('../../lib/vercel-shared');
module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || password.length > 256) return res.status(400).json({ error: 'Informe a senha.' });
  if (!process.env.STAFF_PASSWORD || !process.env.SESSION_SECRET) return res.status(503).json({ error: 'Configure STAFF_PASSWORD e SESSION_SECRET nas variáveis da Vercel.' });
  try {
    const r = redis();
    if (r) {
      const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim().slice(0, 80);
      const key = `znpvp:login:${crypto.createHash('sha256').update(ip).digest('hex')}`;
      const attempts = await r.incr(key); if (attempts === 1) await r.expire(key, 900);
      if (attempts > 8) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
    }
  } catch { /* login continua seguro pela senha; limitação fica indisponível se Redis falhar */ }
  const a = Buffer.from(password); const b = Buffer.from(process.env.STAFF_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Senha incorreta.' });
  setStaffCookie(res); res.status(200).json({ ok: true });
};
