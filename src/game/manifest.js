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
import { assertDomainPatchGate } from "./plugin/gates.js";

export {
  SCHEMA_VERSION,
  APP_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
  actionLifecycle,
};

export const runtimeManifest = {
  ...contractManifest,
  // Runtime-only gate hook for kernel patch validation.
  domainPatchGate: assertDomainPatchGate,
};

export const manifest = runtimeManifest;
