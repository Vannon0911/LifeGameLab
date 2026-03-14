import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-ui-contract.mjs");
import fs from "node:fs";
import path from "node:path";
import { manifest } from "../src/project/project.manifest.js";

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
const UI_REL = "src/game/ui/ui.js";
const MAIN_REL = "src/app/main.js";

const uiTypes = extractActionTypes(read(uiPath));
const mainTypes = extractActionTypes(read(mainPath));
const all = [...new Set([...uiTypes, ...mainTypes])].sort();

for (const type of all) {
  if (!manifest.actionSchema?.[type]) {
    throw new Error(`UI_CONTRACT_FAIL action=${type} missing actionSchema entry`);
  }
  if (!manifest.mutationMatrix?.[type]) {
    throw new Error(`UI_CONTRACT_FAIL action=${type} missing mutationMatrix entry`);
  }
  const dataflow = manifest.dataflow?.actions?.[type];
  if (!dataflow || typeof dataflow !== "object") {
    throw new Error(`UI_CONTRACT_FAIL action=${type} missing dataflow.actions entry`);
  }
  const sources = Array.isArray(dataflow.dispatchSources) ? dataflow.dispatchSources : [];
  if (uiTypes.includes(type) && !sources.includes(UI_REL)) {
    throw new Error(`UI_CONTRACT_FAIL action=${type} missing dispatchSources '${UI_REL}'`);
  }
  if (mainTypes.includes(type) && !sources.includes(MAIN_REL)) {
    throw new Error(`UI_CONTRACT_FAIL action=${type} missing dispatchSources '${MAIN_REL}'`);
  }
}

const declaredByUi = [];
const declaredByMain = [];
for (const [type, entry] of Object.entries(manifest.dataflow?.actions || {})) {
  const sources = Array.isArray(entry?.dispatchSources) ? entry.dispatchSources : [];
  if (sources.includes(UI_REL)) declaredByUi.push(type);
  if (sources.includes(MAIN_REL)) declaredByMain.push(type);
}

for (const type of declaredByUi) {
  if (!uiTypes.includes(type)) {
    throw new Error(`UI_CONTRACT_FAIL dispatchSources claims '${UI_REL}' emits ${type}, but source extraction did not find it`);
  }
}

for (const type of declaredByMain) {
  if (!mainTypes.includes(type)) {
    throw new Error(`UI_CONTRACT_FAIL dispatchSources claims '${MAIN_REL}' emits ${type}, but source extraction did not find it`);
  }
}

console.log(
  `UI_CONTRACT_OK source<->manifest dispatch contracts verified uiTypes=${uiTypes.length} mainTypes=${mainTypes.length}`,
);
