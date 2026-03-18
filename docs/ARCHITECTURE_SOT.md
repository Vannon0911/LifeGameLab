# ARCHITECTURE_SOT

Stand: Head `0b4ef5b` (2026-03-18)

## Ziel
Dieses Dokument ist die Source-of-Truth-Ansicht fuer Architektur, Datenfluss, Funktionsverantwortung und Gates im aktuellen Code-Stand.

## Systembild (Kurzfassung)
- Manifest-first bleibt aktiv.
- State-Updates sind patch-only.
- Der Kernel ist die einzige Schreibinstanz fuer Gameplay-State.
- UI/Renderer lesen State, schreiben ihn nicht direkt.
- Reducer und simStep laufen unter Determinismus-Guard.

## End-to-End Datenfluss
1. UI/Runtime erzeugt Action (`dispatch`).
2. Action wird gegen `actionSchema` validiert.
3. Reducer laeuft in `runWithDeterminismGuard(...)`.
4. Reducer gibt Patches zurueck.
5. Patches werden gegen `mutationMatrix` geprueft.
6. Patches laufen durch `domainPatchGate` (`assertDomainPatchesAllowed`, inkl. simGate-Checks).
7. Patches werden via `applyPatches` sicher angewandt (Safe-Path-Regeln).
8. State wird via `sanitizeBySchema` normalisiert.
9. Bei `SIM_STEP`: `simStepPatch` wird separat erneut mit Guard + Gates ausgefuehrt.
10. Ergebnis wird `deepFreeze`d, persistiert, emittiert, gerendert.

## Gate-Kette (hart)
- Action Gate: `src/kernel/validation/validateAction.js`
- Determinismus Gate: `src/kernel/determinism/runtimeGuards.js`
- Mutation Gate: `src/kernel/store/applyPatches.js` (`assertPatchesAllowed`)
- Domain Gate: `src/game/plugin/gates.js` + `src/project/contract/simGate.js`
- Patch Safety Gate: `src/kernel/store/applyPatches.js` (`assertSafePath`, prototype pollution guards)
- State Gate: `src/kernel/validation/validateState.js`

## SoT-Matrix (Source of Truth)
- Contract-SoT
  - Dateien: `src/project/contract/stateSchema.js`, `actionSchema.js`, `mutationMatrix.js`, `simGate.js`, `manifest.js`, `dataflow.js`
  - Verantwortung: Was State/Actions/Patch-Pfade duerfen.
- Runtime-Pipeline-SoT
  - Datei: `src/kernel/store/createStore.js`
  - Verantwortung: Exakte Dispatch-Reihenfolge und Durchsetzung der Gates.
- Domain-Validierung-SoT
  - Dateien: `src/game/plugin/gates.js`, `src/project/contract/simGate.js`
  - Verantwortung: Fachliche Integritaet (TypedArray ctor/len, Limits, Sim-Key-Typen).
- Simulations-SoT
  - Dateien: `src/game/sim/reducer/index.js`, `src/game/sim/step.js`, `src/game/sim/stepPhases.js`
  - Verantwortung: Run-Phasen, Tick-Effekte, Metriken, Progression, Win.
- Determinismus-SoT
  - Dateien: `src/kernel/determinism/rng.js`, `src/kernel/determinism/runtimeGuards.js`
  - Verantwortung: Reproduzierbare Entropie + Blockade nicht-deterministischer Quellen.
- Persistenz-SoT
  - Datei: `src/kernel/store/persistence.js`
  - Verantwortung: Driver-Wahl (`meta-only` im Browser als Default).
- Render-SoT
  - Dateien: `src/app/main.js`, `src/game/render/renderer.js`, `src/game/render/fogOfWar.js`
  - Verantwortung: Visualisierung, Fog-Redaktion, Worker/Main-Fallback.
- LLM-SoT
  - Dateien: `src/project/llm/commandAdapter.js`, `advisorModel.js`, `readModel.js`, `gateSync.js`
  - Verantwortung: LLM command envelope, advisor reasoning, fog-aware read model, contract sync check.

## State-Ownership (wer schreibt was)
- `meta/*`
  - Primär: Reducer-Actions (`SET_*`, `GEN_WORLD`, `SIM_STEP` fuer `meta/globalLearning`, Grid bei Expansion)
  - Gate: `mutationMatrix` + `stateSchema`
- `world/*`
  - Primär: Reducer/simStepPatch (`GEN_WORLD`, player actions, `SIM_STEP`)
  - Datentyp-Integritaet: `simGate.world.keys`
- `sim/*`
  - Primär: Reducer/simStepPatch (tick, metrics, run phase, progression, win)
  - Key/Typ-Integritaet: `simGate.sim.keys` + boolean/string/object key sets

