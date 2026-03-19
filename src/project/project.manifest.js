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
  manifest as contractManifest,
} from "./contract/manifest.js";
import { assertDomainPatchesAllowed } from "../game/plugin/gates.js";

export { SCHEMA_VERSION, APP_VERSION, stateSchema, actionSchema, mutationMatrix, simGate, dataflow, actionLifecycle };

export const manifest = {
  ...contractManifest,
  domainPatchGate: assertDomainPatchesAllowed,
};
