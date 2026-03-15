import { stateSchema } from "./stateSchema.js";
import { actionSchema } from "./actionSchema.js";
import { mutationMatrix } from "./mutationMatrix.js";
import { simGate } from "./simGate.js";
import { dataflow } from "./dataflow.js";

export const SCHEMA_VERSION = 2;
export const APP_VERSION = "0.7.3";

export const manifest = {
  SCHEMA_VERSION,
  APP_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
};

export {
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
};
