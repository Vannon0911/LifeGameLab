import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const mode = String(process.argv[2] || "pre-commit").toLowerCase();
const preflightScript = path.join(root, "tools", "llm-preflight.mjs");

function runGit(command) {
  return String(
    execSync(command, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }) || "",
  ).trim();
}

function toCsv(paths) {
  return paths.map((p) => p.replace(/\\/g, "/")).join(",");
}

function listChangedPathsForPreCommit() {
  const raw = runGit("git diff --cached --name-only --diff-filter=ACMR");
  if (!raw) return [];
  return raw.split(/\r?\n/g).map((v) => v.trim()).filter(Boolean);
}

function listChangedPathsForPrePush() {
  let upstream = "";
  try {
    upstream = runGit("git rev-parse --abbrev-ref --symbolic-full-name @{upstream}");
  } catch {
    upstream = "origin/main";
  }
  let mergeBase = "";
  try {
    mergeBase = runGit(`git merge-base HEAD ${upstream}`);
  } catch {
    mergeBase = "";
  }
  if (!mergeBase) return [];
  const commitsRaw = runGit(`git rev-list --reverse ${mergeBase}..HEAD`);
  if (!commitsRaw) return [];
  return commitsRaw
    .split(/\r?\n/g)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((commit) => ({
      commit,
      paths: listPathsForCommit(commit),
    }))
    .filter((entry) => entry.paths.length > 0);
}

function listPathsForCommit(commit) {
  const raw = runGit(`git diff-tree --no-commit-id --name-only -r --diff-filter=ACMR ${commit}`);
  if (!raw) return [];
  return raw.split(/\r?\n/g).map((v) => v.trim()).filter(Boolean);
}

function classifyTaskForPath(relPath) {
  const res = spawnSync(
    process.execPath,
    [preflightScript, "classify", "--paths", String(relPath || "")],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) {
    console.error(`[git-llm-guard] classify failed for '${relPath}': ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(
      `[git-llm-guard] blocked: path '${relPath}' is not uniquely classifiable. Split scope and rerun entry+ack.`,
    );
    process.exit(res.status ?? 1);
  }
  const out = String(res.stdout || "");
  const m = out.match(/CLASSIFY_OK\s+task=([a-z0-9_-]+)/i);
  if (!m?.[1]) {
    console.error(`[git-llm-guard] classify output missing task for '${relPath}'.`);
    process.exit(1);
  }
  return m[1];
}

function groupPathsByTask(paths) {
  const grouped = new Map();
  for (const relPath of paths) {
    const task = classifyTaskForPath(relPath);
    if (!grouped.has(task)) grouped.set(task, []);
    grouped.get(task).push(relPath);
  }
  return grouped;
}

function runCheck(paths) {
  if (!paths.length) process.exit(0);
  const groups = groupPathsByTask(paths);
  for (const [task, taskPaths] of groups.entries()) {
    const csvPaths = toCsv(taskPaths);
    const res = spawnSync(
      process.execPath,
      [preflightScript, "check", "--paths", csvPaths],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30_000,
      },
    );
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    if (res.error) {
      console.error(`[git-llm-guard] preflight execution failed for task '${task}': ${res.error.message}`);
      process.exit(1);
    }
    if (res.status !== 0) {
      console.error(
        `[git-llm-guard] blocked: run entry+ack for changed paths in task '${task}' before commit/push.`,
      );
      process.exit(res.status ?? 1);
    }
  }
}

function runPreflight(command, paths, extraArgs = []) {
  if (!paths.length) return;
  const csvPaths = toCsv(paths);
  const res = spawnSync(
    process.execPath,
    [preflightScript, command, "--paths", csvPaths, ...extraArgs],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    },
  );
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) {
    console.error(`[git-llm-guard] preflight execution failed: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(
      `[git-llm-guard] blocked during ${command}: run entry+ack for changed paths before commit/push.`,
    );
    process.exit(res.status ?? 1);
  }
}

function runCheckForCommitSeries(entries) {
  if (!entries.length) process.exit(0);
  for (const entry of entries) {
    console.log(`[git-llm-guard] verifying commit slice ${entry.commit}`);
    runPreflight("entry", entry.paths, ["--mode", "work"]);
    runPreflight("ack", entry.paths);
    runPreflight("check", entry.paths);
  }
}

if (mode === "pre-commit") {
  runCheck(listChangedPathsForPreCommit());
  process.exit(0);
}

if (mode === "pre-push") {
  runCheckForCommitSeries(listChangedPathsForPrePush());
  process.exit(0);
}

console.error(`[git-llm-guard] unknown mode '${mode}' (use pre-commit|pre-push).`);
process.exit(2);
