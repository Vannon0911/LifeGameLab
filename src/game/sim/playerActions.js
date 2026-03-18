import { rng01 } from "../../kernel/determinism/rng.js";
import { TRAIT_COUNT, TRAIT_DEFAULT } from "./life.data.js";
import {
  clamp,
  cloneTypedArray,
  defaultLineageMemory,
  paintCircle,
  renormTraits,
  wrapHue,
} from "./shared.js";
import {
  DOCTRINE_BY_ID,
  TECH_BY_ID,
  SYNERGY_BY_ID,
  computeUnlockedSynergies,
  deriveCommandScore,
  hasRequiredTechs,
  normalizeTechArray,
} from "../techTree.js";
import {
  BRUSH_MODE,
  RUN_PHASE,
  normalizeRunPhase,
} from "../contracts/ids.js";
import { getStartWindowRange, getWorldPreset, isTileInStartWindow } from "./worldPresets.js";

function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

function isPlayerVisibleTile(world, idx) {
  return !!world?.visibility && ArrayBuffer.isView(world.visibility) && ((Number(world.visibility[idx]) | 0) === 1);
}

function isCommittedPlayerAnchorTile(world, idx, playerLineageId) {
  return !!world?.alive
    && !!world?.lineageId
    && !!world?.link
    && ArrayBuffer.isView(world.alive)
    && ArrayBuffer.isView(world.lineageId)
    && ArrayBuffer.isView(world.link)
    && world.alive[idx] === 1
    && ((Number(world.lineageId[idx]) | 0) === (playerLineageId | 0))
    && Number(world.link[idx] || 0) >= 1;
}

function footprintTouchesCommittedPlayerAnchor(world, indices, w, h, playerLineageId) {
  for (const idx of indices) {
    if (isCommittedPlayerAnchorTile(world, idx, playerLineageId)) return true;
    const x = idx % w;
    const y = (idx / w) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (isCommittedPlayerAnchorTile(world, yy * w + xx, playerLineageId)) return true;
      }
    }
  }
  return false;
}

function findPlayerTraitSource({ alive, lineageId, playerLineageId, idx, w, h }) {
  const x = idx % w;
  const y = (idx / w) | 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (alive[j] === 1 && (Number(lineageId[j]) | 0) === playerLineageId) return j;
    }
  }
  return -1;
}

function populatePlayerCell({
  idx,
  tick,
  playerLineageId,
  alive,
  E,
  reserve,
  link,
  lineageId,
  hue,
  trait,
  age,
  born,
  died,
  W,
  w,
  h,
}) {
  if (alive[idx] === 1) return false;

  alive[idx] = 1;
  if (born) born[idx] = 1;
  if (died) died[idx] = 0;
  if (age) age[idx] = 0;
  if (E) E[idx] = 0.40;
  if (reserve) reserve[idx] = 0.10;
  if (link) link[idx] = 0;
  if (W) W[idx] = Math.max(0, Math.min(1, Number(W[idx] || 0) * 0.5));

  lineageId[idx] = playerLineageId >>> 0;

  const sourceIdx = findPlayerTraitSource({ alive, lineageId, playerLineageId, idx, w, h });
  if (trait) {
    const dst = idx * TRAIT_COUNT;
    if (sourceIdx >= 0) {
      const src = sourceIdx * TRAIT_COUNT;
      for (let t = 0; t < TRAIT_COUNT; t++) trait[dst + t] = Number(trait[src + t] ?? TRAIT_DEFAULT[t]);
    } else {
      for (let t = 0; t < TRAIT_COUNT; t++) trait[dst + t] = TRAIT_DEFAULT[t];
    }
  }

  if (hue) {
    if (sourceIdx >= 0) hue[idx] = wrapHue(Number(hue[sourceIdx] || 0));
    else hue[idx] = wrapHue((playerLineageId % 360) + (rng01(playerLineageId, (idx ^ tick) | 0) - 0.5) * 8);
  }

  return true;
}

