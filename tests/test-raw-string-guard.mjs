import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-raw-string-guard.mjs");
import fs from "node:fs";
import path from "node:path";
import {
  BRUSH_MODE,
  GAME_RESULT,
  OVERLAY_MODE,
} from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const root = path.resolve(".");

const checks = Object.freeze([
  {
    file: "src/game/ui/ui.js",
    tokens: [
      GAME_RESULT.WIN,
      GAME_RESULT.LOSS,
      BRUSH_MODE.OBSERVE,
      BRUSH_MODE.CELL_ADD,
      BRUSH_MODE.CELL_REMOVE,
      BRUSH_MODE.CELL_HARVEST,
    ],
  },
  {
    file: "src/project/llm/readModel.js",
    tokens: [BRUSH_MODE.OBSERVE],
  },
  {
    file: "src/game/sim/reducer/index.js",
    tokens: [OVERLAY_MODE.NONE],
  },
]);

function makeQuotedNeedles(token) {
  const value = String(token ?? "");
  return [`"${value}"`, `'${value}'`, `\`${value}\``];
}

for (const { file, tokens } of checks) {
  const abs = path.join(root, file);
  const source = fs.readFileSync(abs, "utf8");
  for (const token of tokens) {
    const hasRawLiteral = makeQuotedNeedles(token).some((needle) => source.includes(needle));
    assert(!hasRawLiteral, `${file} contains banned raw contract token '${token}'`);
  }
}

console.log("RAW_STRING_GUARD_OK runtime files use centralized contract IDs (risk-token audited)");
