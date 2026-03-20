import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const lockPath = path.join(root, "docs", "llm", "entry", "LLM_ENTRY_LOCK.json");
const matrixPath = path.join(root, "docs", "llm", "TASK_ENTRY_MATRIX.json");
const ackPath = path.join(root, ".llm", "entry-ack.json");
const sessionPath = path.join(root, ".llm", "entry-session.json");
const proofDir = path.join(root, ".llm", "entry-proof");
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function fail(message) {
  console.error(`[llm-preflight] ${message}`);
  process.exit(1);
}

function readJson(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch (err) {
    fail(`Cannot read JSON '${path.relative(root, absPath)}': ${err.message}`);
  }
}

function sha256File(absPath) {
  const payload = fs.readFileSync(absPath);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
}

function readOrderCount(absPath) {
  const text = fs.readFileSync(absPath, "utf8");
  return text
    .split(/\r?\n/g)
    .filter((line) => /^\d+\.\s+`.+`/.test(line.trim())).length;
}

function updateEntryLock(lock) {
  const configuredPath = normalizeComparablePath(lock?.entryPath || "");
  const entryPathRel = configuredPath || "docs/llm/ENTRY.md";
  const entryAbs = path.join(root, entryPathRel);
  if (!fs.existsSync(entryAbs)) {
    fail(`Cannot update lock. Entry file missing: ${entryPathRel}`);
  }
  const next = {
    entryPath: entryPathRel,
    sha256: sha256File(entryAbs),
    requiredReadOrderCount: readOrderCount(entryAbs),
  };
  if (!Number.isFinite(next.requiredReadOrderCount) || next.requiredReadOrderCount <= 0) {
    fail(`Cannot update lock. Invalid read-order count for: ${entryPathRel}`);
  }
  fs.writeFileSync(lockPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(
    `[llm-preflight] UPDATE_LOCK_OK entry=${next.entryPath} sha256=${next.sha256} readOrder=${next.requiredReadOrderCount}`,
  );
}

function normalizeComparablePath(inputPath) {
  return String(inputPath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function normalizeRelPath(inputPath) {
  const raw = String(inputPath || "").trim();
  if (!raw) return "";
  const abs = path.isAbsolute(raw) ? raw : path.join(root, raw);
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..")) {
    fail(`Path outside repository is not allowed: ${raw}`);
  }
  return normalizeComparablePath(rel);
}

function parsePaths(args) {
  const ix = args.indexOf("--paths");
  if (ix < 0) return [];
  const raw = String(args[ix + 1] || "").trim();
  if (!raw) fail("Flag '--paths' requires comma-separated paths.");
  const values = raw
    .split(",")
    .map((v) => normalizeRelPath(v))
    .filter(Boolean);
  if (!values.length) fail("No valid paths resolved from '--paths'.");
  return values;
}

function parseModeFlag(args) {
  const modeFlag = args.indexOf("--mode");
  const raw = modeFlag >= 0 ? String(args[modeFlag + 1] || "").trim().toLowerCase() : "work";
  const mode = raw || "work";
  if (!["work", "security"].includes(mode)) {
    fail(`Unknown mode '${mode}'. Use --mode work|security`);
  }
  return mode;
}

function parseScopeFlag(args) {
  const ix = args.indexOf("--task-scope") >= 0 ? args.indexOf("--task-scope") : args.indexOf("--task");
  if (ix < 0) return [];
  const raw = String(args[ix + 1] || "").trim();
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => String(s || "").trim()).filter(Boolean))].sort();
}

function matchesPrefix(relPath, rawPrefix) {
  const normalizedPath = normalizeComparablePath(relPath);
  const prefix = normalizeComparablePath(rawPrefix);
  if (!prefix) return false;
  if (prefix.includes("*")) {
    const escaped = prefix.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(normalizedPath);
  }
  return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
}

function expandScopeDependencies(seedScopes, matrix) {
  const out = new Set(seedScopes);
  const queue = [...seedScopes];
  while (queue.length) {
    const scope = queue.shift();
    const deps = Array.isArray(matrix?.[scope]?.dependsOn) ? matrix[scope].dependsOn : [];
    for (const dep of deps) {
      const key = String(dep || "").trim();
      if (!key) continue;
      if (!Object.prototype.hasOwnProperty.call(matrix, key)) {
        fail(`Unknown dependent scope '${key}' referenced by '${scope}'.`);
      }
      if (!out.has(key)) {
        out.add(key);
        queue.push(key);
      }
    }
  }
  return [...out].sort();
}

