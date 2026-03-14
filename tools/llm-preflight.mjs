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

function resolveTask(args, matrix) {
  const taskFlag = args.indexOf("--task");
  const cliTask = taskFlag >= 0 ? String(args[taskFlag + 1] || "").trim() : "";
  const envTask = String(process.env.LLM_TASK || "").trim();
  const task = cliTask || envTask || "testing";
  if (!Object.prototype.hasOwnProperty.call(matrix, task)) {
    fail(
      `Unknown task '${task}'. Allowed: ${Object.keys(matrix)
        .sort()
        .join(", ")}`,
    );
  }
  return task;
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
  return requiredEntry;
}

function doAck(task, entryRef, requiredEntry) {
  const dir = path.dirname(ackPath);
  fs.mkdirSync(dir, { recursive: true });

  let ack = {};
  if (fs.existsSync(ackPath)) {
    ack = readJson(ackPath);
  }
  const now = new Date().toISOString();
  const tasks = ack.tasks && typeof ack.tasks === "object" ? ack.tasks : {};
  tasks[task] = { requiredEntry, ackedAt: now };

  const next = {
    entryPath: entryRef.entryPath,
    sha256: entryRef.sha256,
    ackedAt: now,
    tasks,
  };
  fs.writeFileSync(ackPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`[llm-preflight] ACK_OK task=${task} entry=${entryRef.entryPath}`);
}

function doCheck(task, entryRef, requiredEntry) {
  if (!fs.existsSync(ackPath)) {
    fail(`Missing ack file. Run: node tools/llm-preflight.mjs ack --task ${task}`);
  }
  const ack = readJson(ackPath);
  if (ack.entryPath !== entryRef.entryPath || ack.sha256 !== entryRef.sha256) {
    fail("Ack invalid due to entry hash/path mismatch. Re-run ack.");
  }
  const taskAck = ack.tasks?.[task];
  if (!taskAck) {
    fail(`Missing task ack '${task}'. Run: node tools/llm-preflight.mjs ack --task ${task}`);
  }
  if (taskAck.requiredEntry !== requiredEntry) {
    fail(`Task entry drift for '${task}'. Re-run ack.`);
  }
  console.log(`[llm-preflight] CHECK_OK task=${task}`);
}

const command = String(process.argv[2] || "check").toLowerCase();
const args = process.argv.slice(3);
const lock = readJson(lockPath);
const matrix = readJson(matrixPath);
const task = resolveTask(args, matrix);
const entryRef = validateEntryLock(lock);
const requiredEntry = ensureTaskEntry(matrix, task);

if (command === "ack") {
  doAck(task, entryRef, requiredEntry);
  process.exit(0);
}
if (command === "check") {
  doCheck(task, entryRef, requiredEntry);
  process.exit(0);
}
fail(`Unknown command '${command}'. Use: ack | check`);
