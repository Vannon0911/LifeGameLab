// ============================================================
// Reducer — V4 COMPATIBLE (Patch-based)
// ============================================================

import { generateWorld, applyMapSpecOverrides } from "../worldgen.js";
import { simStep } from "../step.js";
import { PHYSICS_DEFAULT } from "../../../kernel/store/physics.js";
import { hashString, rng01 } from "../../../kernel/determinism/rng.js";
import { clamp, cloneTypedArray, paintCircle } from "../shared.js";
import {
  BRUSH_MODE,
  GAME_RESULT,
  OVERLAY_MODE,
  RUN_PHASE,
  WIN_MODE,
  ZONE_ROLE,
  isBrushMode,
  normalizeRunPhase,
} from "../../contracts/ids.js";
import {
  handleHarvestWorker,
  handlePlaceWorker,
  handlePlaceSplitCluster,
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
import { buildSetOverlayPatches, buildSetWinModePatches } from "./controlActions.js";
import {
  applyPresetPhysicsOverrides,
  getStartWindowRange,
  getWorldPreset,
  normalizeWorldPresetId,
} from "../worldPresets.js";
import { compileMapSpec, compileStateMapSpec, createLegacyPresetMapSpec } from "../mapspec.js";
import { evaluateFoundationEligibility } from "../foundationEligibility.js";
import { deriveStageState } from "./progression.js";
import { deriveCanonicalZoneState } from "../canonicalZones.js";
import { derivePatternBonuses, derivePatternCatalog } from "../patterns.js";

function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

const TICKS_PER_SECOND = 24;
const HARVEST_SECONDS = 5;
const HARVEST_TICKS = TICKS_PER_SECOND * HARVEST_SECONDS;

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
  return !!evaluateFoundationEligibility(state).eligible;
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
  if (founderIndices.length !== 1) return null;

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

function findNextStepBfs4(world, fromIdx, targetIdx, w, h) {
  if (fromIdx === targetIdx) return fromIdx;
  const total = w * h;
  if (fromIdx < 0 || targetIdx < 0 || fromIdx >= total || targetIdx >= total) return -1;
  const alive = world?.alive;
  if (!alive || !ArrayBuffer.isView(alive)) return -1;

  const prev = new Int32Array(total);
  prev.fill(-1);
  const seen = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qh = 0;
  let qt = 0;
  queue[qt++] = fromIdx;
  seen[fromIdx] = 1;

  while (qh < qt) {
    const idx = queue[qh++];
    if (idx === targetIdx) break;
    const x = idx % w;
    const y = (idx / w) | 0;
    const candidates = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of candidates) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (seen[nIdx]) continue;
      if (nIdx !== targetIdx && (Number(alive[nIdx] || 0) | 0) === 1) continue;
      seen[nIdx] = 1;
      prev[nIdx] = idx;
      queue[qt++] = nIdx;
    }
  }

  if (!seen[targetIdx]) return -1;
  let step = targetIdx;
  while (prev[step] !== -1 && prev[step] !== fromIdx) {
    step = prev[step];
  }
  return prev[step] === fromIdx ? step : targetIdx;
}

function moveEntityTile(world, fromIdx, toIdx) {
  if (fromIdx === toIdx) return;
  const scalarKeys = ["E", "reserve", "link", "lineageId", "hue", "age", "born", "died", "W", "clusterField", "superId"];
  for (const key of scalarKeys) {
    const arr = world?.[key];
    if (!arr || !ArrayBuffer.isView(arr)) continue;
    arr[toIdx] = arr[fromIdx];
    arr[fromIdx] = 0;
  }
  if (world?.alive && ArrayBuffer.isView(world.alive)) {
    world.alive[toIdx] = 1;
    world.alive[fromIdx] = 0;
  }
  const trait = world?.trait;
  if (trait && ArrayBuffer.isView(trait)) {
    const fromOff = fromIdx * 7;
    const toOff = toIdx * 7;
    for (let i = 0; i < 7; i++) {
      trait[toOff + i] = trait[fromOff + i];
      trait[fromOff + i] = 0;
    }
  }
}

function createEmptyActiveOrder() {
  return {
    active: false,
    type: "",
    fromX: -1,
    fromY: -1,
    targetX: -1,
    targetY: -1,
    progress: 0,
    maxProgress: HARVEST_TICKS,
  };
}

function parseWorkerEntityId(entityId) {
  if (typeof entityId !== "string") return null;
  const match = /^worker:(-?\d+):(-?\d+)$/.exec(entityId.trim());
  if (!match) return null;
  return { fromX: Number(match[1]) | 0, fromY: Number(match[2]) | 0 };
}

