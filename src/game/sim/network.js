import { TRAIT_DEFAULT, TRAIT_COUNT } from "./life.data.js";
import { clamp } from "./shared.js";
import { forNeighbours8 } from "./neighbors.js";
import { isCommittedInfraValue } from "./infra.js";

const TRAITS = TRAIT_COUNT;

const tSh = (tr, i) => Number(tr[i * TRAITS + 5]) || TRAIT_DEFAULT[5];
const tTol = (tr, i) => Number(tr[i * TRAITS + 6]) || TRAIT_DEFAULT[6];

function hueDistance(a, b) {
  const d = Math.abs((a || 0) - (b || 0));
  return Math.min(d, 360 - d);
}

function socialPair(trait, hue, i, j) {
  const sim = 1 - (hueDistance(hue[i], hue[j]) / 180);
  const tolI = clamp(tTol(trait, i), 0, 1.2);
  const tolJ = clamp(tTol(trait, j), 0, 1.2);
  const accept = sim >= Math.min(tolI, tolJ) ? 1 : 0.15;
  const share = Math.min(clamp(tSh(trait, i), 0, 1.2), clamp(tSh(trait, j), 0, 1.2));
  return clamp(accept * share, 0, 1);
}

export function computeClusterAndLinks(world, phy) {
  const { w, h, alive, lineageId, trait, hue, E } = world;
  const N = w * h;
  const playerLineageId = Number(phy?.playerLineageId || 0) | 0;

  if (!world.clusterField || world.clusterField.length !== N) world.clusterField = new Float32Array(N);
  if (!world.link || world.link.length !== N) world.link = new Float32Array(N);
  const clusterField = world.clusterField;
  const link = world.link;

  const linkDecay = clamp(Number(phy.linkDecay ?? 0.02), 0, 1);
  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1) {
      if (playerLineageId && (Number(lineageId[i]) | 0) === playerLineageId && isCommittedInfraValue(link[i])) {
        link[i] = 1;
        clusterField[i] = 0;
        continue;
      }
      link[i] = 0;
      clusterField[i] = 0;
      continue;
    }
    if (playerLineageId && (Number(lineageId[i]) | 0) === playerLineageId && isCommittedInfraValue(link[i])) {
      link[i] = 1;
      continue;
    }
    link[i] = clamp(link[i] * (1 - linkDecay), 0, 1);
  }

  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1) continue;
    const lid = Number(lineageId[i]) | 0;
    if (!lid) { clusterField[i] *= 0.9; continue; }
    let liveN = 0, same = 0;
    forNeighbours8(i, w, h, (j) => {
      if (alive[j] !== 1) return;
      liveN++;
      if ((Number(lineageId[j]) | 0) === lid) same++;
    });
    const c = liveN > 0 ? (same / liveN) : 0;
    clusterField[i] = clamp(clusterField[i] + (c - clusterField[i]) * 0.22, 0, 1);
  }

  const linkBuild = clamp(Number(phy.linkBuild ?? 0.10), 0, 1);
  const linkCost = clamp(Number(phy.linkCost ?? 0.02), 0, 1);
  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1) continue;
    if (E[i] < linkCost * 0.9) continue;
    let bestJ = -1;
    let bestScore = 0;
    forNeighbours8(i, w, h, (j) => {
      if (alive[j] !== 1) return;
      if (E[j] < linkCost * 0.6) return;
      const s = socialPair(trait, hue, i, j);
      if (s > bestScore) { bestScore = s; bestJ = j; }
    });
    if (bestJ < 0 || bestScore < 0.58) continue;
    if (bestJ < i) continue;
    const lidI = Number(lineageId[i]) | 0;
    const lidJ = Number(lineageId[bestJ]) | 0;
    const playerPair = playerLineageId && (lidI === playerLineageId || lidJ === playerLineageId);
    const cost = linkCost * (0.90 - bestScore * 0.35);
    if (E[i] < cost || E[bestJ] < cost) continue;
    E[i] = Math.max(0, E[i] - cost * 0.5);
    E[bestJ] = Math.max(0, E[bestJ] - cost * 0.5);
    if (playerPair) {
      if (lidI === playerLineageId && isCommittedInfraValue(link[i])) link[i] = 1;
      else link[i] = clamp(link[i] + linkBuild * bestScore, 0, 0.95);
      if (lidJ === playerLineageId && isCommittedInfraValue(link[bestJ])) link[bestJ] = 1;
      else link[bestJ] = clamp(link[bestJ] + linkBuild * bestScore, 0, 0.95);
      continue;
    }
    link[i] = clamp(link[i] + linkBuild * bestScore, 0, 1);
    link[bestJ] = clamp(link[bestJ] + linkBuild * bestScore, 0, 1);
  }

  const transferStrength = clamp(Number(phy.transferStrength ?? 0.08), 0, 1);
  if (transferStrength > 0.0001) {
    for (let i = 0; i < N; i++) {
      if (alive[i] !== 1) continue;
      if (link[i] < 0.07) continue;
      forNeighbours8(i, w, h, (j) => {
        if (j < i) return;
        if (alive[j] !== 1) return;
        if (link[j] < 0.07) return;
        const pair = socialPair(trait, hue, i, j);
        if (pair <= 0.02) return;
        const diff = E[i] - E[j];
        if (Math.abs(diff) < 0.03) return;
        const maxAmt = 0.08;
        const amt = clamp(diff * 0.5 * transferStrength * pair, -maxAmt, maxAmt);
        E[i] = clamp(E[i] - amt, 0, phy.Emax);
        E[j] = clamp(E[j] + amt, 0, phy.Emax);
      });
    }
  }
}
