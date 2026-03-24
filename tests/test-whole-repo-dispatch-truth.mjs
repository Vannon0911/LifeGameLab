import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { actionSchema } from "../src/game/contracts/actionSchema.js";
import { dataflow } from "../src/game/contracts/dataflow.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const srcRoot = path.join(root, "src");

function toRepoPath(absPath) {
  return path.relative(root, absPath).split(path.sep).join("/");
}

function listSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!full.endsWith(".js") && !full.endsWith(".mjs")) continue;
    out.push(full);
  }
  return out;
}

function extractDispatchActions(fileText) {
  if (!/\b(?:dispatch|_dispatch)\s*\(/.test(fileText)) return [];
  const actions = new Set();
  const re = /(?:_dispatch|dispatch)\s*\(\s*\{[\s\S]{0,1200}?type\s*:\s*["']([A-Z0-9_]+)["']/g;
  let match = re.exec(fileText);
  while (match) {
    actions.add(match[1]);
    match = re.exec(fileText);
  }
  return [...actions];
}

const files = listSourceFiles(srcRoot);
const detectedByFile = new Map();
for (const absPath of files) {
  const text = fs.readFileSync(absPath, "utf8");
  const actions = extractDispatchActions(text);
  if (actions.length === 0) continue;
  detectedByFile.set(toRepoPath(absPath), new Set(actions));
}

const actionsInSchema = new Set(Object.keys(actionSchema));
const declaredByAction = new Map(
  Object.entries(dataflow.actions || {}).map(([action, entry]) => [action, new Set(entry?.dispatchSources || [])]),
);
const declaredByFile = new Map();
for (const [action, sources] of declaredByAction.entries()) {
  for (const source of sources) {
    if (!declaredByFile.has(source)) declaredByFile.set(source, new Set());
    declaredByFile.get(source).add(action);
  }
}

const issues = [];

for (const [action, sources] of declaredByAction.entries()) {
  for (const source of sources) {
    const absSource = path.join(root, source);
    if (!fs.existsSync(absSource)) {
      issues.push(`declared dispatch source missing: ${action} -> ${source}`);
      continue;
    }
    const detected = detectedByFile.get(source);
    if (!detected || !detected.has(action)) {
      issues.push(`declared dispatch source stale: ${action} not found in ${source}`);
    }
  }
}

for (const [file, actions] of detectedByFile.entries()) {
  for (const action of actions) {
    if (!actionsInSchema.has(action)) {
      issues.push(`dispatched action not in actionSchema: ${action} in ${file}`);
      continue;
    }
    const declaredSources = declaredByAction.get(action) || new Set();
    if (!declaredSources.has(file)) {
      issues.push(`undocumented dispatch source: ${action} in ${file} (missing from dataflow.dispatchSources)`);
    }
  }
}

assert.equal(issues.length, 0, `whole-repo dispatch truth drift:\n- ${issues.join("\n- ")}`);

console.log(`WHOLE_REPO_DISPATCH_TRUTH_OK files=${detectedByFile.size} actions=${actionsInSchema.size}`);
