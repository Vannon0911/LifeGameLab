import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-advisor-model.mjs");

import { buildAdvisorDebugModel } from "../src/project/llm/advisorModel.js";
import { WIN_MODE } from "../src/game/contracts/ids.js";
import { TECH_TREE } from "../src/game/techTree.js";
import { registerPublicApi } from "../src/app/runtime/publicApi.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const ALL_TECHS = TECH_TREE.map((tech) => tech.id);
const PLAYER_CELLS = [48, 49, 50, 56, 57, 58, 59, 60, 61, 62];
const CPU_CELLS = [7, 15, 23];

function fill(arr, value) {
  for (let i = 0; i < arr.length; i++) arr[i] = value;
  return arr;
}

function makeState({
  doctrine = "equilibrium",
  techs = ["light_harvest"],
  splitUnlock = techs.includes("cluster_split") ? 1 : 0,
  placementCostEnabled = true,
  zoneType = 0,
  simPatch = {},
  metaPatch = {},
  worldMutate = null,
} = {}) {
  const w = 8;
  const h = 8;
  const size = w * h;
  const alive = new Uint8Array(size);
  const lineageId = new Uint32Array(size);
  const zoneMap = new Int8Array(size);
  const E = fill(new Float32Array(size), 1.4);
  const L = fill(new Float32Array(size), 0.42);
  const R = fill(new Float32Array(size), 0.36);
  const W = fill(new Float32Array(size), 0.05);
  const Sat = fill(new Float32Array(size), 0.25);
  const P = fill(new Float32Array(size), 0.18);
  const reserve = fill(new Float32Array(size), 0.18);
  const link = fill(new Float32Array(size), 0.38);
  const clusterField = fill(new Float32Array(size), 0.58);
  const hue = new Float32Array(size);
  const actionMap = new Uint8Array(size);

  for (const idx of PLAYER_CELLS) {
    alive[idx] = 1;
    lineageId[idx] = 1;
    zoneMap[idx] = zoneType;
    hue[idx] = 165;
  }
  for (const idx of CPU_CELLS) {
    alive[idx] = 1;
    lineageId[idx] = 2;
    hue[idx] = 332;
  }

  const world = {
    w,
    h,
    alive,
    lineageId,
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
    hue,
    actionMap,
    lineageMemory: {
      1: { doctrine, techs: [...techs], synergies: [], splitUnlock },
      2: { doctrine: "expansion", techs: [], synergies: [], splitUnlock: 0 },
    },
  };

  if (typeof worldMutate === "function") worldMutate(world);

  const sim = {
    tick: 0,
    running: false,
    playerStage: 4,
    playerDNA: 0,
    playerAliveCount: 20,
    cpuAliveCount: 6,
    playerEnergyNet: 1.4,
    playerEnergyStored: 6,
    playerEnergyIn: 8,
    playerEnergyOut: 6.6,
    cpuEnergyIn: 4,
    clusterRatio: 0.72,
    networkRatio: 0.34,
    goal: "harvest_secure",
    lossStreakTicks: 0,
    meanReserveAlive: 0.18,
    meanToxinField: 0.05,
    aliveRatio: 0.32,
    expansionWork: 0,
    nextExpandCost: 120,
    stockpileTicks: 0,
    energySupremacyTicks: 0,
    efficiencyTicks: 0,
    gameResult: "",
    totalHarvested: 0,
    winMode: WIN_MODE.SUPREMACY,
    ...simPatch,
  };

  return {
    meta: {
      playerLineageId: 1,
      cpuLineageId: 2,
      brushMode: "observe",
      placementCostEnabled,
      activeOverlay: "none",
      physics: { Emax: 3.2 },
      ui: {
        showRemoteAttackOverlay: true,
        showDefenseOverlay: true,
      },
      ...metaPatch,
    },
    world,
    sim,
  };
}

{
  const highGapState = makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerEnergyNet: -3.1,
      meanReserveAlive: 0.08,
      meanToxinField: 0.39,
      gameResult: "loss",
    },
  });
  highGapState.sim.gameResult = "";
  const highGap = buildAdvisorDebugModel(highGapState);
  assert(highGap.advisor.bottleneckPrimary === "toxin", `severity-gap primary drift: ${highGap.advisor.bottleneckPrimary}`);
  assert(typeof highGap.status.zoneSummary === "object", "zoneSummary missing from advisor status");
  assert(typeof highGap.status.patternSummary === "object", "patternSummary missing from advisor status");

  const lowGapState = makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerEnergyNet: -3.1,
      meanReserveAlive: 0.08,
      meanToxinField: 0.36,
    },
  });
  const lowGap = buildAdvisorDebugModel(lowGapState);
  assert(lowGap.advisor.bottleneckPrimary === "energy", `priority tie-break drift: ${lowGap.advisor.bottleneckPrimary}`);
}

