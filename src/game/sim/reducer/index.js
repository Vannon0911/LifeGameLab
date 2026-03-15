// ============================================================
// Reducer — V4 COMPATIBLE (Patch-based)
// ============================================================

import { generateWorld, seedDeterministicBootstrapCluster } from "../worldgen.js";
import { simStep } from "../step.js";
import { PHYSICS_DEFAULT } from "../../../core/kernel/physics.js";
import { hashString, rng01 } from "../../../core/kernel/rng.js";
import { manifest } from "../../../project/project.manifest.js";
import { assertSimPatchesAllowed } from "../gate.js";
import { clamp, cloneTypedArray, paintCircle } from "../shared.js";
import {
  BRUSH_MODE,
  GAME_MODE,
  GAME_RESULT,
  OVERLAY_MODE,
  RUN_PHASE,
  WIN_MODE,
  ZONE_ROLE,
  isBrushMode,
  normalizeGameMode,
  normalizeRunPhase,
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
import { buildSetOverlayPatches, buildSetWinModePatches } from "./controlActions.js";
import {
  applyPresetPhysicsOverrides,
  getWorldPreset,
  isTileInStartWindow,
  normalizeWorldPresetId,
} from "../worldPresets.js";
import { deriveStageState } from "./progression.js";
import {
  handleHarvestPulse,
  handlePruneCluster,
  handleRecyclePatch,
  handleSeedSpread,
} from "../mainRunActions.js";
import { deriveCanonicalZoneState } from "../canonicalZones.js";
import { derivePatternBonuses, derivePatternCatalog } from "../patterns.js";

function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

function areFounderTilesConnected8(indices, w, h) {
  if (indices.length === 0) return false;
  const set = new Set(indices);
  const seen = new Set();
  const queue = [indices[0]];
  seen.add(indices[0]);
  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % w;
    const y = (idx / w) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!set.has(j) || seen.has(j)) continue;
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen.size === indices.length;
}

function hasAdjacentMarkedTile(mask, idx, w, h) {
  if (!mask || !ArrayBuffer.isView(mask)) return false;
  const x = idx % w;
  const y = (idx / w) | 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if ((Number(mask[j]) | 0) === 1) return true;
    }
  }
  return false;
}

function hasAdjacentMarkedTile4(mask, idx, w, h) {
  if (!mask || !ArrayBuffer.isView(mask)) return false;
  const x = idx % w;
  const y = (idx / w) | 0;
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [xx, yy] of neighbors) {
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    const j = yy * w + xx;
    if ((Number(mask[j]) | 0) === 1) return true;
  }
  return false;
}

function areIndicesConnected4(indices, w, h) {
  if (indices.length === 0) return false;
  const set = new Set(indices);
  const seen = new Set([indices[0]]);
  const queue = [indices[0]];
  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % w;
    const y = (idx / w) | 0;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [xx, yy] of neighbors) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (!set.has(j) || seen.has(j)) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return seen.size === indices.length;
}

function isMarked(mask, idx) {
  return !!mask && ArrayBuffer.isView(mask) && ((Number(mask[idx]) | 0) === 1);
}

function hasAdjacentRoleTile4(zoneRole, idx, w, h, roleIds) {
  if (!zoneRole || !ArrayBuffer.isView(zoneRole)) return false;
  const wanted = new Set(Array.isArray(roleIds) ? roleIds : [roleIds]);
  const x = idx % w;
  const y = (idx / w) | 0;
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [xx, yy] of neighbors) {
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    const j = yy * w + xx;
    if (wanted.has(Number(zoneRole[j]) | 0)) return true;
  }
  return false;
}

function isRoleMarked(zoneRole, idx, roleId) {
  return !!zoneRole && ArrayBuffer.isView(zoneRole) && ((Number(zoneRole[idx]) | 0) === (roleId | 0));
}

function buildCanonicalRuntimeState(world, presetId, playerLineageId, sourceZoneRole = null) {
  const zoneState = deriveCanonicalZoneState(world, playerLineageId, sourceZoneRole);
  const preset = getWorldPreset(presetId);
  const patternCatalog = derivePatternCatalog(zoneState, world);
  const patternBonuses = derivePatternBonuses(patternCatalog, preset);
  return { ...zoneState, patternCatalog, patternBonuses };
}

function pushCanonicalRuntimePatches(patches, canonicalState) {
  patches.push({ op: "set", path: "/world/zoneRole", value: canonicalState.zoneRole });
  patches.push({ op: "set", path: "/world/zoneId", value: canonicalState.zoneId });
  patches.push({ op: "set", path: "/world/zoneMeta", value: canonicalState.zoneMeta });
  patches.push({ op: "set", path: "/sim/patternCatalog", value: canonicalState.patternCatalog });
  patches.push({ op: "set", path: "/sim/patternBonuses", value: canonicalState.patternBonuses });
}

function countAlivePlayerInfraCells(world, playerLineageId) {
  return countAlivePlayerRoleCells(world, playerLineageId, ZONE_ROLE.INFRA);
}

function countAlivePlayerRoleCells(world, playerLineageId, roleId) {
  const zoneRole = world?.zoneRole;
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  if (!zoneRole || !alive || !lineageId) return 0;
  let count = 0;
  for (let i = 0; i < zoneRole.length; i++) {
    if ((Number(zoneRole[i]) | 0) !== (roleId | 0)) continue;
    if ((Number(alive[i]) | 0) !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== (playerLineageId | 0)) continue;
    count++;
  }
  return count;
}

function getVisionRadii(presetId) {
  const phaseD = getWorldPreset(presetId)?.phaseD || {};
  return {
    core: Math.max(0, Number(phaseD.visionRadiusCore || 0) | 0),
    dna: Math.max(0, Number(phaseD.visionRadiusDNA || 0) | 0),
    infra: Math.max(0, Number(phaseD.visionRadiusInfra || 0) | 0),
  };
}

