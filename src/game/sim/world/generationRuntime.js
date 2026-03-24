import { TRAIT_DEFAULT, TRAIT_COUNT } from "../life.data.js";
import { hashString, rng01 } from "../../../kernel/determinism/rng.js";
import {
  BIOME_IDS,
  getWorldPreset,
  normalizeWorldPresetId,
} from "./presetCatalog.js";
import { getStartWindowRange } from "./presetRuntime.js";

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function gauss(cx, cy, x, y, sigma, amp) {
  const dx = x - cx;
  const dy = y - cy;
  return amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}

function makeWorldDescriptor(seedBase, preset) {
  let s = 1;
  const f = () => rng01(seedBase, s++);
  const hotspotCount = 2 + Math.floor(f() * 3);
  const hotspots = [];
  for (let i = 0; i < hotspotCount; i++) {
    hotspots.push({
      cx: 0.10 + f() * 0.80,
      cy: 0.10 + f() * 0.80,
      sigma: 0.05 + f() * 0.12,
      amp: 0.80 + f() * 1.00 + (preset.fertilityBias || 0),
    });
  }

  const channel = {
    sx: 0.06 + f() * 0.12,
    sy: 0.16 + f() * 0.22,
    ex: 0.72 + f() * 0.20,
    ey: 0.68 + f() * 0.18,
    width: 0.05 + f() * 0.04,
  };

  const oases = [];
  const oasisCount = preset.id === "dry_basin" ? 3 : preset.id === "wet_meadow" ? 2 : 1;
  for (let i = 0; i < oasisCount; i++) {
    oases.push({
      cx: 0.12 + f() * 0.76,
      cy: 0.12 + f() * 0.76,
      sigma: 0.05 + f() * 0.08,
      amp: 0.18 + f() * 0.20,
    });
  }
  return { hotspots, channel, oases };
}

function distanceToSegment(nx, ny, sx, sy, ex, ey) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((nx - sx) * dx + (ny - sy) * dy) / len2));
  const px = sx + t * dx;
  const py = sy + t * dy;
  const rx = nx - px;
  const ry = ny - py;
  return Math.sqrt(rx * rx + ry * ry);
}

function buildLightField(w, h, descriptor, preset) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / Math.max(1, w - 1);
      const ny = y / Math.max(1, h - 1);
      let value = 0.10 + (preset.lightBias || 0);
      for (const hotspot of descriptor.hotspots) value += gauss(hotspot.cx, hotspot.cy, nx, ny, hotspot.sigma, hotspot.amp * 0.34);
      if (preset.id === "dry_basin") value += (1 - ny) * 0.16 + Math.abs(nx - 0.5) * 0.08;
      if (preset.id === "wet_meadow") value += 0.03 - Math.abs(nx - 0.5) * 0.02;
      out[y * w + x] = clamp01(value);
    }
  }
  return out;
}

function buildWaterField(w, h, descriptor, preset, seedBase) {
  const out = new Float32Array(w * h);
  let stream = 2000;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / Math.max(1, w - 1);
      const ny = y / Math.max(1, h - 1);
      const idx = y * w + x;
      let water = Math.max(0, 0.08 + (preset.waterBias || 0));

      const d = distanceToSegment(nx, ny, descriptor.channel.sx, descriptor.channel.sy, descriptor.channel.ex, descriptor.channel.ey);
      const corridor = Math.max(0, 1 - d / Math.max(0.001, descriptor.channel.width));
      water += corridor * corridor * (0.52 + (preset.waterSpread || 0.5) * 0.35);

      if (preset.id === "river_delta") {
        const fan = Math.max(0, 1 - Math.abs(nx - 0.82) / 0.20) * Math.max(0, 1 - Math.abs(ny - 0.76) / 0.18);
        water += fan * (preset.waterFan || 0.2);
      }

      for (const oasis of descriptor.oases) {
        water += gauss(oasis.cx, oasis.cy, nx, ny, oasis.sigma, oasis.amp);
      }

      if (preset.id === "dry_basin") {
        water *= 0.52 + rng01(seedBase, stream++) * 0.10;
      } else if (preset.id === "wet_meadow") {
        water += 0.10 + 0.08 * Math.sin((nx + ny) * Math.PI * 2);
      }
      out[idx] = clamp01(water);
    }
  }
  return out;
}

function assignBiome(light, water, fertility, xRatio, yRatio) {
  const stagnation = clamp01(water * (1 - light) * 1.2 + (1 - fertility) * 0.25);
  if (stagnation > 0.52 && water > 0.35) return BIOME_IDS.toxic_marsh;
  if (water > 0.62) return light < 0.34 ? BIOME_IDS.wet_forest : BIOME_IDS.riverlands;
  if (water < 0.10 && light > 0.44) return BIOME_IDS.barren_flats;
  if (water < 0.18) return BIOME_IDS.dry_plains;
  if (fertility > 0.46 && water > 0.30 && (yRatio > 0.42 || xRatio > 0.32)) return BIOME_IDS.wet_forest;
  return BIOME_IDS.riverlands;
}

