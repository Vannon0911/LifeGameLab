import assert from "node:assert/strict";

import { actionSchema } from "../src/project/contract/actionSchema.js";
import { mutationMatrix } from "../src/project/contract/mutationMatrix.js";
import { dataflow } from "../src/project/contract/dataflow.js";
import { stateSchema } from "../src/project/contract/stateSchema.js";
import { simGate } from "../src/project/contract/simGate.js";
import { actionLifecycle, ACTION_LIFECYCLE_STATUS } from "../src/project/contract/actionLifecycle.js";
import { BUILDING_KIND, ENTITY_KIND, RESOURCE_KIND } from "../src/game/contracts/ids.js";
import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const actionKeys = Object.keys(actionSchema).sort();
const lifecycleKeys = Object.keys(actionLifecycle).sort();
const dataflowKeys = Object.keys(dataflow.actions || {}).sort();
const matrixKeys = Object.keys(mutationMatrix).sort();

assert.deepEqual(lifecycleKeys, actionKeys, "actionLifecycle must cover every actionSchema entry");
assert.deepEqual(dataflowKeys, actionKeys, "dataflow must expose every actionSchema entry");
assert.deepEqual(matrixKeys, actionKeys, "mutationMatrix must cover every actionSchema entry");

const deprecatedActions = actionKeys.filter((key) => actionLifecycle[key]?.status === ACTION_LIFECYCLE_STATUS.DEPRECATED);
for (const actionType of deprecatedActions) {
  const entry = actionLifecycle[actionType];
  assert(Array.isArray(entry.removalGates) && entry.removalGates.length === 4, `${actionType} must define replacement gates`);
}

const renamedActions = actionKeys.filter((key) => actionLifecycle[key]?.status === ACTION_LIFECYCLE_STATUS.RENAME);
for (const actionType of renamedActions) {
  const entry = actionLifecycle[actionType];
  assert.equal(typeof entry.replacement, "string", `${actionType} must define a replacement string`);
  assert(entry.replacement.length > 0, `${actionType} must point at a replacement action`);
}

const scaffoldActions = [
  "SELECT_ENTITY",
  "ISSUE_MOVE",
  "PLACE_CORE",
  "PLACE_BUILDING",
  "PLACE_BELT_SEGMENT",
  "PLACE_LINE_SEGMENT",
  "SET_CORE_ROUTING",
  "QUEUE_WORKER",
  "SPAWN_FIGHTER",
  "ASSIGN_REPAIR",
  "SET_MUTATOR_PATTERN",
  "COMMIT_MUTATION",
];

assert.equal(actionLifecycle.SET_MAPSPEC?.status, ACTION_LIFECYCLE_STATUS.STABLE, "SET_MAPSPEC must graduate from scaffold to active Slice B action");
assert(Array.isArray(dataflow.actions.SET_MAPSPEC?.plannedWrites), "SET_MAPSPEC must keep declared planned writes after reducer wiring");

for (const actionType of scaffoldActions) {
  assert.equal(actionLifecycle[actionType]?.status, ACTION_LIFECYCLE_STATUS.NEW_SLICE_A, `${actionType} must be marked as Slice A scaffold`);
  assert.deepEqual(dataflow.actions[actionType]?.dispatchSources || [], [], `${actionType} must stay unwired until reducer work lands`);
  assert(Array.isArray(dataflow.actions[actionType]?.plannedWrites), `${actionType} must expose planned writes`);
}

assert.equal(stateSchema.shape.meta.shape.contractProfile.default, "lifegamelab_rts_v1_1", "meta.contractProfile must advertise the new SoT");
assert.equal(stateSchema.shape.meta.shape.migrationSlice.default, "slice_b_mapspec", "meta.migrationSlice must track the active migration slice");
assert.equal(stateSchema.shape.map.shape.activeSource.default, "legacy_preset", "map scaffold must track the current source");
assert.equal(stateSchema.shape.sim.shape.phase0PlantsDelivered.default, 0, "Phase 0 plant counter scaffold must exist");
assert.equal(stateSchema.shape.sim.shape.phase0CorePlaced.default, false, "Phase 0 core flag scaffold must exist");
assert.equal(stateSchema.shape.sim.shape.deprecatedActionMode.default, true, "legacy coexistence flag must stay explicit");

for (const worldKey of ["cores", "buildings", "workers", "fighters", "belts", "powerLines", "resourceNodes", "mapSpecSnapshot"]) {
  assert.equal(simGate.world.keys[worldKey]?.type, "object", `simGate must reserve world key ${worldKey}`);
}

for (const simKey of ["phase0PlantsDelivered", "phase0CorePlaced", "queuedWorkerCount", "deprecatedActionMode", "selectedEntity", "mutatorDraft"]) {
  assert(simGate.sim.keys.includes(simKey), `simGate must reserve sim key ${simKey}`);
}

const noopCases = [
  { type: "SELECT_ENTITY", payload: { entityKind: ENTITY_KIND.WORKER, entityId: "worker-1" } },
  { type: "ISSUE_MOVE", payload: { entityId: "worker-1", targetX: 3, targetY: 4 } },
  { type: "PLACE_CORE", payload: { x: 5, y: 6 } },
  { type: "PLACE_BUILDING", payload: { x: 7, y: 8, buildingKind: BUILDING_KIND.WORKER_DEPOT, facing: "north" } },
  { type: "PLACE_BELT_SEGMENT", payload: { x: 9, y: 10, direction: "east", remove: false } },
  { type: "PLACE_LINE_SEGMENT", payload: { x: 11, y: 12, remove: false } },
  { type: "SET_CORE_ROUTING", payload: { coreId: "core-1", resourceKind: RESOURCE_KIND.WOOD } },
  { type: "QUEUE_WORKER", payload: { coreId: "core-1", count: 1 } },
  { type: "SPAWN_FIGHTER", payload: { coreId: "core-1", workerId: "worker-1", topologyClass: "triangle" } },
  { type: "ASSIGN_REPAIR", payload: { workerId: "worker-1", targetX: 13, targetY: 14 } },
  { type: "SET_MUTATOR_PATTERN", payload: { mutatorId: "mutator-1", topologyClass: "loop", nodeCount: 6, closed: true } },
  { type: "COMMIT_MUTATION", payload: { mutatorId: "mutator-1", topologyClass: "triangle", workerId: "worker-1" } },
];

for (const testCase of noopCases) {
  const store = createDeterministicStore({ seed: "slice-a-contract-scaffold" });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  const before = snapshotStore(store);
  store.dispatch(testCase);
  const after = snapshotStore(store);
  assert.equal(after.signature, before.signature, `${testCase.type} must be no-op safe before reducer wiring`);
  assert.equal(after.signatureMaterialHash, before.signatureMaterialHash, `${testCase.type} must keep signature material stable before reducer wiring`);
  assert.equal(after.readModelHash, before.readModelHash, `${testCase.type} must keep read model stable before reducer wiring`);
}

console.log(`SLICE_A_CONTRACT_SCAFFOLD_OK actions=${actionKeys.length} deprecated=${deprecatedActions.length} scaffold=${scaffoldActions.length}`);
