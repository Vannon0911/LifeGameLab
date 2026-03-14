import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-world-start-windows.mjs");

import {
  START_WINDOWS_DEFAULT,
  WORLD_PRESETS,
  WORLD_PRESET_IDS,
  getStartWindowRange,
  isTileInStartWindow,
} from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

for (const presetId of WORLD_PRESET_IDS) {
  const preset = WORLD_PRESETS[presetId];
  assert(!!preset, `preset missing: ${presetId}`);
  assert(!!preset.startWindows, `startWindows missing: ${presetId}`);
  const p = preset.startWindows.player;
  const c = preset.startWindows.cpu;
  assert(Number(p.x0) === 0.08 && Number(p.y0) === 0.30 && Number(p.x1) === 0.28 && Number(p.y1) === 0.70, `player startWindow drift: ${presetId}`);
  assert(Number(c.x0) === 0.72 && Number(c.y0) === 0.30 && Number(c.x1) === 0.92 && Number(c.y1) === 0.70, `cpu startWindow drift: ${presetId}`);
}

const w = 16;
const h = 16;
const playerRange = getStartWindowRange(START_WINDOWS_DEFAULT.player, w, h);
const cpuRange = getStartWindowRange(START_WINDOWS_DEFAULT.cpu, w, h);

assert(playerRange.x0 === 1 && playerRange.x1 === 5, `player x-range drift: ${JSON.stringify(playerRange)}`);
assert(playerRange.y0 === 4 && playerRange.y1 === 12, `player y-range drift: ${JSON.stringify(playerRange)}`);
assert(cpuRange.x0 === 11 && cpuRange.x1 === 15, `cpu x-range drift: ${JSON.stringify(cpuRange)}`);
assert(cpuRange.y0 === 4 && cpuRange.y1 === 12, `cpu y-range drift: ${JSON.stringify(cpuRange)}`);

assert(isTileInStartWindow(1, 4, w, h, START_WINDOWS_DEFAULT.player), "player lower-left boundary must be legal");
assert(isTileInStartWindow(4, 11, w, h, START_WINDOWS_DEFAULT.player), "player upper-right boundary must be legal");
assert(!isTileInStartWindow(0, 4, w, h, START_WINDOWS_DEFAULT.player), "left of player window must be illegal");
assert(!isTileInStartWindow(5, 11, w, h, START_WINDOWS_DEFAULT.player), "right of player window must be illegal");
assert(!isTileInStartWindow(1, 3, w, h, START_WINDOWS_DEFAULT.player), "above player window must be illegal");
assert(!isTileInStartWindow(1, 12, w, h, START_WINDOWS_DEFAULT.player), "below player window must be illegal");

console.log("WORLD_START_WINDOWS_OK preset defaults and discretization boundaries verified");
