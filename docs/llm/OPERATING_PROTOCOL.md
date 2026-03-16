# OPERATING PROTOCOL

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN
- zuerst `docs/WORKFLOW.md`
- dann `docs/llm/ENTRY.md`
- dann genau einen Task-Entry

## PRUEFEN
- Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
- Session starten: `node tools/llm-preflight.mjs entry --paths <...> --mode work|security`
- Ack ueber `tools/llm-preflight.mjs`
- vor Test und Schreiben immer `check`
- Hook-Guards einmal aktivieren: `npm run hooks:install`

## SCHREIBEN
- kein Schreiben ohne gelesenen LLM-Entry plus passendem Task-Entry
- kein Scope-Mix ohne neuen Subtask
- task-spezifische Doku vor globaler Statuspflege
- UMGEHUNG (z. B. direkte State-/Patch-Injektion zur Abkuerzung von Flows) ist nur mit expliziter Ruecksprache erlaubt.

## DOKU
- `docs/STATUS.md` ist globale Fallback-Ansicht fuer Governance, Bugfixes und Change-Stand
- task-spezifische Doku lebt in `docs/llm/`
- Top-Level-Doku bleibt absichtlich auf vier Dateien begrenzt
