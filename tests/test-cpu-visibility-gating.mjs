import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-cpu-visibility-gating.mjs");

import { OVERLAY_MODE } from "../src/game/contracts/ids.js";
import { computeFieldSurfaceColor } from "../src/game/render/renderer.js";
import {
  FOG_HIDDEN,
  FOG_MEMORY,
  FOG_VISIBLE,
  applyFogIntelToAdvisorModel,
  buildFogIntel,
  getTileFogState,
} from "../src/game/render/fogOfWar.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeState() {
  return {
    meta: {
      playerLineageId: 1,
      cpuLineageId: 2,
      physics: { Emax: 3.2 },
      activeOverlay: OVERLAY_MODE.NONE,
      renderMode: "combined",
      ui: {},
    },
    sim: {},
    world: {
      w: 3,
      h: 1,
      alive: new Uint8Array([1, 1, 1]),
      lineageId: new Uint32Array([2, 2, 2]),
      E: new Float32Array([1.6, 1.6, 1.6]),
      L: new Float32Array([0.8, 0.8, 0.8]),
      R: new Float32Array([0.5, 0.5, 0.5]),
      W: new Float32Array([0.1, 0.1, 0.1]),
      Sat: new Float32Array([0.6, 0.6, 0.6]),
      P: new Float32Array([0.2, 0.2, 0.2]),
      reserve: new Float32Array([0.2, 0.2, 0.2]),
      link: new Float32Array([0.2, 0.2, 0.2]),
      clusterField: new Float32Array([0.4, 0.4, 0.4]),
      hue: new Float32Array([0, 0, 0]),
      visibility: new Uint8Array([1, 0, 0]),
      explored: new Uint8Array([1, 1, 0]),
    },
  };
}

{
  const state = makeState();
  assert(getTileFogState(state.world, 0) === FOG_VISIBLE, "visible tile must classify as visible");
  assert(getTileFogState(state.world, 1) === FOG_MEMORY, "explored hidden tile must classify as memory");
  assert(getTileFogState(state.world, 2) === FOG_HIDDEN, "unseen tile must classify as hidden");
}

{
  const state = makeState();
  const intel = buildFogIntel(state);
  assert(intel.cpuIntel.mode === "visible", "visible cpu tile must keep precise intel");
  assert(intel.cpuIntel.visibleAlive === 1, "visible cpu tile count must stay exact");
  assert(intel.cpuIntel.signatureBand === "faint", "explored hidden cpu tile must degrade to faint signature");
}

{
  const state = makeState();
  state.world.visibility[0] = 0;
  state.world.explored[0] = 1;
  const intel = buildFogIntel(state);
  assert(intel.cpuIntel.mode === "signature", "cpu outside sight but inside explored memory must become signature intel");
  const redacted = applyFogIntelToAdvisorModel({
    cpuAlive: 3,
    winProgress: {
      blockerCode: "energy_advantage_missing",
      blockerDetail: "Der Energiezufluss liegt noch nicht stabil ueber der CPU.",
    },
  }, state);
  assert(redacted.cpuAlive === null, "signature intel must remove exact cpuAlive output");
  assert(redacted.winProgress.blockerCode === "cpu_intel_limited", "cpu blocker must be redacted outside precise sight");
}

{
  const state = makeState();
  state.world.visibility.fill(0);
  state.world.explored.fill(0);
  const intel = buildFogIntel(state);
  assert(intel.cpuIntel.mode === "hidden", "cpu in unseen area must be fully hidden");
}

{
  const state = makeState();
  const visibleColor = computeFieldSurfaceColor(state.world, state.meta, 0).join(",");
  const memoryColor = computeFieldSurfaceColor(state.world, state.meta, 1).join(",");
  const hiddenColor = computeFieldSurfaceColor(state.world, state.meta, 2).join(",");
  assert(visibleColor !== memoryColor, "memory fog must visually degrade explored tiles");
  assert(hiddenColor !== memoryColor, "unseen fog must be stronger than explored memory");
}

console.log("CPU_VISIBILITY_GATING_OK fog intel and renderer gating verified");
