import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-pattern-engine.mjs");

import { deriveCanonicalZoneState } from "../src/game/sim/canonicalZones.js";
import { derivePatternBonuses, derivePatternCatalog } from "../src/game/sim/patterns.js";
import { getWorldPreset } from "../src/game/sim/worldPresets.js";
import { ZONE_ROLE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeWorld() {
  const w = 8;
  const h = 8;
  const size = w * h;
  const alive = new Uint8Array(size);
  const lineageId = new Uint32Array(size);
  const zoneRole = new Int8Array(size);
  const playerLineageId = 1;

  const mark = (x, y, roleId) => {
    const idx = y * w + x;
    alive[idx] = 1;
    lineageId[idx] = playerLineageId;
    zoneRole[idx] = roleId;
  };

  mark(1, 1, ZONE_ROLE.CORE);
  mark(2, 1, ZONE_ROLE.CORE);
  mark(3, 1, ZONE_ROLE.CORE);

  mark(1, 4, ZONE_ROLE.DNA);
  mark(2, 4, ZONE_ROLE.DNA);
  mark(1, 5, ZONE_ROLE.DNA);
  mark(2, 5, ZONE_ROLE.DNA);

  mark(5, 1, ZONE_ROLE.INFRA);
  mark(5, 2, ZONE_ROLE.INFRA);
  mark(5, 3, ZONE_ROLE.INFRA);
  mark(6, 2, ZONE_ROLE.INFRA);

  return { w, h, alive, lineageId, zoneRole };
}

const world = makeWorld();
const zoneStateA = deriveCanonicalZoneState(world, 1, world.zoneRole);
const zoneStateB = deriveCanonicalZoneState(world, 1, world.zoneRole);
const catalogA = derivePatternCatalog(zoneStateA, world);
const catalogB = derivePatternCatalog(zoneStateB, world);
const bonusesA = derivePatternBonuses(catalogA, getWorldPreset("river_delta"));
const bonusesB = derivePatternBonuses(catalogB, getWorldPreset("river_delta"));

assert(JSON.stringify(Array.from(zoneStateA.zoneId)) === JSON.stringify(Array.from(zoneStateB.zoneId)), "zoneId derivation must be deterministic");
assert(JSON.stringify(zoneStateA.zoneMeta) === JSON.stringify(zoneStateB.zoneMeta), "zoneMeta derivation must be deterministic");
assert(JSON.stringify(catalogA) === JSON.stringify(catalogB), "patternCatalog must be deterministic");
assert(JSON.stringify(bonusesA) === JSON.stringify(bonusesB), "patternBonuses must be deterministic");
assert(Number(catalogA.line.count || 0) >= 1, "line pattern must be detected");
assert(Number(catalogA.block.count || 0) >= 1, "block pattern must be detected");
assert(Number(catalogA.branch.count || 0) >= 1, "branch pattern must be detected");
assert(Number(bonusesA.energy || 0) > 0, "energy bonus must become positive");
assert(Number(bonusesA.transport || 0) > 0, "transport bonus must become positive");

console.log("PATTERN_ENGINE_OK deterministic canonical pattern detection verified");
