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
  const raw = runGit(`git diff --name-only --diff-filter=ACMR ${mergeBase}..HEAD`);
  if (!raw) return [];
  return raw.split(/\r?\n/g).map((v) => v.trim()).filter(Boolean);
}

function runCheck(paths) {
  if (!paths.length) process.exit(0);
  const csvPaths = toCsv(paths);
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
    console.error(`[git-llm-guard] preflight execution failed: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(
      "[git-llm-guard] blocked: run entry+ack for changed paths before commit/push.",
    );
    process.exit(res.status ?? 1);
  }
}

if (mode === "pre-commit") {
  runCheck(listChangedPathsForPreCommit());
  process.exit(0);
}

if (mode === "pre-push") {
  runCheck(listChangedPathsForPrePush());
  process.exit(0);
}

console.error(`[git-llm-guard] unknown mode '${mode}' (use pre-commit|pre-push).`);
process.exit(2);
