import { clamp } from "./shared.js";
import { hashMix32 } from "../../core/kernel/rng.js";
import { TRAIT_DEFAULT } from "./life.data.js";
import { TRAITS } from "./constants.js";
import { GAME_MODE, normalizeGameMode } from "../contracts/ids.js";

const WORLD_AI_RESEED_COOLDOWN = 90;

function getBalanceGovernor(world) {
  const { w, h, R, W, P, Sat } = world;
  const N = Math.max(1, w * h);
  let sR = 0, sW = 0, sP = 0, sSat = 0;
  for (let i = 0; i < N; i++) { sR += R[i]; sW += W[i]; sP += P[i]; sSat += Sat[i]; }
  const meanR = clamp(sR / N, 0, 1);
  const meanW = clamp(sW / N, 0, 1);
  const meanP = clamp(sP / N, 0, 1);
  const meanSat = clamp(sSat / N, 0, 1);
  const desiredPlants = clamp(
    0.96 +
      clamp((0.26 - meanR) / 0.26, 0, 1) * 0.06 -
      clamp(meanW * 1.15 + meanSat * 0.70, 0, 1.6) * 0.04 -
      clamp((meanP - 0.20) / 0.24, 0, 1) * 0.08,
    0.78,
    1.04
  );
  const prev = world.balanceGovernor?.plants ?? desiredPlants;
  const plants = prev + (desiredPlants - prev) * 0.02;
  return (world.balanceGovernor = { plants });
}

function seedFoundersIfEmpty(world, tick) {
  const { w, h, alive, E, reserve, hue, lineageId, trait, born } = world;
  let aliveCount = 0;
  for (let i = 0; i < alive.length; i++) if (alive[i] === 1) aliveCount++;
  if (aliveCount > 1) return 0;
  if (tick - Number(world.lastFounderTick ?? -999999) < WORLD_AI_RESEED_COOLDOWN) return 0;

  const picks = [
    { x: Math.max(1, Math.floor(w * 0.22)), y: Math.floor(h * 0.50) },
    { x: Math.min(w - 2, Math.floor(w * 0.78)), y: Math.floor(h * 0.50) },
  ];
  let placed = 0;
  const offsets = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]];

  for (let n = 0; n < picks.length; n++) {
    const p = picks[n];
    const founderId = (hashMix32((p.y * w + p.x) ^ tick ^ (n * 7919), 13) >>> 0) || (n + 1);
    for (const [dx, dy] of offsets) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const idx = y * w + x;
      if (alive[idx] === 1) continue;
      alive[idx] = 1;
      born[idx] = 1;
      E[idx] = 0.40;
      reserve[idx] = 0.10;
      hue[idx] = 0;
      lineageId[idx] = founderId;
      for (let k = 0; k < TRAITS; k++) trait[idx * TRAITS + k] = TRAIT_DEFAULT[k];
      placed++;
    }
  }

  world.lastFounderTick = tick;
  return placed;
}

export function applyWorldAi(world, tick, options = {}) {
  const gameMode = normalizeGameMode(options?.gameMode, GAME_MODE.GENESIS);
  const foundersPlaced = gameMode === GAME_MODE.LAB_AUTORUN
    ? seedFoundersIfEmpty(world, tick)
    : 0;
  const gov = getBalanceGovernor(world);
  world.worldAiAudit = {
    tick,
    mode: gameMode === GAME_MODE.LAB_AUTORUN ? "lab_start+plants" : "genesis_plants_only",
    foundersPlaced,
    governor: { plants: gov.plants },
  };
}
