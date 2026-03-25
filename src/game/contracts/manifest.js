import { stateSchema } from "./stateSchema.js";
import { actionSchema } from "./actionSchema.js";
import { mutationMatrix } from "./mutationMatrix.js";
import { simGate } from "./simGate.js";
import { dataflow } from "./dataflow.js";
import { actionLifecycle, ACTION_LIFECYCLE_STATUS } from "./actionLifecycle.js";

export const SCHEMA_VERSION = 2;
export const APP_VERSION = "0.9.0";
export const SIM_STEP_ACTION_TYPE = "SIM_STEP";
export const notImplementedActions = Object.freeze(
  Object.entries(actionLifecycle)
    .filter(([, value]) => value?.status === ACTION_LIFECYCLE_STATUS.NEW_SLICE_A)
    .map(([actionType]) => actionType)
);

export const contractManifest = {
  SCHEMA_VERSION,
  APP_VERSION,
  simStepActionType: SIM_STEP_ACTION_TYPE,
  notImplementedActions,
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
