import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const ROOT = process.cwd();

function fail(msg) {
  console.error(`DEBUG_UI_FAIL: ${msg}`);
  process.exit(1);
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function existsRel(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function extractAttrValues(html, tag, attr) {
  const out = [];
  const re = new RegExp(`<${tag}[^>]*\\s${attr}\\s*=\\s*["']([^"']+)["'][^>]*>`, "gi");
  for (const m of html.matchAll(re)) out.push(String(m[1] || "").trim());
  return out;
}

function normalizeRef(ref) {
  const s = String(ref || "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  return s;
}

function toRelPath(ref) {
  const s = normalizeRef(ref);
  if (!s || s.startsWith("http") || s.startsWith("data:")) return "";
  const noQuery = s.split("?")[0].split("#")[0];
  const trimmed = noQuery.startsWith("./") ? noQuery.slice(2) : noQuery.startsWith("/") ? noQuery.slice(1) : noQuery;
  return trimmed;
}

function sniffClassicScriptWouldBreak(relJs) {
  try {
    const text = readText(relJs);
    return /\bimport\s+|\bexport\s+/.test(text);
  } catch {
    return false;
  }
}

function mimeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function serveStatic(req, res) {
  const urlPath = String(req.url || "/").split("?")[0].split("#")[0];
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
  const abs = path.join(ROOT, rel);

  if (!abs.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": mimeFor(abs) });
  fs.createReadStream(abs).pipe(res);
}

async function httpCheck(assetRefs) {
  const server = http.createServer(serveStatic);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;

  const targets = ["index.html", ...assetRefs.map(toRelPath).filter(Boolean)];
  const unique = [...new Set(targets)];

  const results = [];
  for (const rel of unique) {
    const url = `${base}/${rel}`;
    try {
      const r = await fetch(url, { redirect: "manual" });
      results.push({ rel, status: r.status });
    } catch (err) {
      results.push({ rel, status: -1, error: String(err?.message || err) });
    }
  }

  server.close();
  return results;
}

function main() {
  if (!existsRel("index.html")) fail("index.html fehlt im Projekt-Root.");
  const html = readText("index.html");

  const scriptSrc = extractAttrValues(html, "script", "src").map(normalizeRef);
  const linkHref = extractAttrValues(html, "link", "href").map(normalizeRef);
  const assets = [...new Set([...scriptSrc, ...linkHref])];

  console.log("DEBUG_UI_INDEX_ASSETS");
  for (const ref of assets) {
    const rel = toRelPath(ref);
    if (!rel) {
      console.log(`- external: ${ref}`);
      continue;
    }
    const ok = existsRel(rel);
    console.log(`- ${ok ? "OK" : "MISSING"} ${rel}`);
  }

  if (assets.some((a) => toRelPath(a) === "app.bundle.js") && !existsRel("app.bundle.js")) {
    console.log("DEBUG_UI_HINT missing app.bundle.js: use a module entry (e.g. <script type=\"module\" src=\"./src/app/main.js\">) or add a bundling step.");
  }

  const classicScripts = [];
  const reScriptTag = /<script([^>]*)>/gi;
  for (const m of html.matchAll(reScriptTag)) {
    const attrs = String(m[1] || "");
    const srcMatch = attrs.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = normalizeRef(srcMatch[1]);
    const rel = toRelPath(src);
    if (!rel) continue;
    const hasTypeModule = /\stype\s*=\s*["']module["']/i.test(attrs);
    if (!hasTypeModule) classicScripts.push(rel);
  }
  for (const rel of classicScripts) {
    if (sniffClassicScriptWouldBreak(rel)) {
      console.log(`DEBUG_UI_HINT ${rel} contains ESM (import/export) but is not loaded as type=\"module\".`);
    }
  }

  return assets;
}

const assets = main();
const results = await httpCheck(assets);
console.log("DEBUG_UI_HTTP_CHECK");
for (const r of results) {
  if (r.status >= 200 && r.status < 400) console.log(`- OK ${r.rel} (${r.status})`);
  else console.log(`- FAIL ${r.rel} (${r.status})${r.error ? ` ${r.error}` : ""}`);
}