function revealRadius(target, w, h, cx, cy, radius) {
  const r = Math.max(0, Number(radius || 0) | 0);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if ((dx * dx + dy * dy) > r * r) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      target[y * w + x] = 1;
    }
  }
}

function deriveVisibilityState(world, presetId, playerLineageId) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  const prevExplored = world?.explored && ArrayBuffer.isView(world.explored)
    ? world.explored
    : new Uint8Array(N);
  const visibility = new Uint8Array(N);
  const explored = new Uint8Array(prevExplored);
  if (!N || !world?.alive || !world?.lineageId) {
    return { visibility, explored };
  }

  const radii = getVisionRadii(presetId);
  for (let i = 0; i < N; i++) {
    if (!isAlivePlayerOwnedTile(world, i, playerLineageId)) continue;
    const x = i % w;
    const y = (i / w) | 0;
    if (isRoleMarked(world?.zoneRole, i, ZONE_ROLE.CORE)) revealRadius(visibility, w, h, x, y, radii.core);
    if (isRoleMarked(world?.zoneRole, i, ZONE_ROLE.DNA)) revealRadius(visibility, w, h, x, y, radii.dna);
    if (isRoleMarked(world?.zoneRole, i, ZONE_ROLE.INFRA)) revealRadius(visibility, w, h, x, y, radii.infra);
  }

  for (let i = 0; i < N; i++) {
    if ((Number(visibility[i]) | 0) === 1) explored[i] = 1;
  }
  return { visibility, explored };
}

function getInfraCandidateMask(world, size) {
  if (world?.infraCandidateMask && ArrayBuffer.isView(world.infraCandidateMask)) {
    return cloneTypedArray(world.infraCandidateMask);
  }
  return new Uint8Array(size);
}

function isAlivePlayerOwnedTile(world, idx, playerLineageId) {
  return (Number(world?.alive?.[idx] || 0) | 0) === 1
    && (Number(world?.lineageId?.[idx] || 0) | 0) === (playerLineageId | 0);
}

function touchesCommittedInfraAnchor(world, idx, w, h) {
  return isRoleMarked(world?.zoneRole, idx, ZONE_ROLE.CORE)
    || isRoleMarked(world?.zoneRole, idx, ZONE_ROLE.DNA)
    || isRoleMarked(world?.zoneRole, idx, ZONE_ROLE.INFRA)
    || hasAdjacentRoleTile4(world?.zoneRole, idx, w, h, [ZONE_ROLE.CORE, ZONE_ROLE.DNA, ZONE_ROLE.INFRA]);
}

function getInfraStartCosts(sim) {
  const unlockCostDNA = Math.max(0, Number(sim?.nextInfraUnlockCostDNA || 0));
  const buildCostDNA = Math.max(0, Number(sim?.infraBuildCostDNA || 0));
  const buildCostEnergy = Math.max(0, Number(sim?.infraBuildCostEnergy || 0));
  return {
    energy: buildCostEnergy,
    dna: buildCostDNA + (sim?.infrastructureUnlocked ? 0 : unlockCostDNA),
  };
}

function spendPlayerEnergyFromCells(world, playerLineageId, amount) {
  const required = Math.max(0, Number(amount || 0));
  if (required <= 0) return world?.E ? cloneTypedArray(world.E) : null;
  if (!world?.E || !world?.alive || !world?.lineageId) return null;
  const nextE = cloneTypedArray(world.E);
  let remaining = required;
  for (let i = 0; i < nextE.length && remaining > 1e-9; i++) {
    if (!isAlivePlayerOwnedTile(world, i, playerLineageId)) continue;
    const available = Math.max(0, Number(nextE[i] || 0));
    if (available <= 0) continue;
    const spend = Math.min(available, remaining);
    nextE[i] = available - spend;
    remaining -= spend;
  }
  return remaining > 1e-6 ? null : nextE;
}

function canConfirmFoundation(state) {
  if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return false;
  if (state.sim.runPhase !== RUN_PHASE.GENESIS_SETUP) return false;
  const world = state.world;
  if (!world?.alive || !world?.lineageId || !world?.founderMask) return false;
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;
  if (w <= 0 || h <= 0) return false;
  const founderBudget = Math.max(0, Number(state.sim.founderBudget || 0) | 0);
  const founderPlaced = Math.max(0, Number(state.sim.founderPlaced || 0) | 0);
  if (founderBudget !== 4 || founderPlaced !== 4) return false;
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const preset = getWorldPreset(state.meta.worldPresetId);
  const playerWindow = preset?.startWindows?.player;
  if (!playerWindow) return false;

  const founderIndices = [];
  for (let i = 0; i < world.founderMask.length; i++) {
    if ((Number(world.founderMask[i]) | 0) !== 1) continue;
    founderIndices.push(i);
  }
  if (founderIndices.length !== 4) return false;

  for (const idx of founderIndices) {
    if ((Number(world.alive[idx]) | 0) !== 1) return false;
    if ((Number(world.lineageId[idx]) | 0) !== playerLineageId) return false;
    const x = idx % w;
    const y = (idx / w) | 0;
    if (!isTileInStartWindow(x, y, w, h, playerWindow)) return false;
  }
  return areFounderTilesConnected8(founderIndices, w, h);
}

function collectFounderIndices(state) {
  const world = state.world;
  if (!world?.alive || !world?.lineageId || !world?.founderMask) return null;
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;
  if (w <= 0 || h <= 0) return null;
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;

  const founderIndices = [];
  for (let i = 0; i < world.founderMask.length; i++) {
    if ((Number(world.founderMask[i]) | 0) !== 1) continue;
    founderIndices.push(i);
  }
  if (founderIndices.length !== 4) return null;

  for (const idx of founderIndices) {
    if ((Number(world.alive[idx]) | 0) !== 1) return null;
    if ((Number(world.lineageId[idx]) | 0) !== playerLineageId) return null;
  }
  if (!areFounderTilesConnected8(founderIndices, w, h)) return null;
  return founderIndices;
}

