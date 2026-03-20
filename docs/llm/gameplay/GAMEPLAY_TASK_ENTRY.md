# Gameplay Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`
6. `docs/llm/TASK_ENTRY_MATRIX.json`
7. `docs/llm/entry/TASK_GATE_INDEX.md` (GAMEPLAY + globale Mindest-Gates)
8. diese Datei
9. `src/game/contracts/manifest.js`
10. `src/kernel/store/createStore.js`
11. `src/kernel/store/applyPatches.js`
12. `src/game/sim/reducer/index.js`
13. `src/game/sim/worldgen.js`
14. `src/game/sim/step.js`
15. `src/game/sim/stepPhases.js`
16. `src/game/sim/stepRuntime.js`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur GAMEPLAY-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs classify --paths src/game/sim/,src/game/runtime/index.js,src/app/main.js`
- `node tools/llm-preflight.mjs entry --paths src/game/sim/,src/game/runtime/index.js,src/app/main.js --mode work`
- `node tools/llm-preflight.mjs ack --paths src/game/sim/,src/game/runtime/index.js,src/app/main.js`
- `node tools/llm-preflight.mjs check --paths src/game/sim/,src/game/runtime/index.js,src/app/main.js`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passendem Task-Entry.
- Kein Schreiben ohne vollstaendige Pflicht-Lesereihenfolge.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Gameplay-/Runtime-Scope.
- Bei Multi-Scope alle passenden Task-Entries lesen und einen gemeinsamen Preflight fahren.
- Vor jedem Commit muessen Gameplay-Doku, betroffene Top-Level-Doku und relevante Stringmatrix-/Inventar-Dateien nachgezogen werden.

## DOKU (pflicht)
- Zuerst gameplay-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.
- Am Ende jedes Arbeitsschritts ist explizit zu pruefen, dass Runtime, Gates, Doku und Traceability denselben Stand haben.

## Taskregel
Deterministische Reihenfolge und Patch-only Contract bleiben unveraendert.
- Pro abgeschlossenem Slice ist die Version um `0.0.1` zu erhoehen; Teilstufen `a/b/c/d` werden nur als Dokumentanhang gefuehrt.
