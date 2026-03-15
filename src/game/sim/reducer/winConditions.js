import {
  GAME_RESULT,
  GOAL_CODE,
  RUN_PHASE,
  ZONE_ROLE,
  WIN_MODE,
  deriveGoalCode,
} from "../../contracts/ids.js";
import { deriveGoalCodeWithPresetBias } from "./progression.js";

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

function countMaskOnes(mask) {
  if (!mask || !ArrayBuffer.isView(mask)) return 0;
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if ((Number(mask[i]) | 0) === 1) count++;
  }
  return count;
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
    const playerLineageId = Number(state?.meta?.playerLineageId || 1) | 0;
    const coreAlive = countAlivePlayerRoleCells(state.world, playerLineageId, ZONE_ROLE.CORE);
    const committedInfra = countAlivePlayerRoleCells(state.world, playerLineageId, ZONE_ROLE.INFRA);
    const visibleTiles = countMaskOnes(state.world?.visibility);

    if (pAlive === 0 && currentTick > 20) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = WIN_MODE.EXTINCTION;
    } else if (lossStreak >= 150) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = WIN_MODE.ENERGY_COLLAPSE;
    } else if (Number(state.sim.unlockedZoneTier || 0) >= 1 && coreAlive === 0 && currentTick > 30) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = WIN_MODE.CORE_COLLAPSE;
    } else if (Number(state.sim.unlockedZoneTier || 0) >= 2 && visibleTiles === 0 && currentTick > 50) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = WIN_MODE.VISION_BREAK;
    } else if (Number(state.sim.unlockedZoneTier || 0) >= 3 && state.sim.infrastructureUnlocked && committedInfra === 0 && currentTick > 60) {
      gameResult = GAME_RESULT.LOSS;
      resolvedWinMode = WIN_MODE.NETWORK_DECAY;
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

export function applyGoalCode(simOut, currentTick, meta = {}) {
  const fallbackGoalCode = deriveGoalCode(simOut, currentTick) || GOAL_CODE.HARVEST_SECURE;
  simOut.goal = deriveGoalCodeWithPresetBias(simOut, meta, fallbackGoalCode) || GOAL_CODE.HARVEST_SECURE;
}
