import assert from "node:assert/strict";

import { createEmptyActiveOrder, HARVEST_TICKS } from "../src/game/sim/commands/orderCommands.js";
import { processActiveOrderRuntime } from "../src/game/sim/runtime/processActiveOrderRuntime.js";

function makeWorld({ w = 4, h = 1, alive = [], lineageId = [], R = [] } = {}) {
  const size = w * h;
  const world = {
    w,
    h,
    alive: new Uint8Array(size),
    lineageId: new Uint16Array(size),
    R: new Float32Array(size),
  };
  for (let i = 0; i < size; i += 1) {
    world.alive[i] = Number(alive[i] || 0) | 0;
    world.lineageId[i] = Number(lineageId[i] || 0) | 0;
    world.R[i] = Number(R[i] ?? 1);
  }
  return world;
}

function runOrderRuntime({ worldMutable, preStepAlive, simOut, meta, ticksPerSecond = 24, harvestTicks = HARVEST_TICKS }) {
  return processActiveOrderRuntime({
    worldMutable,
    preStepAlive,
    simOut,
    meta,
    ticksPerSecond,
    harvestTicks,
  });
}

{
  const worldMutable = makeWorld({
    w: 2,
    h: 1,
    alive: [1, 0],
    lineageId: [1, 0],
  });
  const simOut = {
    selectedUnit: 0,
    unitOrder: { active: true, fromX: 0, fromY: 0, targetX: 2, targetY: 0 },
    activeOrder: {
      ...createEmptyActiveOrder(),
      active: true,
      type: "HARVEST",
      fromX: 0,
      fromY: 0,
      targetX: 2,
      targetY: 0,
    },
    lastAutoAction: "",
  };
  runOrderRuntime({
    worldMutable,
    preStepAlive: new Uint8Array(worldMutable.alive),
    simOut,
    meta: { gridW: 2, gridH: 1, playerLineageId: 1 },
  });
  assert.equal(simOut.lastAutoAction, "ORDER_ABORTED");
  assert.deepEqual(simOut.unitOrder, { active: false, fromX: -1, fromY: -1, targetX: -1, targetY: -1 });
  assert.equal(simOut.activeOrder.active, false);
  assert.equal(simOut.selectedUnit, -1);
}

{
  const worldMutable = makeWorld({
    w: 3,
    h: 1,
    alive: [1, 0, 0],
    lineageId: [1, 0, 0],
  });
  const simOut = {
    selectedUnit: 0,
    unitOrder: { active: true, fromX: 0, fromY: 0, targetX: 2, targetY: 0 },
    activeOrder: {
      ...createEmptyActiveOrder(),
      active: true,
      type: "HARVEST",
      fromX: 0,
      fromY: 0,
      targetX: 2,
      targetY: 0,
      progress: 0,
    },
    lastAutoAction: "",
  };
  runOrderRuntime({
    worldMutable,
    preStepAlive: new Uint8Array(worldMutable.alive),
    simOut,
    meta: { gridW: 3, gridH: 1, playerLineageId: 1 },
  });
  assert.equal(simOut.lastAutoAction, "MOVE_WAIT:1/24");
  assert.equal(simOut.selectedUnit, 0);
  assert.equal(simOut.activeOrder.progress, 1);
  assert.equal(worldMutable.alive[0], 1);
}

{
  const worldMutable = makeWorld({
    w: 3,
    h: 1,
    alive: [1, 1, 0],
    lineageId: [1, 2, 0],
  });
  const preStepAlive = new Uint8Array(worldMutable.alive);
  const simOut = {
    selectedUnit: 0,
    unitOrder: { active: true, fromX: 0, fromY: 0, targetX: 2, targetY: 0 },
    activeOrder: {
      ...createEmptyActiveOrder(),
      active: true,
      type: "HARVEST",
      fromX: 0,
      fromY: 0,
      targetX: 2,
      targetY: 0,
      progress: 24,
    },
    lastAutoAction: "",
  };
  runOrderRuntime({
    worldMutable,
    preStepAlive,
    simOut,
    meta: { gridW: 3, gridH: 1, playerLineageId: 1 },
  });
  assert.equal(simOut.lastAutoAction, "ORDER_WAIT_BLOCKED");
  assert.equal(simOut.selectedUnit, 0);
  assert.equal(simOut.activeOrder.active, true);
  assert.equal(simOut.activeOrder.progress, 0);
}

{
  const worldMutable = makeWorld({
    w: 2,
    h: 1,
    alive: [0, 1],
    lineageId: [0, 1],
  });
  const simOut = {
    selectedUnit: 1,
    unitOrder: { active: true, fromX: 1, fromY: 0, targetX: 1, targetY: 0 },
    activeOrder: {
      ...createEmptyActiveOrder(),
      active: true,
      type: "HARVEST",
      fromX: 1,
      fromY: 0,
      targetX: 1,
      targetY: 0,
      progress: 5,
      maxProgress: 8,
    },
    playerDNA: 0,
    totalHarvested: 0,
    lastAutoAction: "",
  };
  runOrderRuntime({
    worldMutable,
    preStepAlive: new Uint8Array(worldMutable.alive),
    simOut,
    meta: { gridW: 2, gridH: 1, playerLineageId: 1 },
  });
  assert.equal(simOut.lastAutoAction, "HARVEST_PROGRESS:6/8");
  assert.equal(simOut.activeOrder.progress, 6);
  assert.equal(simOut.unitOrder.active, true);
}

{
  const worldMutable = makeWorld({
    w: 2,
    h: 1,
    alive: [0, 1],
    lineageId: [0, 1],
  });
  const simOut = {
    selectedUnit: 1,
    unitOrder: { active: true, fromX: 1, fromY: 0, targetX: 1, targetY: 0 },
    activeOrder: {
      ...createEmptyActiveOrder(),
      active: true,
      type: "HARVEST",
      fromX: 1,
      fromY: 0,
      targetX: 1,
      targetY: 0,
      progress: 7,
      maxProgress: 8,
    },
    playerDNA: 0,
    totalHarvested: 0,
    lastAutoAction: "",
  };
  runOrderRuntime({
    worldMutable,
    preStepAlive: new Uint8Array(worldMutable.alive),
    simOut,
    meta: { gridW: 2, gridH: 1, playerLineageId: 1 },
  });
  assert.equal(simOut.lastAutoAction, "HARVEST_AUTO:1,0");
  assert.equal(simOut.playerDNA, 1);
  assert.equal(simOut.totalHarvested, 1);
  assert.deepEqual(simOut.unitOrder, { active: false, fromX: -1, fromY: -1, targetX: -1, targetY: -1 });
  assert.equal(simOut.activeOrder.active, false);
}

console.log("ACTIVE_ORDER_RUNTIME_OK branches=abort,move-wait,blocked,harvest-progress,harvest-complete");
