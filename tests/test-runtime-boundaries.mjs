import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function collectJsFiles(relDir) {
  const absDir = path.join(root, relDir);
  const out = [];

  function walk(absPath) {
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absPath)) {
        walk(path.join(absPath, entry));
      }
      return;
    }
    if (/\.(mjs|js)$/.test(absPath)) {
      out.push(path.relative(root, absPath).split(path.sep).join("/"));
    }
  }

  if (fs.existsSync(absDir)) walk(absDir);
  return out.sort();
}

const runtimeFiles = [
  ...collectJsFiles("src/app"),
  ...collectJsFiles("src/game"),
];

const kernelFiles = collectJsFiles("src/kernel");

const runtimeForbidden = [
  "/src/project/",
  "../project/",
  "/tools/llm/",
  "../tools/llm/",
  "/src/core/",
  "../core/",
  "/.llm/",
];

for (const relPath of runtimeFiles) {
  const text = fs.readFileSync(path.join(root, relPath), "utf8");
  for (const needle of runtimeForbidden) {
    assert.equal(
      text.includes(needle),
      false,
      `${relPath} must not reference forbidden runtime boundary '${needle}'`,
    );
  }
}

for (const relPath of kernelFiles) {
  const text = fs.readFileSync(path.join(root, relPath), "utf8");
  assert.equal(
    text.includes("/src/core/") || text.includes("../core/"),
    false,
    `${relPath} must not depend on core facade paths`,
  );
}

assert.equal(fs.existsSync(path.join(root, "src", "project")), false, "src/project must be removed after canonical game migration");
assert.equal(fs.existsSync(path.join(root, "src", "core")), false, "src/core must be removed after canonical kernel migration");

console.log(`RUNTIME_BOUNDARIES_OK runtime=${runtimeFiles.length} kernel=${kernelFiles.length}`);
