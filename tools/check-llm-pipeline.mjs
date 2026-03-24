import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const pipelinePath = path.join(root, "docs", "llm", "DEV8_PIPELINE.json");
const matrixPath = path.join(root, "docs", "llm", "TASK_ENTRY_MATRIX.json");
const statusPath = path.join(root, "docs", "STATUS.md");
const stateSchemaPath = path.join(root, "src", "game", "contracts", "stateSchema.js");
const simGatePath = path.join(root, "src", "game", "contracts", "simGate.js");

function fail(message) {
  console.error(`[llm-pipeline-check] FAIL ${message}`);
  process.exit(1);
}

function readJson(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch (err) {
    fail(`Cannot read JSON ${path.relative(root, absPath)}: ${err.message}`);
  }
}

function readText(absPath) {
  try {
    return fs.readFileSync(absPath, "utf8");
  } catch (err) {
    fail(`Cannot read file ${path.relative(root, absPath)}: ${err.message}`);
  }
}

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) fail(`Duplicate ${label}: ${item}`);
    seen.add(item);
  }
}

function checkPipelineShape(pipeline) {
  const layers = Array.isArray(pipeline.layers) ? pipeline.layers : fail("layers must be an array");
  if (layers.length !== 3) fail(`Expected exactly 3 layers, got ${layers.length}`);
  const layerIds = layers.map((l) => String(l.id || "").trim());
  assertUnique(layerIds, "layer id");
  const requiredLayers = ["kernel", "gameplay", "llm_ops"];
  for (const id of requiredLayers) {
    if (!layerIds.includes(id)) fail(`Missing required layer: ${id}`);
  }

  const roles = Array.isArray(pipeline.roles) ? pipeline.roles : fail("roles must be an array");
  if (roles.length !== 8) fail(`Expected exactly 8 roles, got ${roles.length}`);
  const roleIds = roles.map((r) => String(r.id || "").trim());
  assertUnique(roleIds, "role id");

  const ownedScopeToRole = new Map();
  for (const role of roles) {
    const roleId = String(role.id || "").trim();
    const layer = String(role.layer || "").trim();
    if (!layerIds.includes(layer)) fail(`Role ${roleId} references unknown layer '${layer}'`);
    const owned = Array.isArray(role.ownedScopes) ? role.ownedScopes : [];
    for (const scope of owned) {
      const key = String(scope || "").trim();
      if (!key) continue;
      if (ownedScopeToRole.has(key)) {
        fail(`Owned scope collision '${key}' between ${ownedScopeToRole.get(key)} and ${roleId}`);
      }
      ownedScopeToRole.set(key, roleId);
    }
  }

  const handoffOrder = Array.isArray(pipeline.handoffOrder) ? pipeline.handoffOrder : fail("handoffOrder must be an array");
  if (handoffOrder.length !== 8) fail(`handoffOrder must contain 8 role ids, got ${handoffOrder.length}`);
  for (const roleId of handoffOrder) {
    if (!roleIds.includes(roleId)) fail(`handoffOrder contains unknown role: ${roleId}`);
  }
  assertUnique(handoffOrder, "handoffOrder role");

  const readOrder = Array.isArray(pipeline.readOrder) ? pipeline.readOrder : fail("readOrder must be an array");
  assertUnique(readOrder, "readOrder path");
  for (const relPath of readOrder) {
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) fail(`readOrder path does not exist: ${relPath}`);
  }
}

function checkTaskMatrix(matrix) {
  if (Object.prototype.hasOwnProperty.call(matrix, "sim")) {
    fail("TASK_ENTRY_MATRIX.json still contains deprecated scope 'sim'. Use 'gameplay'.");
  }
  if (!Object.prototype.hasOwnProperty.call(matrix, "gameplay")) {
    fail("TASK_ENTRY_MATRIX.json missing required scope 'gameplay'.");
  }
  for (const [scope, cfg] of Object.entries(matrix)) {
    const requiredEntry = String(cfg?.requiredEntry || "").trim();
    if (!requiredEntry) fail(`Scope '${scope}' has empty requiredEntry.`);
    const abs = path.join(root, requiredEntry);
    if (!fs.existsSync(abs)) fail(`Scope '${scope}' requiredEntry missing: ${requiredEntry}`);
  }
}

function checkStatusContradictions() {
  const status = readText(statusPath);
  const stateSchema = readText(stateSchemaPath);
  const simGate = readText(simGatePath);
  const claimsRemovedPattern =
    status.includes("no longer carry `patternCatalog` or `patternBonuses`") ||
    status.includes("no longer carry patternCatalog or patternBonuses");

  if (claimsRemovedPattern) {
    const stillPresent =
      stateSchema.includes("patternCatalog") ||
      stateSchema.includes("patternBonuses") ||
      simGate.includes("patternCatalog") ||
      simGate.includes("patternBonuses");
    if (stillPresent) {
      fail("STATUS contradicts contracts: claims patternCatalog/patternBonuses removed, but symbols still exist.");
    }
  }
}

function checkDeterminism() {
  const scanRoots = [
    path.join(root, "src", "kernel"),
    path.join(root, "src", "game", "contracts"),
    path.join(root, "src", "game", "manifest.js"),
    path.join(root, "tools", "llm"),
  ];
  const banned = [/Math\.random\s*\(/, /Date\.now\s*\(/];
  const violations = [];

  function walk(p) {
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      if (!p.endsWith(".js") && !p.endsWith(".mjs")) return;
      const rel = path.relative(root, p).split(path.sep).join("/");
      const text = readText(p);
      for (const re of banned) {
        if (re.test(text)) violations.push(`${rel} matches ${re}`);
      }
      return;
    }
    for (const name of fs.readdirSync(p)) {
      walk(path.join(p, name));
    }
  }

  for (const sr of scanRoots) {
    if (!fs.existsSync(sr)) continue;
    walk(sr);
  }

  if (violations.length) {
    fail(`Determinism violation(s): ${violations.join("; ")}`);
  }
}

function checkWholeRepoDispatchTruth() {
  const testPath = path.join(root, "tests", "test-whole-repo-dispatch-truth.mjs");
  const res = spawnSync(process.execPath, [testPath], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) fail(`whole-repo dispatch truth check failed to run: ${res.error.message}`);
  if (res.status !== 0) fail("whole-repo dispatch truth check failed");
}

const pipeline = readJson(pipelinePath);
const matrix = readJson(matrixPath);

checkPipelineShape(pipeline);
checkTaskMatrix(matrix);
checkStatusContradictions();
checkDeterminism();
checkWholeRepoDispatchTruth();

console.log("[llm-pipeline-check] OK layers=3 roles=8 deterministic-kernel=true contradictions=none");
