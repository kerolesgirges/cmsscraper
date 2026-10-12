const fs = require("fs");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

const CMS_HOST = "cms.apps.ischooltech.com";

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

function normalizePageRanges(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value || value === "all") return "";
  if (!/^\d+(?:-\d+)?(?:\s*,\s*\d+(?:-\d+)?)*$/.test(value)) {
    throw new Error("Pages must be 'all', a page such as 2, or ranges such as 1-3,5.");
  }

  const parts = value.split(",").map(part => part.trim());
  for (const part of parts) {
    const [start, end = start] = part.split("-").map(Number);
    if (start < 1 || end < start || end > 1000) {
      throw new Error("PDF page ranges must start at 1, run forwards, and stay within page 1000.");
    }
  }
  return parts.join(",");
}

function localBrowserPath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate));
}

async function browserOptions() {
  const executablePath = localBrowserPath();
  if (executablePath) {
    return {
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    };
  }

  return {
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  };
}

async function createCmsPdf(rawUrl, rawPages) {
  const cmsUrl = validateCmsUrl(rawUrl);
  const pageRanges = normalizePageRanges(rawPages);
  const browser = await puppeteer.launch(await browserOptions());

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await page.goto(cmsUrl.href, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForNetworkIdle({ idleTime: 1500, timeout: 30000 }).catch(() => {});

    const finalUrl = new URL(page.url());
    if (finalUrl.protocol !== "https:" || finalUrl.hostname !== CMS_HOST) {
      throw new Error("CMS redirected to an unsupported host.");
    }

    await page.emulateMediaType("screen");
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const images = Array.from(document.images);
      await Promise.all(images.map(image => {
        if (image.complete) return Promise.resolve();
        return new Promise(resolve => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
          setTimeout(resolve, 10000);
        });
      }));
    });

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      pageRanges: pageRanges || undefined,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });

    return { buffer: Buffer.from(buffer), title: await page.title(), pageRanges };
  } finally {
    await browser.close();
  }
}

module.exports = { createCmsPdf, normalizePageRanges, validateCmsUrl };
