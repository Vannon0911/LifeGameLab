/**
 * Session Management — Verwaltet Agent-Sessions und deren Ergebnisse.
 *
 * Speichert Zwischenergebnisse, Kontext und Agent-Outputs.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SESSION_DIR = join(REPO_ROOT, ".llm", "orchestrator-sessions");

/**
 * Erstellt eine neue Orchestrator-Session.
 */
export function createSession(taskDescription, options = {}) {
  const sessionId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: sessionId,
    task: taskDescription,
    createdAt: new Date().toISOString(),
    pipeline: options.pipeline || "default",
    paths: options.paths || [],

    /** Ergebnisse der einzelnen Agents */
    results: {},

    /** Fehler waehrend der Ausfuehrung */
    errors: [],

    /** Preflight-Status */
    preflight: null,

    /** Gesamtstatus */
    status: "created", // created | running | completed | failed

    /**
     * Speichert ein Agent-Ergebnis.
     */
    addResult(agentId, result) {
      this.results[agentId] = {
        content: result.content,
        usage: result.usage,
        timestamp: new Date().toISOString(),
      };
    },

    /**
     * Loggt einen Fehler.
     */
    addError(agentId, error) {
      this.errors.push({
        agentId,
        message: error.message || String(error),
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Gibt die Ergebnisse eines bestimmten Agents zurueck.
     */
    getResult(agentId) {
      return this.results[agentId] || null;
    },

    /**
     * Baut Kontext-String aus bisherigen Ergebnissen fuer den naechsten Agent.
     */
    buildContext(agentIds = []) {
      const parts = [];
      const keys = agentIds.length > 0 ? agentIds : Object.keys(this.results);
      for (const id of keys) {
        const r = this.results[id];
        if (r) {
          parts.push(`--- Output von ${id} ---\n${r.content}\n`);
        }
      }
      return parts.join("\n");
    },

    /**
     * Serialisiert die Session als JSON.
     */
    toJSON() {
      return {
        id: this.id,
        task: this.task,
        createdAt: this.createdAt,
        pipeline: this.pipeline,
        paths: this.paths,
        status: this.status,
        results: this.results,
        errors: this.errors,
        preflight: this.preflight,
      };
    },

    /**
     * Speichert die Session auf Disk.
     */
    async save() {
      await mkdir(SESSION_DIR, { recursive: true });
      const filePath = join(SESSION_DIR, `${this.id}.json`);
      await writeFile(filePath, JSON.stringify(this.toJSON(), null, 2), "utf-8");
      return filePath;
    },
  };
}

/**
 * Laedt eine gespeicherte Session.
 */
export async function loadSession(sessionId) {
  const filePath = join(SESSION_DIR, `${sessionId}.json`);
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Listet alle gespeicherten Sessions auf.
 */
export async function listSessions() {
  const { readdir } = await import("node:fs/promises");
  try {
    const files = await readdir(SESSION_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}
