import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-raw-string-guard.mjs");
import fs from "node:fs";
import path from "node:path";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const root = path.resolve(".");

const checks = [
  {
    file: "src/game/ui/ui.js",
    banned: ["\"win\"", "\"loss\"", "\"observe\"", "\"cell_add\"", "\"cell_remove\"", "\"cell_harvest\""],
  },
  {
    file: "src/project/llm/readModel.js",
    banned: ["\"observe\""],
  },
  {
    file: "src/game/sim/reducer/index.js",
    banned: ["\"none\""],
  },
];

for (const { file, banned } of checks) {
  const abs = path.join(root, file);
  const source = fs.readFileSync(abs, "utf8");
  for (const token of banned) {
    assert(!source.includes(token), `${file} contains banned raw contract token ${token}`);
  }
}

console.log("RAW_STRING_GUARD_OK runtime files use centralized contract IDs");