function classifyScopeByPaths(paths, matrix) {
  const direct = new Set();
  for (const relPath of paths) {
    for (const [scope, cfg] of Object.entries(matrix)) {
      const prefixes = Array.isArray(cfg?.triggerPrefixes) ? cfg.triggerPrefixes : [];
      if (prefixes.some((prefix) => matchesPrefix(relPath, prefix))) {
        direct.add(scope);
      }
    }
  }
  if (!direct.size) {
    fail(`No task classification match for paths: ${paths.join(", ")}`);
  }
  return expandScopeDependencies([...direct], matrix);
}

function normalizeScopeList(scopeList, matrix) {
  const valid = new Set(Object.keys(matrix));
  const out = [];
  for (const scope of scopeList) {
    const key = String(scope || "").trim();
    if (!key) continue;
    if (!valid.has(key)) {
      fail(
        `Unknown scope '${key}'. Allowed: ${Object.keys(matrix)
          .sort()
          .join(", ")}`,
      );
    }
    out.push(key);
  }
  return [...new Set(out)].sort();
}

function resolveTaskContext(args, matrix, options = {}) {
  const requirePaths = Boolean(options.requirePaths);
  const paths = parsePaths(args);
  if (requirePaths && !paths.length) {
    fail("Task classification requires '--paths <comma-separated-paths>'.");
  }
  const cliScope = normalizeScopeList(parseScopeFlag(args), matrix);
  const classifiedScope = paths.length ? classifyScopeByPaths(paths, matrix) : [];
  const taskScope = expandScopeDependencies([...new Set([...cliScope, ...classifiedScope])], matrix);
  if (!taskScope.length) {
    fail("Task classification required. Use '--paths <...>' or '--task-scope <...>'.");
  }
  return {
    taskScope,
    scopeKey: taskScope.join("+"),
    paths,
  };
}

function validateEntryLock(lock) {
  const entryPath = path.join(root, lock.entryPath || "");
  if (!lock?.entryPath || !fs.existsSync(entryPath)) {
    fail("Entry lock references a missing entry document.");
  }
  const currentHash = sha256File(entryPath);
  if (String(lock.sha256 || "") !== currentHash) {
    fail("Entry hash drift. Update docs/llm/entry/LLM_ENTRY_LOCK.json first.");
  }
  const expectedCount = Number(lock.requiredReadOrderCount || 0);
  const actualCount = readOrderCount(entryPath);
  if (!Number.isFinite(expectedCount) || expectedCount <= 0) {
    fail("requiredReadOrderCount missing/invalid in lock.");
  }
  if (actualCount !== expectedCount) {
    fail(`Read-order drift: lock=${expectedCount} current=${actualCount}. Update lock after intentional edits.`);
  }
  return { entryPath: lock.entryPath, sha256: currentHash };
}

function validateEntryLockAudit(lock) {
  const warnings = [];
  try {
    const entryPath = path.join(root, lock.entryPath || "");
    if (!lock?.entryPath || !fs.existsSync(entryPath)) {
      warnings.push("Entry lock references a missing entry document.");
      return { warnings, entryRef: null };
    }
    const currentHash = sha256File(entryPath);
    if (String(lock.sha256 || "") !== currentHash) {
      warnings.push("Entry hash drift.");
    }
    const expectedCount = Number(lock.requiredReadOrderCount || 0);
    const actualCount = readOrderCount(entryPath);
    if (!Number.isFinite(expectedCount) || expectedCount <= 0) {
      warnings.push("requiredReadOrderCount missing/invalid.");
    } else if (actualCount !== expectedCount) {
      warnings.push(`Read-order drift lock=${expectedCount} current=${actualCount}.`);
    }
    return { warnings, entryRef: { entryPath: lock.entryPath, sha256: currentHash } };
  } catch (err) {
    warnings.push(`Entry lock audit failed: ${err.message}`);
    return { warnings, entryRef: null };
  }
}

