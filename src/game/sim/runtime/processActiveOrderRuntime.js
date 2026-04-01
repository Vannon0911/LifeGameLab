import { createEmptyActiveOrder, HARVEST_TICKS } from "../commands/orderCommands.js";
import { findNextStepBfs4, moveEntityTile } from "./orderNavigation.js";

export function processActiveOrderRuntime({
  worldMutable,
  preStepAlive,
  simOut,
  meta,
  ticksPerSecond = 24,
  harvestTicks = HARVEST_TICKS,
}) {
  const activeOrder = simOut.activeOrder;
  if (!activeOrder?.active) return { worldMutable, simOut };

  const w = Number(worldMutable?.w || meta?.gridW || 0) | 0;
  const h = Number(worldMutable?.h || meta?.gridH || 0) | 0;
  const fromX = Number(activeOrder.fromX) | 0;
  const fromY = Number(activeOrder.fromY) | 0;
  const targetX = Number(activeOrder.targetX) | 0;
  const targetY = Number(activeOrder.targetY) | 0;
  const targetIdx = targetY * w + targetX;
  const playerLineageId = Number(meta?.playerLineageId || 1) | 0;
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
    return { worldMutable, simOut };
  }

  if (unitIdx === targetIdx) {
    const maxProgress = Math.max(1, Number(activeOrder.maxProgress || harvestTicks) | 0);
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
    return { worldMutable, simOut };
  }

  const travelTicks = Math.max(1, ticksPerSecond | 0);
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
      maxProgress: Math.max(1, Number(activeOrder.maxProgress || harvestTicks) | 0),
    };
    simOut.selectedUnit = unitIdx;
    simOut.lastAutoAction = `MOVE_WAIT:${travelProgress}/${travelTicks}`;
    return { worldMutable, simOut };
  }

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
      maxProgress: Math.max(1, Number(activeOrder.maxProgress || harvestTicks) | 0),
    };
    simOut.selectedUnit = unitIdx;
    simOut.lastAutoAction = "ORDER_WAIT_BLOCKED";
    return { worldMutable, simOut };
  }

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
    maxProgress: Math.max(1, Number(activeOrder.maxProgress || harvestTicks) | 0),
  };
  simOut.lastAutoAction = `MOVE_STEP:${nx},${ny}`;
  return { worldMutable, simOut };
}
