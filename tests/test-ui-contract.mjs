import fs from "node:fs";
import path from "node:path";
import * as manifest from "../src/project/project.manifest.js";

function extractActionTypes(code) {
  const out = new Set();
  const re = /type:\s*"([A-Z0-9_]+)"/g;
  let m;
  while ((m = re.exec(code))) out.add(m[1]);
  return [...out].sort();
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

const uiPath = path.resolve("src/game/ui/ui.js");
const mainPath = path.resolve("src/app/main.js");

const uiTypes = extractActionTypes(read(uiPath));
const mainTypes = extractActionTypes(read(mainPath));
const all = [...new Set([...uiTypes, ...mainTypes])].sort();

const missing = all.filter((t) => !manifest.actionSchema[t]);
if (missing.length) {
  console.error("UI_CONTRACT_FAIL missing actionSchema types:", missing.join(", "));
  process.exit(1);
}

console.log(`UI_CONTRACT_OK ${all.length} action types covered by actionSchema`);

