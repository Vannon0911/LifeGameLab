/**
 * Agent Runtime — Laedt Rollendefinitionen und fuehrt sie als LLM-Agents aus.
 *
 * Jeder Agent bekommt:
 * - Seinen AGENT.md als Rollenprofil
 * - Seinen SKILL.md als Verhaltensbeschreibung
 * - Die shared BASE_RULES.md + REPORT_SCHEMA.md
 * - Kontext-Dateien (z.B. vorherige Agent-Outputs)
 */

import { readFile, readdir } from "node:fs/promises";
import { join, basename, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RUNTIME_FILE = fileURLToPath(import.meta.url);
const RUNTIME_DIR = dirname(RUNTIME_FILE);
const REPO_ROOT = join(RUNTIME_DIR, "..", "..", "..");
const AGENTS_ROOT = join(REPO_ROOT, "agents", "llm-entry-sequence");
const SHARED_DIR = join(AGENTS_ROOT, "_shared");
const ENTRY_DOC = join(REPO_ROOT, "docs", "llm", "ENTRY.md");
const TASK_GATE_INDEX_DOC = join(REPO_ROOT, "docs", "llm", "entry", "TASK_GATE_INDEX.md");

/**
 * Laedt eine Pflichtdatei und bricht hart ab, wenn sie fehlt oder leer ist.
 */
async function readRequired(filePath, label) {
  try {
    const content = await readFile(filePath, "utf-8");
    if (!String(content || "").trim()) {
      throw new Error("file is empty");
    }
    return content;
  } catch {
    const rel = relative(REPO_ROOT, filePath).replaceAll("\\", "/");
    throw new Error(`Missing required ${label}: ${rel}`);
  }
}

/**
 * Kanonische Rolle-Schluessel fuer den Orchestrator.
 *
 * Diese Map bleibt der Kompatibilitaetsanker fuer Pipelines, Configs und CLI.
 */
export const ROLE_PATHS = Object.freeze({
  "task-orchestrator": "01-workflow",
  "arbiter-coder": "02-entry",
  "protocol-enforcer": "03-operating-protocol",
  "architecture-guardian": "04-architecture",
  "documentation-auditor": "05-status",
  "scope-router": "06-task-entry-matrix",
  "quality-reviewer": "07-task-gate-index",
  "domain-coordinator": "08-scope-entries",
  "ui-coder": "08-scope-entries/01-ui",
  "sim-coder": "08-scope-entries/02-sim",
  "contract-coder": "08-scope-entries/03-contracts",
  "test-engineer": "08-scope-entries/04-testing",
  "versioning-release": "08-scope-entries/05-versioning",
  "gate-compliance-checker": "09-global-minimum-gates",
});

/**
 * Rolle-Definitionen aus dem Dateisystem laden.
 */
export async function loadRole(rolePath) {
  const fullPath = join(AGENTS_ROOT, rolePath);
  const [agentMd, skillMd, baseRules, reportSchema, entryDoc, taskGateIndexDoc] = await Promise.all([
    readRequired(join(fullPath, "AGENT.md"), `AGENT.md for role '${rolePath}'`),
    readRequired(join(fullPath, "SKILL.md"), `SKILL.md for role '${rolePath}'`),
    readRequired(join(SHARED_DIR, "BASE_RULES.md"), "shared BASE_RULES.md"),
    readRequired(join(SHARED_DIR, "REPORT_SCHEMA.md"), "shared REPORT_SCHEMA.md"),
    readRequired(ENTRY_DOC, "docs/llm/ENTRY.md"),
    readRequired(TASK_GATE_INDEX_DOC, "docs/llm/entry/TASK_GATE_INDEX.md"),
  ]);

  // Parse Rolle und Scope aus AGENT.md
  const roleName = agentMd.match(/Rolle:\s*(.+)/)?.[1]?.trim() || basename(rolePath);
  const scope = agentMd.match(/Erlaubter Scope:\s*(.+)/)?.[1]?.trim() || "";
  const inputs = agentMd.match(/Inputs:\s*(.+)/)?.[1]?.trim() || "";
  const outputs = agentMd.match(/Outputs:\s*(.+)/)?.[1]?.trim() || "";
  const guards = agentMd.match(/Spezifische Guards.*?:\s*(.+)/)?.[1]?.trim() || "";

  return {
    id: rolePath,
    roleName,
    scope,
    inputs,
    outputs,
    guards,
    agentMd,
    skillMd,
    baseRules,
    reportSchema,
    entryDoc,
    taskGateIndexDoc,
  };
}

/**
 * Baut den System-Prompt fuer einen Agent aus seinen Rollendefinitionen.
 */
export function buildSystemPrompt(role, extraContext = "") {
  const parts = [
    `# Du bist: ${role.roleName}`,
    "",
    "## Basis-Regeln",
    role.baseRules,
    "",
    "## Report-Schema",
    role.reportSchema,
    "",
    "## Dein Rollenprofil",
    role.agentMd,
  ];

  if (role.skillMd) {
    parts.push("", "## Deine Skill-Definition", role.skillMd);
  }

  if (role.entryDoc) {
    parts.push("", "## Pflicht-Entry", role.entryDoc);
  }

  if (role.taskGateIndexDoc) {
    parts.push("", "## Task-Gate-Index", role.taskGateIndexDoc);
  }

  if (extraContext) {
    parts.push("", "## Zusaetzlicher Kontext", extraContext);
  }

  return parts.join("\n");
}

function normalizeRoleKey(value) {
  return String(value || "")
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase())
    .filter(Boolean)
    .join("-");
}

