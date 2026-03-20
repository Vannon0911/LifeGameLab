import { RUN_PHASE, normalizeRunPhase } from "../../contracts/ids.js";
import { evaluateFoundationEligibility } from "../foundationEligibility.js";
import { areIndicesConnected8 } from "../grid/index.js";

export function canConfirmFoundation(state) {
  return !!evaluateFoundationEligibility(state).eligible;
}

export function collectFounderIndices(state) {
  const world = state.world;
  if (!world?.alive || !world?.lineageId || !world?.founderMask) return null;
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;
  if (w <= 0 || h <= 0) return null;
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;

  const founderIndices = [];
  for (let i = 0; i < world.founderMask.length; i++) {
    if ((Number(world.founderMask[i]) | 0) !== 1) continue;
    founderIndices.push(i);
  }
  if (founderIndices.length !== 1) return null;

  for (const idx of founderIndices) {
    if ((Number(world.alive[idx]) | 0) !== 1) return null;
    if ((Number(world.lineageId[idx]) | 0) !== playerLineageId) return null;
  }
  if (!areIndicesConnected8(founderIndices, w, h)) return null;
  return founderIndices;
}

export function canConfirmCoreZone(state) {
  if (state.sim.runPhase !== RUN_PHASE.GENESIS_ZONE) return false;
  const founderIndices = collectFounderIndices(state);
  if (!founderIndices) return false;
  const coreZoneMask = state.world?.coreZoneMask;
  if (!coreZoneMask || !ArrayBuffer.isView(coreZoneMask)) return false;
  for (let i = 0; i < coreZoneMask.length; i++) {
    if ((Number(coreZoneMask[i]) | 0) !== 0) return false;
  }
  return true;
}

export function isGenesisSetupInStandardMode(state) {
  return normalizeRunPhase(state?.sim?.runPhase, RUN_PHASE.GENESIS_SETUP) === RUN_PHASE.GENESIS_SETUP;
}

export function isPreRunGenesisPhase(state) {
  return normalizeRunPhase(state?.sim?.runPhase, RUN_PHASE.GENESIS_SETUP) !== RUN_PHASE.RUN_ACTIVE;
}

export function shouldAdvanceSimulation(state) {
  const runPhase = String(state?.sim?.runPhase || RUN_PHASE.GENESIS_SETUP);
  return !!state?.sim?.running && runPhase === RUN_PHASE.RUN_ACTIVE;
}
