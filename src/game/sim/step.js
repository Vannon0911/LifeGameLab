// ============================================================
// Simulation Step Orchestrator (module-friendly)
// ============================================================

import { clamp } from "./shared.js";
import { TRAITS } from "./constants.js";
import { applyCorpseRelease } from "./resources.js";
import { runRemoteClusterAttacks } from "./conflict.js";
import { updateLineageMemory, pruneLineageMemory, mutateNewbornByEnvironment } from "./lineage.js";
import { prepareStepBuffers } from "./buffers.js";
import { forNeighbours8 } from "./neighbors.js";
import { runFieldPhase, runFinalizePopulationPhase, runWorldSystemsPhase } from "./stepPhases.js";
import { buildLineageRuntime, clampScarcityByNutrient, traitAt } from "./stepRuntime.js";

export function simStep(world, phy, tick) {
  const { w, h, alive, E, L, R, W, P, hue, lineageId, trait, water } = world;
  const zoneMap = world.zoneMap;  // Int8Array — 0=none 1=HARVEST 2=BUFFER 3=DEFENSE 4=NEXUS 5=QUARANTINE
  const N = w * h;
  const { Sat, reserve, age, actionMap } = prepareStepBuffers(world, N);
  const B = world.B;
  const link = world.link;

  let sumR = 0, sumW = 0, sumSat = 0, sumP = 0, sumB = 0, sumWater = 0;
  let plantTiles = 0;
  let aliveCount = 0, sumLAlive = 0, sumEAlive = 0, sumReserveAlive = 0;
  let linkedAlive = 0, clusteredAlive = 0;
  let dominantHueRatio = 0;
  let diversitySampled = 0;
  const diversitySampleLimit = 256;
  const diversityLineages = [];

  // P1-04: Player/CPU-Metriken — Akkumulatoren
  const playerLid = (phy.playerLineageId | 0) || 0;
  const cpuLid    = (phy.cpuLineageId    | 0) || 0;
  let playerAliveCount = 0, cpuAliveCount = 0;
  let sumPlayerEIn = 0, sumPlayerEOut = 0, sumPlayerEStored = 0;
  let sumCpuEIn = 0;
  let sumTotalEIn  = 0;
  let sumPlayerR   = 0, sumTotalR = 0;

  const fieldPhase = runFieldPhase(world, phy, tick, traitAt.h);
  sumR = fieldPhase.sumR;
  sumW = fieldPhase.sumW;
  sumSat = fieldPhase.sumSat;
  sumP = fieldPhase.sumP;
  sumB = fieldPhase.sumB;
  plantTiles = fieldPhase.plantTiles;
  const nutrientCappedTilesLastStep = fieldPhase.nutrientCappedTilesLastStep;

  const worldPhase = runWorldSystemsPhase(world, phy, tick, {
    gameMode: phy.gameMode,
  });
  const plantsPrunedLastStep = worldPhase.plantsPrunedLastStep;
  for (let i = 0; i < N; i++) sumWater += Number(water?.[i] || 0);

  let totalBirths = 0, totalDeaths = 0, totalMutations = 0;
  const remote = runRemoteClusterAttacks(world, phy, tick, actionMap) || { attacks: 0, kills: 0, stolen: 0, defAct: 0 };
  const lineageRuntimeCache = new Map();

  const hueBins = new Uint32Array(12);
  let hueLive = 0;

  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1) continue;
    aliveCount++;
    hueLive++;
    hueBins[(((Number(hue?.[i]) || 0) % 360 + 360) % 360 / 30) | 0]++;
    age[i] = Math.min(65535, age[i] + 1);

    const lid = Number(lineageId[i]) | 0;
    
    // P3-03: Visual differentiation by Hue
    if (playerLid && lid === playerLid) {
      hue[i] = 210; // Player = Cyan
    } else if (cpuLid && lid === cpuLid) {
      hue[i] = 0;   // CPU = Red
    }

    const scarcity = clampScarcityByNutrient(R[i]);
    const zone = zoneMap ? (zoneMap[i] | 0) : 0;
    const nexusBonus = zone === 4 ? 1.2 : 1.0;   // NEXUS: +20% Energie-Einkommen
    const bufferMult = zone === 2 ? 0.8 : 1.0;   // BUFFER: -20% Upkeep
    let runtime = lineageRuntimeCache.get(lid);
    if (!runtime) {
      runtime = buildLineageRuntime(world.lineageMemory?.[lid]);
      lineageRuntimeCache.set(lid, runtime);
    }

    // DEFENSE (zone 3): Zellen bauen lineageDefenseReadiness auf
    if (zone === 3 && lid && world.lineageDefenseReadiness) {
      world.lineageDefenseReadiness[lid] = clamp(
        (Number(world.lineageDefenseReadiness[lid] || 0)) + 0.008, 0, 1
      );
    }

    // Crowding penalty: dichte Tiles kosten mehr
    let neighbours = 0;
    forNeighbours8(i, w, h, (j) => { if (alive[j] === 1) neighbours++; });
    const crowdingPenalty = neighbours >= 8 ? 0.22 :
                            neighbours >= 6 ? 0.11 :
                            neighbours >= 4 ? 0.04 : 0;
