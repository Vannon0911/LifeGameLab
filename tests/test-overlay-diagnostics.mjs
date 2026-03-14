import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-overlay-diagnostics.mjs");

import { OVERLAY_MODE, WIN_MODE } from "../src/game/contracts/ids.js";
import { computeFieldSurfaceColor } from "../src/game/render/renderer.js";
import { buildAdvisorDebugModel } from "../src/project/llm/advisorModel.js";
import { TECH_TREE } from "../src/game/techTree.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ALL_TECHS = TECH_TREE.map((tech) => tech.id);

const world = {
  w: 2,
  h: 2,
  alive: new Uint8Array([1, 1, 1, 0]),
  lineageId: new Uint32Array([1, 2, 1, 0]),
  E: new Float32Array([0.2, 2.8, 1.6, 0.1]),
  L: new Float32Array([0.3, 0.7, 0.4, 0.2]),
  R: new Float32Array([0.8, 0.2, 0.5, 0.1]),
  W: new Float32Array([0.05, 0.42, 0.18, 0.01]),
  Sat: new Float32Array([0.3, 0.6, 0.4, 0.2]),
  P: new Float32Array([0.6, 0.1, 0.4, 0.05]),
  reserve: new Float32Array([0.02, 0.22, 0.12, 0.1]),
  link: new Float32Array([0.55, 0.2, 0.65, 0]),
  clusterField: new Float32Array([0.7, 0.6, 0.4, 0]),
  zoneMap: new Int8Array([2, 0, 4, 0]),
  hue: new Float32Array([160, 330, 180, 0]),
  actionMap: new Uint8Array([245, 212, 120, 0]),
  lineageMemory: {
    1: { doctrine: "detox", techs: ALL_TECHS, synergies: [], splitUnlock: 1 },
  },
};

const meta = {
  playerLineageId: 1,
  cpuLineageId: 2,
  physics: { Emax: 3.2 },
  ui: { showRemoteAttackOverlay: true, showDefenseOverlay: true },
  renderMode: "combined",
};

{
  const colors = new Map();
  for (const overlayId of [
    OVERLAY_MODE.ENERGY,
    OVERLAY_MODE.TOXIN,
    OVERLAY_MODE.NUTRIENT,
    OVERLAY_MODE.TERRITORY,
    OVERLAY_MODE.CONFLICT,
  ]) {
    colors.set(overlayId, computeFieldSurfaceColor(world, { ...meta, activeOverlay: overlayId }, 0).join(","));
  }
  assert(new Set(colors.values()).size === colors.size, "overlay modes no longer produce distinct diagnosis colors on the same tile");
}

{
  const energyWeak = computeFieldSurfaceColor(world, { ...meta, activeOverlay: OVERLAY_MODE.ENERGY }, 0);
  const energyHealthy = computeFieldSurfaceColor(world, { ...meta, activeOverlay: OVERLAY_MODE.ENERGY }, 1);
  assert(energyWeak[0] > energyHealthy[0], "energy overlay should mark weak reserves with a hotter red channel");

  const territoryPlayer = computeFieldSurfaceColor(world, { ...meta, activeOverlay: OVERLAY_MODE.TERRITORY }, 0);
  const territoryCpu = computeFieldSurfaceColor(world, { ...meta, activeOverlay: OVERLAY_MODE.TERRITORY }, 1);
  assert(territoryPlayer.join(",") !== territoryCpu.join(","), "territory overlay should separate player and CPU areas");

  const conflictHot = computeFieldSurfaceColor(world, { ...meta, activeOverlay: OVERLAY_MODE.CONFLICT }, 0);
  const conflictQuiet = computeFieldSurfaceColor(world, { ...meta, activeOverlay: OVERLAY_MODE.CONFLICT }, 3);
  assert(conflictHot.join(",") !== conflictQuiet.join(","), "conflict overlay should expose action-map pressure");
}

{
  const advisorState = {
    meta: {
      ...meta,
      placementCostEnabled: true,
      activeOverlay: OVERLAY_MODE.NONE,
      brushMode: "observe",
    },
    world,
    sim: {
      tick: 12,
      running: false,
      playerStage: 2,
      playerDNA: 4,
      playerAliveCount: 12,
      cpuAliveCount: 2,
      playerEnergyNet: -3.8,
      playerEnergyStored: 1,
      playerEnergyIn: 4,
      playerEnergyOut: 7.8,
      cpuEnergyIn: 3,
      clusterRatio: 0.31,
      networkRatio: 0.14,
      goal: "survive_energy",
      lossStreakTicks: 24,
      meanReserveAlive: 0.03,
      meanToxinField: 0.12,
      aliveRatio: 0.3,
      expansionWork: 0,
      nextExpandCost: 120,
      stockpileTicks: 0,
      energySupremacyTicks: 0,
      efficiencyTicks: 0,
      totalHarvested: 0,
      gameResult: "",
      winMode: WIN_MODE.SUPREMACY,
    },
  };
  const advisor = buildAdvisorDebugModel(advisorState);
  assert(advisor.advisor.bottleneckPrimary === "energy", `advisor primary drift: ${advisor.advisor.bottleneckPrimary}`);
  assert(advisor.advisor.recommendedOverlay === OVERLAY_MODE.ENERGY, `advisor overlay drift: ${advisor.advisor.recommendedOverlay}`);
}

console.log("OVERLAY_DIAGNOSTICS_OK overlay rendering answers distinct gameplay questions");
