import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-ui-strategy-contract.mjs");
import fs from "node:fs";
import path from "node:path";
import { PANEL_DEFS } from "../src/game/ui/ui.constants.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const uiPath = path.resolve("src/game/ui/ui.js");
const mainPath = path.resolve("src/app/main.js");
const ui = fs.readFileSync(uiPath, "utf8");
const main = fs.readFileSync(mainPath, "utf8");

assert(
  JSON.stringify(PANEL_DEFS.map((panel) => panel.key)) === JSON.stringify(["lage", "eingriffe", "evolution", "welt", "labor"]),
  "panel defs must expose exactly lage/eingriffe/evolution/welt/labor"
);

const eingriffeStart = ui.indexOf('if (ctx === "eingriffe") {');
const eingriffeEnd = ui.indexOf('// ── ENERGIE', eingriffeStart);
assert(eingriffeStart >= 0 && eingriffeEnd > eingriffeStart, "eingriffe panel branch not found");
const eingriffeBlock = ui.slice(eingriffeStart, eingriffeEnd);
for (const required of ['type: "HARVEST_PULSE"', 'type: "PRUNE_CLUSTER"', 'type: "RECYCLE_PATCH"', 'type: "SEED_SPREAD"', 'type:"SET_PLAYER_DOCTRINE"']) {
  assert(eingriffeBlock.includes(required), `eingriffe panel missing ${required}`);
}
for (const forbidden of ['type:"HARVEST_CELL"', 'type:"SET_ZONE"', 'type:"SET_BRUSH"', 'BRUSH_MODE.CELL_HARVEST']) {
  assert(!eingriffeBlock.includes(forbidden), `eingriffe panel still exposes ${forbidden}`);
}

const weltStart = ui.indexOf('if (ctx === "welt") {');
const weltEnd = ui.indexOf('// ── LABOR', weltStart);
assert(weltStart >= 0 && weltEnd > weltStart, "welt panel branch not found");
const weltBlock = ui.slice(weltStart, weltEnd);
assert(weltBlock.includes('type: "SET_WORLD_PRESET"'), "welt panel missing SET_WORLD_PRESET dispatch");
assert(!weltBlock.includes('type:"SET_RENDER_MODE"'), "welt panel must not expose render mode");
assert(weltBlock.includes('queueMicrotask(() => this._renderPanelBody(container, this._store.getState()))'), "welt panel must force repaint after world-control dispatches");

const laborStart = ui.indexOf('if (ctx === "labor") {');
const laborEnd = ui.indexOf('// ── SIEG', laborStart);
assert(laborStart >= 0 && laborEnd > laborStart, "labor panel branch not found");
const laborBlock = ui.slice(laborStart, laborEnd);
for (const required of ['type:"SET_RENDER_MODE"', 'type:"SET_OVERLAY"', 'BRUSH_MODE.CELL_HARVEST', 'BRUSH_MODE.ZONE_PAINT']) {
  assert(laborBlock.includes(required), `labor panel missing ${required}`);
}
assert(laborBlock.includes('type: "RUN_BENCHMARK"'), "labor panel missing RUN_BENCHMARK dispatch");
assert(laborBlock.includes('queueMicrotask(() => this._renderPanelBody(container, this._store.getState()))'), "labor panel must force repaint after local control dispatches");
assert(ui.includes('window.addEventListener("benchmark:update"'), "ui missing benchmark:update live sync");
assert(ui.includes("_syncUiPanelState("), "ui missing panel state sync helper");
assert(ui.includes('type: "SET_UI"') && ui.includes("activeTab") && ui.includes("panelOpen"), "ui must persist activeTab/panelOpen through SET_UI");
assert(!ui.includes("Scanner und Overlays bleiben Labor-Werkzeuge"), "main-run copy must not reintroduce scanner wording");
assert(!ui.includes("Naechster Overlay-Scan"), "main-run copy must not expose overlay-scan wording");

assert(main.includes("window.render_game_to_text = renderGameToText;"), "main.js missing render_game_to_text hook");
assert(main.includes("window.advanceTime = advanceTime;"), "main.js missing advanceTime hook");
assert(main.includes("window.__lifeGamePerfStats"), "main.js missing __lifeGamePerfStats hook");

console.log("UI_STRATEGY_CONTRACT_OK freeze panels, main-run actions, and labor isolation verified");
