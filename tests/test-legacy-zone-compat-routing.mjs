import assert from "node:assert/strict";

import { reduceLegacyZoneCompat } from "../src/game/sim/reducer/legacyZoneCompat.js";

const deps = {
  handlePlaceSplitCluster: () => ["split"],
  handleHarvestWorker: () => ["harvest"],
  handleSetZone: () => ["zone"],
};

assert.equal(
  reduceLegacyZoneCompat({}, { type: "PLACE_BUILDING", payload: { x: 1, y: 2, radius: 3, zoneType: 1 } }, deps),
  null,
  "PLACE_BUILDING must not route through legacy zone compatibility",
);

assert.deepEqual(
  reduceLegacyZoneCompat({}, { type: "PLACE_SPLIT_CLUSTER", payload: { x: 3, y: 4 } }, deps),
  ["split"],
  "PLACE_SPLIT_CLUSTER must stay wired to split compat handler",
);

assert.deepEqual(
  reduceLegacyZoneCompat({}, { type: "HARVEST_WORKER", payload: { x: 5, y: 6 } }, deps),
  ["harvest"],
  "HARVEST_WORKER must stay wired to harvest compat handler",
);

assert.deepEqual(
  reduceLegacyZoneCompat({}, { type: "SET_ZONE", payload: { x: 7, y: 8, radius: 2, zoneType: 1 } }, deps),
  ["zone"],
  "SET_ZONE must stay wired to zone compat handler",
);

console.log("LEGACY_ZONE_COMPAT_ROUTING_OK");