function applyLineageTraitDelta({
  alive,
  lineageId,
  targetLineageId,
  trait,
  hue,
  vec = [],
  hueDelta = 0,
  intensity = 1,
}) {
  const scaled = Number(intensity || 0);
  if (!scaled) return false;
  let changed = false;
  for (let i = 0; i < alive.length; i++) {
    if (alive[i] !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== (targetLineageId | 0)) continue;
    const o = i * TRAIT_COUNT;
    for (let k = 0; k < TRAIT_COUNT; k++) {
      trait[o + k] = Number(trait[o + k] || TRAIT_DEFAULT[k]) + Number(vec[k] || 0) * scaled;
    }
    renormTraits(trait, o);
    if (hue) hue[i] = wrapHue(Number(hue[i] || 0) + Number(hueDelta || 0) * scaled);
    changed = true;
  }
  return changed;
}

function applyMemoryDelta(target, delta, intensity = 1) {
  if (!delta || typeof delta !== "object") return;
  const scale = Number(intensity || 0);
  for (const key of Object.keys(delta)) {
    const next = Number(delta[key]);
    if (!Number.isFinite(next)) continue;
    target[key] = clamp(Number(target[key] ?? 0) + next * scale, 0, 1);
  }
}

export function handlePlaceCell(state, action) {
  const world = state.world;
  if (!world) return [];
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;
  const x = Number(action.payload?.x) | 0;
  const y = Number(action.payload?.y) | 0;
  if (x < 0 || y < 0 || x >= w || y >= h) return [];
  const idx = y * w + x;
  const remove = !!action.payload?.remove;
  const runPhase = normalizeRunPhase(state.sim.runPhase, RUN_PHASE.GENESIS_SETUP);
  const isGenesis = true;
  const isGenesisSetup = runPhase === RUN_PHASE.GENESIS_SETUP;
  if (runPhase === RUN_PHASE.RESULT) return [];

  const alive = cloneTypedArray(world.alive);
  const E = cloneTypedArray(world.E);
  const reserve = cloneTypedArray(world.reserve);
  const link = cloneTypedArray(world.link);
  const lineageId = cloneTypedArray(world.lineageId);
  const hue = cloneTypedArray(world.hue);
  const trait = cloneTypedArray(world.trait);
  const age = cloneTypedArray(world.age);
  const born = cloneTypedArray(world.born);
  const died = cloneTypedArray(world.died);
  const W = world.W ? cloneTypedArray(world.W) : null;
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const currentLineage = Number(lineageId[idx] || 0) | 0;
  const playerDNA = Number(state.sim.playerDNA || 0);
  const cost = 0.5;
  const costEnabled = !!state.meta.placementCostEnabled;
  const founderMaskSrc = world.founderMask && ArrayBuffer.isView(world.founderMask)
    ? world.founderMask
    : new Uint8Array(w * h);
  const founderMask = cloneTypedArray(founderMaskSrc);

  if (isGenesis && isGenesisSetup) {
    if (String(state.meta.brushMode || BRUSH_MODE.OBSERVE) !== BRUSH_MODE.FOUNDER_PLACE) return [];
    const founderBudget = Math.max(0, Number(state.sim.founderBudget || 0) | 0);
    const founderPlaced = Math.max(0, Number(state.sim.founderPlaced || 0) | 0);
    const preset = getWorldPreset(state.meta.worldPresetId);
    const playerWindow = preset?.startWindows?.player;
    const playerRange = playerWindow ? getStartWindowRange(playerWindow, w, h) : null;
    const fixedStartX = Number(playerRange?.x0 ?? -1) | 0;
    const fixedStartY = Number(playerRange?.y0 ?? -1) | 0;

    if (remove) {
      if (alive[idx] !== 1) return [];
      if (currentLineage !== playerLineageId) return [];
      if ((Number(founderMask[idx]) | 0) !== 1) return [];
      alive[idx] = 0;
      if (born) born[idx] = 0;
      if (died) died[idx] = 1;
      if (E) E[idx] = 0;
      if (reserve) reserve[idx] = 0;
      if (link) link[idx] = 0;
      if (lineageId) lineageId[idx] = 0;
      if (hue) hue[idx] = 0;
      if (age) age[idx] = 0;
      if (trait) {
        const o = idx * TRAIT_COUNT;
        for (let t = 0; t < TRAIT_COUNT; t++) trait[o + t] = TRAIT_DEFAULT[t];
      }
      founderMask[idx] = 0;
      const patches = [
        { op: "set", path: "/world/alive", value: alive },
        { op: "set", path: "/world/E", value: E },
        { op: "set", path: "/world/reserve", value: reserve },
        { op: "set", path: "/world/link", value: link },
        { op: "set", path: "/world/lineageId", value: lineageId },
        { op: "set", path: "/world/hue", value: hue },
        { op: "set", path: "/world/trait", value: trait },
        { op: "set", path: "/world/age", value: age },
        { op: "set", path: "/world/born", value: born },
        { op: "set", path: "/world/died", value: died },
        { op: "set", path: "/world/founderMask", value: founderMask },
        { op: "set", path: "/sim/founderPlaced", value: Math.max(0, founderPlaced - 1) },
      ];
      if (W) patches.push({ op: "set", path: "/world/W", value: W });
      return patches;
    }

    if (alive[idx] === 1) return [];
    if (!playerWindow || !isTileInStartWindow(x, y, w, h, playerWindow)) return [];
    if (x !== fixedStartX || y !== fixedStartY) return [];
    if (founderPlaced >= founderBudget) return [];
    if (!populatePlayerCell({
      idx,
      tick: state.sim.tick,
      playerLineageId,
      alive,
      E,
      reserve,
      link,
      lineageId,
      hue,
      trait,
      age,
      born,
      died,
      W,
      w,
      h,
    })) return [];
    founderMask[idx] = 1;
    const patches = [
      { op: "set", path: "/world/alive", value: alive },
      { op: "set", path: "/world/E", value: E },
      { op: "set", path: "/world/reserve", value: reserve },
      { op: "set", path: "/world/link", value: link },
      { op: "set", path: "/world/lineageId", value: lineageId },
      { op: "set", path: "/world/hue", value: hue },
      { op: "set", path: "/world/trait", value: trait },
      { op: "set", path: "/world/age", value: age },
      { op: "set", path: "/world/born", value: born },
      { op: "set", path: "/world/died", value: died },
      { op: "set", path: "/world/founderMask", value: founderMask },
      { op: "set", path: "/sim/founderPlaced", value: founderPlaced + 1 },
    ];
    if (W) patches.push({ op: "set", path: "/world/W", value: W });
    return patches;
  }

  if (remove) {
    if (alive[idx] !== 1 || currentLineage !== playerLineageId) return [];
    alive[idx] = 0;
    if (born) born[idx] = 0;
    if (died) died[idx] = 1;
    if (E) E[idx] = 0;
    if (reserve) reserve[idx] = 0;
    if (link) link[idx] = 0;
    if (lineageId) lineageId[idx] = 0;
    if (hue) hue[idx] = 0;
    if (age) age[idx] = 0;
    if (trait) {
      const o = idx * TRAIT_COUNT;
      for (let t = 0; t < TRAIT_COUNT; t++) trait[o + t] = TRAIT_DEFAULT[t];
    }
  } else {
    if (alive[idx] === 1) return [];
    if (costEnabled && playerDNA < cost) return [];
    if (!populatePlayerCell({
      idx,
      tick: state.sim.tick,
      playerLineageId,
      alive,
      E,
      reserve,
      link,
      lineageId,
      hue,
      trait,
      age,
      born,
      died,
      W,
      w,
      h,
    })) return [];
  }

  const patches = [
    { op: "set", path: "/world/alive", value: alive },
    { op: "set", path: "/world/E", value: E },
    { op: "set", path: "/world/reserve", value: reserve },
    { op: "set", path: "/world/link", value: link },
    { op: "set", path: "/world/lineageId", value: lineageId },
    { op: "set", path: "/world/hue", value: hue },
    { op: "set", path: "/world/trait", value: trait },
    { op: "set", path: "/world/age", value: age },
    { op: "set", path: "/world/born", value: born },
    { op: "set", path: "/world/died", value: died },
  ];
  if (W) patches.push({ op: "set", path: "/world/W", value: W });
  if (!remove && costEnabled) {
    patches.push({ op: "set", path: "/sim/playerDNA", value: playerDNA - cost });
  }
  return patches;
}

