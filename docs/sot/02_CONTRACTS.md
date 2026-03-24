# 02 Contracts

## SoT Dateien
- src/game/contracts/stateSchema.js
- src/game/contracts/actionSchema.js
- src/game/contracts/mutationMatrix.js
- src/game/contracts/simGate.js
- src/game/contracts/manifest.js
- src/game/contracts/dataflow.js

## Contract-Basis (aus mutationMatrix.js)
- Wahrheitsquelle fuer mutierende Actions: `src/game/contracts/mutationMatrix.js`
- Jede Action aus `actionSchema.js` muss einen passenden Eintrag in der Mutation-Matrix besitzen.
- Genesis-Legacy-Actions sind entfernt (`CONFIRM_FOUNDATION`, `CONFIRM_CORE_ZONE`, `TOGGLE_DNA_ZONE_WORKER`, `BUILD_INFRA_PATH`).

## Mainline-Phasenvertrag
- `GEN_WORLD` erzeugt die Welt deterministisch aus `meta.seed`.
- Startphase nach `GEN_WORLD`: `RUN_ACTIVE`.
- `MAP_BUILDER` bleibt optionaler Override-Pfad.
- `SIM_STEP` darf nur unter `RUN_ACTIVE` mutieren.

## Kennzahlen
- Sim Gate maxPatches: 5000
- Sim Gate maxTiles: 250000