function deriveBaseFields(state, preset, seedBase) {
  const { w, h, L, water, baseSat, Sat, biomeId } = state;
  let stream = 5000;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / Math.max(1, w - 1);
      const ny = y / Math.max(1, h - 1);
      const idx = y * w + x;
      const moisture = Number(water[idx] || 0);
      const light = Number(L[idx] || 0);
      let fertility =
        0.10 +
        moisture * 0.46 +
        (1 - Math.abs(nx - 0.5)) * 0.06 +
        (preset.fertilityBias || 0) +
        rng01(seedBase, stream++) * 0.06;
      if (preset.id === "dry_basin") fertility -= light * 0.08;
      if (preset.id === "wet_meadow") fertility += 0.06;
      fertility = clamp01(fertility);
      baseSat[idx] = fertility;
      Sat[idx] = fertility;
      biomeId[idx] = assignBiome(light, moisture, fertility, nx, ny);
    }
  }
}

export function seedDeterministicBootstrapCluster(world, seedStr, windowDef, lineageId = 2) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  if (w <= 0 || h <= 0 || !windowDef) return [];
  const range = getStartWindowRange(windowDef, w, h);
  const candidates = [];
  for (let y = range.y0; y <= range.y1 - 2; y++) {
    for (let x = range.x0; x <= range.x1 - 2; x++) {
      const indices = [
        y * w + x,
        y * w + (x + 1),
        (y + 1) * w + x,
        (y + 1) * w + (x + 1),
      ];
      if (indices.some((idx) => (Number(world.alive?.[idx] || 0) | 0) === 1)) continue;
      candidates.push(indices);
    }
  }
  if (!candidates.length) return [];

  const seedBase = hashString(`${seedStr || "life-seed"}:cpu-bootstrap:${w}x${h}`);
  let bestIndices = candidates[0];
  let bestScore = -1;
  for (let i = 0; i < candidates.length; i++) {
    const score = rng01(seedBase, i + 1);
    if (score > bestScore) {
      bestScore = score;
      bestIndices = candidates[i];
    }
  }

  for (const idx of bestIndices) {
    world.alive[idx] = 1;
    world.E[idx] = 0.42;
    world.reserve[idx] = 0.12;
    world.link[idx] = 0;
    world.lineageId[idx] = lineageId >>> 0;
    world.hue[idx] = lineageId === 2 ? 0 : 210;
    world.age[idx] = 0;
    if (world.born) world.born[idx] = 1;
    if (world.died) world.died[idx] = 0;
    if (world.W) world.W[idx] = Math.max(0, Math.min(1, Number(world.W[idx] || 0) * 0.5));
    const o = idx * TRAIT_COUNT;
    for (let t = 0; t < TRAIT_COUNT; t++) world.trait[o + t] = TRAIT_DEFAULT[t];
  }
  return bestIndices;
}

export function applyMapSpecOverrides(world, spec) {
  if (!world || !spec || !spec.tilePlan || typeof spec.tilePlan !== "object") return;
  const { w, h, L, R, W, Sat, zoneRole } = world;
  const tilePlan = spec.tilePlan;
  for (const key of Object.keys(tilePlan)) {
    const idx = Number(key) | 0;
    if (idx < 0 || idx >= w * h) continue;
    const entry = tilePlan[key];
    if (!entry || typeof entry !== "object") continue;
    const { mode, value } = entry;
    const v = Number(value ?? 0);
    switch (mode) {
      case "light": if (L) L[idx] = v; break;
      case "nutrient": if (R) R[idx] = v; break;
      case "water": if (W) W[idx] = v; break;
      case "saturation": if (Sat) Sat[idx] = v; break;
      case "core": if (zoneRole) zoneRole[idx] = 1; break;
      case "dna": if (zoneRole) zoneRole[idx] = 2; break;
      case "infra": if (zoneRole) zoneRole[idx] = 3; break;
    }
  }
}

export function generateWorld(w, h, seedStr, phy, presetId = "river_delta") {
  const normalizedPresetId = normalizeWorldPresetId(presetId);
  const preset = getWorldPreset(normalizedPresetId);
  const seedBase = hashString(`${seedStr || "life-seed"}:${normalizedPresetId}`);
  const descriptor = makeWorldDescriptor(seedBase, preset);
  const N = w * h;

  const state = {
    w,
    h,
    nextLineageId: 3,
    alive: new Uint8Array(N),
    E: new Float32Array(N),
    L: new Float32Array(N),
    R: new Float32Array(N),
    W: new Float32Array(N),
    water: new Float32Array(N),
    Sat: new Float32Array(N),
    baseSat: new Float32Array(N),
    P: new Float32Array(N),
    B: new Float32Array(N),
    plantKind: new Int8Array(N),
    reserve: new Float32Array(N),
    link: new Float32Array(N),
    superId: new Int32Array(N),
    clusterField: new Float32Array(N),
    hue: new Float32Array(N),
    lineageId: new Uint32Array(N),
    trait: new Float32Array(N * TRAIT_COUNT),
    age: new Uint16Array(N),
    born: new Uint8Array(N),
    died: new Uint8Array(N),
    actionMap: new Uint8Array(N),
    zoneRole: new Int8Array(N),
    zoneId: new Uint16Array(N),
    zoneMeta: {},
    coreZoneMask: new Uint8Array(N),
    dnaZoneMask: new Uint8Array(N),
    infraCandidateMask: new Uint8Array(N),
    visibility: new Uint8Array(N),
    explored: new Uint8Array(N),
    biomeId: new Int8Array(N),
    lineageThreatMemory: {},
    lineageDefenseReadiness: {},
    clusterAttackState: {},
    presetId: normalizedPresetId,
  };

  state.L = buildLightField(w, h, descriptor, preset);
  state.water = buildWaterField(w, h, descriptor, preset, seedBase);
  deriveBaseFields(state, preset, seedBase);
  state.superId.fill(-1);
  return state;
}
