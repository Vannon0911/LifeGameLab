// ============================================================
// Simulation Entry (back-compat)
// ============================================================
//
// Keep the public import path stable:
// - reducer.js imports `simStep` from "./sim.js"
// - the actual orchestrator lives in `step.js` for module-level testing.

export { simStep } from "./step.js";

