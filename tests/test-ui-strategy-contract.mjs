import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-ui-strategy-contract.mjs");
import { PANEL_DEFS } from "../src/game/ui/ui.constants.js";
import { manifest } from "../src/project/project.manifest.js";
import { registerPublicApi } from "../src/app/runtime/publicApi.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertContractBoundAction(type, expectedSource) {
  const actionSchema = manifest.actionSchema?.[type];
  const mutationMatrix = manifest.mutationMatrix?.[type];
  const dataflow = manifest.dataflow?.actions?.[type];
  assert(actionSchema, `${type}: missing actionSchema entry`);
  assert(mutationMatrix, `${type}: missing mutationMatrix entry`);
  assert(dataflow && typeof dataflow === "object", `${type}: missing dataflow.actions entry`);
  const sources = Array.isArray(dataflow.dispatchSources) ? dataflow.dispatchSources : [];
  assert(sources.includes(expectedSource), `${type}: dispatchSources missing '${expectedSource}'`);
}

const panelKeys = PANEL_DEFS.map((panel) => panel.key);
assert(
  JSON.stringify(panelKeys) === JSON.stringify(["lage", "eingriffe", "evolution", "welt", "labor"]),
  `panel contract drift: expected lage/eingriffe/evolution/welt/labor, got ${JSON.stringify(panelKeys)}`,
);

const UI_SOURCE = "src/game/ui/ui.js";

const mainRunActions = [
  "HARVEST_PULSE",
  "PRUNE_CLUSTER",
  "RECYCLE_PATCH",
  "SEED_SPREAD",
  "SET_WORLD_PRESET",
  "BUY_EVOLUTION",
  "SET_PLAYER_DOCTRINE",
  "SET_WIN_MODE",
  "SET_PLACEMENT_COST",
  "PLACE_SPLIT_CLUSTER",
];

const labActions = [
  "SET_RENDER_MODE",
  "SET_OVERLAY",
  "SET_BRUSH",
  "PAINT_BRUSH",
  "SET_ZONE",
  "PLACE_CELL",
  "HARVEST_CELL",
  "SET_PHYSICS",
  "RUN_BENCHMARK",
];

for (const type of mainRunActions) {
  assertContractBoundAction(type, UI_SOURCE);
}

for (const type of labActions) {
  assertContractBoundAction(type, UI_SOURCE);
}

for (const type of mainRunActions) {
  assert(!labActions.includes(type), `action scope drift: ${type} appears in both main-run and lab contracts`);
}

{
  let tick = 10;
  let stepCalls = 0;
  let renderCalls = 0;
  let uiSyncCalls = 0;
  let perfCalls = 0;

  const windowObj = {};
  const store = {
    getState: () => ({
      meta: { speed: 2 },
      sim: { tick },
    }),
  };

  const api = registerPublicApi({
    windowObj,
    store,
    benchmark: {
      getSnapshot: () => ({ phase: "idle" }),
    },
    runOneSimStep: () => {
      stepCalls += 1;
      tick += 1;
    },
    runRender: () => {
      renderCalls += 1;
    },
    runUiSync: () => {
      uiSyncCalls += 1;
    },
    publishPerfStats: () => {
      perfCalls += 1;
    },
    perfBudget: {
      quality: 3,
      dprCap: 2,
      fpsEma: 60,
      frameMsEma: 16,
      renderMsEma: 8,
      targetMinFps: 50,
      targetMaxFps: 60,
    },
  });

  assert(typeof windowObj.render_game_to_text === "function", "public API drift: window.render_game_to_text missing");
  assert(typeof windowObj.advanceTime === "function", "public API drift: window.advanceTime missing");
  assert(windowObj.advanceTime === api.advanceTime, "public API drift: advanceTime binding mismatch");
  assert(windowObj.render_game_to_text === api.renderGameToText, "public API drift: render_game_to_text binding mismatch");

  const advanced = await api.advanceTime(1250);
  assert(advanced.steps === 3, `advanceTime steps drift: expected 3, got ${advanced.steps}`);
  assert(advanced.tick === 13, `advanceTime tick drift: expected 13, got ${advanced.tick}`);
  assert(stepCalls === 3, `advanceTime runOneSimStep calls drift: expected 3, got ${stepCalls}`);
  assert(renderCalls === 1, `advanceTime runRender calls drift: expected 1, got ${renderCalls}`);
  assert(uiSyncCalls === 1, `advanceTime runUiSync calls drift: expected 1, got ${uiSyncCalls}`);
  assert(perfCalls === 1, `advanceTime publishPerfStats calls drift: expected 1, got ${perfCalls}`);

  const minStep = await api.advanceTime(0);
  assert(minStep.steps === 1, `advanceTime minimum-step drift: expected 1, got ${minStep.steps}`);
}

console.log("UI_STRATEGY_CONTRACT_OK panel gates, scope contracts, and public API behavior verified");
