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
  "docs/00_governance/",
];

const expectedMissing = [
  "src/main.js",
  "reports/BUG_REPORT_MVP.md",
  "GEMINI.md",
];

const expectedEmptyOrMissingDirs = [
  "src/kernel",
  "src/runtime",
  "src/sim",
  "src/render",
  "src/ui",
  "reports",
  "docs/00_governance",
  "docs/01_source_plans",
];

for (const relPath of expectedMissing) {
  if (fs.existsSync(path.join(root, relPath))) {
    fail(`${relPath} should have been removed`);
  }
}

for (const relPath of expectedEmptyOrMissingDirs) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) continue;
  const remaining = walk(relPath);
  if (remaining.length > 0) {
    fail(`${relPath} should not contain files anymore`);
  }
}

const offenders = [];
for (const relPath of activeRoots.flatMap((p) => walk(p))) {
  if (relPath === path.join("tests", "test-path-hygiene.mjs")) continue;
  const text = fs.readFileSync(path.join(root, relPath), "utf8");
  for (const marker of forbiddenMarkers) {
    if (text.includes(marker)) offenders.push(`${relPath} -> ${marker}`);
  }
}

if (offenders.length) {
  fail(`forbidden wrapper references found:\n${offenders.join("\n")}`);
}

console.log("PATH_HYGIENE_OK canonical paths only");