function ensureTaskEntries(matrix, taskScope) {
  const requiredEntries = {};
  for (const scope of taskScope) {
    const requiredEntry = String(matrix[scope]?.requiredEntry || "");
    const abs = path.join(root, requiredEntry);
    if (!requiredEntry || !fs.existsSync(abs)) {
      fail(`Task entry missing for '${scope}': ${requiredEntry || "<empty>"}`);
    }
    requiredEntries[scope] = {
      requiredEntry,
      requiredEntrySha256: sha256File(abs),
    };
  }
  return requiredEntries;
}

function ensureProofDir() {
  fs.mkdirSync(proofDir, { recursive: true });
}

function relativize(absPath) {
  return path.relative(root, absPath).split(path.sep).join("/");
}

function taskEntryHashes(requiredEntries) {
  return Object.fromEntries(
    Object.entries(requiredEntries).map(([scope, ref]) => [scope, ref.requiredEntrySha256]),
  );
}

function buildProofMaterial(entryRef, taskCtx, requiredEntries, mode, nonce) {
  const entryText = fs.readFileSync(path.join(root, entryRef.entryPath), "utf8");
  const chunks = [
    `entryPath=${entryRef.entryPath}`,
    `entrySha256=${entryRef.sha256}`,
    `taskScope=${taskCtx.taskScope.join("|")}`,
    `mode=${mode}`,
    `classifiedPaths=${taskCtx.paths.slice().sort().join("|")}`,
    `requiredEntryHashes=${JSON.stringify(taskEntryHashes(requiredEntries))}`,
    `nonce=${nonce}`,
    entryText,
  ];
  for (const scope of taskCtx.taskScope) {
    const ref = requiredEntries[scope];
    const text = fs.readFileSync(path.join(root, ref.requiredEntry), "utf8");
    chunks.push(`${scope}:${ref.requiredEntry}:${ref.requiredEntrySha256}`);
    chunks.push(text);
  }
  return chunks.join("\n---\n");
}

