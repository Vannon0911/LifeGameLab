import { stateSchema } from "./stateSchema.js";
import { actionSchema } from "./actionSchema.js";
import { mutationMatrix } from "./mutationMatrix.js";
import { simGate } from "./simGate.js";
import { dataflow } from "./dataflow.js";
import { actionLifecycle } from "./actionLifecycle.js";

export const SCHEMA_VERSION = 2;
export const APP_VERSION = "0.9.0";

export const contractManifest = {
  SCHEMA_VERSION,
  APP_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
  actionLifecycle,
};

export { contractManifest as manifest };

export {
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
  actionLifecycle,
};
