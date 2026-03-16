import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDeterministicStore } from "./support/liveTestKit.mjs";

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

const scanTargets = [
  "src/app/main.js",
  "src/game/ui/ui.js",
  "src/game/ui/ui.lage.js",
  "tools/evidence-runner.mjs",
  "tools/llm-preflight.mjs",
  "tools/run-all-tests.mjs",
  "tools/run-test-suite.mjs",
  "src/game/sim/reducer/index.js",
  "src/game/sim/playerActions.js",
  "src/game/sim/worldgen.js",
  "src/game/sim/worldAi.js",
  "src/project/contract/actionSchema.js",
  "src/project/contract/mutationMatrix.js",
  "src/project/contract/dataflow.js",
];

for (const relPath of scanTargets) {
  const text = fs.readFileSync(path.join(root, relPath), "utf8");
  for (const forbidden of forbiddenStaticStrings) {
    assert(!text.includes(forbidden), `${relPath} still contains forbidden string '${forbidden}'`);
  }
}

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

console.log("NO_BYPASS_OK benchmark action removed + forbidden payload keys rejected + forbidden strings absent");
