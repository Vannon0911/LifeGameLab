// Compatibility facade. The contract implementation lives in src/project/contract/*.
import {
  SCHEMA_VERSION,
  APP_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
  actionLifecycle,
  contractManifest,
} from "./contract/manifest.js";
import { assertPluginDomainPatchesAllowed } from "../game/plugin/gates.js";

export { SCHEMA_VERSION, APP_VERSION, stateSchema, actionSchema, mutationMatrix, simGate, dataflow, actionLifecycle, assertPluginDomainPatchesAllowed as domainPatchGate };

export const projectManifest = {
  ...contractManifest,
  domainPatchGate: assertPluginDomainPatchesAllowed,
};

export { projectManifest as manifest };
