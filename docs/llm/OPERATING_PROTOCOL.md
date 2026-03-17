# OPERATING PROTOCOL

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN
- zuerst `docs/WORKFLOW.md`
- dann `docs/llm/ENTRY.md`
- dann genau einen Task-Entry

## PRUEFEN
- Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
- Session im Chat mit `entry` beginnen; das ist Pflicht, ersetzt aber keinen CLI-Preflight
- technische Kette exakt einhalten:
  1. `node tools/llm-preflight.mjs classify --paths <...>`
  2. `node tools/llm-preflight.mjs entry --paths <...> --mode work|security`
  3. `node tools/llm-preflight.mjs ack --paths <...>`
  4. `node tools/llm-preflight.mjs check --paths <...>`
- in allen vier Schritten dieselbe kanonische Pfadmenge verwenden
- vor Test und Schreiben immer ein gruener `check` fuer genau diesen Scope
- vor Commit Scope immer isolieren (`git restore --staged .`, dann nur Zielpfade stagen)
- Preflight immer seriell pro Commit-Scope fahren; keine Scope-Mischung in einer Kette
- Hook-Guards einmal aktivieren: `npm run hooks:install`

## SCHREIBEN
- kein Schreiben ohne gelesenen LLM-Entry plus passendem Task-Entry
- kein Scope-Mix ohne neuen Subtask
- Commits sind task-rein:
  - ein Commit enthaelt nur Pfade aus genau einem klassifizierten Task
  - gemischte Tasks (`testing` + `versioning` usw.) werden in getrennte Commits gesplittet
- task-spezifische Doku vor globaler Statuspflege
- kein Weiterarbeiten nach `check`-Rot; erst neuen Scope-Preflight aufbauen
- UMGEHUNG (z. B. direkte State-/Patch-Injektion zur Abkuerzung von Flows) ist nur mit expliziter Ruecksprache erlaubt.

## DOKU
- `docs/STATUS.md` ist globale Fallback-Ansicht fuer Governance, Bugfixes und Change-Stand
- task-spezifische Doku lebt in `docs/llm/`
- Top-Level-Doku bleibt absichtlich auf vier Dateien begrenzt