function writeProofChallenge(entryRef, taskCtx, requiredEntries, mode, previousFile = "") {
  ensureProofDir();
  const nonce = crypto.randomBytes(32).toString("hex");
  const challengeId = crypto.randomBytes(12).toString("hex");
  const abs = path.join(proofDir, `${challengeId}.json`);
  const rel = relativize(abs);
  const payload = {
    challengeId,
    nonce,
    taskScope: taskCtx.taskScope,
    scopeKey: taskCtx.scopeKey,
    mode,
    entryPath: entryRef.entryPath,
    entrySha256: entryRef.sha256,
    requiredEntries,
    classifiedPaths: taskCtx.paths,
    previousFile,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(abs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return {
    challengeId,
    challengeFile: rel,
    proofHash: sha256Text(buildProofMaterial(entryRef, taskCtx, requiredEntries, mode, nonce)),
  };
}

function sameSet(left, right) {
  const a = Array.isArray(left) ? [...left].sort() : [];
  const b = Array.isArray(right) ? [...right].sort() : [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sameEntryHashes(left, right) {
  const a = left && typeof left === "object" ? Object.keys(left).sort() : [];
  const b = right && typeof right === "object" ? Object.keys(right).sort() : [];
  if (!sameSet(a, b)) return false;
  for (const key of a) {
    const leftHash = String(left[key]?.requiredEntrySha256 || "");
    const rightHash = String(right[key]?.requiredEntrySha256 || "");
    if (leftHash !== rightHash) return false;
  }
  return true;
}

function readSessionOrFail(entryRef, taskCtx, requiredEntries, options = {}) {
  const autoReclassify = Boolean(options.autoReclassify);
  if (!fs.existsSync(sessionPath)) {
    fail(`Missing session entry. Run: node tools/llm-preflight.mjs entry --paths ${taskCtx.paths.join(",")} --mode work`);
  }
  const session = readJson(sessionPath);
  if (session.entryPath !== entryRef.entryPath || session.sha256 !== entryRef.sha256) {
    fail("Session entry invalid due to entry hash/path mismatch. Re-run entry.");
  }
  const startedAtMs = Date.parse(String(session.startedAt || ""));
  if (!Number.isFinite(startedAtMs)) {
    fail("Session startedAt missing/invalid. Re-run entry.");
  }
  if (Date.now() - startedAtMs > SESSION_MAX_AGE_MS) {
    fail("Session entry expired (>12h). Re-run entry.");
  }

  const scopeDrift = !sameSet(session.taskScope, taskCtx.taskScope);
  const pathDrift = !sameSet(session.classifiedPaths, taskCtx.paths);
  const entryDrift = !sameEntryHashes(session.requiredEntries, requiredEntries);

  if (scopeDrift || pathDrift || entryDrift) {
    if (!autoReclassify) {
      fail("Session scope/path drift detected. Re-run entry.");
    }
    const mode = String(session.mode || "work");
    const challenge = writeProofChallenge(entryRef, taskCtx, requiredEntries, mode, String(session.challengeFile || ""));
    const updated = {
      entryPath: entryRef.entryPath,
      sha256: entryRef.sha256,
      taskScope: taskCtx.taskScope,
      scopeKey: taskCtx.scopeKey,
      mode,
      requiredEntries,
      classifiedPaths: taskCtx.paths,
      challengeId: challenge.challengeId,
      challengeFile: challenge.challengeFile,
      startedAt: new Date().toISOString(),
      autoReclassifiedAt: new Date().toISOString(),
    };
    fs.writeFileSync(sessionPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
    console.warn(`[llm-preflight] AUTO_RECLASSIFY scope=${taskCtx.scopeKey} paths=${taskCtx.paths.join(",")}`);
    return updated;
  }

  if (!session.challengeId || !session.challengeFile) {
    fail("Session proof challenge missing. Re-run entry.");
  }
  return session;
}

function readChallengeOrFail(session, entryRef, taskCtx, requiredEntries) {
  const rel = String(session.challengeFile || "").trim();
  if (!rel) fail("Session missing challenge file. Re-run entry.");
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail("Challenge file missing. Re-run entry.");
  const challenge = readJson(abs);
  if (!sameSet(challenge.taskScope, taskCtx.taskScope)) fail("Challenge scope drift. Re-run entry.");
  if (challenge.mode !== session.mode) fail("Challenge mode drift. Re-run entry.");
  if (challenge.entryPath !== entryRef.entryPath || challenge.entrySha256 !== entryRef.sha256) {
    fail("Challenge entry drift. Re-run entry.");
  }
  if (!sameEntryHashes(challenge.requiredEntries, requiredEntries)) {
    fail("Challenge entry-hash drift. Re-run entry.");
  }
  if (!sameSet(challenge.classifiedPaths, taskCtx.paths)) {
    fail("Challenge path drift. Re-run entry.");
  }
  return {
    rel,
    abs,
    payload: challenge,
    expectedProofHash: sha256Text(buildProofMaterial(entryRef, taskCtx, requiredEntries, session.mode, challenge.nonce)),
  };
}

function readAckOrInit(entryRef) {
  let ack = {
    entryPath: entryRef.entryPath,
    sha256: entryRef.sha256,
    ackedAt: null,
    scopes: {},
  };
  if (fs.existsSync(ackPath)) {
    const loaded = readJson(ackPath);
    ack = {
      ...ack,
      ...loaded,
      scopes: loaded.scopes && typeof loaded.scopes === "object" ? loaded.scopes : {},
    };
  }
  if (!ack.tasks || typeof ack.tasks !== "object") ack.tasks = {};
  return ack;
}

function upsertAckScope(ack, taskCtx, requiredEntries, session, challenge, nowIsoText) {
  const payload = {
    taskScope: taskCtx.taskScope,
    scopeKey: taskCtx.scopeKey,
    requiredEntries,
    proofHash: challenge.expectedProofHash,
    challengeId: challenge.payload.challengeId,
    challengeFile: challenge.rel,
    ackedAt: nowIsoText,
    mode: session.mode,
    classifiedPaths: taskCtx.paths,
  };
  ack.scopes[taskCtx.scopeKey] = payload;
  ack.tasks[taskCtx.scopeKey] = payload;
}

function doEntry(taskCtx, entryRef, requiredEntries, mode) {
  const dir = path.dirname(sessionPath);
  fs.mkdirSync(dir, { recursive: true });
  const challenge = writeProofChallenge(entryRef, taskCtx, requiredEntries, mode);
  const now = new Date().toISOString();
  const payload = {
    entryPath: entryRef.entryPath,
    sha256: entryRef.sha256,
    taskScope: taskCtx.taskScope,
    scopeKey: taskCtx.scopeKey,
    mode,
    requiredEntries,
    classifiedPaths: taskCtx.paths,
    challengeId: challenge.challengeId,
    challengeFile: challenge.challengeFile,
    startedAt: now,
  };
  fs.writeFileSync(sessionPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(
    `[llm-preflight] ENTRY_OK scope=${taskCtx.scopeKey} mode=${mode} entries=${taskCtx.taskScope.length} proof=${challenge.challengeId}`,
  );
}

function doAck(taskCtx, entryRef, requiredEntries) {
  const session = readSessionOrFail(entryRef, taskCtx, requiredEntries, { autoReclassify: true });
  const challenge = readChallengeOrFail(session, entryRef, taskCtx, requiredEntries);
  const dir = path.dirname(ackPath);
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const ack = readAckOrInit(entryRef);
  ack.entryPath = entryRef.entryPath;
  ack.sha256 = entryRef.sha256;
  ack.ackedAt = now;
  upsertAckScope(ack, taskCtx, requiredEntries, session, challenge, now);
  fs.writeFileSync(ackPath, `${JSON.stringify(ack, null, 2)}\n`, "utf8");
  console.log(
    `[llm-preflight] ACK_OK scope=${taskCtx.scopeKey} entry=${entryRef.entryPath} proof=${challenge.payload.challengeId}`,
  );
}

function doCheck(taskCtx, entryRef, requiredEntries) {
  const session = readSessionOrFail(entryRef, taskCtx, requiredEntries, { autoReclassify: true });
  const challenge = readChallengeOrFail(session, entryRef, taskCtx, requiredEntries);
  const now = new Date().toISOString();
  const ack = readAckOrInit(entryRef);

  let scopeAck = ack.scopes?.[taskCtx.scopeKey];
  const ackInvalid =
    !scopeAck ||
    !sameSet(scopeAck.taskScope, taskCtx.taskScope) ||
    !sameSet(scopeAck.classifiedPaths, taskCtx.paths) ||
    !sameEntryHashes(scopeAck.requiredEntries, requiredEntries) ||
    String(scopeAck.mode || "") !== String(session.mode || "") ||
    String(scopeAck.proofHash || "") !== String(challenge.expectedProofHash || "");

  if (ackInvalid) {
    console.warn(`[llm-preflight] AUTO_ACK_REFRESH scope=${taskCtx.scopeKey}`);
    upsertAckScope(ack, taskCtx, requiredEntries, session, challenge, now);
    scopeAck = ack.scopes[taskCtx.scopeKey];
  }

  const rotated = writeProofChallenge(entryRef, taskCtx, requiredEntries, session.mode, challenge.rel);
  if (fs.existsSync(challenge.abs)) {
    fs.rmSync(challenge.abs, { force: true });
  }

  const nextSession = {
    ...session,
    taskScope: taskCtx.taskScope,
    scopeKey: taskCtx.scopeKey,
    requiredEntries,
    classifiedPaths: taskCtx.paths,
    challengeId: rotated.challengeId,
    challengeFile: rotated.challengeFile,
    lastVerifiedAt: now,
  };
  fs.writeFileSync(sessionPath, `${JSON.stringify(nextSession, null, 2)}\n`, "utf8");

  ack.entryPath = entryRef.entryPath;
  ack.sha256 = entryRef.sha256;
  ack.ackedAt = now;
  ack.scopes[taskCtx.scopeKey] = {
    ...scopeAck,
    taskScope: taskCtx.taskScope,
    scopeKey: taskCtx.scopeKey,
    requiredEntries,
    proofHash: rotated.proofHash,
    challengeId: rotated.challengeId,
    challengeFile: rotated.challengeFile,
    ackedAt: now,
    mode: session.mode,
    classifiedPaths: taskCtx.paths,
  };
  ack.tasks[taskCtx.scopeKey] = ack.scopes[taskCtx.scopeKey];
  fs.writeFileSync(ackPath, `${JSON.stringify(ack, null, 2)}\n`, "utf8");

  console.log(
    `[llm-preflight] CHECK_OK scope=${taskCtx.scopeKey} mode=${session.mode} proof=${rotated.challengeId}`,
  );
}

function doAudit(args, matrix, lock) {
  const warnings = [];
  const lockAudit = validateEntryLockAudit(lock);
  warnings.push(...lockAudit.warnings);

  const ix = args.indexOf("--paths");
  let paths = [];
  if (ix < 0) {
    warnings.push("Missing --paths for audit.");
  } else {
    const raw = String(args[ix + 1] || "").trim();
    if (!raw) {
      warnings.push("Empty --paths for audit.");
    } else {
      for (const candidate of raw.split(",")) {
        const v = String(candidate || "").trim();
        if (!v) continue;
        const abs = path.isAbsolute(v) ? v : path.join(root, v);
        const rel = path.relative(root, abs);
        if (!rel || rel.startsWith("..")) {
          warnings.push(`Path outside repository ignored: ${v}`);
          continue;
        }
        paths.push(rel.split(path.sep).join("/"));
      }
    }
  }

  let taskScope = [];
  if (paths.length) {
    const direct = new Set();
    for (const relPath of paths) {
      for (const [scope, cfg] of Object.entries(matrix)) {
        const prefixes = Array.isArray(cfg?.triggerPrefixes) ? cfg.triggerPrefixes : [];
        if (prefixes.some((prefix) => matchesPrefix(relPath, prefix))) {
          direct.add(scope);
        }
      }
    }
    if (!direct.size) {
      warnings.push(`No task classification match for paths: ${paths.join(", ")}`);
    } else {
      taskScope = expandScopeDependencies([...direct], matrix);
    }
  }

  const requiredEntries = {};
  for (const scope of taskScope) {
    const requiredEntry = String(matrix[scope]?.requiredEntry || "");
    const abs = path.join(root, requiredEntry);
    if (!requiredEntry || !fs.existsSync(abs)) {
      warnings.push(`Task entry missing for '${scope}': ${requiredEntry || "<empty>"}`);
      continue;
    }
    requiredEntries[scope] = {
      requiredEntry,
      requiredEntrySha256: sha256File(abs),
    };
  }

  const scope = taskScope.length ? taskScope.join("+") : "unknown";
  const pathCount = paths.length;
  const entryCount = Object.keys(requiredEntries).length;
  console.log(`[llm-preflight] AUDIT_OK scope=${scope} paths=${pathCount} entries=${entryCount} warnings=${warnings.length}`);
  for (const warning of warnings) {
    console.warn(`[llm-preflight] AUDIT_WARN ${warning}`);
  }
  process.exit(0);
}

const command = String(process.argv[2] || "check").toLowerCase();
const args = process.argv.slice(3);
const lock = readJson(lockPath);
const matrix = readJson(matrixPath);

if (command === "update-lock") {
  updateEntryLock(lock);
  process.exit(0);
}

if (command === "audit") {
  doAudit(args, matrix, lock);
}

const entryRef = validateEntryLock(lock);

if (command === "classify") {
  const ctx = resolveTaskContext(args, matrix, { requirePaths: true });
  console.log(`[llm-preflight] CLASSIFY_OK scope=${ctx.scopeKey} taskScope=${ctx.taskScope.join("|")} paths=${ctx.paths.join(",")}`);
  process.exit(0);
}

if (command === "entry") {
  const ctx = resolveTaskContext(args, matrix, { requirePaths: true });
  const requiredEntries = ensureTaskEntries(matrix, ctx.taskScope);
  const mode = parseModeFlag(args);
  doEntry(ctx, entryRef, requiredEntries, mode);
  process.exit(0);
}

if (command === "ack") {
  const ctx = resolveTaskContext(args, matrix, { requirePaths: true });
  const requiredEntries = ensureTaskEntries(matrix, ctx.taskScope);
  doAck(ctx, entryRef, requiredEntries);
  process.exit(0);
}

if (command === "check") {
  const ctx = resolveTaskContext(args, matrix, { requirePaths: true });
  const requiredEntries = ensureTaskEntries(matrix, ctx.taskScope);
  doCheck(ctx, entryRef, requiredEntries);
  process.exit(0);
}

fail(`Unknown command '${command}'. Use: classify | entry | ack | check | audit | update-lock`);
