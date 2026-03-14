import { manifest } from "../../../project/project.manifest.js";
import { assertSimPatchesAllowed } from "../gate.js";
import {
  clamp,
  cloneTypedArray,
  defaultLineageMemory,
  renormTraits,
  wrapHue,
} from "../shared.js";
import { TRAIT_COUNT, TRAIT_DEFAULT } from "../life.data.js";

function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

export function handleDevBalanceRunAi(state, action, devMutationCatalog) {
  if (!state.world) return [];
  const payload = (action.payload && typeof action.payload === "object") ? action.payload : {};
  const mode = typeof payload.mode === "string" ? payload.mode : "auto";
  const intensity = clamp(Number(payload.intensity ?? 0.02), 0, 1);
  const maxCellsPerLineage = Math.max(1, Math.min(256, Number(payload.maxCellsPerLineage ?? 48) | 0));
  const blocks = Array.isArray(payload.preferredBlocks) ? payload.preferredBlocks.slice(0, 16).map(String) : [];
  const targets = Array.isArray(payload.targets) ? payload.targets.slice(0, 16) : [];

  const world = state.world;
  const alive = world.alive;
  const lineageId = world.lineageId;
  if (!alive || !lineageId) return [];

  const nextTrait = world.trait ? cloneTypedArray(world.trait) : null;
  const nextHue = world.hue ? cloneTypedArray(world.hue) : null;
  const nextLineageMemory = cloneJson(world.lineageMemory || {});

  const buffIds = blocks
    .map((name) => devMutationCatalog.buffAlias[name])
    .filter(Boolean);
  const buffs = buffIds
    .map((id) => devMutationCatalog.buffs.find((b) => b.id === id))
    .filter(Boolean);
  if (!buffs.length || !nextTrait) {
    const audit = {
      tick: state.sim.tick,
      mode,
      intensity,
      blocks,
      targets,
      applied: 0,
      reason: !nextTrait ? "trait_missing" : "no_buffs",
    };
    const patches = [{ op: "set", path: "/world/devAiLast", value: audit }];
    assertSimPatchesAllowed(manifest, state, action.type, patches);
    return patches;
  }

  const targetMap = new Map();
  for (const t of targets) {
    const lid = Number(t?.lineageId) | 0;
    if (!lid) continue;
    const wgt = clamp(Number(t?.weight ?? 1), 0, 1.5);
    targetMap.set(lid, { remaining: maxCellsPerLineage, weight: wgt, applied: 0 });
  }
  if (targetMap.size === 0) {
    const audit = { tick: state.sim.tick, mode, intensity, blocks, targets, applied: 0, reason: "no_targets" };
    const patches = [{ op: "set", path: "/world/devAiLast", value: audit }];
    assertSimPatchesAllowed(manifest, state, action.type, patches);
    return patches;
  }

  const N = alive.length;
  let applied = 0;
  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1) continue;
    const lid = Number(lineageId[i]) | 0;
    const t = targetMap.get(lid);
    if (!t || t.remaining <= 0) continue;

    const o = i * TRAIT_COUNT;
    for (let b = 0; b < buffs.length; b++) {
      const buff = buffs[b];
      const stepScale = 1 - b * 0.12;
      const amp = intensity * t.weight * stepScale;
      const vec = Array.isArray(buff.trait) ? buff.trait : [];
      for (let k = 0; k < TRAIT_COUNT; k++) {
        const dv = Number(vec[k] || 0) * amp;
        nextTrait[o + k] = Number(nextTrait[o + k] || TRAIT_DEFAULT[k]) + dv;
      }
      renormTraits(nextTrait, o);
      if (nextHue) nextHue[i] = wrapHue(Number(nextHue[i] || 0) + Number(buff.hue || 0) * amp);
      const mem = buff.mem && typeof buff.mem === "object" ? buff.mem : null;
      if (mem) {
        const cur = nextLineageMemory[lid] || defaultLineageMemory();
        for (const mk of Object.keys(mem)) {
          const v = Number(mem[mk]);
          if (!Number.isFinite(v)) continue;
          cur[mk] = clamp(Number(cur[mk] ?? 0) + v * amp, 0, 1);
        }
        nextLineageMemory[lid] = cur;
      }
    }

    t.remaining--;
    t.applied++;
    applied++;
    if (applied > 4096) break;

    let anyLeft = false;
    for (const v of targetMap.values()) {
      if (v.remaining > 0) {
        anyLeft = true;
        break;
      }
    }
    if (!anyLeft) break;
  }

  const audit = {
    tick: state.sim.tick,
    mode,
    intensity,
    blocks,
    targets: targets.map((t) => ({ lineageId: Number(t?.lineageId) | 0, weight: Number(t?.weight ?? 1) })),
    applied,
  };

  const prevVault = state.meta.devMutationVault || { version: 1, totalInvented: 0, entries: [] };
  const nextVault = cloneJson(prevVault);
  if (!nextVault || typeof nextVault !== "object") return [];
  if (!Array.isArray(nextVault.entries)) nextVault.entries = [];
  nextVault.totalInvented = (Number(nextVault.totalInvented || 0) | 0) + 1;
  nextVault.entries.push({ ...audit, id: `ai_${nextVault.totalInvented}` });
  if (nextVault.entries.length > 240) nextVault.entries = nextVault.entries.slice(-240);

  const patches = [
    { op: "set", path: "/world/trait", value: nextTrait },
    { op: "set", path: "/world/lineageMemory", value: nextLineageMemory },
    { op: "set", path: "/world/devAiLast", value: audit },
    { op: "set", path: "/meta/devMutationVault", value: nextVault },
    { op: "set", path: "/world/devMutationVault", value: cloneJson(nextVault) },
  ];
  if (nextHue) patches.push({ op: "set", path: "/world/hue", value: nextHue });
  assertSimPatchesAllowed(manifest, state, action.type, patches);
  return patches;
}
