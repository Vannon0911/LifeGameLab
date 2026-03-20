import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDeterministicStore } from "./support/liveTestKit.mjs";
import { snapshotStore } from "./support/liveTestKit.mjs";
import { createStore } from "../src/kernel/store/createStore.js";
import { createNullDriver } from "../src/kernel/store/persistence.js";
import * as manifest from "../src/game/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const forbiddenStaticStrings = [
  "LAB_AUTORUN",
  "RUN_BENCHMARK",
  "APPLY_BUFFERED_SIM_STEP",
  "DEV_BALANCE_RUN_AI",
  "__lifeGameBenchmark",
  "__lifeGameStore",
  "__worldStateLog",
  "__lifeGamePerfStats",
  "render_game_to_text",
  "window.advanceTime",
  "registerPublicApi",
  "force:true",
];

const scanDirExcludes = new Set([
  ".git",
  ".llm",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "tests",
  "docs",
]);
const markerAllowlist = new Set([
  "tools/test-suites.mjs",
]);

function collectRuntimeScanTargets(startRel = ".", out = []) {
  const abs = path.join(root, startRel);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        if (![".githooks"].includes(entry.name)) continue;
      }
      if (entry.isDirectory() && scanDirExcludes.has(entry.name)) continue;
      collectRuntimeScanTargets(path.join(startRel, entry.name), out);
    }
    return out;
  }
  if (!/\.(m?js|cjs)$/i.test(startRel)) return out;
  out.push(startRel.split(path.sep).join("/"));
  return out;
}

const scanTargets = collectRuntimeScanTargets().sort();
assert(scanTargets.length > 0, "runtime scan target list must not be empty");

for (const relPath of scanTargets) {
  if (markerAllowlist.has(relPath)) continue;
  const text = fs.readFileSync(path.join(root, relPath), "utf8");
  for (const forbidden of forbiddenStaticStrings) {
    assert(!text.includes(forbidden), `${relPath} still contains forbidden string '${forbidden}'`);
  }
}

const reducerSource = fs.readFileSync(path.join(root, "src/game/sim/reducer/index.js"), "utf8");
const stateSchemaSource = fs.readFileSync(path.join(root, "src/game/contracts/stateSchema.js"), "utf8");
assert.equal(reducerSource.includes("actionLog"), false, "reducer must not reintroduce actionLog");
assert.equal(stateSchemaSource.includes("actionLog"), false, "state schema must not register actionLog");

const rollbackStore = createDeterministicStore();
rollbackStore.dispatch({ type: "GEN_WORLD", payload: {} });
const rollbackSnapshot = snapshotStore(rollbackStore);
assert.equal(
  Object.prototype.hasOwnProperty.call(rollbackSnapshot.state.meta || {}, "actionLog"),
  false,
  "meta.actionLog must stay absent after GEN_WORLD",
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rollbackSnapshot.state.sim || {}, "actionLog"),
  false,
  "sim.actionLog must stay absent after GEN_WORLD",
);

const blockedActionStore = createDeterministicStore();
assert.throws(
  () => blockedActionStore.dispatch({ type: "RUN_BENCHMARK", payload: {} }),
  /Unknown action type: RUN_BENCHMARK/,
  "removed benchmark action must not be dispatchable",
);

const strictPayloadStore = createDeterministicStore();
assert.throws(
  () => strictPayloadStore.dispatch({ type: "GEN_WORLD", payload: { gameMode: "lab_autorun" } }),
  /is not allowed/,
  "GEN_WORLD payload must reject removed gameMode override",
);
assert.throws(
  () => strictPayloadStore.dispatch({ type: "SIM_STEP", payload: { force: true } }),
  /is not allowed/,
  "SIM_STEP payload must reject removed force flag",
);

const ignoredPayloadCases = [
  {
    label: "set-brush-invalid-mode",
    action: { type: "SET_BRUSH", payload: { brushMode: "dev_backdoor_mode" } },
    select: (state) => state.meta.brushMode,
  },
  {
    label: "set-ui-unknown-key",
    action: { type: "SET_UI", payload: { debugBackdoor: true } },
    select: (state) => state.meta.ui,
  },
  {
    label: "set-physics-unknown-key",
    action: { type: "SET_PHYSICS", payload: { hiddenKnob: 999 } },
    select: (state) => state.meta.physics,
  },
  {
    label: "set-global-learning-unknown-key",
    action: { type: "SET_GLOBAL_LEARNING", payload: { hiddenKnob: 1 } },
    select: (state) => state.meta.globalLearning,
  },
];

const ignoredCaseAnchors = [];
for (const testCase of ignoredPayloadCases) {
  const store = createDeterministicStore();
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  const before = snapshotStore(store);
  store.dispatch(testCase.action);
  const after = snapshotStore(store);
  assert.deepEqual(testCase.select(after.state), testCase.select(before.state), `${testCase.label} must not mutate its guarded contract surface`);
  assert.equal(after.signature, before.signature, `${testCase.label} must keep signature stable`);
  assert.equal(after.signatureMaterialHash, before.signatureMaterialHash, `${testCase.label} must keep signature material stable`);
  assert.equal(after.readModelHash, before.readModelHash, `${testCase.label} must keep read model stable`);
  ignoredCaseAnchors.push(`${testCase.label}:${after.signature}:${after.signatureMaterialHash}:${after.readModelHash}`);
}

console.log(`NO_BYPASS_OK benchmark action removed + forbidden payload keys rejected + ignored negative cases stable anchors=${ignoredCaseAnchors.join(",")}`);

const hrtimeBypassStore = createStore(
  manifest,
  {
    reducer: (state, action, ctx) => {
      if (action.type === "GEN_WORLD") {
        process.hrtime.bigint();
        return [];
      }
      return reducer(state, action, ctx);
    },
    simStep: simStepPatch,
  },
  { storageDriver: createNullDriver() },
);
assert.throws(
  () => hrtimeBypassStore.dispatch({ type: "GEN_WORLD", payload: {} }),
  /process\.hrtime\.bigint\(\)/,
  "determinism guard must block process.hrtime.bigint()",
);

console.log("DETERMINISM_GUARD_HRTIME_OK blocked=true");
