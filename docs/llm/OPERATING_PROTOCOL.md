# OPERATING PROTOCOL

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN
- zuerst `docs/WORKFLOW.md`
- dann `docs/llm/ENTRY.md`
- dann genau einen Task-Entry

## PRUEFEN
- Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
- Ack ueber `tools/llm-preflight.mjs`
- vor Test und Schreiben immer `check`

## SCHREIBEN
- kein Schreiben ohne gelesenen LLM-Entry plus passendem Task-Entry
- kein Scope-Mix ohne neuen Subtask
- task-spezifische Doku vor globaler Statuspflege

## DOKU
- `docs/STATUS.md` ist globale Fallback-Ansicht fuer Governance, Bugfixes und Change-Stand
- task-spezifische Doku lebt in `docs/llm/`
- Top-Level-Doku bleibt absichtlich auf vier Dateien begrenzt
