// ============================================================
// Reducer — V4 COMPATIBLE (Patch-based)
// ============================================================

import { generateWorld } from "../worldgen.js";
import { simStep } from "../step.js";
import { PHYSICS_DEFAULT } from "../../../core/kernel/physics.js";
import { hashString, rng01 } from "../../../core/kernel/rng.js";
import { manifest } from "../../../project/project.manifest.js";
import { assertSimPatchesAllowed } from "../gate.js";
import { clamp, cloneTypedArray, paintCircle } from "../shared.js";
import {
  BRUSH_MODE,
  GAME_RESULT,
  WIN_MODE,
  WIN_MODE_SELECTABLE,
  isBrushMode,
  isOverlayMode,
} from "../../contracts/ids.js";
import {
  handleBuyEvolution,
  handleHarvestCell,
  handlePlaceCell,
  handlePlaceSplitCluster,
  handleSetPlayerDoctrine,
  handleSetZone,
} from "../playerActions.js";
import {
  WORLD_KEYS,
  WORLD_SIM_STEP_KEYS,
  SIM_KEYS,
  UI_KEYS,
  PHYSICS_KEYS,
  pushKeysPatches,
} from "./metrics.js";
import {
  DEV_MUTATION_CATALOG,
  defaultGlobalLearning,
  defaultDevMutationVault,
  mergeWorldLearningIntoBank,
  applyGlobalLearningToWorld,
} from "./techTreeOps.js";
import {
  expansionWorkGain,
  expansionWorkCost,
  shouldAutoExpand,
  expandWorldPreserve,
} from "./worldRules.js";
import { applyWinConditions, applyGoalCode } from "./winConditions.js";
import { handleDevBalanceRunAi } from "./cpuActions.js";

function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

function seededStartPhysics(seed, basePhysics) {
  const seedBase = hashString(seed || "life-light");
  let s = 1;
  const f = () => rng01(seedBase, s++);
  const p = { ...basePhysics };
  p.L_mean = clamp(basePhysics.L_mean * (0.90 + f() * 0.24), 0.10, 0.52);
  p.T_survive = clamp(basePhysics.T_survive * (0.85 + f() * 0.26), 0.03, 0.15);
  p.T_birth = clamp(Math.max(p.T_survive + 0.03, basePhysics.T_birth * (0.90 + f() * 0.22)), 0.06, 0.35);
  p.U_base = clamp(basePhysics.U_base * (0.86 + f() * 0.24), 0.015, 0.16);
  p.C_birth_base = clamp(basePhysics.C_birth_base * (0.82 + f() * 0.30), 0.12, 1.45);
  p.S_seed_base = clamp(basePhysics.S_seed_base * (0.86 + f() * 0.30), 0.10, 0.90);
  p.R_gen = clamp(basePhysics.R_gen * (0.80 + f() * 0.34), 0.004, 0.05);
  p.W_decay = clamp(basePhysics.W_decay * (0.82 + f() * 0.34), 0.004, 0.05);
  p.plantCloudDensity = clamp(basePhysics.plantCloudDensity * (0.72 + f() * 0.62), 0.2, 2.8);
  p.evoRuntimeStrength = clamp(basePhysics.evoRuntimeStrength * (0.80 + f() * 0.48), 0.0, 0.14);
  p.seasonAmp = clamp(basePhysics.seasonAmp * (0.70 + f() * 0.60), 0.0, 0.35);
  p.seasonPeriod = Math.round(clamp(basePhysics.seasonPeriod * (0.80 + f() * 0.44), 240, 1400));
  return p;
}

export function makeInitialState() {
  return {
    meta: {
      seed:        "life-light",
      gridW:       32,
      gridH:       32,
      speed:       4,
      brushMode:   BRUSH_MODE.OBSERVE,
      brushRadius: 3,
      renderMode:  "combined",
      physics:     { ...PHYSICS_DEFAULT },
      ui: {
        panelOpen: false,
        activeTab: "status",
        expertMode: false,
        showBiochargeOverlay: false,
        showRemoteAttackOverlay: true,
        showDefenseOverlay: true,
      },
      globalLearning: defaultGlobalLearning(),
      devMutationVault: defaultDevMutationVault(),
      placementCostEnabled: false,
    },
    world: null,
    sim: {
      tick: 0, running: false,
      aliveCount: 0, aliveRatio: 0,
      meanLAlive: 0, meanEnergyAlive: 0, meanReserveAlive: 0,
      meanNutrientField: 0, meanToxinField: 0, meanSaturationField: 0, meanPlantField: 0,
      meanBiochargeField: 0,
      lineageDiversity: 0,
      evolutionStageMean: 1,
      evolutionStageMax: 1,
      networkRatio: 0, clusterRatio: 0,
      birthsLastStep: 0, deathsLastStep: 0, mutationsLastStep: 0,
      raidEventsLastStep: 0, infectionsLastStep: 0, conflictKillsLastStep: 0, superCellsLastStep: 0,
      remoteAttacksLastStep: 0, remoteAttackKillsLastStep: 0, defenseActivationsLastStep: 0, resourceStolenLastStep: 0,
      expansionCount: 0, lastExpandTick: -99999, expansionWork: 0, nextExpandCost: 120,
      stockpileTicks: 0,
      winMode: WIN_MODE.SUPREMACY,
      gameResult: GAME_RESULT.NONE, gameEndTick: 0,
    },
  };
}

