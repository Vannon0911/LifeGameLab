import { clamp } from "./shared.js";
import { forNeighbours8 } from "./neighbors.js";
import { MAX_PLANT_TILE_RATIO, PLANT_ACTIVE_THRESHOLD } from "./constants.js";

export function applyPlantLifecycle(world, phy, tick) {
  const { w, h, L, R, W, P, B, Sat, alive } = world;
  const plantGate = clamp(world.balanceGovernor?.plants ?? 1, 0.28, 1);
  const bToPlant = clamp(Number(phy?.B_to_plant_gain ?? 0.30), 0, 2.0);

  if (!world.plantKind || world.plantKind.length !== P.length) world.plantKind = new Int8Array(P.length);
  const plantKind = world.plantKind;
  const spread = new Float32Array(P.length);
  const nextKind = new Int8Array(plantKind);

  for (let i = 0; i < P.length; i++) {
    const lv = clamp(L[i], 0, 1);
    const rv = clamp(R[i], 0, 1);
    const wv = clamp(W[i], 0, 1);
    const sv = clamp(Sat[i], 0, 1);
    const occupied = alive[i] === 1 ? 1 : 0;
    if (plantKind[i] === 0 && P[i] > 0.12) {
      plantKind[i] = wv > 0.35 ? -1 : (rv > 0.42 && wv < 0.16 ? 1 : 0);
    }

    let nPlant = 0, nDetox = 0, nToxic = 0;
    forNeighbours8(i, w, h, j => {
      if (P[j] <= 0.08) return;
      nPlant++;
      if (plantKind[j] < 0) nDetox++;
      else if (plantKind[j] > 0) nToxic++;
    });
    const clusterStrength = nPlant / 8;
    const bioSupport = clamp(B?.[i] || 0, 0, 1);
    const bioTerm = bioSupport * 0.006 * bToPlant;
    const rawGrowth = (lv * 0.012 + rv * 0.010 + clusterStrength * 0.004 + bioTerm) * (1 - sv * 0.84) * (1 - occupied * 0.48) * plantGate;
    const growth = clamp(rawGrowth, 0, 0.022);
    const decay = wv * 0.018 + sv * 0.013 + 0.0028;
    P[i] = clamp(P[i] + growth - decay, 0, 1);
    if (growth > 0.0001 && B) B[i] = Math.max(0, B[i] - growth * 0.45);

    if (P[i] > 0.08) {
      if (rv < 0.10) nextKind[i] = 1;
      if (plantKind[i] <= 0 && wv > 0.28) {
        const detox = Math.min(W[i], 0.003 + P[i] * 0.016 + clusterStrength * 0.007);
        W[i] = Math.max(0, W[i] - detox);
        R[i] = clamp(R[i] + detox * 0.72, 0, 1);
        nextKind[i] = -1;
      }
      if (plantKind[i] >= 0 && rv > 0.38 && wv < 0.22) {
        const toxProd = Math.min(R[i], 0.0018 + P[i] * 0.010 + clusterStrength * 0.005);
        R[i] = Math.max(0, R[i] - toxProd);
        W[i] = clamp(W[i] + toxProd * 0.66, 0, 1);
        nextKind[i] = 1;
      }
    }

    const nutrientSat = clamp(R[i] * 0.66 + Sat[i] * 0.34 - W[i] * 0.24, 0, 1);
    if (P[i] > 0.55 && nutrientSat > 0.48 && nPlant >= 4) {
      const spreadBudget = clamp((0.00003 + P[i] * 0.0008 + clusterStrength * 0.0006) * plantGate, 0, 0.0015);
      forNeighbours8(i, w, h, j => {
        if (alive[j] === 1) return;
        const gain = spreadBudget * clamp(0.75 + nutrientSat - W[j] * 0.6, 0, 1.6);
        spread[j] += gain;
        if (nextKind[j] === 0) nextKind[j] = (nDetox > nToxic ? -1 : nToxic > nDetox ? 1 : plantKind[i]);
      });
    }
  }

  for (let i = 0; i < P.length; i++) {
    if (P[i] < 0.62) continue;
    const aura = clamp((P[i] - 0.62) * 0.0038 * (0.75 + plantGate * 0.25), 0, 0.0011);
    if (aura <= 0) continue;
    R[i] = clamp(R[i] + aura * 0.45, 0, 1);
    forNeighbours8(i, w, h, j => {
      R[j] = clamp(R[j] + aura * 0.35, 0, 1);
      Sat[j] = clamp(Sat[j] + aura * 0.05, 0, 1);
    });
  }

  for (let i = 0; i < P.length; i++) {
    P[i] = clamp(P[i] + spread[i], 0, 1);
    if (nextKind[i] !== 0) plantKind[i] = nextKind[i];
    const osc = 0.0008 * Math.sin((tick + i * 0.13) * 0.012);
    P[i] = clamp(P[i] + osc, 0, 1);
  }
}

export function enforcePlantTileCap(world, capRatio = MAX_PLANT_TILE_RATIO, threshold = PLANT_ACTIVE_THRESHOLD) {
  const { P, W, Sat, plantKind } = world;
  const N = P.length;
  const maxTiles = Math.max(1, Math.floor(N * capRatio));
  const active = [];
  for (let i = 0; i < N; i++) if (P[i] >= threshold) active.push(i);
  if (active.length <= maxTiles) return 0;
  active.sort((a, b) =>
    (P[a] * 0.74 + (1 - W[a]) * 0.16 + (1 - Sat[a]) * 0.10) -
    (P[b] * 0.74 + (1 - W[b]) * 0.16 + (1 - Sat[b]) * 0.10)
  );
  const removeCount = active.length - maxTiles;
  for (let n = 0; n < removeCount; n++) {
    const i = active[n];
    P[i] = Math.min(P[i], 0.015);
    if (plantKind) plantKind[i] = 0;
  }
  return removeCount;
}

