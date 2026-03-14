import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-contract-facade.mjs");
import * as facade from "../src/project/project.manifest.js";
import * as modular from "../src/project/contract/manifest.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(facade.SCHEMA_VERSION === modular.SCHEMA_VERSION, "SCHEMA_VERSION drift");
assert(facade.APP_VERSION === modular.APP_VERSION, "APP_VERSION drift");
assert(facade.stateSchema === modular.stateSchema, "stateSchema reference drift");
assert(facade.actionSchema === modular.actionSchema, "actionSchema reference drift");
assert(facade.mutationMatrix === modular.mutationMatrix, "mutationMatrix reference drift");
assert(facade.simGate === modular.simGate, "simGate reference drift");
assert(facade.dataflow === modular.dataflow, "dataflow reference drift");
assert(facade.manifest === modular.manifest, "manifest reference drift");

console.log("CONTRACT_FACADE_OK");
