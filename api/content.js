const { getContent, method } = require('../lib/vercel-shared');
module.exports = async (req, res) => {
  if (!method(req, res, 'GET')) return;
  try { res.setHeader('Cache-Control', 'no-store'); res.status(200).json(await getContent()); }
  catch (e) { res.status(500).json({ error: 'Não foi possível carregar o conteúdo do site.' }); }
};
