const { createCmsPdf } = require("../lib/cms-pdf");
const { streamBuffer } = require("../lib/stream-response");

module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const result = await createCmsPdf(req.body && req.body.url, req.body && req.body.pages);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"cms-page.pdf\"");
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200);
    await streamBuffer(res, result.buffer);
    return;
  } catch (error) {
    console.error("CMS PDF export failed", error);
    return res.status(500).json({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
};