export function handlePlaceSplitCluster(state, action) {
  const world = state.world;
  if (!world) return [];
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;
  const x = Number(action.payload?.x) | 0;
  const y = Number(action.payload?.y) | 0;
  if (x < 0 || y < 0 || x >= w || y >= h) return [];
  if (w < 4 || h < 4) return [];

  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const playerDNA = Number(state.sim.playerDNA || 0);
  const costPerCell = 0.5;
  const costEnabled = !!state.meta.placementCostEnabled;
  const splitMemory = world.lineageMemory?.[playerLineageId];
  if (Number(splitMemory?.splitUnlock || 0) < 1) return [];
  const unlockedTechs = new Set(normalizeTechArray(splitMemory?.techs));
  if (!unlockedTechs.has("cluster_split")) return [];
  if (deriveCommandScore(state.sim) + 1e-9 < Number(TECH_BY_ID.cluster_split?.commandReq || 0)) return [];

  const alive = cloneTypedArray(world.alive);
  const E = cloneTypedArray(world.E);
  const reserve = cloneTypedArray(world.reserve);
  const link = cloneTypedArray(world.link);
  const lineageId = cloneTypedArray(world.lineageId);
  const hue = cloneTypedArray(world.hue);
  const trait = cloneTypedArray(world.trait);
  const age = cloneTypedArray(world.age);
  const born = cloneTypedArray(world.born);
  const died = cloneTypedArray(world.died);
  const W = world.W ? cloneTypedArray(world.W) : null;
  const zoneMap = world.zoneMap;

  const startX = Math.max(0, Math.min(w - 4, x - 1));
  const startY = Math.max(0, Math.min(h - 4, y - 1));
  const cells = [];
  for (let yy = startY; yy < startY + 4; yy++) {
    for (let xx = startX; xx < startX + 4; xx++) {
      const idx = yy * w + xx;
      if (alive[idx] === 1) return [];
      if (zoneMap && (zoneMap[idx] | 0) === 5) return [];
      cells.push(idx);
    }
  }
  if (cells.length !== 16) return [];
  const centerIdx = y * w + x;
  if (!isPlayerVisibleTile(world, centerIdx)) return [];
  if (!footprintTouchesCommittedPlayerAnchor(world, cells, w, h, playerLineageId)) return [];

  const totalCost = 16 * costPerCell;
  if (costEnabled && playerDNA < totalCost) return [];

  let placed = 0;
  for (const idx of cells) {
    if (populatePlayerCell({
      idx,
      tick: state.sim.tick,
      playerLineageId,
      alive,
      E,
      reserve,
      link,
      lineageId,
      hue,
      trait,
      age,
      born,
      died,
      W,
      w,
      h,
    })) placed++;
  }
  if (!placed) return [];

  const patches = [
    { op: "set", path: "/world/alive", value: alive },
    { op: "set", path: "/world/E", value: E },
    { op: "set", path: "/world/reserve", value: reserve },
    { op: "set", path: "/world/link", value: link },
    { op: "set", path: "/world/lineageId", value: lineageId },
    { op: "set", path: "/world/hue", value: hue },
    { op: "set", path: "/world/trait", value: trait },
    { op: "set", path: "/world/age", value: age },
    { op: "set", path: "/world/born", value: born },
    { op: "set", path: "/world/died", value: died },
  ];
  if (W) patches.push({ op: "set", path: "/world/W", value: W });
  if (costEnabled) patches.push({ op: "set", path: "/sim/playerDNA", value: playerDNA - totalCost });
  return patches;
}

