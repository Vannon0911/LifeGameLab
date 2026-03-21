import { RUN_PHASE } from "../../contracts/ids.js";

export function canConfirmFoundation(_state) {
  return false;
}

export function collectFounderIndices(_state) {
  return null;
}

export function canConfirmCoreZone(_state) {
  return false;
}

export function isGenesisSetupInStandardMode(_state) {
  return false;
}

export function isPreRunGenesisPhase(_state) {
  return false;
}

export function shouldAdvanceSimulation(state) {
  const runPhase = String(state?.sim?.runPhase || RUN_PHASE.RUN_ACTIVE);
  return !!state?.sim?.running && runPhase === RUN_PHASE.RUN_ACTIVE;
}
