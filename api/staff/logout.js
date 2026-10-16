const { clearStaffCookie, method } = require('../../lib/vercel-shared');
module.exports = (req, res) => {
  if (!method(req, res, 'POST')) return;
  clearStaffCookie(res); res.status(200).json({ ok: true });
};