export function handleHarvestCell(state, action) {
  if (!state.world) return [];
  const world = state.world;
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;

  const alive = world.alive;
  const lineageId = world.lineageId;
  if (!alive || !lineageId) return [];
  const playerLineageId = state.meta.playerLineageId | 0;
  let playerAliveCount = 0;
  for (let i = 0; i < alive.length; i++) {
    if (alive[i] === 1 && (Number(lineageId[i]) | 0) === playerLineageId) {
      playerAliveCount++;
      if (playerAliveCount >= 5) break;
    }
  }
  if (playerAliveCount < 5) return [];

  const x = Number(action.payload?.x) | 0;
  const y = Number(action.payload?.y) | 0;
  if (x < 0 || y < 0 || x >= w || y >= h) return [];
  const idx = y * w + x;
  if (alive[idx] !== 1 || (Number(lineageId[idx]) | 0) !== playerLineageId) return [];

  const age = world.age;
  const playerStage = Number(state.sim.playerStage) || 1;
  const ageVal = age ? Number(age[idx]) : 0;
  const harvestZoneBonus = (world.zoneMap && (world.zoneMap[idx] | 0) === 1) ? 1.5 : 1.0;
  const dnaYield = Math.max(1.0, Math.min(5.0,
    1.0 + (ageVal / 500) * 1.5 + (playerStage - 1) * 1.0
  )) * harvestZoneBonus;

  const aliveNext = cloneTypedArray(alive);
  aliveNext[idx] = 0;
  const energyNext = cloneTypedArray(world.E);
  energyNext[idx] = 0;

  const newTotalHarvested = Number(state.sim.totalHarvested || 0) + 1;

  const patches = [
    { op: "set", path: "/sim/playerDNA", value: Number(state.sim.playerDNA || 0) + dnaYield },
    { op: "set", path: "/sim/totalHarvested", value: newTotalHarvested },
    { op: "set", path: "/world/alive", value: aliveNext },
    { op: "set", path: "/world/E", value: energyNext },
  ];
  return patches;
}

