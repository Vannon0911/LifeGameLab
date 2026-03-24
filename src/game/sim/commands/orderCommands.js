import { RUN_PHASE } from "../../contracts/ids.js";

const TICKS_PER_SECOND = 24;
const HARVEST_SECONDS = 5;

export const HARVEST_TICKS = TICKS_PER_SECOND * HARVEST_SECONDS;

export function createEmptyActiveOrder() {
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

export function parseWorkerEntityId(entityId) {
  if (typeof entityId !== "string") return null;
  const match = /^worker:(-?\d+):(-?\d+)$/.exec(entityId.trim());
  if (!match) return null;
  return { fromX: Number(match[1]) | 0, fromY: Number(match[2]) | 0 };
}

export function buildIssueMovePatches(
  state,
  fromX,
  fromY,
  targetX,
  targetY,
  commandType = "ISSUE_MOVE",
  entityId = ""
) {
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
