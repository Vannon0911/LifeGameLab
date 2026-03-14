# Contract Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/LLM_ENTRY.md`
2. `docs/LLM_OPERATING_PROTOCOL.md`
3. diese Datei
4. `src/project/contract/stateSchema.js`
5. `src/project/contract/actionSchema.js`
6. `src/project/contract/mutationMatrix.js`
7. `src/project/contract/simGate.js`
8. `src/project/contract/dataflow.js`

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths src/project/contract/,src/core/kernel/`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/LLM_ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Contract-/Kernel-Contract-Scope.
- Kein SIM-/UI-Scope-Mix ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Zuerst Contract-spezifische Doku.
- `docs/MASTER_CHANGE_LOG.md` nur globale Fallback-Ansicht.

## Taskregel
Keine neue Action/Feldlogik vor vollstaendigem Contract.
