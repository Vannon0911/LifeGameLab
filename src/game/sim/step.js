// ============================================================
// Simulation Step Orchestrator (module-friendly)
// ============================================================

import { TRAIT_DEFAULT } from "./life.data.js";
import { clamp } from "./shared.js";
import { TRAITS, PLANT_ACTIVE_THRESHOLD } from "./constants.js";
import { diffuse, applySeasonalLightAnchor } from "./fields.js";
import { applyPlantLifecycle, enforcePlantTileCap } from "./plants.js";
import { enforceNutrientCap, enforceCellOnlyEnergy, applyCorpseRelease } from "./resources.js";
import { applyWorldAi } from "./worldAi.js";
import { applyDynamicDamping } from "./damping.js";
import { computeClusterAndLinks } from "./network.js";
import { runRemoteClusterAttacks } from "./conflict.js";
import { updateLineageMemory, pruneLineageMemory, mutateNewbornByEnvironment } from "./lineage.js";
import { prepareStepBuffers } from "./buffers.js";
import { forNeighbours8 } from "./neighbors.js";

const tH = (tr, i) => Number(tr[i * TRAITS + 0]) || TRAIT_DEFAULT[0];
const tU = (tr, i) => Number(tr[i * TRAITS + 1]) || TRAIT_DEFAULT[1];
const tTs = (tr, i) => Number(tr[i * TRAITS + 2]) || TRAIT_DEFAULT[2];
const tTb = (tr, i) => Number(tr[i * TRAITS + 3]) || TRAIT_DEFAULT[3];
const tCb = (tr, i) => Number(tr[i * TRAITS + 4]) || TRAIT_DEFAULT[4];

