import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-dataflow-contract.mjs");
import fs from "node:fs";
import path from "node:path";
import { manifest } from "../src/project/project.manifest.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function extractActionTypes(filePath) {
  const text = fs.readFileSync(path.resolve(filePath), "utf8");
  const out = new Set();
  const re = /type:\s*"([A-Z0-9_]+)"/g;
  let m;
  while ((m = re.exec(text))) out.add(m[1]);
  return out;
}

const mainPath = "src/app/main.js";
const uiPath = "src/game/ui/ui.js";
const mainTypes = extractActionTypes(mainPath);
const uiTypes = extractActionTypes(uiPath);

const actionTypes = Object.keys(manifest.actionSchema || {}).sort();
for (const type of actionTypes) {
  const entry = manifest.dataflow?.actions?.[type];
  assert(entry, `dataflow missing action ${type}`);
  assert(entry.contracts?.actionSchema === type, `${type} contracts.actionSchema mismatch`);
  assert(entry.contracts?.mutationMatrix === type, `${type} contracts.mutationMatrix mismatch`);
  const expectedWrites = manifest.mutationMatrix[type] || [];
  const writes = Array.isArray(entry.writes) ? entry.writes : [];
  assert(
    JSON.stringify(writes) === JSON.stringify(expectedWrites),
    `${type} writes mismatch mutationMatrix`
  );
  assert(Array.isArray(entry.dispatchSources), `${type} dispatchSources missing`);
}

for (const type of mainTypes) {
  assert(
    manifest.dataflow.actions[type].dispatchSources.includes(mainPath),
    `${type} missing dispatch source ${mainPath}`
  );
}

for (const type of uiTypes) {
  assert(
    manifest.dataflow.actions[type].dispatchSources.includes(uiPath),
    `${type} missing dispatch source ${uiPath}`
  );
}

console.log(`DATAFLOW_CONTRACT_OK ${actionTypes.length} actions mapped to writes + dispatch sources`);
