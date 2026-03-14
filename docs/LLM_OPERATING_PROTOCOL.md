# LLM_OPERATING_PROTOCOL

## Verbindlicher Operativer Standard
- manifest-first
- deterministic-first
- evidence-first
- scope-first

## Pflicht pro (Sub)Task
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## Phasenpflicht (hart)
- LESEN:
  - `docs/LLM_ENTRY.md`
  - genau ein task-spezifischer Entry gemaess `docs/llm/TASK_ENTRY_MATRIX.json`
- PRUEFEN:
  - Preflight erfolgreich fuer den aktiv klassifizierten Task
  - Ack vorhanden und hash-konsistent fuer globalen + task-spezifischen Entry
- SCHREIBEN:
  - nur im Scope des aktiv klassifizierten Tasks
  - kein Scope-Mix; bei Mehrfachscope in Subtasks aufteilen
- DOKU:
  - zuerst task-spezifische Doku aktualisieren
  - `docs/MASTER_CHANGE_LOG.md` nur als globale Fallback-/Gesamtansicht

## Verboten
- Schreiben ohne LESEN von `docs/LLM_ENTRY.md` + passendem Task-Entry
- Testlauf ohne Ack
- Taskwechsel ohne neue Klassifikation + neues Ack
- direkte State-Mutation
- Kernel-Fachlogik-Mischung
- Legacy-Pfade reaktivieren
- Testaussagen ohne echten Lauf