export function simStep(world, phy, tick) {
  const { w, h, alive, E, L, R, W, P, hue, lineageId, trait } = world;
  const zoneMap = world.zoneMap;  // Int8Array — 0=none 1=HARVEST 2=BUFFER 3=DEFENSE 4=NEXUS 5=QUARANTINE
  const N = w * h;
  const { Sat, reserve, age, actionMap } = prepareStepBuffers(world, N);
  const B = world.B;
  const link = world.link;

  let sumR = 0, sumW = 0, sumSat = 0, sumP = 0, sumB = 0;
  let plantTiles = 0;
  let aliveCount = 0, sumLAlive = 0, sumEAlive = 0, sumReserveAlive = 0;
  let linkedAlive = 0, clusteredAlive = 0;
  let dominantHueRatio = 0;
  let diversitySampled = 0;
  const diversitySampleLimit = 256;
  const diversityLineages = [];
  let maxLidSeen = 0;

  // P1-04: Player/CPU-Metriken — Akkumulatoren
  const playerLid = (phy.playerLineageId | 0) || 0;
  const cpuLid    = (phy.cpuLineageId    | 0) || 0;
  let playerAliveCount = 0, cpuAliveCount = 0;
  let sumPlayerEIn = 0, sumPlayerEOut = 0, sumPlayerEStored = 0;
  let sumCpuEIn = 0;
  let sumTotalEIn  = 0;
  let sumPlayerR   = 0, sumTotalR = 0;

  diffuse(L, w, h, phy.L_diffusion);
  applySeasonalLightAnchor(world, phy, tick);

  for (let i = 0; i < N; i++) if (P[i] > 0.01) R[i] = Math.min(1.0, R[i] + P[i] * phy.R_gen);
  diffuse(R, w, h, phy.R_diff);
  diffuse(W, w, h, phy.W_diff);

  const B_decay = clamp(Number(phy.B_decay ?? 0.045), 0, 1);
  for (let i = 0; i < N; i++) {
    const p = clamp(P[i], 0, 1);
    const live = alive[i] === 1 ? 1 : 0;
    const gen = p * 0.006 + live * clamp(L[i], 0, 1) * 0.003 * clamp(tH(trait, i), 0.22, 3.2);
    B[i] = clamp(B[i] * (1 - B_decay) + gen, 0, 1);
  }
  diffuse(B, w, h, clamp(Number(phy.B_diff ?? 0.04), 0, 1));
  diffuse(P, w, h, 0.01);

  const nutrientCappedTilesLastStep = enforceNutrientCap(world);
  for (let i = 0; i < N; i++) {
    R[i] = Math.max(0, R[i] * (1 - phy.R_decay) - (alive[i] === 1 ? 0.0038 : 0.0009));
    W[i] = Math.max(0, W[i] * (1 - phy.W_decay));
    Sat[i] = clamp(Sat[i] + (world.baseSat[i] - Sat[i]) * 0.035 + P[i] * 0.0045 - L[i] * 0.0065, 0, 1);

    const pv = P[i];
    sumR += R[i];
    sumW += W[i];
    sumSat += Sat[i];
    sumP += pv;
    sumB += B[i];
    if (pv >= PLANT_ACTIVE_THRESHOLD) plantTiles++;
    const lid = Number(lineageId?.[i] || 0) >>> 0;
    if (lid > maxLidSeen) maxLidSeen = lid;
  }

  if (!Number.isFinite(Number(world.nextLineageId)) || (Number(world.nextLineageId) | 0) <= 0) {
    world.nextLineageId = ((maxLidSeen + 1) >>> 0) || 1;
  } else if ((Number(world.nextLineageId) >>> 0) <= maxLidSeen) {
    world.nextLineageId = (maxLidSeen + 1) >>> 0;
  }

  applyPlantLifecycle(world, phy, tick);
  const plantsPrunedLastStep = enforcePlantTileCap(world);
  applyWorldAi(world, tick);
  applyDynamicDamping(world);
  computeClusterAndLinks(world, phy);

  let totalBirths = 0, totalDeaths = 0, totalMutations = 0;
  const remote = runRemoteClusterAttacks(world, phy, tick, actionMap) || { attacks: 0, kills: 0, stolen: 0, defAct: 0 };

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

    const scarcity = clamp(0.5 - clamp(R[i], 0, 1), 0, 0.5) * 2;
    const zone = zoneMap ? (zoneMap[i] | 0) : 0;
    const nexusBonus = zone === 4 ? 1.2 : 1.0;   // NEXUS: +20% Energie-Einkommen
    const bufferMult = zone === 2 ? 0.8 : 1.0;   // BUFFER: -20% Upkeep

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
const energyPotIn = (L[i] * tH(trait, i) + R[i] * phy.R_uptake * phy.R_yieldE) * nexusBonus;
const transferRate = 0.25; // Slower metabolism
const energyIn = energyPotIn * transferRate;

const scarcity2 = clamp(0.5 - clamp(R[i], 0, 1), 0, 0.5) * 2;
const upkeepVal =
  (tU(trait, i) * phy.U_base +
  W[i] * phy.W_penaltySurvive +
  (link[i] || 0) * (phy.costNetwork || 0) +
  clamp(E[i] / Math.max(0.001, phy.Emax), 0, 1) * (phy.costActivity || 0) +
  scarcity2 * (phy.costScarcity || 0)) * bufferMult + crowdingPenalty;

// E mutation (smoothed)
E[i] = clamp(E[i] + energyIn - upkeepVal, 0, phy.Emax);

// P4: Smoothed Toxins (Loading Toxin Pressure)
const wGenPot = clamp(Number(phy.W_gen ?? 0.008), 0, 0.08);
const activity = clamp(0.35 + tU(trait, i) * 0.9 + (E[i] / Math.max(0.001, phy.Emax)) * 0.4, 0, 2);
const wTarget = wGenPot * activity;
const wTransfer = 0.20; // Slower toxin buildup
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

    const minL = tTs(trait, i) * phy.T_survive;
    if (E[i] < 0.01 || W[i] > 0.9 || (L[i] < minL && E[i] < 0.12)) {
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
    const birthWastePenalty = clamp(W[i] * (phy.W_penaltyBirth || 0), 0, 0.25);
    const birthCostThreshold = (tCb(trait, i) * phy.C_birth_base + birthWastePenalty);
    
    // P4: Accumulating Births ("Loading")
    if (E[i] > birthCostThreshold && L[i] > tTb(trait, i) * phy.T_birth) {
      forNeighbours8(i, w, h, (j) => {
        if (alive[j] !== 0 || totalBirths >= 100) return;
        if (zoneMap && (zoneMap[j] | 0) === 5) return;
        
        // Transfer energy to target B-buffer (Biocharge)
        const transfer = 0.065; // ~15 ticks for full birth
        B[j] = Math.min(1.0, (B[j] || 0) + transfer);
        E[i] -= (phy.S_seed_base * transfer + birthWastePenalty * 0.10);

        // If fully charged, finalize birth
        if (B[j] >= 0.95) {
          alive[j] = 1;
          world.born[j] = 1;
          E[j] = 0.20; // Newborn starts with less E due to energy transfer logic
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

  const energyClearedTilesLastStep = enforceCellOnlyEnergy(world);

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
