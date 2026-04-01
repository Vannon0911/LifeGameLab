import { stateSchema } from "./stateSchema.js";
import { actionSchema } from "./actionSchema.js";
import { mutationMatrix } from "./mutationMatrix.js";
import { simGate } from "./simGate.js";
import { assertDomainPatchGate } from "../plugin/gates.js";

export const SCHEMA_VERSION = "seedworld-v3";

export const runtimeManifest = {
  SCHEMA_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  simStepActionType: "SIM_STEP",
  domainPatchGate: assertDomainPatchGate,
};
