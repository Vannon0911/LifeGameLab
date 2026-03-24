# Contract Task Entry

## Pflichtzyklus
LESEN -> PRUEFEN -> SCHREIBEN -> DOKU

## LESEN (pflicht)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`
6. `docs/llm/TASK_ENTRY_MATRIX.json`
7. `docs/llm/entry/TASK_GATE_INDEX.md` (CONTRACTS + globale Mindest-Gates)
8. diese Datei
9. `src/game/contracts/manifest.js`
10. `src/kernel/store/createStore.js`
11. `src/kernel/store/applyPatches.js`
12. `src/game/contracts/stateSchema.js`
13. `src/game/contracts/actionSchema.js`
14. `src/game/contracts/mutationMatrix.js`
15. `src/game/contracts/simGate.js`
16. `src/game/contracts/dataflow.js`

## Minimalzugriff Ohne Vollscan
- Immer zuerst globale Mindest-Gates aus `TASK_GATE_INDEX.md` laden.
- Danach nur CONTRACTS-Task-Set laden und weitere Dateien ausschliesslich nach betroffenen Pfaden.

## PRUEFEN (pflicht, vor Schreiben/Test)
- `node tools/llm-preflight.mjs classify --paths src/game/contracts/,src/kernel/,src/game/manifest.js`
- `node tools/llm-preflight.mjs entry --paths src/game/contracts/,src/kernel/,src/game/manifest.js --mode work`
- `node tools/llm-preflight.mjs ack --paths src/game/contracts/,src/kernel/,src/game/manifest.js`
- `node tools/llm-preflight.mjs check --paths src/game/contracts/,src/kernel/,src/game/manifest.js`

## SCHREIBEN (pflicht)
- Kein Schreiben ohne `docs/llm/ENTRY.md` + passenden Task-Entry.
- Kein Schreiben ohne vollstaendige Pflicht-Lesereihenfolge.
- Kein Test ohne passendes Ack.
- Kein Taskwechsel ohne neue Klassifikation + neues Ack.
- Nur Contract-/Kernel-Contract-Scope.
- Bei Multi-Scope alle passenden Task-Entries lesen und einen gemeinsamen Preflight fahren.
- Vor jedem Commit muessen Contract-Doku, betroffene Top-Level-Doku sowie relevante Stringmatrix-/Inventar-Dateien nachgezogen werden.

## DOKU (pflicht)
- Zuerst Contract-spezifische Doku.
- `docs/STATUS.md` nur globale Fallback-Ansicht.
- Am Ende jedes Arbeitsschritts ist explizit zu pruefen, dass Contract, Gates, Doku und Traceability synchron sind.

## Taskregel
Keine neue Action/Feldlogik vor vollstaendigem Contract.
- Pro abgeschlossenem Slice ist die Version um `0.0.1` zu erhoehen; Teilstufen `a/b/c/d` werden nur als Dokumentanhang gefuehrt.

## Klassifizierungs-Hinweis
- `src/game/contracts/*`, `src/kernel/*`, `src/game/manifest.js` und `src/game/contracts/*` gehoeren zum Contract-Task.
- Insbesondere `src/game/contracts/ids.js` ist Contract-Core und darf nicht aus der Matrix fallen.