{
  const stableReasonsState = makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerEnergyNet: -2.2,
      meanReserveAlive: 0.03,
      lossStreakTicks: 30,
    },
  });
  const a = buildAdvisorDebugModel(stableReasonsState);
  const b = buildAdvisorDebugModel(stableReasonsState);
  const expectedOrder = ["reserve_low", "energy_negative", "loss_streak_rising"];
  assert(a.advisor.bottleneckPrimary === "energy", `reason order primary drift: ${a.advisor.bottleneckPrimary}`);
  assert(a.advisor.reasonCodes.join(",") === expectedOrder.join(","), `reason code order drift: ${a.advisor.reasonCodes.join(",")}`);
  assert(a.advisor.reasonCodes.join(",") === b.advisor.reasonCodes.join(","), "reason code order is not stable");
}

{
  const noneState = makeState({
    techs: ALL_TECHS,
    simPatch: {
      gameResult: "win",
      playerDNA: 0,
      expansionWork: 0,
      nextExpandCost: 120,
    },
  });
  const model = buildAdvisorDebugModel(noneState);
  assert(model.advisor.recommendedZone === "none", `expected recommendedZone=none, got ${model.advisor.recommendedZone}`);
  assert(model.advisor.recommendedOverlay === "none", `expected recommendedOverlay=none, got ${model.advisor.recommendedOverlay}`);
  assert(model.advisor.bottleneckSecondary === undefined, `expected no secondary bottleneck, got ${model.advisor.bottleneckSecondary}`);
  assert(model.advisor.nextLever === "none", `expected no nextLever, got ${model.advisor.nextLever}`);
}

{
  const waitState = makeState({
    techs: ALL_TECHS,
    zoneType: 4,
    simPatch: {
      playerDNA: 0,
      expansionWork: 48,
      nextExpandCost: 120,
      aliveRatio: 0.55,
      gameResult: "",
      playerStage: 4,
      playerEnergyNet: 1.8,
      playerEnergyIn: 8,
      cpuEnergyIn: 8,
    },
  });
  const waitModel = buildAdvisorDebugModel(waitState);
  assert(waitModel.advisor.bottleneckPrimary === "territory_scaling", `wait-state primary drift: ${waitModel.advisor.bottleneckPrimary}`);
  assert(waitModel.advisor.nextAction === "wait_and_advance_time", `wait-state nextAction drift: ${waitModel.advisor.nextAction}`);
  assert(waitModel.advisor.recommendedZone === "none", `wait-state should not suggest a zone, got ${waitModel.advisor.recommendedZone}`);

  const afterState = makeState({
    techs: ALL_TECHS,
    simPatch: {
      tick: 1,
      playerStage: 4,
      energySupremacyTicks: 160,
      playerEnergyIn: 10,
      cpuEnergyIn: 4,
      playerEnergyNet: 1.5,
      expansionWork: 0,
      nextExpandCost: 120,
    },
  });

  let currentState = waitState;
  const api = registerPublicApi({
    windowObj: {},
    store: { getState: () => currentState },
    benchmark: null,
    runOneSimStep: () => {
      currentState = afterState;
    },
    runRender: () => {},
    runUiSync: () => {},
    publishPerfStats: () => {},
    perfBudget: {
      quality: 3,
      dprCap: 2,
      fpsEma: 60,
      frameMsEma: 16,
      renderMsEma: 8,
      targetMinFps: 50,
      targetMaxFps: 60,
    },
  });

  const stepped = await api.advanceTime(1000);
  const afterModel = buildAdvisorDebugModel(currentState);
  assert(stepped.tick === 1, `advanceTime tick drift: ${stepped.tick}`);
  assert(afterModel.advisor.nextAction === "push_win_mode", `advanceTime diagnosis drift: ${afterModel.advisor.nextAction}`);
}

