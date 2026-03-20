/**
 * Orchestrator — Koordiniert Agents sequentiell und parallel.
 *
 * Pipelines definieren, welche Agents in welcher Reihenfolge laufen.
 * Ergebnisse werden zwischen Agents als Kontext weitergegeben.
 */

import { loadRole, createAgent, ROLE_PATHS } from "./runtime/agent.mjs";
import { createSession } from "./runtime/session.mjs";
import { runPreflightChain } from "./runtime/preflight.mjs";

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
  async function runAgent(roleRef, task, contextFromPrevious, session) {
    const { roleKey, resultKey } = toRoleRunSpec(roleRef);
    log(`Starting agent: ${resultKey} (${roleKey})`);

    const rolePath = ROLE_PATHS[roleKey];
    if (!rolePath) {
      throw new Error(`Unknown role: '${roleKey}'. Known: ${Object.keys(ROLE_PATHS).join(", ")}`);
    }

    const role = await loadRole(rolePath);
    const model = getModel(roleKey);

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

    // Kontext von vorherigen Agents hinzufuegen
    if (contextFromPrevious) {
      agent.addContext(contextFromPrevious);
    }

    // Pfad-Kontext hinzufuegen
    if (session.paths.length > 0) {
      agent.addContext(`Betroffene Dateipfade:\n${session.paths.join("\n")}`);
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

  async function runRedTeamV2(task, options, session) {
    const rounds = Math.max(1, Number(options.rounds || 1) | 0);
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
      log(`RED_TEAM_V2 round ${round}/${rounds} start`);

      const scanTask = [
        task,
        "",
        `RUNDE ${round}: Scanner-Auftrag`,
        "Finde jeden scheinbar 'gruenen' Testfall, der nur Surface-Sicherheit beweist.",
        "Suche konkrete Gegenbeispiele, die den Claim trotzdem umgehen.",
        "Output muss enthalten: entweder 'KEINE_LUECKE' oder 'LUECKE_GEFUNDEN'.",
      ].join("\n");

      const scanContext = session.buildContext();
      const scannerResults = await Promise.all(scannerRoles.map(async (spec) => {
        try {
          const response = await runAgent(spec, scanTask, scanContext, session);
          return { ...spec, content: response?.content || "" };
        } catch (err) {
          session.addError(spec.resultKey, err);
          return { ...spec, content: `ERROR: ${err.message}` };
        }
      }));

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
      const attackerResults = await Promise.all(attackerRoles.map(async (spec) => {
        try {
          const response = await runAgent(spec, attackTask, attackerContext, session);
          return { ...spec, content: response?.content || "" };
        } catch (err) {
          session.addError(spec.resultKey, err);
          return { ...spec, content: `ERROR: ${err.message}` };
        }
      }));

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
        await runAgent({ roleKey: "arbiter-coder", resultKey: `fixer-round-${round}` }, fixTask, fixContext, session);
        await runAgent(monitorRole, `${task}\n\nRUNDE ${round}: Pruefe, ob Blocker geschlossen sind.`, session.buildContext(), session);
      } else {
        await runAgent(monitorRole, `${task}\n\nRUNDE ${round}: Keine Blocker, finale Freigabe pruefen.`, session.buildContext(), session);
        log(`RED_TEAM_V2 round ${round} completed without blockers`);
        break;
      }
    }
  }

  /**
   * Fuehrt eine Pipeline aus.
   *
   * @param {string} task - Aufgabenbeschreibung
   * @param {object} options - { pipeline, paths, preflight }
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
    session.status = "running";

    log(`Session ${session.id} started`);
    log(`Pipeline: ${pipelineName}`);
    log(`Task: ${task}`);

    // Preflight ausfuehren wenn Pfade angegeben
    if (options.preflight !== false && session.paths.length > 0) {
      log("Running preflight chain...");
      if (!dryRun) {
        const preflightResult = await runPreflightChain(session.paths, {
          mode: options.preflightMode || "work",
        });
        session.preflight = preflightResult;
        if (!preflightResult.ok) {
          log(`Preflight failed: ${preflightResult.error}`);
          session.status = "failed";
          session.addError("preflight", new Error(preflightResult.error));
          await session.save();
          return session;
        }
        log("Preflight passed");
      } else {
        log("[dry-run] Preflight skipped");
        session.preflight = { ok: true, steps: [], dryRun: true };
      }
    }

    // Spezialmodus: Red Team v2
    if (pipelineName === "red-team-v2") {
      try {
        await runRedTeamV2(task, options, session);
      } catch (err) {
        session.addError("red-team-v2", err);
        session.status = "failed";
      }
      if (session.status === "running") {
        session.status = session.errors.length > 0 ? "failed" : "completed";
      }
      const savedPath = await session.save();
      log(`Session saved to ${savedPath}`);
      log(`Status: ${session.status}`);
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
              runAgent(agentKey, task, context, session).catch((err) => {
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
          await runAgent(step, task, context, session);
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

    // Session speichern
    const savedPath = await session.save();
    log(`Session saved to ${savedPath}`);
    log(`Status: ${session.status}`);

    return session;
  }

  return {
    run,
    getModel,
    listPipelines: () => Object.keys(PIPELINES),
  };
}
