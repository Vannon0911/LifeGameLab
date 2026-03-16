import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { manifest } from "../src/project/contract/manifest.js";
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
  ["running", "zone2Unlocked", "dnaZoneCommitted", "infrastructureUnlocked"],
  "simGate boolean key contract must stay explicit and fail closed",
);
assert.equal(simGate.world.keys.zoneRole.ctor, "Int8Array", "zoneRole gate ctor must stay canonical");
assert.equal(simGate.world.keys.zoneId.ctor, "Uint16Array", "zoneId gate ctor must stay canonical");

for (const invalidBooleanPatch of [
  { op: "set", path: "/sim/running", value: 1 },
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
  { op: "set", path: "/sim/zone2Unlocked", value: false },
  { op: "set", path: "/sim/dnaZoneCommitted", value: true },
  { op: "set", path: "/sim/infrastructureUnlocked", value: false },
  { op: "set", path: "/world/zoneRole", value: new Int8Array(16) },
  { op: "set", path: "/world/zoneId", value: new Uint16Array(16) },
]) {
  assert.doesNotThrow(
    () => assertSimPatchesAllowed(manifest, baseState, "SIM_GATE_CONTRACT", [validPatch]),
    `${validPatch.path} must accept canonical gate values`,
  );
}

const simGateSource = fs.readFileSync(path.join(root, "src/project/contract/simGate.js"), "utf8");
assert.equal((simGateSource.match(/zoneRole:\s*\{\s*type:\s*"ta"/g) || []).length, 1, "simGate source must not duplicate zoneRole");
assert.equal((simGateSource.match(/zoneId:\s*\{\s*type:\s*"ta"/g) || []).length, 1, "simGate source must not duplicate zoneId");
assert.equal((simGateSource.match(/zoneMeta:\s*\{\s*type:\s*"object"\s*\}/g) || []).length, 1, "simGate source must not duplicate zoneMeta");

const worldgenSource = fs.readFileSync(path.join(root, "src/game/sim/worldgen.js"), "utf8");
assert.equal((worldgenSource.match(/zoneRole:\s*new\s+Int8Array\(N\)/g) || []).length, 1, "worldgen must initialize zoneRole exactly once");
assert.equal((worldgenSource.match(/zoneId:\s*new\s+Uint16Array\(N\)/g) || []).length, 1, "worldgen must initialize zoneId exactly once");
assert.equal((worldgenSource.match(/zoneRole:\s*new\s+Uint8Array\(N\)/g) || []).length, 0, "worldgen must not keep stale zoneRole ctor");
assert.equal((worldgenSource.match(/zoneId:\s*new\s+Int32Array\(N\)/g) || []).length, 0, "worldgen must not keep stale zoneId ctor");

console.log("SIM_GATE_CONTRACT_OK boolean coercion blocked + zone gate ctors canonical + duplicate source definitions removed");
