import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-wrapper-ban.mjs");
import fs from "node:fs";
import path from "node:path";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const root = path.resolve(".");
const wrapperFile = path.join(root, "src/game/sim/sim.js");
assert(!fs.existsSync(wrapperFile), "wrapper file src/game/sim/sim.js must be removed");

const roots = ["src", "tests", "tools"];
const forbiddenPatterns = [
  { id: "sim-wrapper-import", re: /"\.\/sim\.js"/g },
  { id: "backcompat-note", re: /\bback-compat\b/gi },
  { id: "wrapper-note", re: /V4 Wrapper for Simulation Logic/g },
  { id: "legacy-signature", re: /simStepPatch\(state,\s*ctx\)/g },
];

const offenders = [];
for (const relRoot of roots) {
  const absRoot = path.join(root, relRoot);
  if (!fs.existsSync(absRoot)) continue;
  const stack = [absRoot];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const abs = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      const rel = path.relative(root, abs).replace(/\\/g, "/");
      if (!/\.(js|mjs)$/.test(rel)) continue;
      if (rel.endsWith("tests/test-wrapper-ban.mjs")) continue;
      const text = fs.readFileSync(abs, "utf8");
      for (const { id, re } of forbiddenPatterns) {
        re.lastIndex = 0;
        if (re.test(text)) offenders.push(`${rel} -> ${id}`);
      }
    }
  }
}

assert(offenders.length === 0, `wrapper/backcompat references found:\n${offenders.join("\n")}`);
console.log("WRAPPER_BAN_OK no sim wrapper or legacy signature references");
