# UI Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`
6. `docs/llm/TASK_ENTRY_MATRIX.json`
7. `docs/llm/entry/TASK_GATE_INDEX.md` (UI + globale Mindest-Gates)
8. diese Datei
9. `src/game/contracts/manifest.js`
10. `src/kernel/store/createStore.js`
11. `src/kernel/store/applyPatches.js`
12. `src/game/ui/ui.constants.js`
13. `src/game/ui/ui.js`
14. `src/app/main.js` falls der Task UI-Caller oder Boot-/Reset-Orchestrierung beruehrt

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur UI-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs classify --paths src/app/,src/game/ui/,src/game/render/,src/game/ui/ui.js`
- `node tools/llm-preflight.mjs entry --paths src/app/,src/game/ui/,src/game/render/,src/game/ui/ui.js --mode work`
- `node tools/llm-preflight.mjs ack --paths src/app/,src/game/ui/,src/game/render/,src/game/ui/ui.js`
- `node tools/llm-preflight.mjs check --paths src/app/,src/game/ui/,src/game/render/,src/game/ui/ui.js`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Schreiben ohne vollstaendige Pflicht-Lesereihenfolge.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- UI/Renderer-Scope inklusive `src/app/`-Boot-/Caller-Orchestrierung.
- Bei Multi-Scope alle passenden Task-Entries lesen und einen gemeinsamen Preflight fahren.
- Vor jedem Commit muessen UI-Doku, betroffene Top-Level-Doku und relevante Stringmatrix-/Inventar-Dateien nachgezogen werden.

## DOKU (pflicht)
- Zuerst UI-spezifische Doku/Artefakte.
- `docs/STATUS.md` nur globale Fallback-Ansicht.
- Am Ende jedes Arbeitsschritts ist explizit zu pruefen, dass UI-Flows, Gates, Doku und Traceability denselben Stand haben.

## Taskregel
Main-Run bleibt auf `lage/eingriffe/evolution/welt`; Labor kapselt Diagnose-/Legacy-Pfade.
- Pro abgeschlossenem Slice ist die Version um `0.0.1` zu erhoehen; Teilstufen `a/b/c/d` werden nur als Dokumentanhang gefuehrt.
