import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const lockPath = path.join(root, "docs", "llm", "entry", "LLM_ENTRY_LOCK.json");
const matrixPath = path.join(root, "docs", "llm", "TASK_ENTRY_MATRIX.json");
const ackPath = path.join(root, ".llm", "entry-ack.json");

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

function readOrderCount(absPath) {
  const text = fs.readFileSync(absPath, "utf8");
  return text
    .split(/\r?\n/g)
    .filter((line) => /^\d+\.\s+`.+`/.test(line.trim())).length;
}

function normalizeRelPath(inputPath) {
  const raw = String(inputPath || "").trim();
  if (!raw) return "";
  const abs = path.isAbsolute(raw) ? raw : path.join(root, raw);
  const rel = path.relative(root, abs);
  if (!rel || rel.startsWith("..")) {
    fail(`Path outside repository is not allowed: ${raw}`);
  }
  return rel.split(path.sep).join("/");
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

function parseTaskFlag(args) {
  const taskFlag = args.indexOf("--task");
  if (taskFlag < 0) return "";
  return String(args[taskFlag + 1] || "").trim();
}

function matchesPrefix(relPath, rawPrefix) {
  const prefix = String(rawPrefix || "").trim().replace(/\\/g, "/");
  if (!prefix) return false;
  if (prefix.endsWith("/")) {
    return relPath.startsWith(prefix);
  }
  return relPath === prefix || relPath.startsWith(`${prefix}/`);
}

function classifyTaskByPaths(paths, matrix) {
  const matches = new Set();
  for (const relPath of paths) {
    for (const [task, cfg] of Object.entries(matrix)) {
      const prefixes = Array.isArray(cfg?.triggerPrefixes) ? cfg.triggerPrefixes : [];
      if (prefixes.some((prefix) => matchesPrefix(relPath, prefix))) {
        matches.add(task);
      }
    }
  }
  if (!matches.size) {
    fail(`No task classification match for paths: ${paths.join(", ")}`);
  }
  if (matches.size > 1) {
    fail(
      `Ambiguous task classification (${Array.from(matches).sort().join(", ")}). Split into subtasks with disjoint paths.`,
    );
  }
  return Array.from(matches)[0];
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
    fail(
      `Read-order drift: lock=${expectedCount} current=${actualCount}. Update lock after intentional edits.`,
    );
  }
  return { entryPath: lock.entryPath, sha256: currentHash };
}

function ensureTaskEntry(matrix, task) {
  const requiredEntry = String(matrix[task]?.requiredEntry || "");
  const abs = path.join(root, requiredEntry);
  if (!requiredEntry || !fs.existsSync(abs)) {
    fail(`Task entry missing for '${task}': ${requiredEntry || "<empty>"}`);
  }
  return {
    requiredEntry,
    requiredEntrySha256: sha256File(abs),
  };
}

function resolveTaskContext(args, matrix, options = {}) {
  const requirePaths = Boolean(options.requirePaths);
  const paths = parsePaths(args);
  const cliTask = parseTaskFlag(args);

  if (cliTask && !Object.prototype.hasOwnProperty.call(matrix, cliTask)) {
    fail(
      `Unknown task '${cliTask}'. Allowed: ${Object.keys(matrix)
        .sort()
        .join(", ")}`,
    );
  }

  if (requirePaths && !paths.length) {
    fail("Task classification requires '--paths <comma-separated-paths>'.");
  }

  const classifiedTask = paths.length ? classifyTaskByPaths(paths, matrix) : "";
  const task = cliTask || classifiedTask;

  if (!task) {
    fail("Task classification required. Use '--paths <...>' or '--task <...>'.");
  }
  if (cliTask && classifiedTask && cliTask !== classifiedTask) {
    fail(
      `Task mismatch: --task=${cliTask} but matrix classifies paths as '${classifiedTask}'.`,
    );
  }

  return {
    task,
    paths,
  };
}

function doAck(taskCtx, entryRef, taskEntryRef) {
  const dir = path.dirname(ackPath);
  fs.mkdirSync(dir, { recursive: true });

  let ack = {};
  if (fs.existsSync(ackPath)) {
    ack = readJson(ackPath);
  }

  const now = new Date().toISOString();
  const tasks = ack.tasks && typeof ack.tasks === "object" ? ack.tasks : {};
  tasks[taskCtx.task] = {
    requiredEntry: taskEntryRef.requiredEntry,
    requiredEntrySha256: taskEntryRef.requiredEntrySha256,
    ackedAt: now,
    classifiedPaths: taskCtx.paths,
  };

  const next = {
    entryPath: entryRef.entryPath,
    sha256: entryRef.sha256,
    ackedAt: now,
    tasks,
  };

  fs.writeFileSync(ackPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(
    `[llm-preflight] ACK_OK task=${taskCtx.task} entry=${entryRef.entryPath} taskEntry=${taskEntryRef.requiredEntry}`,
  );
}

function doCheck(taskCtx, entryRef, taskEntryRef) {
  if (!fs.existsSync(ackPath)) {
    fail(`Missing ack file. Run: node tools/llm-preflight.mjs ack --paths ${taskCtx.paths.join(",")}`);
  }
  const ack = readJson(ackPath);
  if (ack.entryPath !== entryRef.entryPath || ack.sha256 !== entryRef.sha256) {
    fail("Ack invalid due to entry hash/path mismatch. Re-run ack.");
  }

  const taskAck = ack.tasks?.[taskCtx.task];
  if (!taskAck) {
    fail(`Missing task ack '${taskCtx.task}'. Run: node tools/llm-preflight.mjs ack --paths ${taskCtx.paths.join(",")}`);
  }
  if (taskAck.requiredEntry !== taskEntryRef.requiredEntry) {
    fail(`Task entry drift for '${taskCtx.task}'. Re-run ack.`);
  }
  if (taskAck.requiredEntrySha256 !== taskEntryRef.requiredEntrySha256) {
    fail(`Task entry hash drift for '${taskCtx.task}'. Re-run ack.`);
  }

  console.log(
    `[llm-preflight] CHECK_OK task=${taskCtx.task} taskEntry=${taskEntryRef.requiredEntry}`,
  );
}

const command = String(process.argv[2] || "check").toLowerCase();
const args = process.argv.slice(3);
const lock = readJson(lockPath);
const matrix = readJson(matrixPath);

const entryRef = validateEntryLock(lock);

if (command === "classify") {
  const ctx = resolveTaskContext(args, matrix, { requirePaths: true });
  console.log(`[llm-preflight] CLASSIFY_OK task=${ctx.task} paths=${ctx.paths.join(",")}`);
  process.exit(0);
}

if (command === "ack") {
  const ctx = resolveTaskContext(args, matrix, { requirePaths: true });
  const taskEntryRef = ensureTaskEntry(matrix, ctx.task);
  doAck(ctx, entryRef, taskEntryRef);
  process.exit(0);
}

if (command === "check") {
  const ctx = resolveTaskContext(args, matrix, { requirePaths: true });
  const taskEntryRef = ensureTaskEntry(matrix, ctx.task);
  doCheck(ctx, entryRef, taskEntryRef);
  process.exit(0);
}

fail(`Unknown command '${command}'. Use: classify | ack | check`);
