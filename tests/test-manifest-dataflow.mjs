import { manifest } from "../src/project/project.manifest.js";

function fail(msg) {
  console.error(`MANIFEST_DATAFLOW_FAIL: ${msg}`);
  process.exit(1);
}

const actionTypes = Object.keys(manifest.actionSchema || {}).sort();
const df = manifest.dataflow;
if (!df || typeof df !== "object") fail("manifest.dataflow missing");
if (!df.actions || typeof df.actions !== "object") fail("manifest.dataflow.actions missing");

const missing = [];
for (const t of actionTypes) {
  if (!df.actions[t]) missing.push(t);
}
if (missing.length) fail(`missing dataflow entries for: ${missing.join(", ")}`);

// Basic drift guard: dataflow must not refer to unknown contracts.
for (const t of actionTypes) {
  const e = df.actions[t];
  const c = e && e.contracts;
  if (!c) continue;
  if (c.actionSchema && c.actionSchema !== t) fail(`${t} contracts.actionSchema must equal '${t}'`);
  if (c.mutationMatrix && !manifest.mutationMatrix[c.mutationMatrix]) fail(`${t} contracts.mutationMatrix '${c.mutationMatrix}' missing`);
}

console.log(`MANIFEST_DATAFLOW_OK ${actionTypes.length} actions documented`);

