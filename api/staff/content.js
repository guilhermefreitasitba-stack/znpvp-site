const { saveContent, method, requireStaff } = require('../../lib/vercel-shared');
module.exports = async (req, res) => {
  if (!method(req, res, 'PUT')) return;
  if (!requireStaff(req, res)) return;
  try { res.status(200).json(await saveContent(req.body)); }
  catch (e) { res.status(400).json({ error: e.message || 'Não foi possível salvar.' }); }
};