// P4: Loading Metabolism — Energy flows instead of jumps
const energyPotIn = (L[i] * traitAt.h(trait, i) + R[i] * phy.R_uptake * phy.R_yieldE) * nexusBonus;
const clusterDrive = clamp((world.clusterField?.[i] || 0) * runtime.linkMul, 0, 1);
const transferRate = 0.22 + clusterDrive * 0.03;
const energyIn = energyPotIn * transferRate * runtime.energyMul;

const scarcity2 = clampScarcityByNutrient(R[i]);
const upkeepVal =
  (traitAt.u(trait, i) * phy.U_base +
  (W[i] * phy.W_penaltySurvive) / Math.max(0.65, runtime.toxinMul) +
  (link[i] || 0) * (phy.costNetwork || 0) / Math.max(0.7, runtime.linkMul) +
  clamp(E[i] / Math.max(0.001, phy.Emax), 0, 1) * (phy.costActivity || 0) +
  scarcity2 * (phy.costScarcity || 0)) * bufferMult * runtime.upkeepMul + crowdingPenalty;

// E mutation (smoothed)
E[i] = clamp(E[i] + energyIn - upkeepVal, 0, phy.Emax);

// P4: Smoothed Toxins (Loading Toxin Pressure)
const wGenPot = clamp(Number(phy.W_gen ?? 0.008), 0, 0.08);
const activity = clamp(0.35 + traitAt.u(trait, i) * 0.9 + (E[i] / Math.max(0.001, phy.Emax)) * 0.4, 0, 2);
const wTarget = wGenPot * activity;
const wTransfer = 0.18 / Math.max(0.8, runtime.toxinMul); // Resistances slow toxin buildup
W[i] = clamp(W[i] + wTarget * wTransfer, 0, 1);

    sumLAlive += L[i];
    sumEAlive += E[i];
    sumReserveAlive += reserve[i] || 0;
    if ((link?.[i] || 0) > 0.05) linkedAlive++;
    if ((world.clusterField?.[i] || 0) > 0.25) clusteredAlive++;

    sumTotalEIn += energyIn;
    sumTotalR   += R[i];
    if (playerLid && lid === playerLid) {
      playerAliveCount++;
      sumPlayerEIn     += energyIn;
      sumPlayerEOut    += upkeepVal;
      sumPlayerEStored += E[i];
      sumPlayerR       += R[i];
    }
    if (cpuLid && lid === cpuLid) { cpuAliveCount++; sumCpuEIn += energyIn; }

    if (diversitySampled < diversitySampleLimit && lid) {
      let seen = false;
      for (let k = 0; k < diversityLineages.length; k++) {
        if (diversityLineages[k] === lid) { seen = true; break; }
      }
      if (!seen) diversityLineages.push(lid);
      diversitySampled++;
    }

    const minL = Math.max(0.01, traitAt.ts(trait, i) * phy.T_survive - runtime.survivalBonus * 0.05);
    const isolated = neighbours < 1;
    const minEnergyToLive = Math.max(0.004, 0.01 - runtime.survivalBonus * 0.05);
    const toxinKillThreshold = Math.min(0.98, 0.90 + runtime.survivalBonus * 0.40 + (runtime.toxinMul - 1) * 0.10);
    if (isolated || E[i] < minEnergyToLive || W[i] > toxinKillThreshold || (L[i] < minL && E[i] < Math.max(0.08, 0.12 - runtime.survivalBonus * 0.08))) {
      alive[i] = 0;
      world.died[i] = 1;
      applyCorpseRelease(world, i);
      E[i] = 0;
      reserve[i] = 0;
      link[i] = 0;
      totalDeaths++;
      continue;
    }

    updateLineageMemory(world, i, 1, tick);
    const birthWastePenalty = clamp((W[i] * (phy.W_penaltyBirth || 0)) / Math.max(0.75, runtime.toxinMul), 0, 0.25);
    const birthCostThreshold = Math.max(0.08, (traitAt.cb(trait, i) * phy.C_birth_base + birthWastePenalty) * (1 - runtime.survivalBonus * 0.25));
    
    // P4: Accumulating Births ("Loading")
    if (E[i] > birthCostThreshold && L[i] > traitAt.tb(trait, i) * phy.T_birth) {
      forNeighbours8(i, w, h, (j) => {
        if (alive[j] !== 0 || totalBirths >= 100) return;
        if (zoneMap && (zoneMap[j] | 0) === 5) return;
        
        // Transfer energy to target B-buffer (Biocharge)
        const transfer = clamp(0.030 * runtime.birthMul * (1 + clusterDrive * 0.35), 0.014, 0.070);
        B[j] = Math.min(1.0, (B[j] || 0) + transfer);
        E[i] -= (phy.S_seed_base * transfer + birthWastePenalty * 0.10);

        // If fully charged, finalize birth
        if (B[j] >= (runtime.synergies.has("split_bloom") ? 0.88 : 0.92)) {
          alive[j] = 1;
          world.born[j] = 1;
          E[j] = clamp(0.22 + runtime.survivalBonus * 0.12, 0.18, 0.34);
          B[j] = 0; // Reset charge
          lineageId[j] = lid;
          const po = i * TRAITS;
          const jo = j * TRAITS;
          for (let k = 0; k < TRAITS; k++) trait[jo + k] = trait[po + k];
          if (mutateNewbornByEnvironment(world, phy, tick, i, j)) totalMutations++;
          totalBirths++;
        }
      });
    }
  }

  pruneLineageMemory(world, tick);
  let evolutionStageMax = 1;
  let evolutionStageMean = 1;
  if (world.lineageMemory) {
    let sumStage = 0, cntStage = 0;
    for (const lid in world.lineageMemory) {
      const st = Number(world.lineageMemory[lid]?.stage || 1);
      evolutionStageMax = Math.max(evolutionStageMax, st);
      sumStage += st;
      cntStage++;
    }
    evolutionStageMean = cntStage > 0 ? (sumStage / cntStage) : 1;
  }

  if (hueLive > 0) {
    let maxBin = 0;
    for (let b = 0; b < 12; b++) if (hueBins[b] > maxBin) maxBin = hueBins[b];
    dominantHueRatio = maxBin / hueLive;
  }

  const finalizePhase = runFinalizePopulationPhase(world, phy);
  const energyClearedTilesLastStep = finalizePhase.energyClearedTilesLastStep;
  aliveCount = finalizePhase.aliveCount;
  playerAliveCount = finalizePhase.playerAliveCount;
  cpuAliveCount = finalizePhase.cpuAliveCount;

  const invN = 1 / Math.max(1, N);
  const invAlive = 1 / Math.max(1, aliveCount);
  const lineageDiversity = diversityLineages.length;
  const aliveRatio = aliveCount * invN;

  return {
    tick,
    aliveCount,
    aliveRatio,
    meanNutrientField: sumR * invN,
    meanToxinField: sumW * invN,
    meanSaturationField: sumSat * invN,
    meanPlantField: sumP * invN,
    meanBiochargeField: sumB * invN,
    meanWaterField: sumWater * invN,
    plantTileRatio: plantTiles * invN,
    dominantHueRatio,
    meanLAlive: sumLAlive * invAlive,
    meanEnergyAlive: sumEAlive * invAlive,
    meanReserveAlive: sumReserveAlive * invAlive,
    lineageDiversity,
    evolutionStageMean,
    evolutionStageMax,
    networkRatio: linkedAlive * invAlive,
    clusterRatio: clusteredAlive * invAlive,
    birthsLastStep: totalBirths,
    deathsLastStep: totalDeaths,
    mutationsLastStep: totalMutations,
    remoteAttacksLastStep: remote.attacks || 0,
    remoteAttackKillsLastStep: remote.kills || 0,
    resourceStolenLastStep: remote.stolen || 0,
    defenseActivationsLastStep: remote.defAct || 0,
    raidEventsLastStep: 0,
    infectionsLastStep: 0,
    conflictKillsLastStep: remote.kills || 0,
    superCellsLastStep: 0,
    plantsPrunedLastStep,
    nutrientCappedTilesLastStep,
    energyClearedTilesLastStep,
    // P1-04: Fraktions- und Energie-Metriken
    playerAliveCount,
    cpuAliveCount,
    playerEnergyIn:     sumPlayerEIn,
    playerEnergyOut:    sumPlayerEOut,
    playerEnergyNet:    sumPlayerEIn - sumPlayerEOut,
    playerEnergyStored: sumPlayerEStored,
    cpuEnergyIn:   sumCpuEIn,
    lightShare:    sumPlayerEIn / Math.max(1, sumTotalEIn),
    nutrientShare: sumPlayerR   / Math.max(1, sumTotalR),
    seasonPhase:   (tick % (phy.seasonLength || 300)) / (phy.seasonLength || 300),
  };
}
