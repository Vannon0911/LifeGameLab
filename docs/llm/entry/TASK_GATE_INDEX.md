# Task Gate Index

## Zweck
Minimale Pflicht-Leselisten pro Task, damit LLMs ohne Repo-Vollscan gate-konform arbeiten koennen.
Reihenfolge: diese Datei kommt erst nach `docs/WORKFLOW.md`, `docs/llm/ENTRY.md`, `docs/llm/OPERATING_PROTOCOL.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md` und `docs/llm/TASK_ENTRY_MATRIX.json`.
Danach werden alle Task-Sets fuer alle klassifizierten Scopes gelesen, nicht nur eins.

## Globale Mindest-Gates (immer)
1. `src/game/contracts/manifest.js` (SoT)
2. `src/kernel/store/createStore.js`
3. `src/kernel/store/applyPatches.js`

## Zusaetzliche Pflichtregel (immer)
1. Vor jedem Commit betroffene Dokuquellen, Stringmatrix und Inventar auf aktuellen Stand nachziehen.
2. Am Ende jedes Arbeitsschritts Aktualitaet von Code, Gates, Doku und Traceability explizit pruefen.
3. Jeder abgeschlossene Slice erhoeht die Version um `0.0.1`; Teilstufen `a/b/c/d` bleiben nur Dokument-Anhaenge.

## UI Task
1. `src/game/ui/ui.js`
2. `src/game/ui/ui.model.js`
3. `src/game/ui/ui.constants.js`
4. `src/game/ui/ui.js`
5. `src/app/main.js` (wenn Caller/Boot betroffen)

## GAMEPLAY Task
1. `src/game/sim/reducer/index.js`
2. `src/game/sim/step.js`
3. `src/game/sim/stepPhases.js`
4. `src/game/sim/stepRuntime.js`
5. `src/game/sim/worldgen.js`

## CONTRACTS Task
1. `src/game/contracts/stateSchema.js`
2. `src/game/contracts/actionSchema.js`
3. `src/game/contracts/mutationMatrix.js`
4. `src/game/contracts/simGate.js`
5. `src/game/contracts/dataflow.js`

## TESTING Task
1. `tools/llm-preflight.mjs`
2. `tools/run-test-suite.mjs`
3. `tools/run-all-tests.mjs`
4. `tests/test-llm-contract.mjs`
5. `tests/support/liveTestKit.mjs`

## VERSIONING Task
1. `package.json`
2. `src/game/contracts/manifest.js`
3. `docs/STATUS.md`
4. `docs/ARCHITECTURE.md`

## Wichtige Regel
Wenn ein Task ueber dieses Minimum hinausgeht, dann nur gezielt die betroffenen Dateien nachladen.
Kein blindes Full-Repo-Scannen.
