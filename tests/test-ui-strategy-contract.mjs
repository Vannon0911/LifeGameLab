import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-ui-strategy-contract.mjs");
import fs from "node:fs";
import path from "node:path";
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
const expectedPanelKeySet = new Set(["lage", "eingriffe", "evolution", "welt", "labor"]);
assert(panelKeys.length === expectedPanelKeySet.size, `panel contract drift: expected ${expectedPanelKeySet.size} panels, got ${panelKeys.length}`);
assert(new Set(panelKeys).size === panelKeys.length, `panel contract drift: duplicate panel keys detected (${JSON.stringify(panelKeys)})`);
for (const key of panelKeys) {
  assert(expectedPanelKeySet.has(key), `panel contract drift: unexpected panel key '${key}'`);
}
for (const panel of PANEL_DEFS) {
  assert(typeof panel.key === "string" && panel.key.length > 0, "panel contract drift: panel.key must be non-empty string");
}

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

{
  const mainText = fs.readFileSync(path.resolve("src/app/main.js"), "utf8");
  const normalized = mainText.replace(/\s+/g, " ");
  assert(/\bconst\s+publicApi\s*=\s*registerPublicApi\s*\(/.test(normalized), "main integration drift: registerPublicApi call missing");
  assert(/\bwindowObj\s*:\s*window\b/.test(normalized), "main integration drift: registerPublicApi must bind windowObj: window");
  assert(/\bwindow\.render_game_to_text\s*=/.test(normalized), "main integration drift: window.render_game_to_text assignment missing");
  assert(/\bwindow\.advanceTime\s*=/.test(normalized), "main integration drift: window.advanceTime assignment missing");
}

console.log("UI_STRATEGY_CONTRACT_OK panel gates, scope contracts, and public API behavior verified");
