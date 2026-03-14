# UI Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/LLM_ENTRY.md`
2. `docs/LLM_OPERATING_PROTOCOL.md`
3. diese Datei
4. `src/game/ui/ui.constants.js`
5. `src/game/ui/ui.model.js`
6. `src/game/ui/ui.dom.js`
7. `src/game/ui/ui.feedback.js`
8. `src/game/ui/ui.js`

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths src/game/ui/,src/game/render/,src/project/ui.js`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/LLM_ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur UI/Renderer-Scope.
- Kein SIM-/CONTRACT-Scope-Mix ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Zuerst UI-spezifische Doku/Artefakte.
- `docs/MASTER_CHANGE_LOG.md` nur globale Fallback-Ansicht.

## Taskregel
Main-Run bleibt auf `lage/eingriffe/evolution/welt`; Labor kapselt Diagnose-/Legacy-Pfade.