export function handleSetZone(state, action) {
  if (!state.world) return [];
  const world = state.world;
  const w = Number(world.w || state.meta.gridW || 0) | 0;
  const h = Number(world.h || state.meta.gridH || 0) | 0;
  if (!world.zoneMap || !ArrayBuffer.isView(world.zoneMap)) return [];

  const x = Number(action.payload?.x) | 0;
  const y = Number(action.payload?.y) | 0;
  const radius = Math.max(1, Math.min(64, Number(action.payload?.radius) | 0));
  const zoneType = Math.max(0, Math.min(5, Number(action.payload?.zoneType) | 0));
  if (x < 0 || y < 0 || x >= w || y >= h) return [];
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const targetIndices = [];
  paintCircle({
    w, h, x, y, radius,
    cb: (idx) => { targetIndices.push(idx); },
  });
  if (!targetIndices.length) return [];
  const centerIdx = y * w + x;
  if (!isPlayerVisibleTile(world, centerIdx)) return [];
  if (!footprintTouchesCommittedPlayerAnchor(world, targetIndices, w, h, playerLineageId)) return [];

  const zoneMap = cloneTypedArray(world.zoneMap);
  paintCircle({
    w, h, x, y, radius,
    cb: (idx) => { zoneMap[idx] = zoneType; },
  });

  const patches = [{ op: "set", path: "/world/zoneMap", value: zoneMap }];
  return patches;
}

export function handleSetPlayerDoctrine(state, action) {
  if (!state.world) return [];
  const doctrineId = String(action.payload?.doctrineId || "");
  const doctrine = DOCTRINE_BY_ID[doctrineId];
  if (!doctrine) return [];
  const playerStage = Number(state.sim.playerStage || 1);
  if (playerStage < Number(doctrine.unlockStage || 1)) return [];
  const playerLineageId = Number(state.meta.playerLineageId || 0) | 0;
  if (!playerLineageId) return [];
  const nextLineageMemory = cloneJson(state.world.lineageMemory || {});
  const current = { ...defaultLineageMemory(), ...(nextLineageMemory[playerLineageId] || {}) };
  current.doctrine = doctrineId;
  current.stage = Math.max(Number(current.stage || 1), playerStage);
  nextLineageMemory[playerLineageId] = current;
  const patches = [{ op: "set", path: "/world/lineageMemory", value: nextLineageMemory }];
  return patches;
}