## GlobalLearning Datenfluss
1. `GEN_WORLD`: `applyGlobalLearningToWorld(world, meta.globalLearning)` injiziert Bankwerte in `world.lineageMemory`.
2. `SIM_STEP`: `mergeWorldLearningIntoBank(...)` verdichtet Live-Memory zurueck nach `meta.globalLearning.bank`.
3. `SET_GLOBAL_LEARNING`/`RESET_GLOBAL_LEARNING`: halten `meta` und `world` synchron gemaess mutation matrix.

Relevante Dateien:
- `src/game/sim/reducer/techTreeOps.js`
- `src/game/sim/reducer/index.js`
- `src/project/contract/mutationMatrix.js`

## Runtime-Topologie
- Sim-Takt: `setInterval(1000/24)`.
- Render-Takt: `requestAnimationFrame(loop)`.
- Render nutzt `alpha`-Interpolation aus Zeit seit letztem Sim-Step.

Datei:
- `src/app/main.js`

## Wichtig: deklarierte aber derzeit nicht aktive/verdrahtete Teile
- `runRemoteClusterAttacks(...)` ist implementiert, aber aktuell nicht in `runWorldSystemsPhase(...)` aufgerufen.
  - Datei: `src/game/sim/conflict.js`
- `seedDeterministicBootstrapCluster(...)` ist vorhanden, aktueller CPU-Bootstrap in reducer nutzt jedoch direkten Startwindow-Spawn.
  - Dateien: `src/game/sim/worldgen.js`, `src/game/sim/reducer/index.js`

## Umfang (Codeinventur)
- Vollstaendige Symbolinventur: `output/function-inventory.json`
- Kategorisierte Inventur: `output/function-inventory-categorized.md`
- Gesamt: 553 Symbole in 78 Dateien (ohne `node_modules`)

## Vollstaendige Action->WritePath SoT
Die folgende Matrix wird direkt aus `src/project/contract/mutationMatrix.js` generiert und ist damit der verbindliche Write-Scope je Action.

