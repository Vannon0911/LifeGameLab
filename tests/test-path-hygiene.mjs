import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-path-hygiene.mjs");
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");

function fail(msg) {
  console.error(`PATH_HYGIENE_FAIL: ${msg}`);
  process.exit(1);
}

function walk(relPath, out = []) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) return out;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    out.push(relPath);
    return out;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = path.join(relPath, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else out.push(child);
  }
  return out;
}

function isTextFile(relPath) {
  const lower = String(relPath || "").toLowerCase();
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) return false;
  if (lower.endsWith(".gif") || lower.endsWith(".ico") || lower.endsWith(".pdf") || lower.endsWith(".zip")) return false;
  const textExt = [
    ".js", ".mjs", ".ts", ".tsx", ".json", ".md", ".txt",
    ".html", ".css", ".svg", ".yml", ".yaml",
  ];
  if (textExt.some((ext) => lower.endsWith(ext))) return true;
  const base = path.basename(lower);
  return base === ".gitignore";
}

const activeRoots = [
  "README.md",
  "MANDATORY_READING.md",
  "index.html",
  "src",
  "tests",
  "tools",
  "docs",
];

const forbiddenMarkers = [
  "src/kernel/",
  "src/runtime/",
  "src/sim/",
  "src/render/",
  "src/ui/",
  "src/main.js",
  "reports/",
  "LifeGameLab/",
  "docs/00_governance/",
];

const expectedMissing = [
  "src/main.js",
  "reports/BUG_REPORT_MVP.md",
  "GEMINI.md",
  "src/kernel",
  "src/runtime",
  "src/sim",
  "src/render",
  "src/ui",
  "reports",
  "docs/00_governance",
  "docs/01_source_plans",
  "LifeGameLab",
];

for (const relPath of expectedMissing) {
  if (fs.existsSync(path.join(root, relPath))) {
    fail(`${relPath} should have been removed`);
  }
}

const offenders = [];
for (const relPath of activeRoots.flatMap((p) => walk(p))) {
  if (relPath === path.join("tests", "test-path-hygiene.mjs")) continue;
  if (!isTextFile(relPath)) continue;
  const text = fs.readFileSync(path.join(root, relPath), "utf8");
  for (const marker of forbiddenMarkers) {
    if (text.includes(marker)) offenders.push(`${relPath} -> ${marker}`);
  }
}

if (offenders.length) {
  fail(`forbidden wrapper references found:\n${offenders.join("\n")}`);
}

console.log("PATH_HYGIENE_OK canonical paths only");
