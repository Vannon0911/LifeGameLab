# Agent Orchestrator

Ausfuehrbares Multi-Agent-System fuer LifeGameLab. Verwandelt die 14 Rollendefinitionen aus `agents/llm-entry-sequence/` in echte Agents, die ueber verschiedene LLM-Provider (OpenAI, Anthropic, Ollama) gesteuert werden.

## Schnellstart

```bash
# Dry-Run (kein API-Key noetig)
node agents/orchestrator/cli.mjs -t "Add zoom feature" -d -v

# Mit OpenAI
export OPENAI_API_KEY="sk-..."
node agents/orchestrator/cli.mjs -t "Add zoom feature" -p "src/game/ui/controls.js"

# Mit Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
node agents/orchestrator/cli.mjs -t "Refactor renderer" -m "anthropic:claude-sonnet-4-20250514"

# Mit lokalem Ollama
node agents/orchestrator/cli.mjs -t "Review code" -m "ollama:llama3" -P review
```

## Architektur

```
agents/orchestrator/
├── cli.mjs                     ← CLI Einstiegspunkt
├── orchestrator.mjs            ← Pipeline-Ausfuehrung (sequentiell + parallel)
├── config.mjs                  ← Konfiguration laden + mergen
├── config.default.json         ← Default Rolle→Modell Zuordnung
├── models/
│   ├── base.mjs                ← Gemeinsames Adapter-Interface
│   ├── openai.mjs              ← OpenAI (GPT-4, GPT-4o, etc.)
│   ├── anthropic.mjs           ← Anthropic (Claude)
│   ├── ollama.mjs              ← Ollama (lokale Modelle)
│   └── index.mjs               ← Model-Registry + Factory
└── runtime/
    ├── agent.mjs               ← Agent-Instanz (Rolle laden, LLM-Chat)
    ├── preflight.mjs           ← Preflight-Chain Integration
    └── session.mjs             ← Session-Management + Persistenz
```

## Pipelines

Pipelines definieren die Reihenfolge der Agent-Ausfuehrung. Steps koennen sequentiell oder parallel sein:

| Pipeline | Steps | Einsatz |
| --- | --- | --- |
| `default` | Orchestrator → Router → Coder → [Protocol + Arch + Quality] → Gate | Standard-Workflow |
| `plan` | Orchestrator → Router | Nur Planung |
| `review` | [Protocol + Arch + DocAudit] → Quality → Gate | Review bestehender Aenderungen |
| `ui` | Orchestrator → Router → UI-Coder → [Protocol + Arch] → Gate | UI-Aenderungen |
| `sim` | Orchestrator → Router → SIM-Coder → [Protocol + Arch] → Gate | Simulations-Aenderungen |
| `contracts` | Orchestrator → Router → Contract-Coder → [Protocol + Arch] → Gate | Contract-Aenderungen |
| `full` | Orchestrator → Router → DomainCoord → Coder → [Protocol + Arch + DocAudit] → Quality → Gate | Vollstaendiger Durchlauf |
| `red-team-v2` | Runde: [Protocol + Arch + Quality] → [Arbiter + SIM + Contract] → Gate + Blocker-Report | Red-Team Gegenbeweis-Loop |

`[A + B + C]` = parallele Ausfuehrung.

## Model-Provider

### OpenAI
```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.openai.com/v1"  # optional
```

### Anthropic
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_BASE_URL="https://api.anthropic.com"  # optional
```

### Ollama (lokal)
```bash
# Ollama Server muss laufen
export OLLAMA_BASE_URL="http://localhost:11434"  # default
ollama serve &
ollama pull llama3
```

## Konfiguration

### Default-Zuordnung (`config.default.json`)

Jede Rolle hat einen zugewiesenen Provider + Modell:

- **Code-Rollen** (Arbiter, UI, SIM, Contract) → `anthropic:claude-sonnet-4-20250514`
- **Review-Rollen** (Protocol, Arch, Quality, Gate) → `openai:gpt-4o`
- **Leichte Rollen** (DocAudit, ScopeRouter, Versioning) → `openai:gpt-4o-mini`

### Custom Config

Eigene `config.json` erstellen:

```json
{
  "defaultProvider": "ollama",
  "defaultModel": "llama3",
  "roleModels": {
    "arbiter-coder": { "provider": "anthropic", "modelId": "claude-sonnet-4-20250514" }
  },
  "options": { "maxTokens": 8192, "temperature": 0.1 }
}
```

```bash
node agents/orchestrator/cli.mjs -t "..." -c my-config.json
```

### CLI-Override

```bash
# Globales Modell fuer alle Rollen
node agents/orchestrator/cli.mjs -t "..." -m "openai:gpt-4o"