| Action | Write-Pfade (mutationMatrix) |
|---|---|
| `GEN_WORLD` | `/meta/worldPresetId`, `/meta/physics`, `/meta/playerLineageId`, `/meta/cpuLineageId`, `/world/`, `/world/actionMap`, `/sim/` |
| `CONFIRM_FOUNDATION` | `/sim/runPhase`, `/sim/running` |
| `CONFIRM_CORE_ZONE` | `/world/alive`, `/world/E`, `/world/reserve`, `/world/link`, `/world/lineageId`, `/world/hue`, `/world/trait`, `/world/age`, `/world/born`, `/world/died`, `/world/W`, `/world/coreZoneMask`, `/world/zoneRole`, `/world/zoneId`, `/world/zoneMeta`, `/sim/patternCatalog`, `/sim/patternBonuses`, `/sim/unlockedZoneTier`, `/sim/nextZoneUnlockKind`, `/sim/nextZoneUnlockCostEnergy`, `/sim/zoneUnlockProgress`, `/sim/coreEnergyStableTicks`, `/sim/zone2Unlocked`, `/sim/zone2PlacementBudget`, `/sim/dnaZoneCommitted`, `/sim/nextInfraUnlockCostDNA`, `/sim/cpuBootstrapDone`, `/sim/aliveCount`, `/sim/playerAliveCount`, `/sim/cpuAliveCount`, `/sim/runPhase`, `/sim/running` |
| `START_DNA_ZONE_SETUP` | `/world/dnaZoneMask`, `/sim/runPhase`, `/sim/running`, `/sim/zone2Unlocked`, `/sim/zone2PlacementBudget` |
| `TOGGLE_DNA_ZONE_CELL` | `/world/dnaZoneMask`, `/sim/zone2PlacementBudget` |
| `CONFIRM_DNA_ZONE` | `/world/dnaZoneMask`, `/world/infraCandidateMask`, `/world/zoneRole`, `/world/zoneId`, `/world/zoneMeta`, `/sim/dnaZoneCommitted`, `/sim/unlockedZoneTier`, `/sim/nextZoneUnlockKind`, `/sim/nextZoneUnlockCostEnergy`, `/sim/zoneUnlockProgress`, `/sim/coreEnergyStableTicks`, `/sim/nextInfraUnlockCostDNA`, `/sim/infrastructureUnlocked`, `/sim/infraBuildMode`, `/sim/infraBuildCostEnergy`, `/sim/infraBuildCostDNA`, `/sim/patternCatalog`, `/sim/patternBonuses`, `/sim/zone2PlacementBudget`, `/sim/runPhase`, `/sim/running` |
| `BEGIN_INFRA_BUILD` | `/world/infraCandidateMask`, `/sim/infraBuildMode`, `/sim/running` |
| `BUILD_INFRA_PATH` | `/world/infraCandidateMask` |
| `CONFIRM_INFRA_PATH` | `/world/infraCandidateMask`, `/world/link`, `/world/zoneRole`, `/world/zoneId`, `/world/zoneMeta`, `/world/E`, `/sim/patternCatalog`, `/sim/patternBonuses`, `/sim/playerDNA`, `/sim/playerEnergyStored`, `/sim/infrastructureUnlocked`, `/sim/infraBuildMode`, `/sim/running` |
| `TOGGLE_RUNNING` | `/sim/running` |
| `SIM_STEP` | `/meta/globalLearning`, `/meta/gridW`, `/meta/gridH`, `/meta/simStepCount`, `/sim/runSummary`, `/world/`, `/sim/` |
| `SET_SPEED` | `/meta/speed` |
| `SET_SEED` | `/meta/seed` |
| `SET_SIZE` | `/meta/gridW`, `/meta/gridH` |
| `SET_WORLD_PRESET` | `/meta/worldPresetId`, `/meta/physics`, `/meta/playerLineageId`, `/meta/cpuLineageId`, `/world/`, `/sim/` |
| `SET_RENDER_MODE` | `/meta/renderMode` |
| `SET_PHYSICS` | `/meta/physics` |
| `SET_BRUSH` | `/meta/brushMode`, `/meta/brushRadius` |
| `SET_UI` | `/meta/ui` |
| `SET_GLOBAL_LEARNING` | `/meta/globalLearning`, `/world/globalLearning` |
| `RESET_GLOBAL_LEARNING` | `/meta/globalLearning`, `/world/globalLearning`, `/world/lineageMemory` |
| `SET_TILE` | `/world/R` |
| `PLACE_CELL` | `/world/alive`, `/world/E`, `/world/reserve`, `/world/link`, `/world/lineageId`, `/world/hue`, `/world/trait`, `/world/age`, `/world/born`, `/world/died`, `/world/W`, `/world/founderMask`, `/sim/playerDNA`, `/sim/founderPlaced` |
| `ISSUE_ORDER` | `/sim/unitOrder`, `/sim/activeOrder`, `/sim/selectedUnit`, `/sim/lastCommand` |
| `PLACE_SPLIT_CLUSTER` | `/world/alive`, `/world/E`, `/world/reserve`, `/world/link`, `/world/lineageId`, `/world/hue`, `/world/trait`, `/world/age`, `/world/born`, `/world/died`, `/world/W`, `/sim/playerDNA` |
| `HARVEST_CELL` | `/sim/playerDNA`, `/sim/totalHarvested`, `/world/alive`, `/world/E` |
| `HARVEST_PULSE` | `/world/P`, `/world/R`, `/world/Sat`, `/world/lineageMemory`, `/sim/playerDNA`, `/sim/harvestYieldTotal`, `/sim/meanWaterField`, `/sim/stabilityScore`, `/sim/ecologyScore`, `/sim/stageProgressScore`, `/sim/activeBiomeCount`, `/sim/playerStage` |
| `PRUNE_CLUSTER` | `/world/P`, `/world/W`, `/world/lineageMemory`, `/sim/playerDNA`, `/sim/pruneYieldTotal`, `/sim/meanWaterField`, `/sim/stabilityScore`, `/sim/ecologyScore`, `/sim/stageProgressScore`, `/sim/activeBiomeCount`, `/sim/playerStage` |
| `RECYCLE_PATCH` | `/world/W`, `/world/R`, `/world/Sat`, `/world/lineageMemory`, `/sim/playerDNA`, `/sim/recycleYieldTotal`, `/sim/meanWaterField`, `/sim/stabilityScore`, `/sim/ecologyScore`, `/sim/stageProgressScore`, `/sim/activeBiomeCount`, `/sim/playerStage` |
| `SEED_SPREAD` | `/world/P`, `/world/R`, `/world/B`, `/world/lineageMemory`, `/sim/playerDNA`, `/sim/seedYieldTotal`, `/sim/meanWaterField`, `/sim/stabilityScore`, `/sim/ecologyScore`, `/sim/stageProgressScore`, `/sim/activeBiomeCount`, `/sim/playerStage` |
| `SET_ZONE` | `/world/zoneMap` |
| `BUY_EVOLUTION` | `/sim/playerDNA`, `/world/trait`, `/world/hue`, `/world/lineageMemory` |
| `SET_PLAYER_DOCTRINE` | `/world/lineageMemory` |
| `SET_WIN_MODE` | `/sim/winMode` |
| `SET_OVERLAY` | `/meta/activeOverlay` |
| `SET_PLACEMENT_COST` | `/meta/placementCostEnabled` |

Anzahl Actions (Schema): `36`
Anzahl Actions (Mutation Matrix): `36`