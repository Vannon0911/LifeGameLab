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

function failGuard(message) {
  console.error(`[git-llm-guard] ${message}`);
  process.exit(1);
}

function toCsv(paths) {
  return paths.map((p) => p.replace(/\\/g, "/")).join(",");
}

function isEntryLockDrift(output) {
  const text = String(output || "");
  return text.includes("Entry hash drift") || text.includes("Read-order drift");
}

function listChangedPathsForPreCommit() {
  const raw = runGit("git diff --cached --name-only --diff-filter=ACMRDT");
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
    failGuard(`blocked: cannot resolve merge-base for pre-push (upstream='${upstream || "unknown"}'). Configure upstream and retry.`);
  }
  if (!mergeBase) {
    failGuard(`blocked: empty merge-base for pre-push (upstream='${upstream || "unknown"}').`);
  }
  const commitsRaw = runGit(`git rev-list --reverse ${mergeBase}..HEAD`);
  if (!commitsRaw) return [];
  const entries = commitsRaw
    .split(/\r?\n/g)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((commit) => ({
      commit,
      paths: listPathsForCommit(commit),
    }))
    .filter((entry) => entry.paths.length > 0);
  if (entries.length === 0) {
    failGuard("blocked: pre-push found commits but no verifiable changed paths. Re-run with a clean index and valid upstream.");
  }
  return entries;
}

function listPathsForCommit(commit) {
  const raw = runGit(`git diff-tree --no-commit-id --name-only -r --diff-filter=ACMRDT ${commit}`);
  if (!raw) return [];
  return raw.split(/\r?\n/g).map((v) => v.trim()).filter(Boolean);
}

function runCheck(paths) {
  if (!paths.length) process.exit(0);
  const csvPaths = toCsv(paths);
  let res = spawnSync(process.execPath, [preflightScript, "check", "--paths", csvPaths], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) {
    console.error(`[git-llm-guard] preflight execution failed: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0 && isEntryLockDrift(`${res.stdout || ""}\n${res.stderr || ""}`)) {
    failGuard("blocked: entry lock drift detected during check. Run 'node tools/llm-preflight.mjs update-lock', stage the lock file, then rerun entry/ack/check.");
  }
  if (res.status !== 0) {
    console.error(
      "[git-llm-guard] blocked: run entry+ack for changed paths before commit/push.",
    );
    process.exit(res.status ?? 1);
  }
}

function runPreflight(command, paths, extraArgs = []) {
  if (!paths.length) return;
  const csvPaths = toCsv(paths);
  let res = spawnSync(process.execPath, [preflightScript, command, "--paths", csvPaths, ...extraArgs], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) {
    console.error(`[git-llm-guard] preflight execution failed: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0 && isEntryLockDrift(`${res.stdout || ""}\n${res.stderr || ""}`)) {
    failGuard(`blocked: entry lock drift detected during ${command}. Run 'node tools/llm-preflight.mjs update-lock', stage the lock file, then rerun entry/ack/check.`);
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
