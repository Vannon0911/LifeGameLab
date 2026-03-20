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
} from "./contracts/manifest.js";
import { assertDomainPatchesAllowed } from "./plugin/gates.js";

export {
  SCHEMA_VERSION,
  APP_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
  actionLifecycle,
  assertDomainPatchesAllowed as domainPatchGate,
};

export const manifest = {
  ...contractManifest,
  domainPatchGate: assertDomainPatchesAllowed,
};