function collectMaskIndices(mask) {
  if (!mask || !ArrayBuffer.isView(mask)) return [];
  const indices = [];
  for (let i = 0; i < mask.length; i++) {
    if ((Number(mask[i]) | 0) === 1) indices.push(i);
  }
  return indices;
}

function canConfirmCoreZone(state) {
  if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return false;
  if (state.sim.runPhase !== RUN_PHASE.GENESIS_ZONE) return false;
  const founderIndices = collectFounderIndices(state);
  if (!founderIndices) return false;
  const coreZoneMask = state.world?.coreZoneMask;
  if (!coreZoneMask || !ArrayBuffer.isView(coreZoneMask)) return false;
  for (let i = 0; i < coreZoneMask.length; i++) {
    if ((Number(coreZoneMask[i]) | 0) !== 0) return false;
  }
  return true;
}

function isGenesisSetupInStandardMode(state) {
  return normalizeGameMode(state?.meta?.gameMode, GAME_MODE.GENESIS) === GAME_MODE.GENESIS
    && normalizeRunPhase(state?.sim?.runPhase, RUN_PHASE.GENESIS_SETUP) === RUN_PHASE.GENESIS_SETUP;
}

function isPreRunGenesisPhase(state) {
  return normalizeGameMode(state?.meta?.gameMode, GAME_MODE.GENESIS) === GAME_MODE.GENESIS
    && normalizeRunPhase(state?.sim?.runPhase, RUN_PHASE.GENESIS_SETUP) !== RUN_PHASE.RUN_ACTIVE;
}

function countAlivePlayerCoreCells(world, playerLineageId) {
  return countAlivePlayerRoleCells(world, playerLineageId, ZONE_ROLE.CORE);
}

function countAlivePlayerMaskedCells(mask, world, playerLineageId) {
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  if (!mask || !alive || !lineageId) return 0;
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if ((Number(mask[i]) | 0) !== 1) continue;
    if ((Number(alive[i]) | 0) !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== (playerLineageId | 0)) continue;
    count++;
  }
  return count;
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

function deriveBootstrapSimMetrics(world, meta, baseSim) {
  const nextSim = { ...baseSim };
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  if (!N || !world?.alive) return nextSim;

  const playerLineageId = 1;
  const cpuLineageId = 2;
  const alive = world.alive;
  const lineageId = world.lineageId;
  const light = world.L;
  const energy = world.E;
  const reserve = world.reserve;
  const nutrients = world.R;
  const toxin = world.W;
  const water = world.water;
  const plant = world.P;
  const saturation = world.Sat;
  const biocharge = world.B;
  const link = world.link;
  const physics = meta?.physics || PHYSICS_DEFAULT;

  let aliveCount = 0;
  let playerAliveCount = 0;
  let cpuAliveCount = 0;
  let linkedAlive = 0;
  let clusteredPlayer = 0;
  let playerLinked = 0;
  let sumLAlive = 0;
  let sumEAlive = 0;
  let sumReserveAlive = 0;
  let sumWater = 0;
  let sumNutrients = 0;
  let sumToxin = 0;
  let sumSaturation = 0;
  let sumPlant = 0;
  let sumBiocharge = 0;
  let plantTiles = 0;
  let playerLight = 0;
  let playerNutrients = 0;
  let playerStored = 0;
  const lineageSeen = new Set();

  const hasPlayerNeighbour = (index) => {
    const x = index % w;
    const y = Math.floor(index / w);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (alive[j] !== 1) continue;
        if ((Number(lineageId?.[j] || 0) | 0) === playerLineageId) return true;
      }
    }
    return false;
  };

  for (let i = 0; i < N; i++) {
    const waterValue = Number(water?.[i] || 0);
    const nutrientValue = Number(nutrients?.[i] || 0);
    const toxinValue = Number(toxin?.[i] || 0);
    const saturationValue = Number(saturation?.[i] || 0);
    const plantValue = Number(plant?.[i] || 0);
    const biochargeValue = Number(biocharge?.[i] || 0);
    sumWater += waterValue;
    sumNutrients += nutrientValue;
    sumToxin += toxinValue;
    sumSaturation += saturationValue;
    sumPlant += plantValue;
    sumBiocharge += biochargeValue;
    if (plantValue > 0.001) plantTiles++;

    if (alive[i] !== 1) continue;
    aliveCount++;
    const lid = Number(lineageId?.[i] || 0) | 0;
    const lightValue = Number(light?.[i] || 0);
    const energyValue = Number(energy?.[i] || 0);
    const reserveValue = Number(reserve?.[i] || 0);
    const linkValue = Number(link?.[i] || 0);
    sumLAlive += lightValue;
    sumEAlive += energyValue;
    sumReserveAlive += reserveValue;
    if (linkValue > 0.05) linkedAlive++;
    if (lid) lineageSeen.add(lid);

    if (lid === playerLineageId) {
      playerAliveCount++;
      playerLight += lightValue;
      playerNutrients += nutrientValue;
      playerStored += energyValue;
      if (linkValue > 0.05) playerLinked++;
      if (hasPlayerNeighbour(i)) clusteredPlayer++;
    } else if (lid === cpuLineageId) {
      cpuAliveCount++;
    }
  }

  const invN = 1 / Math.max(1, N);
  const invAlive = 1 / Math.max(1, aliveCount);
  const approxPlayerEnergyIn = playerLight * 0.35 + playerNutrients * 0.12 + playerStored * 0.02;
  const approxPlayerEnergyOut = playerAliveCount * Number(physics?.U_base || PHYSICS_DEFAULT.U_base || 0.04);

  nextSim.aliveCount = aliveCount;
  nextSim.aliveRatio = aliveCount * invN;
  nextSim.playerAliveCount = playerAliveCount;
  nextSim.cpuAliveCount = cpuAliveCount;
  nextSim.meanLAlive = sumLAlive * invAlive;
  nextSim.meanEnergyAlive = sumEAlive * invAlive;
  nextSim.meanReserveAlive = sumReserveAlive * invAlive;
  nextSim.meanNutrientField = sumNutrients * invN;
  nextSim.meanToxinField = sumToxin * invN;
  nextSim.meanSaturationField = sumSaturation * invN;
  nextSim.meanPlantField = sumPlant * invN;
  nextSim.meanBiochargeField = sumBiocharge * invN;
  nextSim.meanWaterField = sumWater * invN;
  nextSim.plantTileRatio = plantTiles * invN;
  nextSim.lineageDiversity = lineageSeen.size;
  nextSim.networkRatio = linkedAlive * invAlive;
  nextSim.clusterRatio = playerAliveCount > 0 ? clusteredPlayer / playerAliveCount : 0;
  nextSim.playerEnergyIn = approxPlayerEnergyIn;
  nextSim.playerEnergyOut = approxPlayerEnergyOut;
  nextSim.playerEnergyNet = approxPlayerEnergyIn - approxPlayerEnergyOut;
  nextSim.playerEnergyStored = playerStored;
  nextSim.lightShare = approxPlayerEnergyIn > 0 ? clamp(playerLight * 0.35 / approxPlayerEnergyIn, 0, 1) : 0;
  nextSim.nutrientShare = approxPlayerEnergyIn > 0 ? clamp(playerNutrients * 0.12 / approxPlayerEnergyIn, 0, 1) : 0;
  return nextSim;
}