{
  const territoryFacts = {
    techs: ALL_TECHS,
    zoneType: 4,
    simPatch: {
      playerDNA: 0,
      expansionWork: 84,
      nextExpandCost: 120,
      aliveRatio: 0.72,
      playerEnergyNet: 1.4,
      playerEnergyIn: 8,
      cpuEnergyIn: 5,
    },
  };
  const expansionModel = buildAdvisorDebugModel(makeState({ ...territoryFacts, doctrine: "expansion" }));
  const conserveModel = buildAdvisorDebugModel(makeState({ ...territoryFacts, doctrine: "conserve" }));
  assert(expansionModel.advisor.bottleneckPrimary === "territory_scaling", `territory primary drift: ${expansionModel.advisor.bottleneckPrimary}`);
  assert(expansionModel.advisor.nextAction === "prepare_territory_expand", `expansion doctrine drift: ${expansionModel.advisor.nextAction}`);
  assert(conserveModel.advisor.nextAction === "densify_core", `conserve doctrine drift: ${conserveModel.advisor.nextAction}`);

  const crisisFacts = {
    ...territoryFacts,
    simPatch: {
      ...territoryFacts.simPatch,
      playerEnergyNet: -6.2,
      meanReserveAlive: 0.02,
      lossStreakTicks: 92,
    },
  };
  const crisisExpansion = buildAdvisorDebugModel(makeState({ ...crisisFacts, doctrine: "expansion" }));
  const crisisConserve = buildAdvisorDebugModel(makeState({ ...crisisFacts, doctrine: "conserve" }));
  assert(crisisExpansion.advisor.nextAction === "stabilize_energy", `crisis override drift (expansion): ${crisisExpansion.advisor.nextAction}`);
  assert(crisisConserve.advisor.nextAction === "stabilize_energy", `crisis override drift (conserve): ${crisisConserve.advisor.nextAction}`);
}

{
  const stageBlock = buildAdvisorDebugModel(makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerStage: 1,
      winMode: WIN_MODE.SUPREMACY,
    },
  }));
  assert(stageBlock.winProgress.blockerCode === "stage_not_ready", `win blocker drift(stage): ${stageBlock.winProgress.blockerCode}`);

  const advantageBlock = buildAdvisorDebugModel(makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerStage: 2,
      winMode: WIN_MODE.SUPREMACY,
      playerEnergyIn: 5,
      cpuEnergyIn: 4,
    },
  }));
  assert(advantageBlock.winProgress.blockerCode === "energy_advantage_missing", `win blocker drift(advantage): ${advantageBlock.winProgress.blockerCode}`);

  const livePush = buildAdvisorDebugModel(makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerStage: 2,
      winMode: WIN_MODE.SUPREMACY,
      playerEnergyIn: 10,
      cpuEnergyIn: 4,
      energySupremacyTicks: 160,
    },
  }));
  assert(livePush.winProgress.blockerCode === "maintain_advantage", `win blocker drift(live): ${livePush.winProgress.blockerCode}`);
  assert(livePush.advisor.bottleneckPrimary === "win_push", `win_push primary drift: ${livePush.advisor.bottleneckPrimary}`);
  assert(livePush.advisor.nextAction === "push_win_mode", `win_push nextAction drift: ${livePush.advisor.nextAction}`);
}

{
  const splitReadyCrisis = buildAdvisorDebugModel(makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerDNA: 20,
      playerEnergyNet: -6.3,
      meanReserveAlive: 0.02,
      lossStreakTicks: 96,
    },
  }));
  assert(splitReadyCrisis.status.splitReady === true, "splitReady should be true in crisis case");
  assert(splitReadyCrisis.advisor.nextAction === "stabilize_energy", `splitReady must not force split action: ${splitReadyCrisis.advisor.nextAction}`);
}

{
  const splitWins = buildAdvisorDebugModel(makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerDNA: 20,
      expansionWork: 84,
      nextExpandCost: 120,
      aliveRatio: 0.72,
    },
  }));
  assert(splitWins.advisor.bottleneckPrimary === "split_expansion", `split should win over territory when ready, got ${splitWins.advisor.bottleneckPrimary}`);

  const territoryWins = buildAdvisorDebugModel(makeState({
    techs: ALL_TECHS,
    simPatch: {
      playerDNA: 7,
      expansionWork: 84,
      nextExpandCost: 120,
      aliveRatio: 0.72,
    },
  }));
  assert(territoryWins.advisor.bottleneckPrimary === "territory_scaling", `territory should win over weak split, got ${territoryWins.advisor.bottleneckPrimary}`);
}

console.log("ADVISOR_MODEL_OK deterministic primary selection, blocker logic, and policy coloring verified");
