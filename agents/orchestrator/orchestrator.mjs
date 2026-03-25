/**
 * Orchestrator — Koordiniert Agents sequentiell und parallel.
 *
 * Pipelines definieren, welche Agents in welcher Reihenfolge laufen.
 * Ergebnisse werden zwischen Agents als Kontext weitergegeben.
 */

import { loadRole, createAgent, ROLE_PATHS } from "./runtime/agent.mjs";
import { createSession } from "./runtime/session.mjs";
import { runPreflightChain } from "./runtime/preflight.mjs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORCH_FILE = fileURLToPath(import.meta.url);
const ORCH_DIR = path.dirname(ORCH_FILE);
const REPO_ROOT = path.resolve(ORCH_DIR, "..", "..");

/**
 * Vordefinierte Pipelines.
 *
 * Jeder Step kann sein:
 * - Ein String (Agent-Key): sequentielle Ausfuehrung
 * - Ein Array von Strings: parallele Ausfuehrung
 */
export const PIPELINES = Object.freeze({
  /** Standard-Pipeline: Plan → Implement → Review (parallel) → Gate-Check */
  default: [
    "task-orchestrator",
    "scope-router",
    "arbiter-coder",
    ["protocol-enforcer", "architecture-guardian", "quality-reviewer"],
    "gate-compliance-checker",
  ],

  /** Nur Planung, kein Code */
  plan: [
    "task-orchestrator",
    "scope-router",
  ],

  /** Review-Pipeline fuer bestehende Aenderungen */
  review: [
    ["protocol-enforcer", "architecture-guardian", "documentation-auditor"],
    "quality-reviewer",
    "gate-compliance-checker",
  ],

  /** UI-fokussierte Pipeline */
  ui: [
    "task-orchestrator",
    "scope-router",
    "ui-coder",
    ["protocol-enforcer", "architecture-guardian"],
    "gate-compliance-checker",
  ],

  /** Simulation-fokussierte Pipeline */
  sim: [
    "task-orchestrator",
    "scope-router",
    "sim-coder",
    ["protocol-enforcer", "architecture-guardian"],
    "gate-compliance-checker",
  ],

  /** Contract-fokussierte Pipeline */
  contracts: [
    "task-orchestrator",
    "scope-router",
    "contract-coder",
    ["protocol-enforcer", "architecture-guardian"],
    "gate-compliance-checker",
  ],

  /** Vollstaendige Pipeline mit allen Reviews */
  full: [
    "task-orchestrator",
    "scope-router",
    "domain-coordinator",
    "arbiter-coder",
    ["protocol-enforcer", "architecture-guardian", "documentation-auditor"],
    "quality-reviewer",
    "gate-compliance-checker",
  ],

  /** Red Team v2: 3 Scanner + 3 Angreifer + Monitor in Runden */
  "red-team-v2": [
    "protocol-enforcer",
    "architecture-guardian",
    "quality-reviewer",
    "arbiter-coder",
    "sim-coder",
    "contract-coder",
    "gate-compliance-checker",
  ],
});

/**
 * Erstellt den Orchestrator.
 *
 * @param {object} config - { modelMap, defaultModel, verbose, dryRun }
 *   modelMap: { "task-orchestrator": modelAdapter, ... }
 *   defaultModel: modelAdapter (Fallback fuer alle Rollen)
 */
