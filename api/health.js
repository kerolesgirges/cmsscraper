module.exports = function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).json({ ok: true });
};
