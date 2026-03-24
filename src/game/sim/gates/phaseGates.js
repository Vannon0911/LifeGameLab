import { RUN_PHASE } from "../../contracts/ids.js";

export function shouldAdvanceSimulation(state) {
  const runPhase = String(state?.sim?.runPhase || RUN_PHASE.RUN_ACTIVE);
  return !!state?.sim?.running && runPhase === RUN_PHASE.RUN_ACTIVE;
}
