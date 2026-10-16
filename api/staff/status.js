const { isStaff, method } = require('../../lib/vercel-shared');
module.exports = (req, res) => {
  if (!method(req, res, 'GET')) return;
  res.status(200).json({ authenticated: isStaff(req) });
};
