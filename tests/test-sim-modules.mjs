import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-sim-modules.mjs");
import crypto from "node:crypto";
import { generateWorld } from "../src/game/sim/worldgen.js";
import { PHYSICS_DEFAULT } from "../src/core/kernel/physics.js";
import { stableStringify } from "../src/core/kernel/stableStringify.js";

import { diffuse, applySeasonalLightAnchor } from "../src/game/sim/fields.js";
import { applyPlantLifecycle, enforcePlantTileCap } from "../src/game/sim/plants.js";
import { enforceNutrientCap, enforceCellOnlyEnergy, applyCorpseRelease } from "../src/game/sim/resources.js";
import { applyWorldAi } from "../src/game/sim/worldAi.js";
import { applyDynamicDamping } from "../src/game/sim/damping.js";
import { computeClusterAndLinks } from "../src/game/sim/network.js";
import { runRemoteClusterAttacks } from "../src/game/sim/conflict.js";
import { updateLineageMemory, pruneLineageMemory } from "../src/game/sim/lineage.js";

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function cloneWorld(w) {
  const out = { ...w };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (v && ArrayBuffer.isView(v)) out[k] = new v.constructor(v);
  }
  // Clone plain objects used by modules.
  for (const k of ["lineageMemory", "lineageThreatMemory", "lineageDefenseReadiness", "clusterAttackState", "balanceGovernor", "worldAiAudit"]) {
    if (out[k] && typeof out[k] === "object" && !ArrayBuffer.isView(out[k])) {
      out[k] = JSON.parse(JSON.stringify(out[k]));
    }
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function hashWorldSubset(w, keys) {
  const sub = {};
  for (const k of keys) sub[k] = w[k];
  return sha256Hex(stableStringify(sub));
}

const seed = "module-test-1";
const phy = { ...PHYSICS_DEFAULT };
const base = generateWorld(32, 32, seed, phy);

// 1) fields: diffuse + seasonal anchor deterministic.
{
  const a = cloneWorld(base);
  const b = cloneWorld(base);
  diffuse(a.L, a.w, a.h, phy.L_diffusion);
  applySeasonalLightAnchor(a, phy, 123);
  diffuse(b.L, b.w, b.h, phy.L_diffusion);
  applySeasonalLightAnchor(b, phy, 123);
  assert(hashWorldSubset(a, ["L"]) === hashWorldSubset(b, ["L"]), "fields determinism failed");
}

// 2) plants: lifecycle + cap deterministic + bounded.
{
  const a = cloneWorld(base);
  const b = cloneWorld(base);
  applyPlantLifecycle(a, phy, 10);
  const prunedA = enforcePlantTileCap(a);
  applyPlantLifecycle(b, phy, 10);
  const prunedB = enforcePlantTileCap(b);
  assert(prunedA === prunedB, "plants prune count determinism failed");
  assert(hashWorldSubset(a, ["P", "plantKind", "R", "W"]) === hashWorldSubset(b, ["P", "plantKind", "R", "W"]), "plants determinism failed");
}

// 3) resources: nutrient cap + cell-only-energy + corpse release.
{
  const w = cloneWorld(base);
  w.R.fill(2.0);
  const capped = enforceNutrientCap(w);
  assert(capped > 0, "nutrient cap did not cap anything");
  w.E[0] = 1;
  w.reserve[0] = 1;
  w.link[0] = 1;
  w.alive[0] = 0;
  const cleared = enforceCellOnlyEnergy(w);
  assert(cleared >= 1, "cell-only-energy did not clear ghost resources");
  const r0 = w.R[1], w0 = w.W[1];
  applyCorpseRelease(w, 1);
  assert(w.R[1] >= r0 && w.W[1] >= w0, "corpse release not applied");
}

// 4) worldAi + damping: should not throw and should be deterministic given same input.
{
  const a = cloneWorld(base);
  const b = cloneWorld(base);
  applyWorldAi(a, 5);
  applyWorldAi(b, 5);
  assert(sha256Hex(stableStringify(a.worldAiAudit)) === sha256Hex(stableStringify(b.worldAiAudit)), "worldAi determinism failed");
  applyDynamicDamping(a);
  applyDynamicDamping(b);
  assert(hashWorldSubset(a, ["B", "W", "Sat"]) === hashWorldSubset(b, ["B", "W", "Sat"]), "damping determinism failed");
}

// 5) network: computeClusterAndLinks deterministic.
{
  const a = cloneWorld(base);
  const b = cloneWorld(base);
  computeClusterAndLinks(a, phy);
  computeClusterAndLinks(b, phy);
  assert(hashWorldSubset(a, ["link", "clusterField"]) === hashWorldSubset(b, ["link", "clusterField"]), "network determinism failed");
}

// 6) lineage: update + prune deterministic.
{
  const a = cloneWorld(base);
  const b = cloneWorld(base);
  // Find a living tile to update.
  let idx = -1;
  for (let i = 0; i < a.alive.length; i++) if (a.alive[i] === 1) { idx = i; break; }
  assert(idx >= 0, "no living cell in worldgen output (unexpected)");
  updateLineageMemory(a, idx, 1, 77);
  updateLineageMemory(b, idx, 1, 77);
  pruneLineageMemory(a, 77);
  pruneLineageMemory(b, 77);
  assert(sha256Hex(stableStringify(a.lineageMemory)) === sha256Hex(stableStringify(b.lineageMemory)), "lineage determinism failed");
}

// 7) conflict: force a minimal conflict scenario and verify actionMap marks.
{
  const w = generateWorld(16, 16, "module-conflict-1", phy);
  // Ensure two alive of different lineages with high cohesion and toxin memory.
  const i = 10;
  const j = 100;
  w.alive.fill(0);
  w.E.fill(0);
  w.W.fill(0.5);
  w.R.fill(0.3);
  w.alive[i] = 1;
  w.alive[j] = 1;
  w.E[i] = 1.0;
  w.E[j] = 0.4;
  w.lineageId[i] = 1;
  w.lineageId[j] = 2;
  w.clusterField[i] = 1;
  w.clusterField[j] = 1;
  w.link[i] = 1;
  w.link[j] = 1;
  w.lineageMemory = {
    1: { toxinMetabolism: 0.8, toxin: 0.8, light: 0.5 },
    2: { toxinMetabolism: 0.2, toxin: 0.5, light: 0.5 },
  };
  if (!w.actionMap) w.actionMap = new Uint8Array(w.w * w.h);
  const r = runRemoteClusterAttacks(w, phy, 9, w.actionMap);
  assert(r.attacks >= 0, "conflict returned invalid result");
  // If an attack happened, we require at least one mark.
  if (r.attacks > 0) {
    let marked = 0;
    for (let k = 0; k < w.actionMap.length; k++) if ((w.actionMap[k] | 0) === 245) marked++;
    assert(marked >= 1, "conflict: attacks>0 but no actionMap marks");
  }
}

console.log("SIM_MODULES_OK");
