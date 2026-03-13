import { clamp } from "./shared.js";
import { ACTION_REMOTE_ATTACK } from "./constants.js";
import { hashMix32 } from "../../core/kernel/rng.js";

export function runRemoteClusterAttacks(world, phy, tick, actionMap) {
  const { w, h, alive, E, W, R, link, reserve, lineageId, clusterField } = world;
  if (!world.clusterAttackState) world.clusterAttackState = {};
  if (!world.lineageThreatMemory) world.lineageThreatMemory = {};
  if (!world.lineageDefenseReadiness) world.lineageDefenseReadiness = {};

  let attacks = 0, kills = 0, stolen = 0, defAct = 0;
  for (let i = 0; i < w * h; i++) {
    if (alive[i] !== 1) continue;
    const lid = Number(lineageId[i]) | 0;
    if (!lid) continue;
    const mem = (world.lineageMemory && world.lineageMemory[lid]);
    if (!mem) continue;

    const toxinSkill = clamp(
      (mem.toxinMetabolism || 0) * 0.35 + (mem.toxin || 0.5) * 0.45 + (mem.light || 0.5) * 0.20,
      0,
      1
    );
    if (toxinSkill < 0.22) continue;

    const cohesion = clamp((clusterField?.[i] || 0) * 0.65 + (link?.[i] || 0) * 0.35, 0, 1);
    if (cohesion < 0.36) continue;

    const key = String(lid);
    const prev = world.clusterAttackState[key] || { cooldown: 0, budget: 0.4 };
    if (prev.cooldown > 0) { prev.cooldown--; continue; }

    const budget = clamp(prev.budget + 0.016 + cohesion * 0.02, 0, 1.1);
    const cost = clamp((phy.remoteAttackCost || 0.12) * (0.85 - toxinSkill * 0.2), 0.04, 0.2);
    if (budget < cost || E[i] < cost * 0.9) { world.clusterAttackState[key] = { cooldown: 0, budget }; continue; }

    const jump = Math.max(5, Math.floor(Math.max(w, h) * (1.4 + (phy.remoteAttackFalloff || 0.72))));
    const r = (hashMix32(lid ^ tick, i * 17 + 11) >>> 0) % (w * h);
    const cand = (i + (r + jump)) % (w * h);
    if (alive[cand] !== 1 || (Number(lineageId[cand]) | 0) === lid) { world.clusterAttackState[key] = { cooldown: 0, budget }; continue; }

    const targetLid = Number(lineageId[cand]) | 0;
    const readiness = Number(world.lineageDefenseReadiness[targetLid] || 0);
    const basePressure = clamp(0.08 + toxinSkill * 0.19 + cohesion * 0.12 - readiness * 0.16, 0.02, 0.30);
    // DEFENSE-Zone (zone 3): Schadens-Reduktion ×0.5 für Zellen im DEFENSE-Gebiet
    const targetZone = world.zoneMap ? (world.zoneMap[cand] | 0) : 0;
    const pressure = targetZone === 3 ? basePressure * 0.5 : basePressure;

    W[cand] = clamp(W[cand] + pressure, 0, 1);
    E[cand] = Math.max(0, E[cand] - pressure * 0.36);
    E[i] = Math.max(0, E[i] - cost * 0.75);

    actionMap[i] = Math.max(actionMap[i], ACTION_REMOTE_ATTACK);
    actionMap[cand] = Math.max(actionMap[cand], ACTION_REMOTE_ATTACK);

    attacks++;
    world.lineageThreatMemory[targetLid] = clamp((world.lineageThreatMemory[targetLid] || 0) * 0.985 + pressure * 0.65, 0, 1.2);
    if (world.lineageThreatMemory[targetLid] > 0.22) {
      world.lineageDefenseReadiness[targetLid] = clamp((world.lineageDefenseReadiness[targetLid] || 0) + 0.02, 0, 1);
      defAct++;
    }

    if (E[cand] <= 0.02) {
      alive[cand] = 0;
      world.died[cand] = 1;
      E[cand] = 0;
      if (reserve) reserve[cand] = 0;
      if (link) link[cand] = 0;
      const loot = Math.min(R[cand], 0.05);
      R[cand] -= loot;
      E[i] += loot * 0.5;
      kills++;
      stolen += loot;
    }

    world.clusterAttackState[key] = {
      cooldown: Math.max(8, Number(phy.remoteAttackCooldown || 36) | 0),
      budget: Math.max(0, budget - cost)
    };
  }

  return { attacks, kills, stolen, defAct };
}

