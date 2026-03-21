// Reducer index facade: keep this file as overview-only export surface.
// Implementation lives in core.js to avoid monolithic index modules.
export {
  reducer,
  makeInitialState,
  simStepPatch,
  shouldAdvanceSimulation,
} from "./core.js";
