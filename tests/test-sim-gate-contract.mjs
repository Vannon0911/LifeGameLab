import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { manifest } from "../src/game/contracts/manifest.js";
import { assertSimPatchesAllowed } from "../src/game/sim/gate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const baseState = {
  meta: { gridW: 4, gridH: 4 },
  world: { w: 4, h: 4 },
  sim: {},
};

const simGate = manifest.simGate;

assert.deepEqual(
  simGate.sim.booleanKeys,
  ["running", "phase0CorePlaced", "deprecatedActionMode", "zone2Unlocked", "dnaZoneCommitted", "infrastructureUnlocked"],
  "simGate boolean key contract must stay explicit and fail closed",
);
assert(simGate.sim.objectKeys.includes("cellPatternCounts"), "simGate objectKeys must include cellPatternCounts");
assert(simGate.sim.objectKeys.includes("runSummary"), "simGate objectKeys must include runSummary");
assert(simGate.sim.objectKeys.includes("selectedEntity"), "simGate objectKeys must include selectedEntity");
assert(simGate.sim.objectKeys.includes("mutatorDraft"), "simGate objectKeys must include mutatorDraft");
assert(simGate.sim.keys.includes("cellPatternCounts"), "simGate sim.keys must include cellPatternCounts");
assert(simGate.sim.keys.includes("runSummary"), "simGate sim.keys must include runSummary");
assert(simGate.sim.keys.includes("phase0PlantsDelivered"), "simGate sim.keys must include phase0PlantsDelivered");
assert(simGate.sim.keys.includes("queuedWorkerCount"), "simGate sim.keys must include queuedWorkerCount");
assert.equal(simGate.world.keys.zoneRole.ctor, "Int8Array", "zoneRole gate ctor must stay canonical");
assert.equal(simGate.world.keys.zoneId.ctor, "Uint16Array", "zoneId gate ctor must stay canonical");

for (const invalidBooleanPatch of [
  { op: "set", path: "/sim/running", value: 1 },
  { op: "set", path: "/sim/phase0CorePlaced", value: 1 },
  { op: "set", path: "/sim/deprecatedActionMode", value: 0 },
  { op: "set", path: "/sim/zone2Unlocked", value: 1 },
  { op: "set", path: "/sim/dnaZoneCommitted", value: 0 },
  { op: "set", path: "/sim/infrastructureUnlocked", value: 7 },
]) {
  assert.throws(
    () => assertSimPatchesAllowed(manifest, baseState, "SIM_GATE_CONTRACT", [invalidBooleanPatch]),
    /expected boolean/,
    `${invalidBooleanPatch.path} must reject numeric coercion`,
  );
}

for (const validPatch of [
  { op: "set", path: "/sim/running", value: true },
  { op: "set", path: "/sim/phase0CorePlaced", value: false },
  { op: "set", path: "/sim/deprecatedActionMode", value: true },
  { op: "set", path: "/sim/zone2Unlocked", value: false },
  { op: "set", path: "/sim/dnaZoneCommitted", value: true },
  { op: "set", path: "/sim/infrastructureUnlocked", value: false },
  { op: "set", path: "/sim/phase0PlantsDelivered", value: 5 },
  { op: "set", path: "/sim/queuedWorkerCount", value: 1 },
  { op: "set", path: "/sim/selectedEntity", value: { entityKind: "worker", entityId: "worker-1" } },
  { op: "set", path: "/sim/mutatorDraft", value: { mutatorId: "mutator-1", topologyClass: "loop", nodeCount: 6, closed: true } },
  { op: "set", path: "/sim/cellPatternCounts", value: { line: 1, angle: 2, triangle: 3, loop: 4 } },
  {
    op: "set",
    path: "/sim/runSummary",
    value: {
      result: "WIN",
      winMode: "SUPREMACY",
      tick: 123,
      stage: 3,
      seed: "gate-seed",
      cpuDelta: 9,
      playerDNA: 42,
      playerEnergyNet: 1.5,
      totalHarvested: 17,
      activeBiomeCount: 4,
      dominantTopology: "loop",
      nextSeedSuggestion: "gate-seed-rematch",
      score: 3123,
    },
  },
  { op: "set", path: "/world/zoneRole", value: new Int8Array(16) },
  { op: "set", path: "/world/zoneId", value: new Uint16Array(16) },
]) {
  assert.doesNotThrow(
    () => assertSimPatchesAllowed(manifest, baseState, "SIM_GATE_CONTRACT", [validPatch]),
    `${validPatch.path} must accept canonical gate values`,
  );
}

const simGateSource = fs.readFileSync(path.join(root, "src/game/contracts/simGate.js"), "utf8");
assert.equal((simGateSource.match(/zoneRole:\s*\{\s*type:\s*"ta"/g) || []).length, 1, "simGate source must not duplicate zoneRole");
assert.equal((simGateSource.match(/zoneId:\s*\{\s*type:\s*"ta"/g) || []).length, 1, "simGate source must not duplicate zoneId");
assert.equal((simGateSource.match(/zoneMeta:\s*\{\s*type:\s*"object"\s*\}/g) || []).length, 1, "simGate source must not duplicate zoneMeta");

const worldgenFacadeSource = fs.readFileSync(path.join(root, "src/game/sim/worldgen.js"), "utf8");
const worldgenRuntimeSource = fs.readFileSync(path.join(root, "src/game/sim/world/generationRuntime.js"), "utf8");
const worldgenSource = `${worldgenFacadeSource}\n${worldgenRuntimeSource}`;
assert.equal((worldgenSource.match(/zoneRole:\s*new\s+Int8Array\(N\)/g) || []).length, 1, "worldgen must initialize zoneRole exactly once");
assert.equal((worldgenSource.match(/zoneId:\s*new\s+Uint16Array\(N\)/g) || []).length, 1, "worldgen must initialize zoneId exactly once");
assert.equal((worldgenSource.match(/zoneRole:\s*new\s+Uint8Array\(N\)/g) || []).length, 0, "worldgen must not keep stale zoneRole ctor");
assert.equal((worldgenSource.match(/zoneId:\s*new\s+Int32Array\(N\)/g) || []).length, 0, "worldgen must not keep stale zoneId ctor");

console.log("SIM_GATE_CONTRACT_OK boolean coercion blocked + zone gate ctors canonical + duplicate source definitions removed");