export function createOrchestrator(config = {}) {
  const { modelMap = {}, defaultModel, verbose = false, dryRun = false } = config;
  const ADVERSARIAL_REBUTTAL_ROLE = "quality-reviewer";
  const ASSUMPTION_SCAN_LIMIT = 12;
  const MAX_SCAN_CHARS = 12_000;
  const MIN_REBUTTAL_CONTENT_CHARS = 40;

  function log(...args) {
    if (verbose) console.log("[orchestrator]", ...args);
  }

  function toRoleRunSpec(roleRef) {
    if (typeof roleRef === "string") {
      return { roleKey: roleRef, resultKey: roleRef };
    }
    if (roleRef && typeof roleRef === "object") {
      const roleKey = String(roleRef.roleKey || roleRef.role || "").trim();
      const resultKey = String(roleRef.resultKey || roleRef.alias || roleKey).trim();
      if (roleKey) return { roleKey, resultKey: resultKey || roleKey };
    }
    throw new Error(`Invalid role reference: ${JSON.stringify(roleRef)}`);
  }

  /**
   * Gibt den Model-Adapter fuer eine bestimmte Rolle zurueck.
   */
  function getModel(roleKey) {
    const model = modelMap[roleKey] || defaultModel;
    if (!model) {
      throw new Error(`No model configured for role '${roleKey}' and no defaultModel set`);
    }
    return model;
  }

  /**
   * Fuehrt einen einzelnen Agent-Step aus.
   */
  async function runAgent(roleRef, task, contextFromPrevious, session, subagentController) {
    const { roleKey, resultKey } = toRoleRunSpec(roleRef);
    log(`Starting agent: ${resultKey} (${roleKey})`);

    const rolePath = ROLE_PATHS[roleKey];
    if (!rolePath) {
      throw new Error(`Unknown role: '${roleKey}'. Known: ${Object.keys(ROLE_PATHS).join(", ")}`);
    }

    const role = await loadRole(rolePath);
    const model = getModel(roleKey);
    const scanTargets = await resolveFileScanTargets(session.paths);
    if (scanTargets.length === 0) {
      throw new Error(`no_scan_targets:${session.paths.join(",")}`);
    }

    if (dryRun) {
      const dryResult = {
        content: `[DRY RUN] ${role.roleName} wuerde hier ausgefuehrt.\nTask: ${task}\nModel: ${model}\nScope: ${role.scope}`,
        usage: { promptTokens: 0, completionTokens: 0 },
      };
      session.addResult(resultKey, dryResult);
      log(`  [dry-run] ${resultKey} completed`);
      return dryResult;
    }

    const agent = createAgent(role, model);
    if (subagentController?.enabled) {
      await subagentController.spawnRebuttal({
        parentRoleKey: roleKey,
        resultKey,
        task,
        purpose: "task-start-analysis",
        context: contextFromPrevious || "",
        strict: true,
      });
    }

    // Kontext von vorherigen Agents hinzufuegen
    if (contextFromPrevious) {
      agent.addContext(contextFromPrevious);
    }

    // Pfad-Kontext hinzufuegen
    if (session.paths.length > 0) {
      agent.addContext(`Betroffene Dateipfade:\n${session.paths.join("\n")}`);
    }
    for (let idx = 0; idx < scanTargets.length; idx += 1) {
      const target = scanTargets[idx];
      const gateStatus = await runFileScanGate({
        role,
        roleKey,
        resultKey,
        task,
        session,
        subagentController,
        parentAgent: agent,
        scanTarget: target,
        scanIndex: idx + 1,
      });
      session.addResult(`${resultKey}::scan-gate-${idx + 1}`, {
        content: JSON.stringify(gateStatus),
        usage: { promptTokens: 0, completionTokens: 0 },
      });
      if (gateStatus?.scanGate?.valid !== true) {
        throw new Error(`invalid_scan_gate:${target.relPath}:${gateStatus?.scanGate?.invalidReason || "unknown_reason"}`);
      }

      agent.addContext([
        `FILE_SCAN_INPUT #${idx + 1}`,
        `path=${target.relPath}`,
        "content:",
        target.content,
        "",
        `scanGate=${JSON.stringify(gateStatus)}`,
      ].join("\n"));
    }

    const prompt = buildTaskPrompt(role, task);
    const response = await agent.send(prompt);

    session.addResult(resultKey, response);
    log(`  ${resultKey} completed (${response.usage.completionTokens} tokens)`);

    return response;
  }

  /**
   * Baut den Task-Prompt fuer einen Agent.
   */
  function buildTaskPrompt(role, task) {
    return [
      `## Aufgabe`,
      task,
      "",
      `## Erwarteter Output`,
      `Erstelle: ${role.outputs}`,
      "",
      `## Dein Scope`,
      role.scope,
      "",
      `## Guards`,
      role.guards,
    ].join("\n");
  }

  function buildRedTeamRoundReport(round, blockers, scannerOutputs, attackerOutputs) {
    const blockerLines = blockers.length > 0
      ? blockers.map((b, idx) => `${idx + 1}. ${b}`).join("\n")
      : "Keine bestaetigten Luecken in dieser Runde.";

    const scannerLines = scannerOutputs.map((x) => `- ${x.key}: ${x.summary}`).join("\n");
    const attackerLines = attackerOutputs.map((x) => `- ${x.key}: ${x.summary}`).join("\n");
    return [
      `# BLOCKER REPORT — Runde ${round}`,
      "",
      "## Status",
      blockers.length > 0 ? "BLOCKER_OFFEN" : "NO_BLOCKER",
      "",
      "## Bestaetigte Blocker",
      blockerLines,
      "",
      "## Scanner-Summary",
      scannerLines || "- (keine)",
      "",
      "## Angreifer-Summary",
      attackerLines || "- (keine)",
      "",
      "## Guard",
      "Kein Testverfahren darf veraendert werden, nur um gruen zu werden.",
      "Aenderungen sind nur erlaubt, wenn echte Produkt-/Contract-Luecken geschlossen werden.",
    ].join("\n");
  }

  function summarizeContent(content) {
    const first = String(content || "").split(/\r?\n/).find((line) => line.trim().length > 0) || "";
    return first.slice(0, 220) || "(leer)";
  }

  function parseAssumptions(content, limit = ASSUMPTION_SCAN_LIMIT) {
    const text = String(content || "").trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.assumptions) ? parsed.assumptions : []);
      return list
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, limit);
    } catch {}

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
    return lines.slice(0, limit);
  }

  function sanitizeSegment(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  }

  function truncateScanContent(text) {
    const raw = String(text || "");
    if (raw.length <= MAX_SCAN_CHARS) return raw;
    return `${raw.slice(0, MAX_SCAN_CHARS)}\n\n...[truncated ${raw.length - MAX_SCAN_CHARS} chars]`;
  }

  async function collectFileTargets(relPath, absPath) {
    const st = await stat(absPath);
    if (st.isDirectory()) {
      const entries = await readdir(absPath, { withFileTypes: true });
      const nestedTargets = await Promise.all(
        entries.map((entry) => {
          const childRelPath = path.posix.join(relPath.replaceAll("\\", "/"), entry.name);
          const childAbsPath = path.join(absPath, entry.name);
          return collectFileTargets(childRelPath, childAbsPath);
        }),
      );
      return nestedTargets.flat();
    }
    if (!st.isFile()) {
      return [];
    }

    const content = await readFile(absPath, "utf8");
    return [{
      relPath: relPath.replaceAll("\\", "/"),
      absPath,
      content: truncateScanContent(content),
    }];
  }

  async function resolveFileScanTargets(paths) {
    const targets = [];
    for (const rawPath of paths || []) {
      const relPath = String(rawPath || "").trim();
      if (!relPath) continue;
      const absPath = path.resolve(REPO_ROOT, relPath);
      try {
        const resolvedTargets = await collectFileTargets(relPath, absPath);
        targets.push(...resolvedTargets);
      } catch {
        continue;
      }
    }
    return targets;
  }

  function serializeParentHistory(history) {
    const entries = Array.isArray(history) ? history : [];
    return entries
      .map((entry, idx) => {
        const role = String(entry?.role || "unknown");
        const content = String(entry?.content || "");
        return `#${idx + 1} role=${role}\n${content}`;
      })
      .join("\n\n");
  }

  function hasMarker(text, markers) {
    const lower = String(text || "").toLowerCase();
    return markers.some((marker) => lower.includes(marker));
  }

  function isRebuttalSufficient(content) {
    const text = String(content || "").trim();
    if (!text) return false;
    if (text.length < MIN_REBUTTAL_CONTENT_CHARS) return false;
    if (/^\(?leer\)?$/i.test(text) || /^n\/a$/i.test(text) || /^none$/i.test(text)) return false;

    const hasCounterReading = hasMarker(text, ["gegenlesart", "counter-reading", "counter reading", "gegenargument", "einwand"]);
    const hasUncertainty = hasMarker(text, ["unsicher", "unklar", "uncertain", "unknown", "nicht belegt", "nicht gesichert"]);
    const hasAlternative = hasMarker(text, ["alternative", "alternativ", "other explanation", "alternative erklaerung", "alternative erklärung"]);
    const hasConcreteObjection = hasMarker(text, ["widerlegt", "widerlegung", "does not follow", "folgt nicht", "nicht zwingend", "gegenbeweis"]);
    return hasCounterReading || hasUncertainty || hasAlternative || hasConcreteObjection;
  }

  function createSubagentController(session, options = {}) {
    const optOutExplicit = options?.subagentsOptOutExplicit === true;
    const enabled = optOutExplicit ? false : true;
    const records = [];
    const active = new Map();
    const taskNonce = `${session.id}-${Date.now()}`;

    session.subagentPolicy = {
      enabled,
      optOutExplicit,
      taskNonce,
      records,
      invalidReason: null,
    };

    function markInvalid(reason) {
      session.subagentPolicy.invalidReason = String(reason || "unknown_subagent_policy_error");
    }

    function registerCreate(record) {
      records.push(record);
      active.set(record.id, record);
    }

    function closeRecord(record, reason = "task_cleanup") {
      if (!record || record.closedAt) return;
      try {
        record.agent?.close?.();
      } catch {}
      record.closedAt = new Date().toISOString();
      record.closeReason = String(reason || "task_cleanup");
      active.delete(record.id);
    }

    async function spawnRebuttal({
      parentRoleKey = "unknown",
      resultKey = "unknown",
      task = "",
      purpose = "",
      context = "",
      strict = true,
    }) {
      if (!enabled) {
        return { skipped: true, reason: "explicit_user_opt_out" };
      }
      const rebuttalRolePath = ROLE_PATHS[ADVERSARIAL_REBUTTAL_ROLE];
      if (!rebuttalRolePath) {
        const reason = `missing_rebuttal_role:${ADVERSARIAL_REBUTTAL_ROLE}`;
        markInvalid(reason);
        throw new Error(`invalid_subagent_policy:${reason}`);
      }
      const rebuttalRole = await loadRole(rebuttalRolePath);
      const rebuttalModel = dryRun ? null : getModel(ADVERSARIAL_REBUTTAL_ROLE);
      const rebuttalAgent = dryRun ? {
        addContext() {},
        async send() {
          return {
            content: "Gegenlesart: Dry-Run Rebuttal aktiv. Unsicherheitsmarker: keine Laufzeitvalidierung.",
            usage: { promptTokens: 0, completionTokens: 0 },
          };
        },
        close() {},
      } : createAgent(rebuttalRole, rebuttalModel);
      const subagentId = [
        "rebuttal",
        taskNonce,
        parentRoleKey,
        resultKey,
        sanitizeSegment(purpose || "purpose"),
        String(records.length + 1),
      ].join(":");
      const record = {
        id: subagentId,
        createdAt: new Date().toISOString(),
        taskNonce,
        parentRoleKey,
        resultKey,
        purpose,
        strict,
        closedAt: null,
        closeReason: null,
        valid: false,
        agent: rebuttalAgent,
      };
      registerCreate(record);

      let response;
      try {
        rebuttalAgent.addContext(`PARENT_ROLE=${parentRoleKey}\nRESULT_KEY=${resultKey}\nPURPOSE=${purpose}`);
        if (context) rebuttalAgent.addContext(context);
        const prompt = [
          "REBUTTAL SUBAGENT (MANDATORY / FAIL-CLOSED)",
          "Pflicht: aktive Widerlegung der Parent-Annahme/Analyse.",
          "Format: Symptom -> Root Cause -> Evidence (Datei:Zeile) -> Impact -> Freigabebedarf",
          "",
          `Task: ${task}`,
          `Purpose: ${purpose}`,
        ].join("\n");
        response = await rebuttalAgent.send(prompt);
        const content = String(response?.content || "").trim();
        record.valid = isRebuttalSufficient(content);
        if (strict && !record.valid) {
          const reason = `insufficient_rebuttal:${subagentId}`;
          markInvalid(reason);
          throw new Error(`invalid_subagent_policy:${reason}`);
        }
        session.addResult(`${resultKey}::subagent::${sanitizeSegment(purpose)}::${records.length}`, {
          content,
          usage: response?.usage || { promptTokens: 0, completionTokens: 0 },
        });
        return { id: subagentId, content, valid: record.valid };
      } finally {
        closeRecord(record, "post_rebuttal");
      }
    }

    async function cleanupAll() {
      for (const record of records) {
        if (!record.closedAt) closeRecord(record, "task_finalize");
      }
      if (enabled) {
        const createdCount = records.length;
        const closedCount = records.filter((r) => Boolean(r.closedAt)).length;
        if (createdCount === 0) {
          const reason = "missing_required_rebuttal_subagents";
          markInvalid(reason);
          throw new Error(`invalid_subagent_policy:${reason}`);
        }
        if (createdCount !== closedCount) {
          const reason = `subagent_cleanup_incomplete:${closedCount}/${createdCount}`;
          markInvalid(reason);
          throw new Error(`invalid_subagent_policy:${reason}`);
        }
      }
    }

    return {
      enabled,
      optOutExplicit,
      spawnRebuttal,
      cleanupAll,
      markInvalid,
    };
  }

  async function runFileScanGate({
    role,
    roleKey,
    resultKey,
    task,
    session,
    subagentController,
    parentAgent,
    scanTarget,
    scanIndex,
  }) {
    const status = {
      scanPath: scanTarget.relPath,
      scanGate: {
        required: true,
        assumptionsExtracted: false,
        rebuttalsComplete: false,
        valid: false,
        invalidReason: null,
      },
    };

    const parentHistory = serializeParentHistory(parentAgent?.history || []);
    if (subagentController?.enabled) {
      await subagentController.spawnRebuttal({
        parentRoleKey: roleKey,
        resultKey,
        task,
        purpose: `file-scan-${scanIndex}`,
        context: [
          "PARENT_CONTEXT_FULL",
          parentHistory || "(empty-parent-history)",
          "",
          `FILE_SCAN_TARGET #${scanIndex}`,
          `path=${scanTarget.relPath}`,
          "content:",
          scanTarget.content,
        ].join("\n"),
        strict: true,
      });
    }

    const model = getModel(roleKey);
    const assumptionProbe = createAgent(role, model);
    assumptionProbe.addContext([
      "PARENT_CONTEXT_FULL",
      parentHistory || "(empty-parent-history)",
    ].join("\n"));
    assumptionProbe.addContext([
      `FILE_SCAN_TARGET #${scanIndex}`,
      `path=${scanTarget.relPath}`,
      "content:",
      scanTarget.content,
    ].join("\n"));

    const assumptionPrompt = [
      "ADVERSARIAL FILE-SCAN GATE (REQUIRED)",
      "Extrahiere nur Annahmen aus diesem Datei-Scan, die spaeter als Fakt missbraucht werden koennten.",
      "Regeln:",
      "- Ausgabe strikt als JSON: {\"assumptions\":[\"...\"]}",
      "- Keine Loesung, keine Entscheidung.",
      `- Maximal ${ASSUMPTION_SCAN_LIMIT} Annahmen.`,
      "",
      "Task:",
      task,
    ].join("\n");
    const assumptionResponse = await assumptionProbe.send(assumptionPrompt);
    const assumptions = parseAssumptions(assumptionResponse?.content || "");
    session.addResult(`${resultKey}::scan-${scanIndex}::assumption-scan`, {
      content: assumptionResponse?.content || "",
      usage: assumptionResponse?.usage || { promptTokens: 0, completionTokens: 0 },
    });

    if (assumptions.length === 0) {
      status.scanGate.invalidReason = "invalid_scan_gate:no_explicit_assumptions_extracted";
      return status;
    }
    status.scanGate.assumptionsExtracted = true;

    if (!subagentController?.enabled) {
      status.scanGate.invalidReason = "invalid_scan_gate:rebuttal_subagent_required";
      return status;
    }
    for (let i = 0; i < assumptions.length; i += 1) {
      const assumption = assumptions[i];
      const rebuttalRun = await subagentController.spawnRebuttal({
        parentRoleKey: roleKey,
        resultKey,
        task,
        purpose: `assumption-${scanIndex}-${i + 1}`,
        context: [
          "PARENT_CONTEXT_FULL",
          parentHistory || "(empty-parent-history)",
          "",
          `FILE_SCAN_TARGET #${scanIndex}`,
          `path=${scanTarget.relPath}`,
          "content:",
          scanTarget.content,
          "",
          `ASSUMPTION #${i + 1}`,
          assumption,
        ].join("\n"),
        strict: true,
      });

      if (!rebuttalRun?.valid) {
        status.scanGate.invalidReason = `invalid_scan_gate:insufficient_rebuttal:${i + 1}`;
        return status;
      }
    }

    status.scanGate.rebuttalsComplete = true;
    status.scanGate.valid = true;
    return status;
  }

  function extractConfirmedBlockers(attackerOutputs) {
    const blockers = [];
    for (const entry of attackerOutputs) {
      const text = String(entry.content || "");
      if (/(^|\n)\s*FINAL:\s*LUECKE_BESTAETIGT\b/i.test(text) || /(^|\n)\s*FINAL:\s*GAP_CONFIRMED\b/i.test(text)) {
        blockers.push(`${entry.resultKey} bestaetigt eine Luecke`);
      }
    }
    return blockers;
  }

  async function runRoleBatch(specs, task, context, session, maxParallel, subagentController) {
    const concurrency = Math.max(1, Number(maxParallel || specs.length) | 0);
    const out = [];
    for (let i = 0; i < specs.length; i += concurrency) {
      const chunk = specs.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(async (spec) => {
        try {
          const response = await runAgent(spec, task, context, session, subagentController);
          return { ...spec, content: response?.content || "" };
        } catch (err) {
          session.addError(spec.resultKey, err);
          return { ...spec, content: `ERROR: ${err.message}` };
        }
      }));
      out.push(...chunkResults);
    }
    return out;
  }

  async function runRedTeamV2(task, options, session, subagentController) {
    const rounds = Math.max(1, Number(options.rounds || 1) | 0);
    const maxParallel = Math.max(1, Number(options.maxParallel || 6) | 0);
    const scannerRoles = [
      { roleKey: "protocol-enforcer", resultKey: "scanner-1-protocol" },
      { roleKey: "architecture-guardian", resultKey: "scanner-2-architecture" },
      { roleKey: "quality-reviewer", resultKey: "scanner-3-quality" },
    ];
    const attackerRoles = [
      { roleKey: "arbiter-coder", resultKey: "attacker-1-arbiter" },
      { roleKey: "sim-coder", resultKey: "attacker-2-sim" },
      { roleKey: "contract-coder", resultKey: "attacker-3-contract" },
    ];
    const monitorRole = { roleKey: "gate-compliance-checker", resultKey: "monitor-gate" };

    for (let round = 1; round <= rounds; round++) {
      log(`RED_TEAM_V2 round ${round}/${rounds} start (maxParallel=${maxParallel})`);

      const scanTask = [
        task,
        "",
        `RUNDE ${round}: Scanner-Auftrag`,
        "Finde jeden scheinbar 'gruenen' Testfall, der nur Surface-Sicherheit beweist.",
        "Suche konkrete Gegenbeispiele, die den Claim trotzdem umgehen.",
        "Output muss enthalten: entweder 'KEINE_LUECKE' oder 'LUECKE_GEFUNDEN'.",
      ].join("\n");

      const scanContext = session.buildContext();
      const scannerResults = await runRoleBatch(scannerRoles, scanTask, scanContext, session, maxParallel, subagentController);

      const attackTask = [
        task,
        "",
        `RUNDE ${round}: Angreifer-Auftrag`,
        "Pruefe die Scanner-Funde aktiv auf Reproduzierbarkeit.",
        "Wenn reproduzierbare Luecke besteht, gib als letzte Zeile aus: FINAL: LUECKE_BESTAETIGT",
        "Wenn Scanner falsch liegt oder nichts reproduzierbar ist, gib als letzte Zeile aus: FINAL: WIDERLEGT",
        "",
        "WICHTIGER GUARD:",
        "Kein Testverfahren im Code so aendern, dass es nur formal besteht.",
        "Nur reale Luecken schliessen.",
      ].join("\n");
      const attackerContext = scannerResults.map((x) => `--- ${x.resultKey} ---\n${x.content}`).join("\n\n");
      const attackerResults = await runRoleBatch(attackerRoles, attackTask, attackerContext, session, maxParallel, subagentController);

      const blockers = extractConfirmedBlockers(attackerResults);
      const infraBlockers = [...scannerResults, ...attackerResults]
        .filter((x) => /^ERROR:/i.test(String(x.content || "")))
        .map((x) => `${x.resultKey} failed: ${String(x.content || "").slice(0, 140)}`);
      blockers.push(...infraBlockers);
      const scannerSummaries = scannerResults.map((x) => ({
        key: x.resultKey,
        summary: summarizeContent(x.content),
      }));
      const attackerSummaries = attackerResults.map((x) => ({
        key: x.resultKey,
        summary: summarizeContent(x.content),
      }));

      session.addResult(`blocker-report-round-${round}`, {
        content: buildRedTeamRoundReport(round, blockers, scannerSummaries, attackerSummaries),
        usage: { promptTokens: 0, completionTokens: 0 },
      });

      if (infraBlockers.length > 0) {
        session.status = "failed";
        session.addError(`red-team-v2-round-${round}`, new Error("Infra/API blocker detected during red-team round"));
        break;
      }

      if (blockers.length > 0) {
        const fixTask = [
          task,
          "",
          `RUNDE ${round}: BLOCKER_OFFEN`,
          "Bestaetigte Luecken schliessen.",
          "Anschliessend gehaerteten Test erneut laufen lassen.",
          "Nicht am Test vorbeibauen, nicht Test lockern.",
        ].join("\n");
        const fixContext = [
          "Scanner-Ausgaben:",
          scannerResults.map((x) => `--- ${x.resultKey} ---\n${x.content}`).join("\n\n"),
          "Angreifer-Ausgaben:",
          attackerResults.map((x) => `--- ${x.resultKey} ---\n${x.content}`).join("\n\n"),
        ].join("\n\n");
        await runAgent({ roleKey: "arbiter-coder", resultKey: `fixer-round-${round}` }, fixTask, fixContext, session, subagentController);
        await runAgent(monitorRole, `${task}\n\nRUNDE ${round}: Pruefe, ob Blocker geschlossen sind.`, session.buildContext(), session, subagentController);
      } else {
        await runAgent(monitorRole, `${task}\n\nRUNDE ${round}: Keine Blocker, finale Freigabe pruefen.`, session.buildContext(), session, subagentController);
        log(`RED_TEAM_V2 round ${round} completed without blockers`);
        break;
      }
    }
  }

  /**
   * Fuehrt eine Pipeline aus.
   *
   * @param {string} task - Aufgabenbeschreibung
   * @param {object} options - { pipeline, paths, preflightMode }
   */
  async function run(task, options = {}) {
    const pipelineName = options.pipeline || "default";
    const pipeline = typeof pipelineName === "string" ? PIPELINES[pipelineName] : pipelineName;
    if (!pipeline) {
      const known = Object.keys(PIPELINES).join(", ");
      throw new Error(`Unknown pipeline '${pipelineName}'. Known: ${known}`);
    }

    const session = createSession(task, {
      pipeline: pipelineName,
      paths: options.paths || [],
    });
    const subagentController = createSubagentController(session, {
      subagentsOptOutExplicit: options.subagentsOptOutExplicit === true,
    });
    session.status = "running";

    log(`Session ${session.id} started`);
    log(`Pipeline: ${pipelineName}`);
    log(`Task: ${task}`);

    try {
      if (subagentController.enabled) {
        await subagentController.spawnRebuttal({
          parentRoleKey: "orchestrator",
          resultKey: "task-start-gate",
          task,
          purpose: "task-start",
          context: session.paths.length > 0 ? `TASK_PATHS\n${session.paths.join("\n")}` : "TASK_PATHS\n(none)",
          strict: true,
        });
      }

      if (session.paths.length === 0) {
        const err = new Error("At least one path is required for an orchestrator run.");
        session.addError("paths", err);
        session.status = "failed";
        log("Session failed: no paths provided");
        return session;
      }

      log("Running preflight chain...");
      const preflightResult = await runPreflightChain(session.paths, {
        mode: options.preflightMode || "work",
      });
      session.preflight = { ...preflightResult, dryRun };
      if (!preflightResult.ok) {
        log(`Preflight failed: ${preflightResult.error}`);
        session.status = "failed";
        session.addError("preflight", new Error(preflightResult.error));
        return session;
      }
      log("Preflight passed");

      // Spezialmodus: Red Team v2
      if (pipelineName === "red-team-v2") {
        try {
          await runRedTeamV2(task, options, session, subagentController);
        } catch (err) {
          session.addError("red-team-v2", err);
          session.status = "failed";
        }
        if (session.status === "running") {
          session.status = session.errors.length > 0 ? "failed" : "completed";
        }
        return session;
      }

      // Pipeline ausfuehren
      for (const step of pipeline) {
        try {
          if (Array.isArray(step)) {
            // Parallele Ausfuehrung
            log(`Parallel step: [${step.join(", ")}]`);
            const context = session.buildContext();
            const results = await Promise.all(
              step.map((agentKey) =>
                runAgent(agentKey, task, context, session, subagentController).catch((err) => {
                  session.addError(agentKey, err);
                  log(`  ERROR in ${agentKey}: ${err.message}`);
                  return null;
                })
              )
            );

            // Wenn alle parallel-Agents fehlschlagen, abbrechen
            if (results.every((r) => r === null)) {
              session.status = "failed";
              break;
            }
          } else {
            // Sequentielle Ausfuehrung
            const context = session.buildContext();
            await runAgent(step, task, context, session, subagentController);
          }
        } catch (err) {
          session.addError(step, err);
          log(`ERROR in step ${JSON.stringify(step)}: ${err.message}`);
          session.status = "failed";
          break;
        }
      }

      if (session.status === "running") {
        session.status = "completed";
      }
      return session;
    } finally {
      try {
        await subagentController.cleanupAll();
      } catch (cleanupErr) {
        session.addError("subagent-cleanup", cleanupErr);
        session.status = "failed";
      }
      const savedPath = await session.save();
      log(`Session saved to ${savedPath}`);
      log(`Status: ${session.status}`);
    }
  }

  return {
    run,
    getModel,
    listPipelines: () => Object.keys(PIPELINES),
  };
}
