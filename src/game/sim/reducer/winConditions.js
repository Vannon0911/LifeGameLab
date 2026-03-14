import {
  GAME_RESULT,
  GOAL_CODE,
  RUN_PHASE,
  WIN_MODE,
  deriveGoalCode,
} from "../../contracts/ids.js";

function getZoneMetaEntry(world, zoneId) {
  const zoneMeta = world?.zoneMeta;
  if (!zoneMeta || typeof zoneMeta !== "object") return null;
  if (Array.isArray(zoneMeta)) {
    return zoneMeta.find((entry) => String(entry?.id ?? entry?.zoneId ?? "") === String(zoneId)) || null;
  }
  return zoneMeta[zoneId] || zoneMeta[String(zoneId)] || null;
}

function normalizeCanonicalRole(roleValue, meta) {
  const metaRole = String(meta?.role || meta?.zoneRole || "").toLowerCase();
  if (metaRole) return metaRole;
  const role = String(roleValue || "").toLowerCase();
  if (role) return role;
  const numeric = Number(roleValue);
  if (!Number.isFinite(numeric)) return "";
  if (numeric === 1) return "core";
  if (numeric === 2) return "dna";
  if (numeric === 3) return "infra";
  return "";
}

function zoneBelongsToPlayer(meta, playerLineageId) {
  if (!meta || typeof meta !== "object") return true;
  const owner = Number(meta.playerLineageId ?? meta.ownerLineageId ?? meta.lineageId);
  if (!Number.isFinite(owner) || owner <= 0) return true;
  return (owner | 0) === (playerLineageId | 0);
}

function zoneCommitted(meta) {
  if (!meta || typeof meta !== "object") return true;
  if (typeof meta.committed === "boolean") return meta.committed;
  if (typeof meta.active === "boolean") return meta.active;
  return true;
}

function zoneVisible(meta, world, idx) {
  if (meta && typeof meta.visible === "boolean") return meta.visible;
  return Number(world?.visibility?.[idx] || 0) > 0;
}

function collectCanonicalRoleFacts(world, roleId, playerLineageId) {
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  const zoneRole = world?.zoneRole;
  const zoneId = world?.zoneId;
  if (!alive || !lineageId || !zoneRole || !zoneId) {
    return { committedZones: 0, totalTiles: 0, alivePlayerTiles: 0, visibleTiles: 0 };
  }

  const seenZones = new Set();
  let committedZones = 0;
  let totalTiles = 0;
  let alivePlayerTiles = 0;
  let visibleTiles = 0;

  for (let i = 0; i < alive.length; i++) {
    const tileZoneId = zoneId[i];
    const meta = getZoneMetaEntry(world, tileZoneId);
    const role = normalizeCanonicalRole(zoneRole[i], meta);
    if (role !== roleId) continue;
    if (!zoneBelongsToPlayer(meta, playerLineageId) || !zoneCommitted(meta)) continue;
    totalTiles++;
    if (zoneVisible(meta, world, i)) visibleTiles++;
    if ((Number(alive[i]) | 0) === 1 && (Number(lineageId[i]) | 0) === (playerLineageId | 0)) alivePlayerTiles++;
    const zoneKey = String(tileZoneId);
    if (!seenZones.has(zoneKey)) {
      seenZones.add(zoneKey);
      committedZones++;
    }
  }

  return { committedZones, totalTiles, alivePlayerTiles, visibleTiles };
}

function deriveCanonicalLoss(state, simOut) {
  const playerLineageId = Number(state?.meta?.playerLineageId || 0) | 0;
  if (!playerLineageId || !state?.world?.zoneRole || !state?.world?.zoneId) return "";

  const coreFacts = collectCanonicalRoleFacts(state.world, "core", playerLineageId);
  if (coreFacts.committedZones > 0 && coreFacts.alivePlayerTiles <= 0) return WIN_MODE.CORE_COLLAPSE;

  const visibleCore = coreFacts.visibleTiles > 0;
  const dnaFacts = collectCanonicalRoleFacts(state.world, "dna", playerLineageId);
  if ((dnaFacts.committedZones > 0 || Number(state?.sim?.dnaZoneCommitted || 0) > 0) && !visibleCore && dnaFacts.visibleTiles <= 0) {
    return WIN_MODE.VISION_BREAK;
  }

  const infraFacts = collectCanonicalRoleFacts(state.world, "infra", playerLineageId);
  if (
    (infraFacts.committedZones > 0 || state?.sim?.infrastructureUnlocked) &&
    infraFacts.totalTiles > 0 &&
    (infraFacts.alivePlayerTiles <= 0 || Number(simOut?.networkRatio || state?.sim?.networkRatio || 0) < 0.05)
  ) {
    return WIN_MODE.NETWORK_DECAY;
  }

  return "";
}

