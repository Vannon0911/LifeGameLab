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
  async function runAgent(roleKey, task, contextFromPrevious, session) {
    log(`Starting agent: ${roleKey}`);

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
      session.addResult(roleKey, dryResult);
      log(`  [dry-run] ${roleKey} completed`);
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

    session.addResult(roleKey, response);
    log(`  ${roleKey} completed (${response.usage.completionTokens} tokens)`);

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