function buildIssueMovePatches(state, fromX, fromY, targetX, targetY, commandType = "ISSUE_MOVE", entityId = "") {
  if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
  const world = state.world;
  if (!world?.alive || !world?.lineageId || !world?.R) return [];
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;
  if (fromX < 0 || fromY < 0 || fromX >= w || fromY >= h) return [];
  if (targetX < 0 || targetY < 0 || targetX >= w || targetY >= h) return [];
  const fromIdx = fromY * w + fromX;
  const targetIdx = targetY * w + targetX;
  if (fromIdx === targetIdx) return [];
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const isOwnAlive =
    (Number(world.alive[fromIdx] || 0) | 0) === 1 &&
    (Number(world.lineageId[fromIdx] || 0) | 0) === playerLineageId;
  if (!isOwnAlive) return [];
  if (Number(world.R[targetIdx] || 0) <= 0.05) return [];
  const normalizedEntityId = entityId || `worker:${fromX}:${fromY}`;
  const order = { active: true, fromX, fromY, targetX, targetY };
  const activeOrder = {
    active: true,
    type: "HARVEST",
    fromX,
    fromY,
    targetX,
    targetY,
    progress: 0,
    maxProgress: HARVEST_TICKS,
  };
  return [
    { op: "set", path: "/sim/selectedUnit", value: fromIdx },
    { op: "set", path: "/sim/selectedEntity", value: { entityKind: "worker", entityId: normalizedEntityId } },
    { op: "set", path: "/sim/unitOrder", value: order },
    { op: "set", path: "/sim/activeOrder", value: activeOrder },
    { op: "set", path: "/sim/lastCommand", value: `${commandType}:${fromX},${fromY}->${targetX},${targetY}` },
  ];
}

function canConfirmCoreZone(state) {
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
  return normalizeRunPhase(state?.sim?.runPhase, RUN_PHASE.GENESIS_SETUP) === RUN_PHASE.GENESIS_SETUP;
}

