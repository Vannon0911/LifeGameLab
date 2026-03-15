# Contract Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/llm/ENTRY.md`
2. `docs/llm/OPERATING_PROTOCOL.md`
3. diese Datei
4. `docs/llm/entry/TASK_GATE_INDEX.md` (CONTRACTS + globale Mindest-Gates)
5. `src/project/contract/stateSchema.js`
6. `src/project/contract/actionSchema.js`
7. `src/project/contract/mutationMatrix.js`
8. `src/project/contract/simGate.js`
9. `src/project/contract/dataflow.js`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur CONTRACTS-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs check --paths src/project/contract/,src/core/kernel/`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Contract-/Kernel-Contract-Scope.
- Kein SIM-/UI-Scope-Mix ohne neuen Subtask mit eigener Klassifikation.

## DOKU (pflicht)
- Zuerst Contract-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.

## Taskregel
Keine neue Action/Feldlogik vor vollstaendigem Contract.

## Klassifizierungs-Hinweis
- `src/project/contract/*`, `src/core/kernel/*` und `src/game/contracts/*` gehoeren zum Contract-Task.
- Insbesondere `src/game/contracts/ids.js` ist Contract-Core und darf nicht aus der Matrix fallen.