function buildWorldGenerationPatches(state, presetId, gameModeOverride, patchGameMode = false) {
  const meta = state.meta;
  const normalizedPresetId = normalizeWorldPresetId(presetId ?? meta.worldPresetId);
  const nextGameMode = gameModeOverride === undefined
    ? normalizeGameMode(meta.gameMode, GAME_MODE.GENESIS)
    : normalizeGameMode(gameModeOverride, normalizeGameMode(meta.gameMode, GAME_MODE.GENESIS));
  const isLabAutorun = nextGameMode === GAME_MODE.LAB_AUTORUN;
  const seededPhysics = seededStartPhysics(meta.seed, PHYSICS_DEFAULT);
  const tunedPhysics = applyPresetPhysicsOverrides(seededPhysics, normalizedPresetId);
  const world = generateWorld(
    meta.gridW,
    meta.gridH,
    meta.seed,
    tunedPhysics,
    normalizedPresetId,
    { gameMode: nextGameMode }
  );
  applyGlobalLearningToWorld(world, meta.globalLearning);
  world.devMutationVault = cloneJson(meta.devMutationVault || defaultDevMutationVault());
  world.zoneMap = new Int8Array(meta.gridW * meta.gridH);
  world.zoneRole = new Int8Array(meta.gridW * meta.gridH);
  world.zoneId = new Uint16Array(meta.gridW * meta.gridH);
  world.zoneMeta = {};

  const nextSim = deriveBootstrapSimMetrics(world, { ...meta, physics: tunedPhysics }, makeInitialState().sim);
  nextSim.running = false;
  nextSim.runPhase = isLabAutorun ? RUN_PHASE.RUN_ACTIVE : RUN_PHASE.GENESIS_SETUP;
  nextSim.founderBudget = 4;
  nextSim.founderPlaced = 0;
  const stageState = deriveStageState(world, nextSim, {
    ...meta,
    physics: tunedPhysics,
    worldPresetId: normalizedPresetId,
    playerLineageId: 1,
  });
  Object.assign(nextSim, stageState);

  const patches = [
    { op: "set", path: "/meta/worldPresetId", value: normalizedPresetId },
    { op: "set", path: "/meta/physics", value: tunedPhysics },
  ];
  if (patchGameMode) {
    patches.push({ op: "set", path: "/meta/gameMode", value: nextGameMode });
  }
  pushKeysPatches(patches, world, WORLD_KEYS, "/world");
  pushKeysPatches(patches, nextSim, SIM_KEYS, "/sim");
  patches.push({ op: "set", path: "/meta/playerLineageId", value: 1 });
  patches.push({ op: "set", path: "/meta/cpuLineageId", value: 2 });
  return patches;
}

export function makeInitialState() {
  return {
    meta: {
      seed:        "life-light",
      gridW:       16,
      gridH:       16,
      speed:       2,
      brushMode:   BRUSH_MODE.OBSERVE,
      brushRadius: 3,
      renderMode:  "combined",
      activeOverlay: OVERLAY_MODE.NONE,
      worldPresetId: "river_delta",
      gameMode:    GAME_MODE.GENESIS,
      physics:     { ...PHYSICS_DEFAULT },
      ui: {
        panelOpen: false,
        activeTab: "lage",
        expertMode: false,
        showBiochargeOverlay: false,
        showRemoteAttackOverlay: true,
        showDefenseOverlay: true,
      },
      globalLearning: defaultGlobalLearning(),
      devMutationVault: defaultDevMutationVault(),
      placementCostEnabled: true,
    },
    world: null,
    sim: {
      tick: 0, running: false, runPhase: RUN_PHASE.GENESIS_SETUP, founderBudget: 4, founderPlaced: 0,
      unlockedZoneTier: 0, nextZoneUnlockKind: "", nextZoneUnlockCostEnergy: 0, zoneUnlockProgress: 0, coreEnergyStableTicks: 0, zone2Unlocked: false, zone2PlacementBudget: 0, dnaZoneCommitted: false, nextInfraUnlockCostDNA: 0, infrastructureUnlocked: false, infraBuildMode: "", infraBuildCostEnergy: 0, infraBuildCostDNA: 0, cpuBootstrapDone: 0,
      aliveCount: 0, aliveRatio: 0,
      meanLAlive: 0, meanEnergyAlive: 0, meanReserveAlive: 0,
      meanNutrientField: 0, meanToxinField: 0, meanSaturationField: 0, meanPlantField: 0,
      meanBiochargeField: 0,
      meanWaterField: 0,
      lineageDiversity: 0,
      evolutionStageMean: 1,
      evolutionStageMax: 1,
      networkRatio: 0, clusterRatio: 0,
      birthsLastStep: 0, deathsLastStep: 0, mutationsLastStep: 0,
      raidEventsLastStep: 0, infectionsLastStep: 0, conflictKillsLastStep: 0, superCellsLastStep: 0,
      remoteAttacksLastStep: 0, remoteAttackKillsLastStep: 0, defenseActivationsLastStep: 0, resourceStolenLastStep: 0,
      playerDNA: 0, totalHarvested: 0, playerStage: 1,
      stageProgressScore: 0,
      harvestYieldTotal: 0, pruneYieldTotal: 0, recycleYieldTotal: 0, seedYieldTotal: 0,
      stabilityScore: 0, ecologyScore: 0, activeBiomeCount: 0,
      patternCatalog: {},
      patternBonuses: {
        energy: 0,
        dna: 0,
        stability: 0,
        vision: 0,
        defense: 0,
        transport: 0,
      },
      expansionCount: 0, lastExpandTick: -99999, expansionWork: 0, nextExpandCost: 120,
      stockpileTicks: 0,
      winMode: WIN_MODE.SUPREMACY,
      gameResult: GAME_RESULT.NONE, gameEndTick: 0,
    },
  };
}

