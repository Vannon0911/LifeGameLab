import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-fog-intel-read-model.mjs");

import { buildLlmReadModel } from "../src/project/llm/readModel.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeState(visibleCpu) {
  const alive = new Uint8Array(16);
  const lineageId = new Uint32Array(16);
  const visibility = new Uint8Array(16);
  const explored = new Uint8Array(16);
  const zoneMap = new Int8Array(16);
  const E = new Float32Array(16);
  const L = new Float32Array(16);
  const R = new Float32Array(16);
  const W = new Float32Array(16);
  const Sat = new Float32Array(16);
  const P = new Float32Array(16);
  const reserve = new Float32Array(16);
  const link = new Float32Array(16);
  const clusterField = new Float32Array(16);
  const actionMap = new Uint8Array(16);
  alive[5] = 1;
  lineageId[5] = 2;
  explored[5] = 1;
  visibility[5] = visibleCpu ? 1 : 0;
  alive[10] = 1;
  lineageId[10] = 1;
  visibility[10] = 1;
  explored[10] = 1;
  return {
    meta: {
      playerLineageId: 1,
      cpuLineageId: 2,
      brushMode: "observe",
      activeOverlay: "none",
      physics: { Emax: 3.2 },
      ui: { showRemoteAttackOverlay: true, showDefenseOverlay: true },
    },
    world: {
      w: 4,
      h: 4,
      alive,
      lineageId,
      visibility,
      explored,
      zoneMap,
      E,
      L,
      R,
      W,
      Sat,
      P,
      reserve,
      link,
      clusterField,
      actionMap,
      lineageMemory: { 1: { doctrine: "equilibrium", techs: [], synergies: [] } },
    },
    sim: {
      tick: 12,
      running: false,
      playerStage: 2,
      playerDNA: 3,
      playerAliveCount: 1,
      cpuAliveCount: 1,
      playerEnergyNet: 1,
      clusterRatio: 0.2,
      networkRatio: 0.1,
      goal: "harvest_secure",
      winMode: "supremacy",
      meanReserveAlive: 0.2,
      meanToxinField: 0.05,
      aliveRatio: 0.1,
    },
  };
}

{
  const hiddenModel = buildLlmReadModel(makeState(false));
  assert(hiddenModel.cpuIntel.mode === "signature", `expected signature intel, got ${hiddenModel.cpuIntel.mode}`);
  assert(hiddenModel.cpuAlive === null, `cpuAlive must be redacted outside visibility, got ${hiddenModel.cpuAlive}`);
  assert(String(hiddenModel.cpuIntel.summary || "").includes("Signatur"), `unexpected hidden summary: ${hiddenModel.cpuIntel.summary}`);
}

{
  const visibleModel = buildLlmReadModel(makeState(true));
  assert(visibleModel.cpuIntel.mode === "visible", `expected visible intel, got ${visibleModel.cpuIntel.mode}`);
  assert(visibleModel.cpuAlive === 1, `expected precise visible cpu count, got ${visibleModel.cpuAlive}`);
  assert(String(visibleModel.cpuIntel.summary || "").includes("1 CPU in Sicht"), `unexpected visible summary: ${visibleModel.cpuIntel.summary}`);
}

console.log("FOG_INTEL_READ_MODEL_OK cpu info is precise only in visibility and redacted otherwise");
