#!/usr/bin/env node

/**
 * CLI — Einstiegspunkt fuer den Agent-Orchestrator.
 *
 * Verwendung:
 *   node agents/orchestrator/cli.mjs --task "Beschreibung" [Optionen]
 *
 * Optionen:
 *   --task <text>        Aufgabenbeschreibung (Pflicht)
 *   --paths <p1,p2,...>  Dateipfade (kommagetrennt)
 *   --pipeline <name>    Pipeline: default|plan|review|ui|sim|contracts|full
 *   --rounds <n>         Nur fuer red-team-v2: Anzahl Runden
 *   --max-parallel <n>   Nur fuer red-team-v2: max. gleichzeitige Agent-Runs
 *   --model <spec>       Globales Modell-Override (z.B. "openai:gpt-4o", "anthropic:claude-sonnet-4-20250514")
 *   --provider <name>    Default-Provider: openai|anthropic|ollama
 *   --config <path>      Pfad zu einer Custom-Config-Datei
 *   --dry-run            Simulation ohne echte LLM-Aufrufe
 *   --verbose            Detaillierte Ausgabe
 *   --validate           Nur Config validieren, nicht ausfuehren
 *   --no-subagents       Explizites Opt-out fuer Rebuttal-Subagents
 *   --list-pipelines     Verfuegbare Pipelines auflisten
 *   --list-roles         Verfuegbare Rollen auflisten
 *   --help               Hilfe anzeigen
 */

import { parseArgs } from "node:util";
import { loadConfig, validateConfig } from "./config.mjs";
import { createOrchestrator, PIPELINES } from "./orchestrator.mjs";
import { ROLE_PATHS, loadAllRoles } from "./runtime/agent.mjs";
import { listProviders } from "./models/index.mjs";

// ── Argument Parsing ──────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    task:            { type: "string",  short: "t" },
    paths:           { type: "string",  short: "p" },
    pipeline:        { type: "string",  short: "P" },
    model:           { type: "string",  short: "m" },
    provider:        { type: "string" },
    config:          { type: "string",  short: "c" },
    "dry-run":       { type: "boolean", short: "d" },
    verbose:         { type: "boolean", short: "v" },
    validate:        { type: "boolean" },
    "list-pipelines":{ type: "boolean" },
    "list-roles":    { type: "boolean" },
    "preflight-mode":{ type: "string" },
    "no-subagents":  { type: "boolean" },
    rounds:          { type: "string" },
    "max-parallel":  { type: "string" },
    help:            { type: "boolean", short: "h" },
  },
  strict: true,
});

// ── Hilfe ─────────────────────────────────────────────────
if (args.help) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           LifeGameLab Agent Orchestrator CLI                ║
╚══════════════════════════════════════════════════════════════╝

Verwendung:
  node agents/orchestrator/cli.mjs --task "Beschreibung" [Optionen]

Pflicht:
  --task, -t <text>        Aufgabenbeschreibung

Optionen:
  --paths, -p <p1,p2,...>  Dateipfade (kommagetrennt)
  --pipeline, -P <name>    Pipeline-Name (default: "default")
  --rounds <n>             Fuer red-team-v2: Anzahl Runden (default: 1)
  --max-parallel <n>       Fuer red-team-v2: max. gleichzeitige Agent-Runs (default: 6)
  --model, -m <spec>       Globales Modell ("provider:model")
  --provider <name>        Default-Provider (openai|anthropic|ollama)
  --config, -c <path>      Custom-Config-Datei
  --dry-run, -d            Simulation ohne LLM-Aufrufe
  --verbose, -v            Detaillierte Ausgabe
  --validate               Nur Config validieren
  --preflight-mode <mode>  Preflight-Modus (work|security|audit)
  --no-subagents           Explizites Opt-out fuer Rebuttal-Subagents
  --list-pipelines         Pipelines auflisten
  --list-roles             Rollen auflisten
  --help, -h               Diese Hilfe