// Simulation bridge: clone mutable world buffers, then run step orchestrator.
function runWorldSimV4(world, meta, sim, rng) {
  // Core contract: simulation must not mutate store-owned state.
  // Store deep-freeze does not protect TypedArray elements, so we must clone any
  // TypedArrays that sim.js may write to, and then emit them back via patches.
  const worldMutable = { ...world };

  const cloneTA = (v) => (v && ArrayBuffer.isView(v)) ? new v.constructor(v) : v;
  // Arrays mutated by sim.js (kept explicit to avoid copying read-only fields).
  const TA_MUT_KEYS = [
    "alive", "E", "L", "R", "W", "Sat", "P", "B", "plantKind",
    "reserve", "link", "clusterField", "hue", "lineageId", "trait", "age", "born", "died",
    // lazily-created buffers inside sim.js:
    "actionMap",
  ];
  for (const k of TA_MUT_KEYS) {
    if (worldMutable[k] && ArrayBuffer.isView(worldMutable[k])) {
      worldMutable[k] = cloneTA(worldMutable[k]);
    }
  }

  // sim.js also mutates these plain objects.
  worldMutable.lineageMemory = cloneJson(world?.lineageMemory || {});
  worldMutable.clusterAttackState = cloneJson(world?.clusterAttackState || {});
  worldMutable.lineageThreatMemory = cloneJson(world?.lineageThreatMemory || {});
  worldMutable.lineageDefenseReadiness = cloneJson(world?.lineageDefenseReadiness || {});
  if (world?.balanceGovernor && typeof world.balanceGovernor === "object") worldMutable.balanceGovernor = cloneJson(world.balanceGovernor);
  if (world?.worldAiAudit && typeof world.worldAiAudit === "object") worldMutable.worldAiAudit = cloneJson(world.worldAiAudit);
  const metrics = simStep(worldMutable, {
    ...meta.physics,
    playerLineageId: (meta.playerLineageId | 0) || 1,
    cpuLineageId: (meta.cpuLineageId | 0) || 2,
    seasonLength: meta.physics?.seasonLength || 300,
  }, sim.tick);
  return { world: worldMutable, metrics };
}