export function applyWinConditions(state, simOut, currentTick) {
  if (!state.sim.gameResult) {
    const pEIn = Number(simOut.playerEnergyIn || 0);
    const pAlive = Number(simOut.playerAliveCount || 0);
    const pENet = Number(simOut.playerEnergyNet || 0);

    const cpuEIn = (typeof simOut.cpuEnergyIn === "number" && Number.isFinite(simOut.cpuEnergyIn))
      ? simOut.cpuEnergyIn
      : Number(state.sim.cpuEnergyIn || 0);
    simOut.cpuEnergyIn = cpuEIn;

    const winMode = String(state.sim.winMode || WIN_MODE.SUPREMACY);

    let supTicks = Number(state.sim.energySupremacyTicks || 0);
    if (pEIn > cpuEIn * 1.5) supTicks++;
    else supTicks = Math.max(0, supTicks - 1);
    simOut.energySupremacyTicks = supTicks;

    const cpuAlive = Number(simOut.cpuAliveCount || 0);
    let stockTicks = Number(state.sim.stockpileTicks || 0);
    if (pAlive > cpuAlive * 1.5 && pAlive > 30) stockTicks++;
    else stockTicks = Math.max(0, stockTicks - 1);
    simOut.stockpileTicks = stockTicks;

    let effTicks = Number(state.sim.efficiencyTicks || 0);
    const effRatio = pAlive > 0 ? pEIn / pAlive : 0;
    if (effRatio > 0.18 && pAlive > 20) effTicks++;
    else effTicks = Math.max(0, effTicks - 1);
    simOut.efficiencyTicks = effTicks;

    let lossStreak = Number(state.sim.lossStreakTicks || 0);
    if (pENet < -5 && pAlive > 0) lossStreak++;
    else lossStreak = Math.max(0, lossStreak - 1);
    simOut.lossStreakTicks = lossStreak;

    let gameResult = GAME_RESULT.NONE;
    let resolvedWinMode = "";
    const canonicalLoss = deriveCanonicalLoss(state, simOut);

    if (canonicalLoss) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = canonicalLoss;
    } else if (pAlive === 0 && currentTick > 20) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = WIN_MODE.EXTINCTION;
    } else if (lossStreak >= 150) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = WIN_MODE.ENERGY_COLLAPSE;
    } else if (winMode === WIN_MODE.SUPREMACY && supTicks >= 200) {
      gameResult = GAME_RESULT.WIN;
      resolvedWinMode = WIN_MODE.SUPREMACY;
    } else if (winMode === WIN_MODE.STOCKPILE && stockTicks >= 200) {
      gameResult = GAME_RESULT.WIN;
      resolvedWinMode = WIN_MODE.STOCKPILE;
    } else if (winMode === WIN_MODE.EFFICIENCY && effTicks >= 100) {
      gameResult = GAME_RESULT.WIN;
      resolvedWinMode = WIN_MODE.EFFICIENCY;
    }

    if (gameResult) {
      simOut.gameResult = gameResult;
      simOut.winMode = resolvedWinMode;
      simOut.gameEndTick = currentTick;
      simOut.running = false;
      simOut.runPhase = RUN_PHASE.RESULT;
    }
  } else {
    simOut.gameResult = state.sim.gameResult;
    simOut.winMode = state.sim.winMode;
    simOut.gameEndTick = state.sim.gameEndTick;
    simOut.energySupremacyTicks = state.sim.energySupremacyTicks;
    simOut.efficiencyTicks = state.sim.efficiencyTicks;
    simOut.lossStreakTicks = state.sim.lossStreakTicks;
    simOut.stockpileTicks = state.sim.stockpileTicks;
    simOut.cpuEnergyIn = state.sim.cpuEnergyIn;
    simOut.runPhase = RUN_PHASE.RESULT;
  }
}

export function applyGoalCode(state, simOut, currentTick) {
  simOut.goal = deriveGoalCode(simOut, currentTick, state?.meta?.worldPresetId) || GOAL_CODE.HARVEST_SECURE;
}