function isPreRunGenesisPhase(state) {
  return normalizeRunPhase(state?.sim?.runPhase, RUN_PHASE.GENESIS_SETUP) !== RUN_PHASE.RUN_ACTIVE;
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

function buildWorldGenerationPatches(state, presetId) {
  const meta = state.meta;
  const compiledMap = compileStateMapSpec(state, { presetId });
  const normalizedPresetId = normalizeWorldPresetId(compiledMap.presetId);
  const seededPhysics = seededStartPhysics(meta.seed, PHYSICS_DEFAULT);
  const tunedPhysics = applyPresetPhysicsOverrides(seededPhysics, normalizedPresetId);
  const world = generateWorld(
    compiledMap.gridW,
    compiledMap.gridH,
    meta.seed,
    tunedPhysics,
    normalizedPresetId
  );
  applyMapSpecOverrides(world, compiledMap.spec);
  applyGlobalLearningToWorld(world, meta.globalLearning);
  world.devMutationVault = cloneJson(meta.devMutationVault || defaultDevMutationVault());
  world.zoneMap = new Int8Array(compiledMap.gridW * compiledMap.gridH);
  world.zoneRole = new Int8Array(compiledMap.gridW * compiledMap.gridH);
  world.zoneId = new Uint16Array(compiledMap.gridW * compiledMap.gridH);
  world.zoneMeta = {};
  world.cores = {};
  world.buildings = {};
  world.workers = {};
  world.fighters = {};
  world.belts = {};
  world.powerLines = {};
  world.resourceNodes = {};
  world.mapSpecSnapshot = compiledMap.snapshot;

  const nextSim = deriveBootstrapSimMetrics(
    world,
    { ...meta, gridW: compiledMap.gridW, gridH: compiledMap.gridH, physics: tunedPhysics },
    makeInitialState().sim,
  );
  nextSim.running = false;
  nextSim.runPhase = RUN_PHASE.GENESIS_SETUP;
  nextSim.founderBudget = 1;
  nextSim.founderPlaced = 0;
  const stageState = deriveStageState(world, nextSim, {
    ...meta,
    physics: tunedPhysics,
    worldPresetId: normalizedPresetId,
    playerLineageId: 1,
  });
  Object.assign(nextSim, stageState);

  for (const k of Object.keys(nextSim)) {
    if (typeof nextSim[k] === "number" && !Number.isFinite(nextSim[k])) {
      console.error(`BOOTSTRAP_METRIC_FAIL: non-finite ${k}`, nextSim[k]);
      nextSim[k] = 0;
    }
  }

  const patches = [
    { op: "set", path: "/meta/gridW", value: compiledMap.gridW },
    { op: "set", path: "/meta/gridH", value: compiledMap.gridH },
    { op: "set", path: "/meta/worldPresetId", value: normalizedPresetId },
    { op: "set", path: "/meta/physics", value: tunedPhysics },
    { op: "set", path: "/map/activeSource", value: compiledMap.activeSource },
    { op: "set", path: "/map/spec", value: compiledMap.spec },
    { op: "set", path: "/map/compiledHash", value: compiledMap.compiledHash },
    { op: "set", path: "/map/validation", value: compiledMap.validation },
  ];
  pushKeysPatches(patches, world, WORLD_KEYS, "/world");
  patches.push({ op: "set", path: "/world/cores", value: world.cores });
  patches.push({ op: "set", path: "/world/buildings", value: world.buildings });
  patches.push({ op: "set", path: "/world/workers", value: world.workers });
  patches.push({ op: "set", path: "/world/fighters", value: world.fighters });
  patches.push({ op: "set", path: "/world/belts", value: world.belts });
  patches.push({ op: "set", path: "/world/powerLines", value: world.powerLines });
  patches.push({ op: "set", path: "/world/resourceNodes", value: world.resourceNodes });
  patches.push({ op: "set", path: "/world/mapSpecSnapshot", value: world.mapSpecSnapshot });
  pushKeysPatches(patches, nextSim, SIM_KEYS, "/sim");
  patches.push({ op: "set", path: "/meta/playerLineageId", value: 1 });
  patches.push({ op: "set", path: "/meta/cpuLineageId", value: 2 });
  if (stageState.patches) patches.push(...stageState.patches);
  return patches;
}

function buildMapSpecCompilePatches(compiledMap) {
  const normalizedPresetId = normalizeWorldPresetId(compiledMap?.presetId);
  return [
    { op: "set", path: "/map/activeSource", value: compiledMap.activeSource },
    { op: "set", path: "/map/spec", value: compiledMap.spec },
    { op: "set", path: "/map/compiledHash", value: compiledMap.compiledHash },
    { op: "set", path: "/map/validation", value: compiledMap.validation },
    { op: "set", path: "/meta/gridW", value: compiledMap.gridW },
    { op: "set", path: "/meta/gridH", value: compiledMap.gridH },
    { op: "set", path: "/meta/worldPresetId", value: normalizedPresetId },
  ];
}

export function makeInitialState() {
  return {
    meta: {
      seed:        "life-light",
      gridW:       64,
      gridH:       64,
      speed:       24,
      brushMode:   BRUSH_MODE.OBSERVE,
      brushRadius: 3,
      renderMode:  "cells",
      activeOverlay: OVERLAY_MODE.NONE,
      worldPresetId: "river_delta",
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
      tick: 0, running: false, runPhase: RUN_PHASE.GENESIS_SETUP, founderBudget: 1, founderPlaced: 0,
      selectedUnit: -1,
      unitOrder: { active: false, fromX: -1, fromY: -1, targetX: -1, targetY: -1 },
      lastCommand: "",
      lastAutoAction: "",
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
    "reserve", "link", "clusterField", "superId", "hue", "lineageId", "trait", "age", "born", "died",
    "visibility", "explored",
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
  const worldSeedHash = hashString(`${meta?.seed || "life-seed"}:${normalizeWorldPresetId(meta?.worldPresetId)}`);
  const metrics = simStep(worldMutable, {
    ...meta.physics,
    playerLineageId: (meta.playerLineageId | 0) || 1,
    cpuLineageId: (meta.cpuLineageId | 0) || 2,
    seasonLength: meta.physics?.seasonLength || 300,
    worldSeedHash,
    playerAliveCount: Number(sim?.playerAliveCount || 0),
    cpuAliveCount: Number(sim?.cpuAliveCount || 0),
  }, sim.tick);
  return { world: worldMutable, metrics };
}

export function reducer(state, action, ctx = {}) {
  const { rng } = ctx;
  switch (action.type) {

    case "GEN_WORLD": {
      const patches = buildWorldGenerationPatches(state);
      return patches;
    }

    case "CONFIRM_FOUNDATION": {
      if (!canConfirmFoundation(state)) return [];
      const patches = [
        { op: "set", path: "/sim/runPhase", value: RUN_PHASE.GENESIS_ZONE },
        { op: "set", path: "/sim/running", value: false },
      ];
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
      const w = Number(state.world.w || state.meta.gridW || 0) | 0;
      const h = Number(state.world.h || state.meta.gridH || 0) | 0;
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
      const cpuSpawn = [];
      if (Number(state.sim.cpuBootstrapDone || 0) === 0) {
        const cpuWindow = preset?.startWindows?.cpu;
        const cpuLineageId = Number(state.meta.cpuLineageId || 2) | 0;
        if (cpuWindow) {
          const cpuRange = getStartWindowRange(cpuWindow, w, h);
          const cx = Number(cpuRange?.x0 ?? -1) | 0;
          const cy = Number(cpuRange?.y0 ?? -1) | 0;
          if (cx >= 0 && cy >= 0 && cx < w && cy < h) {
            const cIdx = cy * w + cx;
            if ((Number(alive[cIdx] || 0) | 0) !== 1) {
              alive[cIdx] = 1;
              lineageId[cIdx] = cpuLineageId;
              E[cIdx] = Math.max(0.6, Number(E[cIdx] || 0));
              reserve[cIdx] = Math.max(0.2, Number(reserve[cIdx] || 0));
              link[cIdx] = 0;
              hue[cIdx] = 8;
              age[cIdx] = 0;
              if (born) born[cIdx] = 1;
              if (died) died[cIdx] = 0;
              cpuSpawn.push(cIdx);
            }
          }
        }
      }
      const canonicalState = buildCanonicalRuntimeState(
        { ...state.world, coreZoneMask, alive, lineageId, link },
        state.meta.worldPresetId,
        Number(state.meta.playerLineageId || 1) | 0,
      );
      const bootstrapMetrics = deriveBootstrapSimMetrics(
        {
          ...bootstrapWorld,
          coreZoneMask,
          zoneRole: canonicalState.zoneRole,
          zoneId: canonicalState.zoneId,
          zoneMeta: canonicalState.zoneMeta,
        },
        state.meta,
        state.sim,
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
        { op: "set", path: "/sim/aliveCount", value: Number(bootstrapMetrics.aliveCount || 0) },
        { op: "set", path: "/sim/playerAliveCount", value: Number(bootstrapMetrics.playerAliveCount || 0) },
        { op: "set", path: "/sim/cpuAliveCount", value: Number(bootstrapMetrics.cpuAliveCount || 0) },
      ];
      pushCanonicalRuntimePatches(patches, canonicalState);
      return patches;
    }

    case "TOGGLE_DNA_ZONE_WORKER":
    {
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
      return patches;
    }

    case "BUILD_INFRA_PATH": {
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
      return patches;
    }

    case "TOGGLE_RUNNING": {
      const running = action.payload?.running ?? !state.sim.running;
      if (!state.world && running) return [];
      if (running && state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return [];
      if (running && String(state.sim.infraBuildMode || "") !== "") return [];
      const patches = [{ op: "set", path: "/sim/running", value: running }];
      return patches;
    }

    case "SIM_STEP":
      // Core standard: SIM_STEP mutations happen in simStepPatch (separate phase + gate).
      return [];

    case "SET_SPEED": {
      const speed = typeof action.payload === "number" ? action.payload : Number(action.payload?.speed);
      const value = Number.isFinite(speed) ? Math.max(1, Math.min(60, speed)) : 24;
      return [{ op: "set", path: "/meta/speed", value }];
    }

    case "SET_SEED": {
      const seed = typeof action.payload === "string" ? action.payload : String(action.payload?.seed || "life-light");
      return [{ op: "set", path: "/meta/seed", value: seed }];
    }

    case "SET_SIZE":
      if (!Number.isFinite(action.payload?.w) || !Number.isFinite(action.payload?.h)) return [];
      if (action.payload.w < 1 || action.payload.h < 1) return [];
      if (action.payload.w > 512 || action.payload.h > 512) return [];
      return [
        { op: "set", path: "/meta/gridW", value: Math.trunc(action.payload.w) },
        { op: "set", path: "/meta/gridH", value: Math.trunc(action.payload.h) }
      ];

    case "SET_WORLD_PRESET": {
      const compiledMap = compileStateMapSpec(state, {
        presetId: normalizeWorldPresetId(action.payload?.presetId),
      });
      const legacySpec = createLegacyPresetMapSpec({
        presetId: compiledMap.presetId,
        gridW: compiledMap.gridW,
        gridH: compiledMap.gridH,
      });
      const normalizedCompiledMap = {
        ...compiledMap,
        spec: legacySpec,
      };
      return buildMapSpecCompilePatches(normalizedCompiledMap);
    }

    case "SET_MAPSPEC": {
      const compiledMap = compileMapSpec(action.payload?.mapSpec, {
        fallback: {
          gridW: state.meta.gridW,
          gridH: state.meta.gridH,
          presetId: state.meta.worldPresetId,
        },
      });
      return buildMapSpecCompilePatches(compiledMap);
    }

    case "SET_MAP_TILE": {
      if (state.sim.runPhase !== RUN_PHASE.MAP_BUILDER) return [];
      const world = state.world;
      const w = Number(world?.w || state.meta.gridW || 0) | 0;
      const h = Number(world?.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      const mode = String(action.payload?.mode || "");
      const rawValue = Number(action.payload?.value ?? 0.8);
      const value = Number.isFinite(rawValue) ? rawValue : 0.8;
      const remove = !!action.payload?.remove;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      
      const idx = y * w + x;
      const spec = state.map?.spec || {};
      const nextTilePlan = { ...(spec.tilePlan || {}) };
      
      if (remove) {
        delete nextTilePlan[idx];
      } else {
        nextTilePlan[idx] = { mode, value };
      }
      
      const nextSpec = { ...spec, tilePlan: nextTilePlan, mode: "manual" };
      const compiled = compileMapSpec(nextSpec, { fallback: { gridW: w, gridH: h, presetId: state.meta.worldPresetId } });
      
      return buildMapSpecCompilePatches(compiled);
    }

    case "SET_RENDER_MODE": {
      const mode = typeof action.payload === "string" ? action.payload : (action.payload?.mode || "combined");
      return [{ op: "set", path: "/meta/renderMode", value: String(mode) }];
    }

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
      const patches = [{ op: "set", path: "/meta/ui", value: { ...prev, ...clean } }];
      if (typeof src.runPhase === "string" && src.runPhase.length > 0) {
        patches.push({
          op: "set",
          path: "/sim/runPhase",
          value: normalizeRunPhase(src.runPhase, state?.sim?.runPhase || RUN_PHASE.GENESIS_SETUP),
        });
      }
      return patches;
    }

    case "SET_GLOBAL_LEARNING": {
      const prev = state.meta.globalLearning || defaultGlobalLearning();
      const enabled = action.payload?.enabled ?? prev.enabled;
      const strength = clamp(Number(action.payload?.strength ?? prev.strength), 0, 1);
      const next = { ...prev, enabled, strength };
      const patches = [{ op: "set", path: "/meta/globalLearning", value: next }];
      if (state.world) patches.push({ op: "set", path: "/world/globalLearning", value: cloneJson(next) });
      return patches;
    }

    case "RESET_GLOBAL_LEARNING": {
      const reset = defaultGlobalLearning();
      const patches = [{ op: "set", path: "/meta/globalLearning", value: reset }];
      if (state.world) {
        patches.push({ op: "set", path: "/world/globalLearning", value: cloneJson(reset) });
        patches.push({ op: "set", path: "/world/lineageMemory", value: {} });
      }
      return patches;
    }

    case "SET_TILE": {
      const world = state.world;
      if (!world) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const mode = String(action.payload?.mode || "set");
      const radius = Math.max(1, Math.min(10, Number(action.payload?.radius) | 0));
      const base = world.R;
      if (!base || !ArrayBuffer.isView(base)) return [];
      const next = cloneTypedArray(base);
      const clear = !!action.payload?.clear || mode === "clear" || mode === "erase" || mode === "remove";
      const rawValue = Number(action.payload?.value);
      const value = clear ? 0 : clamp(Number.isFinite(rawValue) ? rawValue : 1, 0, 1);

      paintCircle({
        w, h, x, y, radius,
        cb: (idx) => {
          next[idx] = value;
        }
      });

      const patches = [{ op: "set", path: "/world/R", value: next }];
      return patches;
    }

    case "SELECT_ENTITY": {
      const entityKind = String(action.payload?.entityKind || "");
      const entityId = String(action.payload?.entityId || "");
      return [
        { op: "set", path: "/sim/selectedEntity", value: { entityKind, entityId } },
      ];
    }

    case "PLACE_WORKER": {
      return handlePlaceWorker(state, action);
    }

    case "PLACE_CORE": {
      const world = state.world;
      if (!world) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      const remove = !!action.payload?.remove;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;

      // Core footprint is 4x4 anchored at (x, y) as top-left.
      const CORE_SIZE = 4;
      if (x + CORE_SIZE > w || y + CORE_SIZE > h) return [];

      const prevCores = (world.cores && typeof world.cores === "object") ? world.cores : {};
      const coreId = `core_${x}_${y}`;

      if (remove) {
        if (!prevCores[coreId]) return [];
        const runPhase = normalizeRunPhase(state.sim.runPhase, RUN_PHASE.GENESIS_SETUP);
        if (runPhase !== RUN_PHASE.GENESIS_SETUP) return [];
        const nextCores = { ...prevCores };
        delete nextCores[coreId];
        if (!world.alive || !ArrayBuffer.isView(world.alive)) return [];
        const alive = cloneTypedArray(world.alive);
        const E = world.E && ArrayBuffer.isView(world.E) ? cloneTypedArray(world.E) : new Float32Array(w * h);
        const lineageId = world.lineageId && ArrayBuffer.isView(world.lineageId) ? cloneTypedArray(world.lineageId) : new Uint32Array(w * h);
        for (let dy = 0; dy < CORE_SIZE; dy++) {
          for (let dx = 0; dx < CORE_SIZE; dx++) {
            const idx = (y + dy) * w + (x + dx);
            if ((Number(lineageId[idx]) | 0) === playerLineageId) {
              alive[idx] = 0;
              E[idx] = 0;
              lineageId[idx] = 0;
            }
          }
        }
        return [
          { op: "set", path: "/world/cores", value: nextCores },
          { op: "set", path: "/world/alive", value: alive },
          { op: "set", path: "/world/E", value: E },
          { op: "set", path: "/world/lineageId", value: lineageId },
          { op: "set", path: "/sim/phase0CorePlaced", value: false },
          { op: "set", path: "/sim/phase0PlantsDelivered", value: 0 },
          { op: "set", path: "/sim/lastCommand", value: "PLACE_CORE:remove" },
        ];
      }

      // Placement guard: founder must be placed and we must be in genesis setup.
      const runPhase = normalizeRunPhase(state.sim.runPhase, RUN_PHASE.GENESIS_SETUP);
      if (runPhase !== RUN_PHASE.GENESIS_SETUP) return [];
      const founderPlaced = Math.max(0, Number(state.sim.founderPlaced || 0) | 0);
      if (founderPlaced < 1) return [];
      if (state.sim.phase0CorePlaced) return [];

      // Validate all footprint tiles are unoccupied.
      if (!world.alive || !ArrayBuffer.isView(world.alive)) return [];
      for (let dy = 0; dy < CORE_SIZE; dy++) {
        for (let dx = 0; dx < CORE_SIZE; dx++) {
          const idx = (y + dy) * w + (x + dx);
          if ((Number(world.alive[idx]) | 0) === 1) return [];
        }
      }

      // Stamp core footprint into world arrays.
      const alive = cloneTypedArray(world.alive);
      const E = world.E && ArrayBuffer.isView(world.E) ? cloneTypedArray(world.E) : new Float32Array(w * h);
      const lineageId = world.lineageId && ArrayBuffer.isView(world.lineageId) ? cloneTypedArray(world.lineageId) : new Uint32Array(w * h);
      for (let dy = 0; dy < CORE_SIZE; dy++) {
        for (let dx = 0; dx < CORE_SIZE; dx++) {
          const idx = (y + dy) * w + (x + dx);
          alive[idx] = 1;
          E[idx] = 0;
          lineageId[idx] = playerLineageId >>> 0;
        }
      }

      const nextCores = {
        ...prevCores,
        [coreId]: {
          x,
          y,
          size: CORE_SIZE,
          energy: 0,
          resourceKind: "raw_plant",
          lineageId: playerLineageId,
        },
      };

      return [
        { op: "set", path: "/world/cores", value: nextCores },
        { op: "set", path: "/world/alive", value: alive },
        { op: "set", path: "/world/E", value: E },
        { op: "set", path: "/world/lineageId", value: lineageId },
        { op: "set", path: "/sim/phase0CorePlaced", value: true },
        { op: "set", path: "/sim/phase0PlantsDelivered", value: 0 },
        { op: "set", path: "/sim/lastCommand", value: `PLACE_CORE:${x},${y}` },
      ];
    }

    case "ISSUE_MOVE": {
      const parsed = parseWorkerEntityId(action.payload?.entityId);
      if (!parsed) return [];
      return buildIssueMovePatches(
        state,
        parsed.fromX,
        parsed.fromY,
        Number(action.payload?.targetX) | 0,
        Number(action.payload?.targetY) | 0,
        "ISSUE_MOVE",
        String(action.payload?.entityId || ""),
      );
    }

    case "ISSUE_ORDER": {
      return buildIssueMovePatches(
        state,
        Number(action.payload?.fromX) | 0,
        Number(action.payload?.fromY) | 0,
        Number(action.payload?.targetX) | 0,
        Number(action.payload?.targetY) | 0,
        "ISSUE_ORDER",
      );
    }

    case "PLACE_SPLIT_CLUSTER": {
      if (isPreRunGenesisPhase(state)) return [];
      return handlePlaceSplitCluster(state, action);
    }

    case "HARVEST_WORKER": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleHarvestWorker(state, action);
    }

    case "SET_ZONE": {
      if (isPreRunGenesisPhase(state)) return [];
      return handleSetZone(state, action);
    }

    case "SET_WIN_MODE": {
      const patches = buildSetWinModePatches(state, action);
      if (!patches.length) return [];
      return patches;
    }

    case "SET_OVERLAY": {
      return buildSetOverlayPatches(action);
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
  if (!state.sim.running) return [];

  const currentTick = state.sim.tick;
  const preStepAlive = state.world?.alive && ArrayBuffer.isView(state.world.alive)
    ? state.world.alive
    : null;
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
  simOut.selectedUnit = Number(state.sim.selectedUnit ?? -1);
  simOut.unitOrder = state.sim.unitOrder && typeof state.sim.unitOrder === "object"
    ? { ...state.sim.unitOrder }
    : { active: false, fromX: -1, fromY: -1, targetX: -1, targetY: -1 };
  simOut.activeOrder = state.sim.activeOrder && typeof state.sim.activeOrder === "object"
    ? { ...state.sim.activeOrder }
    : {
      ...createEmptyActiveOrder(),
      active: !!simOut.unitOrder?.active,
      type: simOut.unitOrder?.active ? "HARVEST" : "",
      fromX: Number(simOut.unitOrder?.fromX ?? -1),
      fromY: Number(simOut.unitOrder?.fromY ?? -1),
      targetX: Number(simOut.unitOrder?.targetX ?? -1),
      targetY: Number(simOut.unitOrder?.targetY ?? -1),
    };
  simOut.lastCommand = String(state.sim.lastCommand || "");
  simOut.lastAutoAction = "";

  const activeOrder = simOut.activeOrder;
  if (activeOrder?.active) {
    const w = Number(worldMutable?.w || state.meta.gridW || 0) | 0;
    const h = Number(worldMutable?.h || state.meta.gridH || 0) | 0;
    const fromX = Number(activeOrder.fromX) | 0;
    const fromY = Number(activeOrder.fromY) | 0;
    const targetX = Number(activeOrder.targetX) | 0;
    const targetY = Number(activeOrder.targetY) | 0;
    const targetIdx = targetY * w + targetX;
    const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
    let unitIdx = Number(simOut.selectedUnit ?? -1) | 0;
    if (unitIdx < 0 || unitIdx >= w * h || (Number(worldMutable.alive?.[unitIdx] || 0) | 0) !== 1) {
      unitIdx = fromY * w + fromX;
    }
    const validUnit =
      unitIdx >= 0 &&
      unitIdx < w * h &&
      (Number(worldMutable.alive?.[unitIdx] || 0) | 0) === 1 &&
      (Number(worldMutable.lineageId?.[unitIdx] || 0) | 0) === playerLineageId;

    if (!validUnit || targetX < 0 || targetY < 0 || targetX >= w || targetY >= h) {
      simOut.unitOrder = { active: false, fromX: -1, fromY: -1, targetX: -1, targetY: -1 };
      simOut.activeOrder = createEmptyActiveOrder();
      simOut.selectedUnit = -1;
      simOut.lastAutoAction = "ORDER_ABORTED";
    } else if (unitIdx === targetIdx) {
      const maxProgress = Math.max(1, Number(activeOrder.maxProgress || HARVEST_TICKS) | 0);
      const nextProgress = Math.min(maxProgress, (Number(activeOrder.progress || 0) | 0) + 1);
      if (nextProgress < maxProgress) {
        simOut.activeOrder = {
          ...activeOrder,
          active: true,
          type: "HARVEST",
          fromX: unitIdx % w,
          fromY: (unitIdx / w) | 0,
          targetX,
          targetY,
          progress: nextProgress,
          maxProgress,
        };
        simOut.unitOrder = { active: true, fromX: unitIdx % w, fromY: (unitIdx / w) | 0, targetX, targetY };
        simOut.selectedUnit = unitIdx;
        simOut.lastAutoAction = `HARVEST_PROGRESS:${nextProgress}/${maxProgress}`;
      } else {
        simOut.playerDNA = Number(simOut.playerDNA || 0) + 1;
        simOut.totalHarvested = Number(simOut.totalHarvested || 0) + 1;
        simOut.unitOrder = { active: false, fromX: -1, fromY: -1, targetX: -1, targetY: -1 };
        simOut.activeOrder = createEmptyActiveOrder();
        simOut.selectedUnit = unitIdx;
        simOut.lastAutoAction = `HARVEST_AUTO:${targetX},${targetY}`;
      }
    } else {
      const travelTicks = Math.max(1, TICKS_PER_SECOND | 0);
      const travelProgress = (Number(activeOrder.progress || 0) | 0) + 1;
      if (travelProgress < travelTicks) {
        simOut.unitOrder = {
          active: true,
          fromX: unitIdx % w,
          fromY: (unitIdx / w) | 0,
          targetX,
          targetY,
        };
        simOut.activeOrder = {
          ...activeOrder,
          active: true,
          type: "HARVEST",
          fromX: unitIdx % w,
          fromY: (unitIdx / w) | 0,
          targetX,
          targetY,
          progress: travelProgress,
          maxProgress: Math.max(1, Number(activeOrder.maxProgress || HARVEST_TICKS) | 0),
        };
        simOut.selectedUnit = unitIdx;
        simOut.lastAutoAction = `MOVE_WAIT:${travelProgress}/${travelTicks}`;
      } else {
        const navigationWorld = preStepAlive ? { ...worldMutable, alive: preStepAlive } : worldMutable;
        const nextIdx = findNextStepBfs4(navigationWorld, unitIdx, targetIdx, w, h);
        const occupiedAtTickStart = nextIdx >= 0 && (Number(preStepAlive?.[nextIdx] || 0) | 0) === 1;
        const hardBlocked = nextIdx < 0 || (occupiedAtTickStart && nextIdx !== targetIdx);
        if (hardBlocked) {
          simOut.unitOrder = {
            active: true,
            fromX: unitIdx % w,
            fromY: (unitIdx / w) | 0,
            targetX,
            targetY,
          };
          simOut.activeOrder = {
            ...activeOrder,
            active: true,
            type: "HARVEST",
            fromX: unitIdx % w,
            fromY: (unitIdx / w) | 0,
            targetX,
            targetY,
            progress: 0,
            maxProgress: Math.max(1, Number(activeOrder.maxProgress || HARVEST_TICKS) | 0),
          };
          simOut.selectedUnit = unitIdx;
          simOut.lastAutoAction = "ORDER_WAIT_BLOCKED";
        } else {
          moveEntityTile(worldMutable, unitIdx, nextIdx);
          const nx = nextIdx % w;
          const ny = (nextIdx / w) | 0;
          simOut.selectedUnit = nextIdx;
          simOut.unitOrder = {
            active: true,
            fromX: nx,
            fromY: ny,
            targetX,
            targetY,
          };
          simOut.activeOrder = {
            ...activeOrder,
            active: true,
            type: "HARVEST",
            fromX: nx,
            fromY: ny,
            targetX,
            targetY,
            progress: 0,
            maxProgress: Math.max(1, Number(activeOrder.maxProgress || HARVEST_TICKS) | 0),
          };
          simOut.lastAutoAction = `MOVE_STEP:${nx},${ny}`;
        }
      }
    }
  }

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
      ? alivePlayerCoreCells / Math.max(1, alivePlayerCoreCells + alivePlayerInfraCells)
      : Number(simOut.networkRatio || 0);
  }
  if (state.sim.dnaZoneCommitted) {
    const preset = getWorldPreset(state.meta.worldPresetId);
    const dnaYieldScale = Math.max(0, Number(preset?.phaseC?.dnaYieldScale || 0));
    const alivePlayerDnaCells = countAlivePlayerRoleCells(worldMutable, playerLineageId, ZONE_ROLE.DNA);
    simOut.playerDNA = Number(state.sim.playerDNA || 0) + alivePlayerDnaCells * 0.1 * dnaYieldScale;
  }
  const stageDerivation = deriveStageState(worldMutable, simOut, state.meta);
  Object.assign(simOut, stageDerivation);
  if (stageDerivation.patches) patches.push(...stageDerivation.patches);
  applyGoalCode(simOut, currentTick, state.meta);

  for (const k of Object.keys(simOut)) {
    if (typeof simOut[k] === "number" && !Number.isFinite(simOut[k])) {
      console.error(`SIM_STEP_METRIC_FAIL: non-finite ${k}`, simOut[k]);
      simOut[k] = 0;
    }
  }

  // Drift hardening: only patch known sim keys.
  pushKeysPatches(patches, simOut, SIM_KEYS, "/sim", state.sim);
  return patches;
}