export function handleBuyEvolution(state, action, devMutationCatalog) {
  if (!state.world) return [];
  const archetypeId = typeof action.payload?.archetypeId === "string"
    ? action.payload.archetypeId : "";
  const tech = TECH_BY_ID[archetypeId];
  if (!tech) return [];

  const playerLineageId = state.meta.playerLineageId | 0;
  const playerStage = Number(state.sim.playerStage) || 1;
  const playerDNA = Number(state.sim.playerDNA) || 0;
  const dnaCost = 5 * Math.max(1, Number(tech.stage || playerStage || 1));
  if (playerDNA < dnaCost) return [];
  if (playerStage < Number(tech.stage || 1)) return [];
  const commandScore = deriveCommandScore(state.sim);

  const world = state.world;
  const alive = world.alive;
  const lineageId = world.lineageId;
  if (!alive || !lineageId || !world.trait) return [];

  const nextTrait = cloneTypedArray(world.trait);
  const nextHue = world.hue ? cloneTypedArray(world.hue) : null;
  const nextLineageMemory = cloneJson(world.lineageMemory || {});
  const currentMemory = { ...defaultLineageMemory(), ...(nextLineageMemory[playerLineageId] || {}) };
  const unlocked = new Set(normalizeTechArray(currentMemory.techs));
  if (unlocked.has(archetypeId)) return [];
  if (!hasRequiredTechs(unlocked, tech.requires)) return [];
  if (commandScore + 1e-9 < Number(tech.commandReq || 0)) return [];
  const req = tech.runRequirements;
  if (req) {
    if (Number(req.minZoneTier || 0) > 0 && Number(state.sim.unlockedZoneTier || 0) < Number(req.minZoneTier || 0)) return [];
    if (req.requiresInfra && !state.sim.infrastructureUnlocked) return [];
    if (Number(req.minPatternClasses || 0) > 0) {
      let count = 0;
      const patternCatalog = state.sim.patternCatalog || {};
      for (const key of Object.keys(patternCatalog)) {
        if (Number(patternCatalog[key]?.count || 0) > 0) count++;
      }
      if (count < Number(req.minPatternClasses || 0)) return [];
    }
    if (Number(req.minNetworkRatio || 0) > 0 && Number(state.sim.networkRatio || 0) + 1e-9 < Number(req.minNetworkRatio || 0)) return [];
    if (Number(req.minExpansionCount || 0) > 0 && Number(state.sim.expansionCount || 0) < Number(req.minExpansionCount || 0)) return [];
    if (Array.isArray(req.positivePatternBonuses) && req.positivePatternBonuses.length > 0) {
      const bonuses = state.sim.patternBonuses || {};
      const hasPositiveBonus = req.positivePatternBonuses.some((key) => Number(bonuses[key] || 0) > 0);
      if (!hasPositiveBonus) return [];
    }
  }

  unlocked.add(archetypeId);
  currentMemory.techs = [...unlocked].sort();
  currentMemory.stage = Math.max(Number(currentMemory.stage || 1), playerStage);
  if (archetypeId === "cluster_split") currentMemory.splitUnlock = 1;

  const effectQueue = [];
  const buffId = devMutationCatalog.buffAlias[archetypeId];
  const buff = buffId ? devMutationCatalog.buffs.find((entry) => entry.id === buffId) : null;
  if (buff) {
    effectQueue.push({
      trait: Array.isArray(buff.trait) ? buff.trait : [],
      hue: Number(buff.hue || 0),
      mem: buff.mem || null,
      intensity: 0.05,
    });
  }

  const previousSynergies = new Set(normalizeTechArray(currentMemory.synergies));
  const nextSynergies = computeUnlockedSynergies(unlocked);
  for (const synergyId of nextSynergies) {
    if (previousSynergies.has(synergyId)) continue;
    const synergy = SYNERGY_BY_ID[synergyId];
    if (!synergy) continue;
    effectQueue.push({
      trait: Array.isArray(synergy.trait) ? synergy.trait : [],
      hue: Number(synergy.hue || 0),
      mem: synergy.mem || null,
      intensity: 1,
    });
  }
  currentMemory.synergies = nextSynergies;

  for (const effect of effectQueue) {
    applyLineageTraitDelta({
      alive,
      lineageId,
      targetLineageId: playerLineageId,
      trait: nextTrait,
      hue: nextHue,
      vec: effect.trait,
      hueDelta: effect.hue,
      intensity: effect.intensity,
    });
    applyMemoryDelta(currentMemory, effect.mem, effect.intensity);
  }
  nextLineageMemory[playerLineageId] = currentMemory;

  const patches = [
    { op: "set", path: "/sim/playerDNA", value: playerDNA - dnaCost },
    { op: "set", path: "/world/lineageMemory", value: nextLineageMemory },
    { op: "set", path: "/world/trait", value: nextTrait },
  ];
  if (nextHue) patches.push({ op: "set", path: "/world/hue", value: nextHue });
  return patches;
}


