# Sim Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/llm/ENTRY.md`
2. `docs/llm/OPERATING_PROTOCOL.md`
3. diese Datei
4. `docs/llm/entry/TASK_GATE_INDEX.md` (SIM + globale Mindest-Gates)
5. `src/game/sim/reducer/index.js`
6. `src/game/sim/worldgen.js`
7. `src/game/sim/step.js`
8. `src/game/sim/stepPhases.js`
9. `src/game/sim/stepRuntime.js`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur SIM-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths src/game/sim/,src/project/project.logic.js`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur SIM-/Reducer-Scope.
- Kein UI-/CONTRACT-Scope-Mix ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Zuerst SIM-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.

## Taskregel
Deterministische Reihenfolge und Patch-only Contract bleiben unveraendert.
