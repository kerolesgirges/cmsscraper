const CMS_HOST = "cms.apps.ischooltech.com";

module.exports = async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const cmsUrl = validateCmsUrl(req.body && req.body.url);
    const cms = await fetch(cmsUrl.href, {
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (Vercel CMS one-week scraper)"
      }
    });
    const finalUrl = new URL(cms.url);
    if (finalUrl.protocol !== "https:" || finalUrl.hostname !== CMS_HOST) {
      throw new Error("CMS redirected to an unsupported host.");
    }

    const html = await cms.text();
    if (!cms.ok) {
      return res.status(cms.status).json({
        ok: false,
        error: `CMS returned HTTP ${cms.status}.`
      });
    }

    return res.status(200).json({ ok: true, url: cmsUrl.href, html });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
};

function validateCmsUrl(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || "").trim());
  } catch {
    throw new Error("A valid CMS URL is required.");
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== CMS_HOST) {
    throw new Error(`Only https://${CMS_HOST}/ links are allowed.`);
  }
  return parsed;
}
