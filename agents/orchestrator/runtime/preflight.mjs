/**
 * Preflight Integration — Wrapper fuer das bestehende Preflight-System.
 *
 * Fuehrt die 4-stufige Pipeline aus: classify → entry → ack → check
 * Nutzt `tools/llm-preflight.mjs` als Basis.
 */

import { execFile } from "node:child_process";
import { join } from "node:path";

const REPO_ROOT = new URL("../../../", import.meta.url).pathname;
const PREFLIGHT_SCRIPT = join(REPO_ROOT, "tools", "llm-preflight.mjs");

/**
 * Fuehrt ein Preflight-Kommando aus und gibt stdout/stderr zurueck.
 */
function runPreflight(args) {
  return new Promise((resolve, reject) => {
    execFile("node", [PREFLIGHT_SCRIPT, ...args], {
      cwd: REPO_ROOT,
      timeout: 30_000,
      env: { ...process.env },
    }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          ok: false,
          exitCode: err.code ?? 1,
          stdout: stdout || "",
          stderr: stderr || err.message,
        });
      } else {
        resolve({
          ok: true,
          exitCode: 0,
          stdout: stdout || "",
          stderr: stderr || "",
        });
      }
    });
  });
}

/**
 * Fuehrt die vollstaendige Preflight-Kette aus.
 *
 * @param {string[]} paths - Dateipfade die bearbeitet werden sollen
 * @param {object} options - { mode: "work"|"security"|"audit", verbose: boolean }
 * @returns {Promise<{ ok: boolean, steps: object[], error?: string }>}
 */
export async function runPreflightChain(paths, options = {}) {
  const mode = options.mode || "work";
  const pathArgs = ["--paths", paths.join(",")];
  const steps = [];

  // Schritt 1: classify
  const classifyResult = await runPreflight(["classify", ...pathArgs]);
  steps.push({ step: "classify", ...classifyResult });
  if (!classifyResult.ok) {
    return { ok: false, steps, error: `classify failed: ${classifyResult.stderr}` };
  }

  // Schritt 2: entry
  const entryResult = await runPreflight(["entry", ...pathArgs, "--mode", mode]);
  steps.push({ step: "entry", ...entryResult });
  if (!entryResult.ok) {
    return { ok: false, steps, error: `entry failed: ${entryResult.stderr}` };
  }

  // Schritt 3: ack
  const ackResult = await runPreflight(["ack", ...pathArgs]);
  steps.push({ step: "ack", ...ackResult });
  if (!ackResult.ok) {
    return { ok: false, steps, error: `ack failed: ${ackResult.stderr}` };
  }

  // Schritt 4: check
  const checkResult = await runPreflight(["check", ...pathArgs]);
  steps.push({ step: "check", ...checkResult });
  if (!checkResult.ok) {
    return { ok: false, steps, error: `check failed: ${checkResult.stderr}` };
  }

  return { ok: true, steps };
}

/**
 * Prueft nur den aktuellen Preflight-Status (ohne neue Chain zu starten).
 */
export async function checkPreflightStatus(paths) {
  const pathArgs = ["--paths", paths.join(",")];
  return runPreflight(["check", ...pathArgs]);
}

/**
 * Fuehrt nur classify aus (fuer Scope-Ermittlung).
 */
export async function classifyPaths(paths) {
  const pathArgs = ["--paths", paths.join(",")];
  return runPreflight(["classify", ...pathArgs]);
}
