import fs from "node:fs";
import path from "node:path";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const uiPath = path.resolve("src/game/ui/ui.js");
const mainPath = path.resolve("src/app/main.js");
const ui = fs.readFileSync(uiPath, "utf8");
const main = fs.readFileSync(mainPath, "utf8");

const toolsStart = ui.indexOf('if (ctx === "tools") {');
const toolsEnd = ui.indexOf('// ── ENERGIE', toolsStart);
assert(toolsStart >= 0 && toolsEnd > toolsStart, "tools panel branch not found");
const toolsBlock = ui.slice(toolsStart, toolsEnd);

const evoStart = ui.indexOf('if (ctx === "evolution") {');
const evoEnd = ui.indexOf('// ── HARVEST', evoStart);
assert(evoStart >= 0 && evoEnd > evoStart, "evolution panel branch not found");
const evoBlock = ui.slice(evoStart, evoEnd);

for (const required of ['id:"observe"', 'id:"split_place"', 'id:"cell_harvest"', 'id:"zone_paint"', 'SET_PLAYER_DOCTRINE']) {
  assert(toolsBlock.includes(required), `tools panel missing ${required}`);
}
for (const forbidden of ['id:"cell_add"', 'id:"cell_remove"']) {
  assert(!toolsBlock.includes(forbidden), `tools panel still exposes ${forbidden}`);
}

for (const required of ["TECH_TREE.filter", "TECH_SYNERGIES", "hasRequiredTechs", "deriveCommandScore"]) {
  assert(evoBlock.includes(required), `evolution panel missing ${required}`);
}

assert(main.includes("window.render_game_to_text = renderGameToText;"), "main.js missing render_game_to_text hook");
assert(main.includes("window.advanceTime = advanceTime;"), "main.js missing advanceTime hook");

console.log("UI_STRATEGY_CONTRACT_OK tools, tech-tree, and browser hooks verified");
