import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { TESTING_PREFLIGHT_PATHS_ARG } from "./test-suites.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const preflightScript = path.join(root, "tools", "llm-preflight.mjs");

export function hasAuditWarnings(output) {
  return /\[llm-preflight\]\s+AUDIT_WARN\b/.test(String(output || ""));
}

export function assertCleanAuditOutput(output, label = "preflight audit") {
  if (hasAuditWarnings(output)) {
    throw new Error(`${label} reported warnings:\n${String(output || "").trim()}`);
  }
}

export function runPreflightAudit(pathsArg = TESTING_PREFLIGHT_PATHS_ARG, timeoutMs = 30_000) {
  const res = spawnSync(process.execPath, [preflightScript, "audit", "--paths", pathsArg], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  });
  const output = `${res.stdout || ""}${res.stderr || ""}`;
  return { ...res, output };
}

export function runPreflightAuditOrThrow(pathsArg = TESTING_PREFLIGHT_PATHS_ARG, timeoutMs = 30_000) {
  const res = runPreflightAudit(pathsArg, timeoutMs);
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) throw res.error;
  if (res.status !== 0) process.exit(res.status ?? 1);
  assertCleanAuditOutput(res.output);
}
