# UI Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/llm/ENTRY.md`
2. `docs/llm/OPERATING_PROTOCOL.md`
3. diese Datei
4. `docs/llm/entry/TASK_GATE_INDEX.md` (UI + globale Mindest-Gates)
5. `src/game/ui/ui.constants.js`
6. `src/game/ui/ui.model.js`
7. `src/game/ui/ui.dom.js`
8. `src/game/ui/ui.feedback.js`
9. `src/game/ui/ui.js`
10. `src/app/main.js` falls der Task UI-Caller oder Boot-/Reset-Orchestrierung beruehrt

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur UI-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths src/app/,src/game/ui/,src/game/render/,src/project/ui.js`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- UI/Renderer-Scope inklusive `src/app/`-Boot-/Caller-Orchestrierung.
- Kein SIM-/CONTRACT-Scope-Mix ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Zuerst UI-spezifische Doku/Artefakte.
- `docs/STATUS.md` nur globale Fallback-Ansicht.

## Taskregel
Main-Run bleibt auf `lage/eingriffe/evolution/welt`; Labor kapselt Diagnose-/Legacy-Pfade.
