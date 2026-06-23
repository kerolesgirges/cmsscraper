const fs = require("fs");
const http = require("http");
const path = require("path");

const CMS_HOST = "cms.apps.ischooltech.com";
const PORT = Number(process.env.PORT || 10000);
const INDEX_PATH = path.join(__dirname, "index.html");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return send(res, 200, fs.readFileSync(INDEX_PATH), "text/html; charset=utf-8");
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/one-week-scrape") {
      const body = await readJson(req);
      const cmsUrl = validateCmsUrl(body.url);
      const cms = await fetch(cmsUrl.href, {
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (Render CMS one-week scraper)"
        }
      });
      const html = await cms.text();
      if (!cms.ok) {
        return json(res, cms.status, { ok: false, error: `CMS returned HTTP ${cms.status}.` });
      }
      return json(res, 200, { ok: true, url: cmsUrl.href, html });
    }

    return json(res, 404, { ok: false, error: "Not found." });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
});

server.listen(PORT, () => {
  console.log(`One Week CMS Scraper running on port ${PORT}`);
});

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

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function json(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), "application/json; charset=utf-8");
}

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}