Umgebungsvariablen:
  OPENAI_API_KEY           OpenAI API Key
  OPENAI_BASE_URL          OpenAI Base URL (optional)
  ANTHROPIC_API_KEY        Anthropic API Key
  ANTHROPIC_BASE_URL       Anthropic Base URL (optional)
  OLLAMA_BASE_URL          Ollama Server URL (default: http://localhost:11434)

Beispiele:
  # Standard-Pipeline mit GPT-4o
  node agents/orchestrator/cli.mjs -t "Add zoom feature" -p "src/game/ui/controls.js"

  # Review-Pipeline mit Claude
  node agents/orchestrator/cli.mjs -t "Review last changes" -P review -m "anthropic:claude-sonnet-4-20250514"

  # Dry-Run zum Testen
  node agents/orchestrator/cli.mjs -t "Test task" -d -v

  # Nur Planung
  node agents/orchestrator/cli.mjs -t "Plan refactoring" -P plan

  # Red-Team v2, 3 Scanner + 3 Angreifer in 2 Runden
  node agents/orchestrator/cli.mjs -t "Red Team Test V2" -P red-team-v2 --rounds 2 -v
`);
  process.exit(0);
}

// ── List-Befehle ──────────────────────────────────────────
if (args["list-pipelines"]) {
  console.log("\nVerfuegbare Pipelines:\n");
  for (const [name, steps] of Object.entries(PIPELINES)) {
    const stepsStr = steps.map((s) =>
      Array.isArray(s) ? `[${s.join(" + ")}]` : s
    ).join(" → ");
    console.log(`  ${name}`);
    console.log(`    ${stepsStr}\n`);
  }
  process.exit(0);
}

if (args["list-roles"]) {
  console.log("\nVerfuegbare Rollen:\n");
  const roles = await loadAllRoles();
  for (const [key, role] of Object.entries(roles)) {
    console.log(`  ${key}`);
    console.log(`    Rolle: ${role.roleName}`);
    console.log(`    Scope: ${role.scope}`);
    console.log(`    Output: ${role.outputs}`);
    console.log();
  }
  console.log(`Verfuegbare Model-Provider: ${listProviders().join(", ")}\n`);
  process.exit(0);
}

// ── Task pruefen ──────────────────────────────────────────
if (!args.task) {
  console.error("Fehler: --task ist Pflicht. Nutze --help fuer Hilfe.");
  process.exit(1);
}

// ── Config laden ──────────────────────────────────────────
console.log("\n🔧 Konfiguration laden...");

const config = await loadConfig({
  configPath: args.config,
  model: args.model,
  provider: args.provider,
  verbose: args.verbose,
  dryRun: args["dry-run"],
});

// ── Config validieren ─────────────────────────────────────
if (args.validate) {
  console.log("\n🔍 Konfiguration validieren...\n");
  const validation = validateConfig(config);
  if (validation.ok) {
    console.log("  Config OK. Alle Modelle korrekt konfiguriert.\n");
    console.log("  Default: " + config.defaultModel);
    for (const [role, model] of Object.entries(config.modelMap)) {
      console.log(`  ${role}: ${model}`);
    }
  } else {
    console.log("  Probleme gefunden:\n");
    for (const issue of validation.issues) {
      console.log(`  ⚠ ${issue}`);
    }
  }
  console.log();
  process.exit(validation.ok ? 0 : 1);
}

// ── Ausfuehrung ───────────────────────────────────────────
const paths = args.paths ? args.paths.split(",").map((p) => p.trim()) : [];
const pipeline = args.pipeline || "default";

console.log(`\n🚀 Agent Orchestrator`);
console.log(`   Task:     ${args.task}`);
console.log(`   Pipeline: ${pipeline}`);
console.log(`   Paths:    ${paths.length > 0 ? paths.join(", ") : "(keine)"}`);
if (pipeline === "red-team-v2") {
  console.log(`   Rounds:   ${Math.max(1, Number(args.rounds || 1) | 0)}`);
  console.log(`   MaxPar:   ${Math.max(1, Number(args["max-parallel"] || 6) | 0)}`);
}
console.log(`   Dry-Run:  ${config.dryRun ? "JA" : "NEIN"}`);
console.log(`   Subagents:${args["no-subagents"] ? " EXPLIZIT AUS" : " AN (DEFAULT)"}`);
console.log();

const orchestrator = createOrchestrator(config);

try {
  const session = await orchestrator.run(args.task, {
    pipeline,
    paths,
    rounds: Math.max(1, Number(args.rounds || 1) | 0),
    maxParallel: Math.max(1, Number(args["max-parallel"] || 6) | 0),
    preflight: true,
    preflightMode: args["preflight-mode"] || "work",
    subagentsOptOutExplicit: args["no-subagents"] === true,
  });

  // Ergebnis ausgeben
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Session: ${session.id}`);
  console.log(`Status:  ${session.status}`);
  console.log(`${"═".repeat(60)}\n`);

  if (session.errors.length > 0) {
    console.log("Fehler:");
    for (const err of session.errors) {
      console.log(`  [${err.agentId}] ${err.message}`);
    }
    console.log();
  }

  for (const [agentId, result] of Object.entries(session.results)) {
    console.log(`─── ${agentId} ${"─".repeat(Math.max(0, 50 - agentId.length))}`);
    console.log(result.content);
    console.log();
  }

  if (session.status === "completed") {
    console.log("Pipeline erfolgreich abgeschlossen.");
  } else {
    console.log(`Pipeline beendet mit Status: ${session.status}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`\nFehler: ${err.message}`);
  if (config.verbose) console.error(err.stack);
  process.exit(1);
}
