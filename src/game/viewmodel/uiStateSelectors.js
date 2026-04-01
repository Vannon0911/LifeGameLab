import { RUN_PHASE } from "../contracts/ids.js";

export function selectRunPhase(state) {
  return String(state?.sim?.runPhase || "");
}

export function selectIsMapBuilder(state) {
  return selectRunPhase(state) === RUN_PHASE.MAP_BUILDER;
}

export function selectIsRunning(state) {
  return !!state?.sim?.running;
}

export function selectGridSize(state) {
  return {
    gridW: Number(state?.meta?.gridW || 0) | 0,
    gridH: Number(state?.meta?.gridH || 0) | 0,
  };
}

export function selectBrushContext(state, builderMode) {
  const runPhase = selectRunPhase(state);
  const isBuilder = runPhase === RUN_PHASE.MAP_BUILDER;
  return {
    runPhase,
    isBuilder,
    mode: isBuilder ? builderMode : state?.meta?.brushMode,
    radius: Number(state?.meta?.brushRadius || 3) | 0,
  };
}

export function selectUiMeta(state) {
  return state?.meta?.ui && typeof state.meta.ui === "object" ? state.meta.ui : {};
}