export function reducer(state, action, { rng }) {
  switch (action.type) {

    case "GEN_WORLD": {
      const { meta } = state;
      const tunedPhysics = seededStartPhysics(meta.seed, PHYSICS_DEFAULT);
      const world = generateWorld(
        meta.gridW, meta.gridH,
        meta.seed,
        tunedPhysics
      );
      applyGlobalLearningToWorld(world, meta.globalLearning);
      world.devMutationVault = cloneJson(meta.devMutationVault || defaultDevMutationVault());
      // P3-02: zoneMap initialisieren — alle Zonen = 0 ('none')
      world.zoneMap = new Int8Array(meta.gridW * meta.gridH);
      
      const patches = [{ op: "set", path: "/meta/physics", value: tunedPhysics }];
      // Drift hardening: only patch known world keys.
      pushKeysPatches(patches, world, WORLD_KEYS, "/world");
      pushKeysPatches(patches, makeInitialState().sim, SIM_KEYS, "/sim");
      // P1-03: Fraktions-IDs deterministisch setzen (fix: 1 = player, 2 = cpu)
      patches.push({ op: "set", path: "/meta/playerLineageId", value: 1 });
      patches.push({ op: "set", path: "/meta/cpuLineageId", value: 2 });

      // Fix: compute initial alive count so UI shows correct stats at t=0
      // (sim stats are normally computed in simStepPatch, but we seed them here
      //  so the HUD does not display "alive 0" while the canvas already shows cells).
      const N = (meta.gridW | 0) * (meta.gridH | 0);
      let initialAlive = 0;
      for (let _i = 0; _i < N; _i++) { if (world.alive[_i] === 1) initialAlive++; }
      patches.push({ op: "set", path: "/sim/aliveCount", value: initialAlive });
      patches.push({ op: "set", path: "/sim/aliveRatio",  value: N > 0 ? initialAlive / N : 0 });

      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "TOGGLE_RUNNING": {
      const running = action.payload?.running ?? !state.sim.running;
      if (!state.world && running) return [];
      const patches = [{ op: "set", path: "/sim/running", value: running }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "SIM_STEP":
      // Core standard: SIM_STEP mutations happen in simStepPatch (separate phase + gate).
      return [];

    case "APPLY_BUFFERED_SIM_STEP": {
      const src = action.payload && typeof action.payload === "object" ? action.payload : {};
      const patches = Array.isArray(src.patches) ? src.patches : [];
      // Specialized gate: reject drift / wrong typed arrays early.
      assertSimPatchesAllowed(manifest, state, "SIM_STEP", patches);
      return patches;
    }

    case "SET_SPEED":
      return [{ op: "set", path: "/meta/speed", value: Math.max(1, Math.min(60, action.payload)) }];

    case "SET_SEED":
      return [{ op: "set", path: "/meta/seed", value: action.payload }];

    case "SET_SIZE":
      return [
        { op: "set", path: "/meta/gridW", value: action.payload.w },
        { op: "set", path: "/meta/gridH", value: action.payload.h }
      ];

    case "SET_RENDER_MODE":
      return [{ op: "set", path: "/meta/renderMode", value: String(action.payload || "combined") }];

    case "SET_PHYSICS": {
      const prev = (state.meta && state.meta.physics && typeof state.meta.physics === "object") ? state.meta.physics : {};
      const src = (action.payload && typeof action.payload === "object") ? action.payload : {};
      const next = { ...prev };
      for (const k of Object.keys(src)) {
        if (!PHYSICS_KEYS.has(k)) continue;
        const v = Number(src[k]);
        if (!Number.isFinite(v)) continue;
        next[k] = v;
      }
      return [{ op: "set", path: "/meta/physics", value: next }];
    }

    case "SET_BRUSH": {
      const patches = [];
      const src = (action.payload && typeof action.payload === "object") ? action.payload : {};
      if (typeof src.brushMode === "string" && src.brushMode.length > 0) {
        if (!isBrushMode(src.brushMode)) return [];
        patches.push({ op: "set", path: "/meta/brushMode", value: src.brushMode });
      }
      if (src.brushRadius !== undefined) {
        const r = Math.max(1, Math.min(10, Number(src.brushRadius) | 0));
        patches.push({ op: "set", path: "/meta/brushRadius", value: r });
      }
      return patches;
    }

    case "SET_UI": {
      const prev = (state.meta && state.meta.ui && typeof state.meta.ui === "object") ? state.meta.ui : {};
      const src = (action.payload && typeof action.payload === "object") ? action.payload : {};
      const clean = {};
      for (const k of Object.keys(src)) {
        if (!UI_KEYS.has(k)) continue;
        const v = src[k];
        if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") clean[k] = v;
      }
      return [{ op: "set", path: "/meta/ui", value: { ...prev, ...clean } }];
    }

    case "SET_GLOBAL_LEARNING": {
      const prev = state.meta.globalLearning || defaultGlobalLearning();
      const enabled = action.payload?.enabled ?? prev.enabled;
      const strength = clamp(Number(action.payload?.strength ?? prev.strength), 0, 1);
      const next = { ...prev, enabled, strength };
      const patches = [{ op: "set", path: "/meta/globalLearning", value: next }];
      if (state.world) patches.push({ op: "set", path: "/world/globalLearning", value: cloneJson(next) });
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "RESET_GLOBAL_LEARNING": {
      const reset = defaultGlobalLearning();
      const patches = [{ op: "set", path: "/meta/globalLearning", value: reset }];
      if (state.world) {
        patches.push({ op: "set", path: "/world/globalLearning", value: cloneJson(reset) });
        patches.push({ op: "set", path: "/world/lineageMemory", value: {} });
      }
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "PAINT_BRUSH": {
      const world = state.world;
      if (!world) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const mode = String(action.payload?.mode || "light");
      const radius = Math.max(1, Math.min(10, Number(action.payload?.radius) | 0));

      let key = null;
      let delta = 0;
      let op = "add";
      if (mode === "light") { key = "L"; delta = +0.12; }
      else if (mode === "light_remove") { key = "L"; delta = -0.12; }
      else if (mode === "nutrient") { key = "R"; delta = +0.12; }
      else if (mode === "toxin") { key = "W"; delta = +0.12; }
      else if (mode === "saturation_reset") { key = "Sat"; op = "reset"; }
      else return [];

      const base = world[key];
      if (!base || !ArrayBuffer.isView(base)) return [];
      const next = cloneTypedArray(base);

      paintCircle({
        w, h, x, y, radius,
        cb: (idx, falloff) => {
          if (op === "reset") {
            next[idx] = 0;
            return;
          }
          const v = Number(next[idx] || 0) + delta * falloff;
          next[idx] = clamp(v, 0, 1);
        }
      });

      const patches = [{ op: "set", path: `/world/${key}`, value: next }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "PLACE_CELL": {
      return handlePlaceCell(state, action);
    }

    case "PLACE_SPLIT_CLUSTER": {
      return handlePlaceSplitCluster(state, action);
    }

    case "DEV_BALANCE_RUN_AI": {
      return handleDevBalanceRunAi(state, action, DEV_MUTATION_CATALOG);
    }

    case "HARVEST_CELL": {
      return handleHarvestCell(state, action);
    }

    case "SET_ZONE": {
      return handleSetZone(state, action);
    }

    case "SET_PLAYER_DOCTRINE": {
      return handleSetPlayerDoctrine(state, action);
    }

    case "BUY_EVOLUTION": {
      return handleBuyEvolution(state, action, DEV_MUTATION_CATALOG);
    }

    case "SET_WIN_MODE": {
      const mode = typeof action.payload?.winMode === "string" ? action.payload.winMode : WIN_MODE.SUPREMACY;
      if (!WIN_MODE_SELECTABLE.includes(mode)) return [];
      const patches = [{ op: "set", path: "/sim/winMode", value: mode }];
      assertSimPatchesAllowed(manifest, state, "SET_WIN_MODE", patches);
      return patches;
    }

    case "SET_OVERLAY": {
      const ov = String(action.payload || "none");
      if (!isOverlayMode(ov)) return [];
      return [{ op: "set", path: "/meta/activeOverlay", value: ov }];
    }

    case "SET_PLACEMENT_COST": {
      const enabled = !!action.payload?.enabled;
      const patches = [{ op: "set", path: "/meta/placementCostEnabled", value: enabled }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    default:
      return [];
  }
}

export function simStepPatch(state, action, ctx) {
  if (!action || typeof action !== "object" || action.type !== "SIM_STEP") {
    throw new Error("simStepPatch requires action { type: 'SIM_STEP', payload }");
  }
  const rngStreams = ctx?.rng;

  if (!state.world) return [];
  const force = !!action.payload?.force;
  if (!state.sim.running && !force) return [];

  const currentTick = state.sim.tick;
  const { world: worldMutable, metrics } = runWorldSimV4(state.world, state.meta, state.sim, rngStreams);

  const nextLearning = mergeWorldLearningIntoBank(worldMutable, state.meta.globalLearning, metrics);
  worldMutable.globalLearning = cloneJson(nextLearning);

  let simOut = {
    ...metrics,
    tick: currentTick + 1,
    running: state.sim.running,
    expansionCount: state.sim.expansionCount || 0,
    lastExpandTick: state.sim.lastExpandTick || -99999,
    expansionWork: state.sim.expansionWork || 0,
    nextExpandCost: state.sim.nextExpandCost || 120,
  };
  simOut.expansionWork = Math.max(0, simOut.expansionWork + expansionWorkGain(simOut));
  simOut.nextExpandCost = expansionWorkCost(worldMutable, simOut);

  const patches = [];

  if (shouldAutoExpand(worldMutable, simOut, currentTick)) {
    const expandedWorld = expandWorldPreserve(worldMutable, 1);
    expandedWorld.globalLearning = cloneJson(nextLearning);
    simOut.expansionWork = Math.max(0, simOut.expansionWork - expansionWorkCost(expandedWorld, simOut));
    simOut.expansionCount = (simOut.expansionCount || 0) + 1;
    simOut.lastExpandTick = currentTick;
    simOut.nextExpandCost = expansionWorkCost(expandedWorld, simOut);
    simOut.aliveRatio = simOut.aliveCount / Math.max(1, expandedWorld.w * expandedWorld.h);

    patches.push({ op: "set", path: "/meta/gridW", value: expandedWorld.w });
    patches.push({ op: "set", path: "/meta/gridH", value: expandedWorld.h });
    // Drift hardening: only patch known world keys.
    pushKeysPatches(patches, expandedWorld, WORLD_KEYS, "/world", state.world);
  } else {
    // Drift hardening: only patch known world keys.
    pushKeysPatches(patches, worldMutable, WORLD_SIM_STEP_KEYS, "/world", state.world);
  }

  patches.push({ op: "set", path: "/meta/globalLearning", value: nextLearning });

  applyWinConditions(state, simOut, currentTick);
  applyGoalCode(simOut, currentTick);

  // Drift hardening: only patch known sim keys.
  pushKeysPatches(patches, simOut, SIM_KEYS, "/sim", state.sim);
  assertSimPatchesAllowed(manifest, state, "SIM_STEP", patches);
  return patches;
}