# Nur Provider wechseln
node agents/orchestrator/cli.mjs -t "..." --provider ollama
```

## Preflight-Integration

Der Orchestrator integriert die bestehende Preflight-Kette (`tools/llm-preflight.mjs`):

1. **classify** — Pfade klassifizieren (Scope bestimmen)
2. **entry** — Entry-Session starten
3. **ack** — Regeln bestaetigen
4. **check** — Schreibberechtigung pruefen

Zusatzregel (Default): Rebuttal-Subagents sind verpflichtend **an** und werden pro Task/File-Scan/Analyse neu erzeugt und nach Task-Ende explizit geschlossen.
Ein Deaktivieren ist nur per explizitem User-Opt-out erlaubt (`--no-subagents`).

Preflight ist im CLI fest aktiviert und kann nicht per Flag deaktiviert werden.
Fuer governance-konforme operative Runs muessen sinnvolle `--paths` gesetzt werden, damit `classify -> entry -> ack -> check` auf dem betroffenen Scope ausgefuehrt wird (belegt durch `docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:65`ff.).

## CLI-Referenz

```
node agents/orchestrator/cli.mjs [Optionen]

Pflicht:
  --task, -t <text>        Aufgabenbeschreibung

Optionen:
  --paths, -p <p1,p2,...>  Dateipfade (kommagetrennt)
  --pipeline, -P <name>    Pipeline-Name
  --model, -m <spec>       Globales Modell ("provider:model")
  --provider <name>        Default-Provider
  --config, -c <path>      Custom-Config-Datei
  --dry-run, -d            Simulation ohne LLM-Aufrufe
  --verbose, -v            Detaillierte Ausgabe
  --validate               Nur Config validieren
  --preflight-mode <mode>  Preflight-Modus (work|security|audit)
  --no-subagents           Explizites Opt-out fuer Rebuttal-Subagents
  --rounds <n>             Nur fuer red-team-v2: Anzahl Runden
  --list-pipelines         Pipelines auflisten
  --list-roles             Rollen auflisten
  --help, -h               Hilfe
```

## Rollen

Alle 14 Rollen aus `agents/llm-entry-sequence/` werden automatisch geladen:

| Rolle | Funktion | Output |
| --- | --- | --- |
| Task-Orchestrator | Plant Aufgaben und routet zu Agents | `PLAN.md` |
| Scope-Router | Klassifiziert Scope gegen Matrix | `SCOPE_MAP.md` |
| Arbiter-Coder | Implementiert Code-Slices | `PATCH.md` |
| Protocol-Enforcer | Prueft Protokoll-Einhaltung | `PROTOCOL_REPORT.md` |
| Architecture-Guardian | Prueft Schicht-Grenzen | `ARCH_REVIEW.md` |
| Documentation-Auditor | Prueft Doku-Sync | `DOC_AUDIT.md` |
| Quality-Reviewer | Prueft Tests + Regression | `QUALITY_REPORT.md` |
| Domain-Coordinator | Koordiniert Cross-Domain | `DOMAIN_SYNC.md` |
| UI-Coder | UI-Implementierung | `UI_PATCH_REPORT.md` |
| SIM-Coder | Simulations-Implementierung | `SIM_PATCH_REPORT.md` |
| Contract-Coder | Contract-Implementierung | `CONTRACT_PATCH_REPORT.md` |
| Test-Engineer | Test-Implementierung | `TEST_REPORT.md` |
| Versioning-Release | Versionierung | `VERSION_REPORT.md` |
| Gate-Compliance-Checker | Finale Gate-Pruefung | `GATE_REPORT.md` |

## Session-Persistenz

Jede Ausfuehrung erzeugt eine Session-Datei unter `.llm/orchestrator-sessions/`:

```json
{
  "id": "orch-1773977349459-m8w6wm",
  "task": "Add zoom feature",
  "pipeline": "default",
  "status": "completed",
  "results": { ... },
  "errors": [],
  "preflight": { ... }
}
```

## Erweiterung

### Neuen Provider hinzufuegen

1. Neue Datei `models/my-provider.mjs` erstellen
2. `BaseModelAdapter` extenden und `chat()` implementieren
3. In `models/index.mjs` registrieren

### Neue Pipeline hinzufuegen

In `orchestrator.mjs` unter `PIPELINES` eintragen:

```js
myPipeline: [
  "task-orchestrator",
  ["ui-coder", "sim-coder"],  // parallel
  "gate-compliance-checker",
],
```
