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
- Startphase nach `GEN_WORLD`: `PHASE_0_OVERVIEW` fuer `10s` (`240` ticks bei `24 TPS`).
- Danach ist Mainline-Startphase: `RUN_ACTIVE`.
- `MAP_BUILDER` bleibt optionaler Override-Pfad.
- `SIM_STEP` darf nur unter `RUN_ACTIVE` mutieren.

## Sprachregel (MVP)
- Der alte Produktbegriff `Energy` wird als `Nahrung` gefuehrt.
- Solange Runtime-Felder noch technisch `energy` heissen, gilt:
  - Produktsprache/Dokumentation: `Nahrung`
  - Technische Feldnamen: bis Umstellung unveraendert

## Kennzahlen
- Sim Gate maxPatches: 5000
- Sim Gate maxTiles: 250000
- Default test map size: 96x96
- Core footprint: 4x4
- Largest object target: up to 8x8
