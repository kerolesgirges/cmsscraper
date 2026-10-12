const { contentDisposition, createCmsPdf, pdfFilename } = require("../lib/cms-pdf");
const { streamBuffer } = require("../lib/stream-response");

module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const input = req.method === "GET" ? req.query : req.body;
    const result = await createCmsPdf(input && input.url, input && input.pages);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", contentDisposition(pdfFilename(result.title)));
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