export function shouldAdvanceSimulation(state) {
  const runPhase = String(state?.sim?.runPhase || RUN_PHASE.GENESIS_SETUP);
  return !!state?.sim?.running && runPhase === RUN_PHASE.RUN_ACTIVE;
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
    gameMode: normalizeGameMode(meta.gameMode, GAME_MODE.GENESIS),
  }, sim.tick);
  return { world: worldMutable, metrics };
}

export function reducer(state, action, { rng }) {
  switch (action.type) {

    case "GEN_WORLD": {
      const payload = action.payload && typeof action.payload === "object" ? action.payload : {};
      const hasModeOverride = Object.prototype.hasOwnProperty.call(payload, "gameMode");
      const patches = buildWorldGenerationPatches(
        state,
        state.meta.worldPresetId,
        hasModeOverride ? payload.gameMode : undefined,
        hasModeOverride
      );
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "CONFIRM_FOUNDATION": {
      if (!canConfirmFoundation(state)) return [];
      const patches = [
        { op: "set", path: "/sim/runPhase", value: RUN_PHASE.GENESIS_ZONE },
        { op: "set", path: "/sim/running", value: false },
      ];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "CONFIRM_CORE_ZONE": {
      if (!canConfirmCoreZone(state)) return [];
      const founderIndices = collectFounderIndices(state);
      if (!founderIndices) return [];
      const coreZoneMask = cloneTypedArray(state.world.coreZoneMask);
      for (const idx of founderIndices) coreZoneMask[idx] = 1;
      const preset = getWorldPreset(state.meta.worldPresetId);
      const nextZoneUnlockCostEnergy = Math.max(0, Number(preset?.coreZoneUnlockCostEnergy || 0));
      const alive = cloneTypedArray(state.world.alive);
      const E = cloneTypedArray(state.world.E);
      const reserve = cloneTypedArray(state.world.reserve);
      const link = cloneTypedArray(state.world.link);
      const lineageId = cloneTypedArray(state.world.lineageId);
      const hue = cloneTypedArray(state.world.hue);
      const trait = cloneTypedArray(state.world.trait);
      const age = cloneTypedArray(state.world.age);
      const born = cloneTypedArray(state.world.born);
      const died = cloneTypedArray(state.world.died);
      const W = state.world.W ? cloneTypedArray(state.world.W) : null;
      const bootstrapWorld = {
        ...state.world,
        alive,
        E,
        reserve,
        link,
        lineageId,
        hue,
        trait,
        age,
        born,
        died,
        W,
      };
      const cpuSpawn = Number(state.sim.cpuBootstrapDone || 0) === 0
        ? seedDeterministicBootstrapCluster(
          bootstrapWorld,
          state.meta.seed,
          preset?.startWindows?.cpu,
          Number(state.meta.cpuLineageId || 2) | 0,
        )
        : [];
      const canonicalState = buildCanonicalRuntimeState(
        { ...state.world, coreZoneMask, alive, lineageId, link },
        state.meta.worldPresetId,
        Number(state.meta.playerLineageId || 1) | 0,
      );
      const patches = [
        { op: "set", path: "/world/alive", value: alive },
        { op: "set", path: "/world/E", value: E },
        { op: "set", path: "/world/reserve", value: reserve },
        { op: "set", path: "/world/link", value: link },
        { op: "set", path: "/world/lineageId", value: lineageId },
        { op: "set", path: "/world/hue", value: hue },
        { op: "set", path: "/world/trait", value: trait },
        { op: "set", path: "/world/age", value: age },
        { op: "set", path: "/world/born", value: born },
        { op: "set", path: "/world/died", value: died },
        { op: "set", path: "/world/W", value: W },
        { op: "set", path: "/world/coreZoneMask", value: coreZoneMask },
        { op: "set", path: "/sim/unlockedZoneTier", value: 1 },
        { op: "set", path: "/sim/nextZoneUnlockKind", value: "DNA" },
        { op: "set", path: "/sim/nextZoneUnlockCostEnergy", value: nextZoneUnlockCostEnergy },
        { op: "set", path: "/sim/zoneUnlockProgress", value: 0 },
        { op: "set", path: "/sim/coreEnergyStableTicks", value: 0 },
        { op: "set", path: "/sim/zone2Unlocked", value: false },
        { op: "set", path: "/sim/zone2PlacementBudget", value: 0 },
        { op: "set", path: "/sim/dnaZoneCommitted", value: false },
        { op: "set", path: "/sim/nextInfraUnlockCostDNA", value: 0 },
        { op: "set", path: "/sim/cpuBootstrapDone", value: cpuSpawn.length ? 1 : Number(state.sim.cpuBootstrapDone || 0) },
        { op: "set", path: "/sim/runPhase", value: RUN_PHASE.RUN_ACTIVE },
        { op: "set", path: "/sim/running", value: true },
      ];
      pushCanonicalRuntimePatches(patches, canonicalState);
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "START_DNA_ZONE_SETUP":
    {
      if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return [];
      if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
      if (Number(state.sim.unlockedZoneTier || 0) < 1) return [];
      if (String(state.sim.nextZoneUnlockKind || "") !== "DNA") return [];
      if (Number(state.sim.zoneUnlockProgress || 0) + 1e-9 < 1) return [];
      if (state.sim.zone2Unlocked || state.sim.dnaZoneCommitted) return [];
      const preset = getWorldPreset(state.meta.worldPresetId);
      const placementBudget = Math.max(0, Number(preset?.phaseC?.dnaPlacementBudget || 0) | 0);
      if (placementBudget <= 0) return [];
      const sourceMask = state.world?.dnaZoneMask && ArrayBuffer.isView(state.world.dnaZoneMask)
        ? state.world.dnaZoneMask
        : new Uint8Array(Number(state.meta.gridW || 0) * Number(state.meta.gridH || 0));
      const dnaZoneMask = cloneTypedArray(sourceMask);
      dnaZoneMask.fill(0);
      const patches = [
        { op: "set", path: "/world/dnaZoneMask", value: dnaZoneMask },
        { op: "set", path: "/sim/runPhase", value: RUN_PHASE.DNA_ZONE_SETUP },
        { op: "set", path: "/sim/running", value: false },
        { op: "set", path: "/sim/zone2Unlocked", value: true },
        { op: "set", path: "/sim/zone2PlacementBudget", value: placementBudget },
      ];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "TOGGLE_DNA_ZONE_CELL":
    {
      if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return [];
      if (state.sim.runPhase !== RUN_PHASE.DNA_ZONE_SETUP) return [];
      if (!state.sim.zone2Unlocked || state.sim.dnaZoneCommitted) return [];
      const world = state.world;
      if (!world?.alive || !world?.lineageId || !world?.coreZoneMask) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const idx = y * w + x;
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      const maxBudget = Math.max(0, Number(getWorldPreset(state.meta.worldPresetId)?.phaseC?.dnaPlacementBudget || 0) | 0);
      const budget = Math.max(0, Number(state.sim.zone2PlacementBudget || 0) | 0);
      const dnaZoneMask = world.dnaZoneMask && ArrayBuffer.isView(world.dnaZoneMask)
        ? cloneTypedArray(world.dnaZoneMask)
        : new Uint8Array(w * h);
      if ((Number(dnaZoneMask[idx]) | 0) === 1) {
        dnaZoneMask[idx] = 0;
        const patches = [
          { op: "set", path: "/world/dnaZoneMask", value: dnaZoneMask },
          { op: "set", path: "/sim/zone2PlacementBudget", value: Math.min(maxBudget, budget + 1) },
        ];
        assertSimPatchesAllowed(manifest, state, action.type, patches);
        return patches;
      }
      if (budget <= 0) return [];
      if ((Number(world.alive[idx]) | 0) !== 1) return [];
      if ((Number(world.lineageId[idx]) | 0) !== playerLineageId) return [];
      if ((Number(world.coreZoneMask[idx]) | 0) === 1) return [];
      const touchesCore = hasAdjacentMarkedTile(world.coreZoneMask, idx, w, h);
      const touchesPlaced = hasAdjacentMarkedTile(dnaZoneMask, idx, w, h);
      if (!touchesCore && !touchesPlaced) return [];
      dnaZoneMask[idx] = 1;
      const patches = [
        { op: "set", path: "/world/dnaZoneMask", value: dnaZoneMask },
        { op: "set", path: "/sim/zone2PlacementBudget", value: Math.max(0, budget - 1) },
      ];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "CONFIRM_DNA_ZONE": {
      if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return [];
      if (state.sim.runPhase !== RUN_PHASE.DNA_ZONE_SETUP) return [];
      if (!state.sim.zone2Unlocked || state.sim.dnaZoneCommitted) return [];
      const world = state.world;
      if (!world?.alive || !world?.lineageId || !world?.dnaZoneMask || !world?.coreZoneMask) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const maxBudget = Math.max(0, Number(getWorldPreset(state.meta.worldPresetId)?.phaseC?.dnaPlacementBudget || 0) | 0);
      if (maxBudget <= 0) return [];
      const selectedIndices = collectMaskIndices(world.dnaZoneMask);
      if (selectedIndices.length !== maxBudget) return [];
      if (Math.max(0, Number(state.sim.zone2PlacementBudget || 0) | 0) !== 0) return [];
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      let touchesCore = false;
      for (const idx of selectedIndices) {
        if ((Number(world.alive[idx]) | 0) !== 1) return [];
        if ((Number(world.lineageId[idx]) | 0) !== playerLineageId) return [];
        if ((Number(world.coreZoneMask[idx]) | 0) === 1) return [];
        if (!touchesCore && hasAdjacentMarkedTile(world.coreZoneMask, idx, w, h)) touchesCore = true;
      }
      if (!touchesCore) return [];
      if (!areFounderTilesConnected8(selectedIndices, w, h)) return [];
      const nextInfraUnlockCostDNA = Math.max(0, Number(getWorldPreset(state.meta.worldPresetId)?.phaseC?.nextInfraUnlockCostDNA || 0));
      const phaseD = getWorldPreset(state.meta.worldPresetId)?.phaseD || {};
      const infraBuildCostEnergy = Math.max(0, Number(phaseD.infraBuildCostEnergy || 0));
      const infraBuildCostDNA = Math.max(0, Number(phaseD.infraBuildCostDNA || 0));
      const infraCandidateMask = getInfraCandidateMask(world, w * h);
      infraCandidateMask.fill(0);
      const canonicalState = buildCanonicalRuntimeState(
        { ...world, infraCandidateMask, dnaZoneMask: cloneTypedArray(world.dnaZoneMask) },
        state.meta.worldPresetId,
        playerLineageId,
      );
      const patches = [
        { op: "set", path: "/world/dnaZoneMask", value: cloneTypedArray(world.dnaZoneMask) },
        { op: "set", path: "/world/infraCandidateMask", value: infraCandidateMask },
        { op: "set", path: "/sim/dnaZoneCommitted", value: true },
        { op: "set", path: "/sim/unlockedZoneTier", value: 2 },
        { op: "set", path: "/sim/nextZoneUnlockKind", value: "INFRA" },
        { op: "set", path: "/sim/nextZoneUnlockCostEnergy", value: 0 },
        { op: "set", path: "/sim/zoneUnlockProgress", value: 0 },
        { op: "set", path: "/sim/coreEnergyStableTicks", value: 0 },
        { op: "set", path: "/sim/nextInfraUnlockCostDNA", value: nextInfraUnlockCostDNA },
        { op: "set", path: "/sim/infrastructureUnlocked", value: false },
        { op: "set", path: "/sim/infraBuildMode", value: "" },
        { op: "set", path: "/sim/infraBuildCostEnergy", value: infraBuildCostEnergy },
        { op: "set", path: "/sim/infraBuildCostDNA", value: infraBuildCostDNA },
        { op: "set", path: "/sim/zone2PlacementBudget", value: 0 },
        { op: "set", path: "/sim/runPhase", value: RUN_PHASE.RUN_ACTIVE },
        { op: "set", path: "/sim/running", value: true },
      ];
      pushCanonicalRuntimePatches(patches, canonicalState);
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "BEGIN_INFRA_BUILD": {
      if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return [];
      if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
      if (!state.sim.dnaZoneCommitted) return [];
      if (String(state.sim.nextZoneUnlockKind || "") !== "INFRA") return [];
      if (String(state.sim.infraBuildMode || "") !== "") return [];
      const startCosts = getInfraStartCosts(state.sim);
      if (Number(state.sim.playerDNA || 0) + 1e-9 < startCosts.dna) return [];
      if (Number(state.sim.playerEnergyStored || 0) + 1e-9 < startCosts.energy) return [];
      const tileCount = Number(state.world?.w || state.meta.gridW || 0) * Number(state.world?.h || state.meta.gridH || 0);
      const infraCandidateMask = getInfraCandidateMask(state.world, tileCount);
      infraCandidateMask.fill(0);
      const patches = [
        { op: "set", path: "/world/infraCandidateMask", value: infraCandidateMask },
        { op: "set", path: "/sim/infraBuildMode", value: "path" },
        { op: "set", path: "/sim/running", value: false },
      ];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "BUILD_INFRA_PATH": {
      if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return [];
      if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
      if (String(state.sim.infraBuildMode || "") !== "path") return [];
      const world = state.world;
      if (!world?.alive || !world?.lineageId || !world?.link) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const idx = y * w + x;
      const remove = !!action.payload?.remove;
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      const infraCandidateMask = getInfraCandidateMask(world, w * h);
      if ((Number(infraCandidateMask[idx]) | 0) === 1) {
        if (!remove) return [];
        infraCandidateMask[idx] = 0;
        const patches = [{ op: "set", path: "/world/infraCandidateMask", value: infraCandidateMask }];
        assertSimPatchesAllowed(manifest, state, action.type, patches);
        return patches;
      }
      if (remove) return [];
      if (!isAlivePlayerOwnedTile(world, idx, playerLineageId)) return [];
      if (Number(world.link[idx] || 0) > 0) return [];
      const touchesAnchor = touchesCommittedInfraAnchor(world, idx, w, h);
      const touchesCandidate = hasAdjacentMarkedTile4(infraCandidateMask, idx, w, h);
      if (!touchesAnchor && !touchesCandidate) return [];
      infraCandidateMask[idx] = 1;
      const patches = [{ op: "set", path: "/world/infraCandidateMask", value: infraCandidateMask }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "CONFIRM_INFRA_PATH": {
      if (normalizeGameMode(state.meta.gameMode, GAME_MODE.GENESIS) !== GAME_MODE.GENESIS) return [];
      if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
      if (String(state.sim.infraBuildMode || "") !== "path") return [];
      const world = state.world;
      if (!world?.alive || !world?.lineageId || !world?.link) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      const infraCandidateMask = getInfraCandidateMask(world, w * h);
      const candidateIndices = collectMaskIndices(infraCandidateMask);
      if (!candidateIndices.length) return [];
      if (!areIndicesConnected4(candidateIndices, w, h)) return [];
      let touchesAnchor = false;
      for (const idx of candidateIndices) {
        if (!isAlivePlayerOwnedTile(world, idx, playerLineageId)) return [];
        if (Number(world.link[idx] || 0) > 0) return [];
        if (!touchesAnchor && touchesCommittedInfraAnchor(world, idx, w, h)) touchesAnchor = true;
      }
      if (!touchesAnchor) return [];
      const startCosts = getInfraStartCosts(state.sim);
      if (Number(state.sim.playerDNA || 0) + 1e-9 < startCosts.dna) return [];
      if (Number(state.sim.playerEnergyStored || 0) + 1e-9 < startCosts.energy) return [];
      const nextE = spendPlayerEnergyFromCells(world, playerLineageId, startCosts.energy);
      if (!nextE) return [];
      const link = cloneTypedArray(world.link);
      for (const idx of candidateIndices) link[idx] = 1;
      infraCandidateMask.fill(0);
      const canonicalState = buildCanonicalRuntimeState(
        { ...world, link, infraCandidateMask },
        state.meta.worldPresetId,
        playerLineageId,
      );
      const patches = [
        { op: "set", path: "/world/infraCandidateMask", value: infraCandidateMask },
        { op: "set", path: "/world/link", value: link },
        { op: "set", path: "/world/E", value: nextE },
        { op: "set", path: "/sim/playerDNA", value: Math.max(0, Number(state.sim.playerDNA || 0) - startCosts.dna) },
        { op: "set", path: "/sim/playerEnergyStored", value: Math.max(0, Number(state.sim.playerEnergyStored || 0) - startCosts.energy) },
        { op: "set", path: "/sim/infrastructureUnlocked", value: true },
        { op: "set", path: "/sim/infraBuildMode", value: "" },
        { op: "set", path: "/sim/running", value: true },
      ];
      pushCanonicalRuntimePatches(patches, canonicalState);
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "TOGGLE_RUNNING": {
      const running = action.payload?.running ?? !state.sim.running;
      if (!state.world && running) return [];
      if (running && state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
      if (running && String(state.sim.infraBuildMode || "") !== "") return [];
      const patches = [{ op: "set", path: "/sim/running", value: running }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "SIM_STEP":
      // Core standard: SIM_STEP mutations happen in simStepPatch (separate phase + gate).
      return [];

    case "APPLY_BUFFERED_SIM_STEP": {
      if (!shouldAdvanceSimulation(state)) return [];
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

    case "SET_WORLD_PRESET": {
      const nextState = {
        ...state,
        meta: {
          ...state.meta,
          worldPresetId: normalizeWorldPresetId(action.payload?.presetId),
        },
      };
      const patches = buildWorldGenerationPatches(nextState, nextState.meta.worldPresetId);
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

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
      if (isPreRunGenesisPhase(state)) return [];
      return handlePlaceSplitCluster(state, action);
    }

    case "DEV_BALANCE_RUN_AI": {
      return handleDevBalanceRunAi(state, action, DEV_MUTATION_CATALOG);
    }

    case "HARVEST_CELL": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleHarvestCell(state, action);
    }

    case "HARVEST_PULSE": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleHarvestPulse(state, action);
    }

    case "PRUNE_CLUSTER": {
      if (isPreRunGenesisPhase(state)) return [];
      return handlePruneCluster(state, action);
    }

    case "RECYCLE_PATCH": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleRecyclePatch(state, action);
    }

    case "SEED_SPREAD": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleSeedSpread(state, action);
    }

    case "SET_ZONE": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleSetZone(state, action);
    }

    case "SET_PLAYER_DOCTRINE": {
      return handleSetPlayerDoctrine(state, action);
    }

    case "BUY_EVOLUTION": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleBuyEvolution(state, action, DEV_MUTATION_CATALOG);
    }

    case "SET_WIN_MODE": {
      const patches = buildSetWinModePatches(state, action);
      if (!patches.length) return [];
      assertSimPatchesAllowed(manifest, state, "SET_WIN_MODE", patches);
      return patches;
    }

    case "SET_OVERLAY": {
      return buildSetOverlayPatches(action);
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
  if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
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
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const visionState = deriveVisibilityState(worldMutable, state.meta.worldPresetId, playerLineageId);
  worldMutable.visibility = visionState.visibility;
  worldMutable.explored = visionState.explored;

  const patches = [];

  if (shouldAutoExpand(worldMutable, simOut, currentTick)) {
    const expandedWorld = expandWorldPreserve(worldMutable, 1);
    expandedWorld.globalLearning = cloneJson(nextLearning);
    const expandedCanonicalState = buildCanonicalRuntimeState(
      expandedWorld,
      state.meta.worldPresetId,
      playerLineageId,
      expandedWorld.zoneRole,
    );
    expandedWorld.zoneRole = expandedCanonicalState.zoneRole;
    expandedWorld.zoneId = expandedCanonicalState.zoneId;
    expandedWorld.zoneMeta = expandedCanonicalState.zoneMeta;
    simOut.patternCatalog = expandedCanonicalState.patternCatalog;
    simOut.patternBonuses = expandedCanonicalState.patternBonuses;
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
    patches.push({ op: "set", path: "/world/visibility", value: worldMutable.visibility });
    patches.push({ op: "set", path: "/world/explored", value: worldMutable.explored });
  }

  patches.push({ op: "set", path: "/meta/globalLearning", value: nextLearning });

  applyWinConditions(state, simOut, currentTick);
  const nextZoneUnlockCostEnergy = Math.max(0, Number(state.sim.nextZoneUnlockCostEnergy || 0));
  const alivePlayerCoreCells = countAlivePlayerCoreCells(worldMutable, playerLineageId);
  const alivePlayerInfraCells = countAlivePlayerInfraCells(worldMutable, playerLineageId);
  if (Number(state.sim.unlockedZoneTier || 0) >= 1) {
    simOut.zoneUnlockProgress = nextZoneUnlockCostEnergy > 0
      ? clamp(Number(simOut.playerEnergyStored || 0) / nextZoneUnlockCostEnergy, 0, 1)
      : 0;
  simOut.coreEnergyStableTicks = Number(simOut.playerEnergyNet || 0) > 0 && alivePlayerCoreCells > 0
    ? (Number(state.sim.coreEnergyStableTicks || 0) + 1)
    : 0;
  simOut.networkRatio = (alivePlayerCoreCells + alivePlayerInfraCells) > 0
    ? alivePlayerInfraCells / Math.max(1, alivePlayerCoreCells + alivePlayerInfraCells)
    : Number(simOut.networkRatio || 0);
  }
  if (state.sim.dnaZoneCommitted) {
    const preset = getWorldPreset(state.meta.worldPresetId);
    const dnaYieldScale = Math.max(0, Number(preset?.phaseC?.dnaYieldScale || 0));
    const alivePlayerDnaCells = countAlivePlayerRoleCells(worldMutable, playerLineageId, ZONE_ROLE.DNA);
    simOut.playerDNA = Number(simOut.playerDNA || 0) + alivePlayerDnaCells * 0.1 * dnaYieldScale;
  }
  Object.assign(simOut, deriveStageState(worldMutable, simOut, state.meta));
  applyGoalCode(simOut, currentTick, state.meta);

  // Drift hardening: only patch known sim keys.
  pushKeysPatches(patches, simOut, SIM_KEYS, "/sim", state.sim);
  assertSimPatchesAllowed(manifest, state, "SIM_STEP", patches);
  return patches;
}