/**
 * Erstellt einen ausfuehrbaren Agent mit Model-Adapter und Rollenkontext.
 */
export function createAgent(role, model) {
  const systemPrompt = buildSystemPrompt(role);

  return {
    role,
    model,
    history: [{ role: "system", content: systemPrompt }],

    /**
     * Sendet eine Nachricht an den Agent und bekommt eine Antwort.
     */
    async send(userMessage, options = {}) {
      this.history.push({ role: "user", content: userMessage });
      const response = await model.chat(this.history, options);
      this.history.push({ role: "assistant", content: response.content });
      return response;
    },

    /**
     * Fuegt Kontext hinzu ohne eine Antwort zu erwarten.
     */
    addContext(content) {
      this.history.push({ role: "user", content: `[KONTEXT]\n${content}` });
    },

    /**
     * Setzt die Konversation zurueck (behaelt System-Prompt).
     */
    reset() {
      this.history = [{ role: "system", content: systemPrompt }];
    },

    toString() {
      return `Agent(${role.roleName} via ${model})`;
    },
  };
}

/**
 * Alle verfuegbaren Rollen-Pfade auflisten.
 */
async function collectRolePaths(dirPath, bucket = []) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const hasAgentDefinition = entries.some((entry) => entry.isFile() && entry.name === "AGENT.md");
  if (hasAgentDefinition) {
    bucket.push(relative(AGENTS_ROOT, dirPath).replaceAll("\\", "/"));
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    await collectRolePaths(join(dirPath, entry.name), bucket);
  }
  return bucket;
}

function roleKeyFromRole(role, fallbackPath = "") {
  const fromName = normalizeRoleKey(role?.roleName);
  if (fromName) return fromName;
  const fromPath = normalizeRoleKey(fallbackPath);
  return fromPath || "unknown-role";
}

/**
 * Laedt alle Rollen und gibt eine Map zurueck.
 */
export async function loadAllRoles() {
  const roles = {};
  const rolePaths = await collectRolePaths(AGENTS_ROOT);
  for (const path of rolePaths) {
    try {
      const role = await loadRole(path);
      const key = roleKeyFromRole(role, path);
      if (roles[key]) {
        console.warn(`Warning: Duplicate role key '${key}' discovered at '${path}'`);
        continue;
      }
      roles[key] = role;
    } catch (err) {
      console.warn(`Warning: Could not load role '${path}': ${err.message}`);
    }
  }
  return roles;
}
