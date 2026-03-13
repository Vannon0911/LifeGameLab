// ============================================================
// Reducer — V4 COMPATIBLE (Patch-based)
// ============================================================

import { generateWorld } from "./worldgen.js";
import { simStep }       from "./sim.js";
import { PHYSICS_DEFAULT } from "../../core/kernel/physics.js";
import { hashString, rng01 } from "../../core/kernel/rng.js";
import { TRAIT_COUNT, TRAIT_DEFAULT } from "./life.data.js";
import { manifest } from "../../project/project.manifest.js";
import { assertSimPatchesAllowed } from "./gate.js";
import { clamp, wrapHue, renormTraits, defaultLineageMemory } from "./shared.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

function cloneTypedArray(ta) {
  return (ta && ArrayBuffer.isView(ta)) ? new ta.constructor(ta) : ta;
}

const WORLD_KEYS = [
  "w", "h",
  "nextLineageId",
  "alive", "E", "L", "R", "W",
  "Sat", "baseSat",
  "P", "B", "plantKind",
  "reserve", "link",
  "superId", "clusterField",
  "hue", "lineageId", "trait", "age",
  "born", "died",
  // Optional / soft-state
  "actionMap",
  "balanceGovernor",
  "lastFounderTick",
  "worldAiAudit",
  "globalLearning",
  "devMutationVault",
  "devAiLast",
  "lineageMemory",
  "lineageThreatMemory",
  "lineageDefenseReadiness",
  "clusterAttackState",
  "zoneMap",
];

const SIM_KEYS = [
  "tick", "running",
  "aliveCount", "aliveRatio",
  "meanLAlive", "meanEnergyAlive", "meanReserveAlive",
  "meanNutrientField", "meanToxinField", "meanSaturationField", "meanPlantField", "meanBiochargeField",
  "plantTileRatio", "dominantHueRatio",
  "lineageDiversity",
  "evolutionStageMean", "evolutionStageMax",
  "networkRatio", "clusterRatio",
  "birthsLastStep", "deathsLastStep", "mutationsLastStep",
  "raidEventsLastStep", "infectionsLastStep", "conflictKillsLastStep", "superCellsLastStep",
  "remoteAttacksLastStep", "remoteAttackKillsLastStep", "defenseActivationsLastStep", "resourceStolenLastStep",
  "plantsPrunedLastStep", "nutrientCappedTilesLastStep", "energyClearedTilesLastStep",
  "expansionCount", "lastExpandTick", "expansionWork", "nextExpandCost",
  "playerAliveCount", "cpuAliveCount",
  "playerEnergyIn", "playerEnergyOut", "playerEnergyNet", "playerEnergyStored",
  "lightShare", "nutrientShare", "seasonPhase",
  "playerDNA", "totalHarvested", "playerStage",
  "energySupremacyTicks", "efficiencyTicks", "lossStreakTicks", "stockpileTicks",
  "cpuEnergyIn", "gameResult", "winMode", "gameEndTick", "goal",
];

const UI_KEYS = new Set([
  "panelOpen",
  "activeTab",
  "expertMode",
  "showBiochargeOverlay",
  "showRemoteAttackOverlay",
  "showDefenseOverlay",
]);

const PHYSICS_KEYS = new Set(Object.keys(PHYSICS_DEFAULT || {}));

function pushKeysPatches(patches, obj, keys, prefix) {
  const src = obj && typeof obj === "object" ? obj : {};
  for (const k of keys) {
    if (src[k] !== undefined) patches.push({ op: "set", path: `${prefix}/${k}`, value: src[k] });
  }
}

function paintCircle({ w, h, x, y, radius, cb }) {
  const r = Math.max(1, radius | 0);
  const r2 = r * r;
  const minX = Math.max(0, x - r);
  const maxX = Math.min(w - 1, x + r);
  const minY = Math.max(0, y - r);
  const maxY = Math.min(h - 1, y + r);
  for (let yy = minY; yy <= maxY; yy++) {
    const dy = yy - y;
    for (let xx = minX; xx <= maxX; xx++) {
      const dx = xx - x;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      // Smooth falloff, deterministic.
      const t = 1 - (d2 / Math.max(1, r2));
      const falloff = t * t;
      cb(yy * w + xx, falloff);
    }
  }
}

// ... (Helper functions remain same but will be used to generate patches) ...
// [Note: Keeping helper functions for internal logic, but switching switch-case to return patches]

function buildDevMutationCatalogs() {
  const seeds = [
    ["light_harvest",       [ +0.12, +0.00, -0.03, -0.02, +0.00, +0.00, +0.00 ], +5,  { light: +0.03 }],
    ["nutrient_harvest",    [ +0.02, -0.02, +0.00, +0.00, -0.05, +0.00, +0.00 ], +12, { nutrient: +0.03 }],
    ["toxin_resist",        [ +0.00, +0.02, +0.00, +0.00, +0.03, +0.00, +0.10 ], -8,  { toxin: +0.04, toxinMetabolism: +0.02 }],
    ["reserve_buffer",      [ +0.00, -0.03, +0.00, +0.00, +0.02, +0.04, +0.02 ], +2,  { resilience: +0.04 }],
    ["cooperative_network", [ +0.00, +0.01, +0.00, +0.00, +0.00, +0.10, +0.00 ], +14, { resilience: +0.02 }],
    ["reproductive_spread", [ +0.00, +0.01, +0.00, -0.03, -0.08, +0.00, -0.01 ], +18, { nutrient: +0.01 }],
    ["defensive_shell",     [ -0.02, +0.01, +0.04, +0.02, +0.04, +0.02, +0.06 ], -12, { resilience: +0.03 }],
    ["predator_raid",       [ +0.05, +0.03, +0.00, +0.00, +0.02, -0.07, -0.03 ], +24, { energySense: +0.02 }],
    ["nomadic_adapt",       [ +0.04, +0.00, -0.01, -0.01, +0.00, -0.01, +0.01 ], +20, { light: +0.01, nutrient: +0.01 }],
    ["hybrid_mixer",        [ +0.03, +0.00, +0.01, +0.00, +0.01, +0.04, +0.03 ], +16, { resilience: +0.02 }],
    ["fortress_homeostasis",[ -0.01, -0.02, +0.03, +0.03, +0.03, +0.05, +0.05 ], -6,  { resilience: +0.04 }],
    ["scavenger_loop",      [ +0.01, +0.01, +0.00, +0.00, +0.01, +0.00, +0.08 ], -3,  { toxin: +0.02, toxinMetabolism: +0.03 }],
    ["pioneer_explorer",    [ +0.05, +0.00, -0.02, -0.02, -0.03, -0.02, +0.01 ], +26, { light: +0.02 }],
    ["symbiotic_bloom",     [ +0.02, -0.01, +0.00, -0.02, -0.02, +0.09, +0.02 ], +10, { resilience: +0.02, nutrient: +0.02 }],
    ["mutation_diversify",  [ +0.00, +0.00, +0.00, +0.00, +0.00, +0.00, +0.00 ], +30, { xp: +0.10 }],
  ];

  const buffs = [];
  const buffAlias = {};
  const traitBlocks = [];
  for (let i = 0; i < 100; i++) {
    const s = seeds[i % seeds.length];
    const t = i / 99;
    const phase = (i % 9) / 8;
    const amp = 0.70 + t * 0.75;
    const noisy = 0.008 + phase * 0.042;
    const trait = s[1].map((v, k) => v * amp * (0.78 + ((k + i) % 5) * 0.07));
    const id = `buff_${String(i).padStart(3, "0")}`;
    const name = `${s[0]}_${String(i % 10)}`;
    buffs.push({
      id,
      name,
      trait,
      hue: s[2] * (0.7 + phase * 0.7),
      mem: { ...(s[3] || {}) },
      noisy,
      risk: clamp(0.14 + (Math.abs(s[1][1]) + Math.abs(s[1][4])) * 0.55 + phase * 0.18, 0, 1),
      scaleMin: 0.20,
      scaleMax: 1.45,
      profile: [
        clamp(0.5 + s[1][0] * 3, 0, 1),
        clamp(0.5 - s[1][4] * 2.5, 0, 1),
        clamp(0.5 + s[1][6] * 2.5, 0, 1),
        clamp(0.5 + s[1][5] * 2.0, 0, 1),
      ],
    });
    if (!buffAlias[s[0]]) buffAlias[s[0]] = id;
  }

  for (let i = 0; i < 100; i++) {
    const t = i / 99;
    const angle = i * 0.47;
    const env = [
      clamp(0.5 + Math.sin(angle) * 0.5, 0, 1),            // light
      clamp(0.5 + Math.cos(angle * 0.83) * 0.5, 0, 1),     // nutrient
      clamp(0.5 + Math.sin(angle * 1.21 + 1.2) * 0.5, 0, 1), // toxin
      clamp(0.5 + Math.cos(angle * 1.37 + 0.4) * 0.5, 0, 1), // saturation
      clamp(0.5 + Math.sin(angle * 0.62 + 2.1) * 0.5, 0, 1), // cluster
      clamp(0.5 + Math.cos(angle * 0.58 + 1.4) * 0.5, 0, 1), // network
    ];
    const traitBias = [
      lerp(-0.05, 0.10, env[0]),
      lerp(0.04, -0.04, env[1]),
      lerp(0.04, -0.03, env[0]),
      lerp(0.03, -0.02, env[0]),
      lerp(0.05, -0.06, env[1]),
      lerp(-0.04, 0.09, env[5]),
      lerp(-0.02, 0.11, env[2]),
    ].map(v => v * (0.65 + t * 0.8));
    traitBlocks.push({
      id: `trait_${String(i).padStart(3, "0")}`,
      env,
      traitBias,
      memBias: {
        light: (env[0] - 0.5) * 0.08,
        nutrient: (env[1] - 0.5) * 0.08,
        toxin: (env[2] - 0.5) * 0.08,
        resilience: (env[4] - 0.5) * 0.06 + (env[5] - 0.5) * 0.06,
      },
      scaleMin: 0.18,
      scaleMax: 1.35,
    });
  }

  return { buffs, traitBlocks, buffAlias };
}

const DEV_MUTATION_CATALOG = buildDevMutationCatalogs();

function defaultGlobalLearning() {
  return {
    enabled: true,
    strength: 0.42,
    bank: {
      light: 0.5,
      nutrient: 0.5,
      toxin: 0.5,
      resilience: 0.5,
      energySense: 0.5,
      toxinMetabolism: 0.0,
      stage: 1,
      xp: 0,
      mutationScore: 0,
      samples: 0,
      updates: 0,
    },
  };
}

function defaultDevMutationVault() {
  return {
    version: 1,
    totalInvented: 0,
    entries: [],
  };
}

function mergeWorldLearningIntoBank(world, learning, sim) {
  const out = cloneJson(learning || defaultGlobalLearning());
  // Harden against schema-sanitized empty objects (meta.globalLearning allowUnknown) and partial payloads.
  if (!out || typeof out !== "object") return defaultGlobalLearning();
  if (!out.bank || typeof out.bank !== "object") out.bank = cloneJson(defaultGlobalLearning().bank);
  if (typeof out.enabled !== "boolean") out.enabled = true;
  if (!Number.isFinite(out.strength)) out.strength = 0.42;
  if (!out.enabled || !world?.lineageMemory) return out;
  const entries = Object.values(world.lineageMemory);
  if (entries.length === 0) return out;

  let sLight = 0, sNut = 0, sTox = 0, sRes = 0, sEn = 0, sMeta = 0, sStage = 0, sXp = 0, sMut = 0;
  let n = 0;
  for (const m of entries) {
    if (!m) continue;
    sLight += Number(m.light || 0.5);
    sNut += Number(m.nutrient || 0.5);
    sTox += Number(m.toxin || 0.5);
    sRes += Number(m.resilience || 0.5);
    sEn += Number(m.energySense || 0.5);
    sMeta += Number(m.toxinMetabolism || 0);
    sStage += Number(m.stage || 1);
    sXp += Number(m.xp || 0);
    sMut += Number(m.mutationScore || 0);
    n++;
  }
  if (n === 0) return out;
  const b = out.bank;
  const mutationDrive = clamp((sim?.mutationsLastStep || 0) / Math.max(1, sim?.aliveCount || 1), 0, 1);
  const alpha = clamp((out.strength || 0.42) * (0.05 + mutationDrive * 0.22), 0.01, 0.16);
  b.light = lerp(b.light, sLight / n, alpha);
  b.nutrient = lerp(b.nutrient, sNut / n, alpha);
  b.toxin = lerp(b.toxin, sTox / n, alpha);
  b.resilience = lerp(b.resilience, sRes / n, alpha);
  b.energySense = lerp(b.energySense, sEn / n, alpha);
  b.toxinMetabolism = lerp(b.toxinMetabolism, sMeta / n, alpha);
  b.stage = lerp(b.stage, sStage / n, alpha * 0.55);
  b.xp = lerp(b.xp, sXp / n, alpha * 0.40);
  b.mutationScore = lerp(b.mutationScore, sMut / n, alpha);
  b.samples += n;
  b.updates += 1;
  return out;
}

function applyGlobalLearningToWorld(world, learning) {
  if (!world) return;
  let gl = cloneJson(learning || defaultGlobalLearning());
  if (!gl || typeof gl !== "object") gl = defaultGlobalLearning();
  if (!gl.bank || typeof gl.bank !== "object") gl.bank = cloneJson(defaultGlobalLearning().bank);
  if (typeof gl.enabled !== "boolean") gl.enabled = true;
  if (!Number.isFinite(gl.strength)) gl.strength = 0.42;
  world.globalLearning = gl;
  if (!world.lineageMemory) world.lineageMemory = {};
  const lineages = new Set();
  for (let i = 0; i < world.alive.length; i++) {
    if (world.alive[i] !== 1) continue;
    lineages.add(Number(world.lineageId[i]) | 0);
  }
  const b = world.globalLearning.bank;
  const strength = clamp(world.globalLearning.strength || 0.42, 0, 1);
  for (const lid of lineages) {
    if (!lid) continue;
    const m = world.lineageMemory[lid] || defaultLineageMemory();
    const jitter = (rng01(lid, 71) - 0.5) * 0.08;
    m.light = clamp(lerp(m.light, b.light + jitter * 0.5, strength * 0.65), 0, 1);
    m.nutrient = clamp(lerp(m.nutrient, b.nutrient - jitter * 0.3, strength * 0.65), 0, 1);
    m.toxin = clamp(lerp(m.toxin, b.toxin + jitter * 0.2, strength * 0.65), 0, 1);
    m.resilience = clamp(lerp(m.resilience, b.resilience, strength * 0.55), 0, 1);
    m.energySense = clamp(lerp(m.energySense, b.energySense, strength * 0.55), 0, 1);
    m.toxinMetabolism = clamp(lerp(m.toxinMetabolism, b.toxinMetabolism, strength * 0.40), 0, 1);
    m.xp = Math.max(m.xp, b.xp * (0.20 + strength * 0.35));
    m.stage = Math.max(1, Math.floor(1 + Math.log2(1 + m.xp * 0.075)));
    m.mutationScore = Math.max(0, (m.mutationScore || 0) * 0.8 + b.mutationScore * 0.2);
    world.lineageMemory[lid] = m;
  }
}

// ... (Other helpers like lineageStats, shouldAutoExpand, etc. remain used internally) ...

function modIndex(x, n) {
  if (n <= 0) return 0;
  const r = x % n;
  return r < 0 ? r + n : r;
}

function expansionWorkGain(sim) {
  const births = Number(sim?.birthsLastStep || 0);
  const deaths = Number(sim?.deathsLastStep || 0);
  // netBirth ersetzt durch births (absolut) — Crowding-Tode sollen Expansion nicht blockieren
  const alive = Math.max(0, Number(sim?.aliveRatio || 0));
  const diversity = Math.max(0, Number(sim?.lineageDiversity || 0));
  const evo = Math.max(1, Number(sim?.evolutionStageMean || 1));
  const toxin = Math.max(0, Number(sim?.meanToxinField || 0));
  const sat = Math.max(0, Number(sim?.meanSaturationField || 0));
  const pressurePenalty = clamp(toxin * 1.2 + sat * 0.9, 0, 1.9);
  return Math.max(
    0,
    births * 0.38 +
    Math.max(0, alive - 0.10) * 7.5 +
    Math.max(0, diversity - 1) * 0.14 +
    Math.max(0, evo - 1) * 0.35 -
    pressurePenalty
  );
}

function expansionWorkCost(world, sim) {
  const w = Math.max(1, Number(world?.w || 1));
  const h = Math.max(1, Number(world?.h || 1));
  const count = Math.max(0, Number(sim?.expansionCount || 0));
  return 120 + (w + h) * 1.25 + count * 96;
}

function shouldAutoExpand(world, sim, tick) {
  const w = world?.w | 0;
  const h = world?.h | 0;
  if (w <= 0 || h <= 0) return false;
  const maxGrid = 128;
  if (w >= maxGrid || h >= maxGrid) return false;
  if ((sim?.expansionWork || 0) < expansionWorkCost(world, sim)) return false;
  const coolDown = 120;
  if ((sim?.lastExpandTick ?? -99999) + coolDown > tick) return false;

  const alive = world.alive;
  const hue = world.hue;
  const born = world.born || world.alive;
  const N = w * h;
  const aliveRatio = (sim?.aliveCount ?? 0) / Math.max(1, N);
  let dominantHueRatio = 0;
  if (alive && hue) {
    const bins = new Uint32Array(12);
    let live = 0;
    for (let i = 0; i < alive.length; i++) {
      if (alive[i] !== 1) continue;
      live++;
      const h0 = Number(hue[i]) || 0;
      const b = (((h0 % 360) + 360) % 360 / 30) | 0;
      bins[b]++;
    }
    if (live > 0) {
      let maxBin = 0;
      for (let b = 0; b < 12; b++) if (bins[b] > maxBin) maxBin = bins[b];
      dominantHueRatio = maxBin / live;
    }
  }
  if (dominantHueRatio < 0.90) return false;
  if (aliveRatio > 0.74) return true;

  let edgeActive = 0;
  let edgeCells = 0;
  for (let x = 0; x < w; x++) {
    const top = x;
    const bot = (h - 1) * w + x;
    edgeCells += 2;
    if (alive[top] === 1 || born[top] === 1) edgeActive++;
    if (alive[bot] === 1 || born[bot] === 1) edgeActive++;
  }
  for (let y = 1; y < h - 1; y++) {
    const left = y * w;
    const right = left + (w - 1);
    edgeCells += 2;
    if (alive[left] === 1 || born[left] === 1) edgeActive++;
    if (alive[right] === 1 || born[right] === 1) edgeActive++;
  }
  const edgePressure = edgeActive / Math.max(1, edgeCells);
  return edgePressure > 0.07 || (aliveRatio > 0.58 && edgePressure > 0.03);
}

function expandWorldPreserve(world, step = 1) {
  const oldW = world.w | 0;
  const oldH = world.h | 0;
  const newW = oldW + step;
  const newH = oldH + step;
  const offX = ((newW - oldW) / 2) | 0;
  const offY = ((newH - oldH) / 2) | 0;
  const oldN = oldW * oldH;
  const newN = newW * newH;

  const next = { ...world, w: newW, h: newH };
  const copy1 = (src, ctor) => {
    const out = new ctor(newN);
    for (let y = 0; y < oldH; y++) {
      const srcBase = y * oldW;
      const dstBase = (y + offY) * newW + offX;
      out.set(src.subarray(srcBase, srcBase + oldW), dstBase);
    }
    return out;
  };

  next.alive = copy1(world.alive, Uint8Array);
  next.E = copy1(world.E, Float32Array);
  next.L = copy1(world.L, Float32Array);
  next.R = copy1(world.R, Float32Array);
  next.W = copy1(world.W, Float32Array);
  next.Sat = copy1(world.Sat || new Float32Array(oldN), Float32Array);
  next.baseSat = copy1(world.baseSat || new Float32Array(oldN), Float32Array);
  next.P = copy1(world.P || new Float32Array(oldN), Float32Array);
  next.B = copy1(world.B || new Float32Array(oldN), Float32Array);
  next.plantKind = copy1(world.plantKind || new Int8Array(oldN), Int8Array);
  next.reserve = copy1(world.reserve || new Float32Array(oldN), Float32Array);
  next.link = copy1(world.link || new Float32Array(oldN), Float32Array);
  next.superId = copy1(world.superId || new Int32Array(oldN), Int32Array);
  next.clusterField = copy1(world.clusterField || new Float32Array(oldN), Float32Array);
  next.actionMap = copy1(world.actionMap || new Uint8Array(oldN), Uint8Array);
  next.zoneMap   = copy1(world.zoneMap   || new Int8Array(oldN),  Int8Array);
  next.hue = copy1(world.hue || new Float32Array(oldN), Float32Array);
  next.lineageId = copy1(world.lineageId || new Uint32Array(oldN), Uint32Array);
  next.age = copy1(world.age || new Uint16Array(oldN), Uint16Array);
  next.born = copy1(world.born || new Uint8Array(oldN), Uint8Array);
  next.died = copy1(world.died || new Uint8Array(oldN), Uint8Array);
  next.lineageThreatMemory = { ...(world.lineageThreatMemory || {}) };
  next.lineageDefenseReadiness = { ...(world.lineageDefenseReadiness || {}) };
  next.clusterAttackState = { ...(world.clusterAttackState || {}) };

  const traits = new Float32Array(newN * TRAIT_COUNT);
  const srcTraits = world.trait || new Float32Array(oldN * TRAIT_COUNT);
  for (let y = 0; y < oldH; y++) {
    for (let x = 0; x < oldW; x++) {
      const s = y * oldW + x;
      const d = (y + offY) * newW + (x + offX);
      traits.set(srcTraits.subarray(s * TRAIT_COUNT, s * TRAIT_COUNT + TRAIT_COUNT), d * TRAIT_COUNT);
    }
  }
  next.trait = traits;
  return next;
}

function seededStartPhysics(seed, basePhysics) {
  const seedBase = hashString(seed || "life-light");
  let s = 1;
  const f = () => rng01(seedBase, s++);
  const p = { ...basePhysics };
  p.L_mean = clamp(basePhysics.L_mean * (0.90 + f() * 0.24), 0.10, 0.52);
  p.T_survive = clamp(basePhysics.T_survive * (0.85 + f() * 0.26), 0.03, 0.15);
  p.T_birth = clamp(Math.max(p.T_survive + 0.03, basePhysics.T_birth * (0.90 + f() * 0.22)), 0.06, 0.35);
  p.U_base = clamp(basePhysics.U_base * (0.86 + f() * 0.24), 0.015, 0.16);
  p.C_birth_base = clamp(basePhysics.C_birth_base * (0.82 + f() * 0.30), 0.12, 1.45);
  p.S_seed_base = clamp(basePhysics.S_seed_base * (0.86 + f() * 0.30), 0.10, 0.90);
  p.R_gen = clamp(basePhysics.R_gen * (0.80 + f() * 0.34), 0.004, 0.05);
  p.W_decay = clamp(basePhysics.W_decay * (0.82 + f() * 0.34), 0.004, 0.05);
  p.plantCloudDensity = clamp(basePhysics.plantCloudDensity * (0.72 + f() * 0.62), 0.2, 2.8);
  p.evoRuntimeStrength = clamp(basePhysics.evoRuntimeStrength * (0.80 + f() * 0.48), 0.0, 0.14);
  p.seasonAmp = clamp(basePhysics.seasonAmp * (0.70 + f() * 0.60), 0.0, 0.35);
  p.seasonPeriod = Math.round(clamp(basePhysics.seasonPeriod * (0.80 + f() * 0.44), 240, 1400));
  return p;
}

export function makeInitialState() {
  return {
    meta: {
      seed:        "life-light",
      gridW:       32,
      gridH:       32,
      speed:       10,
      brushMode:   "paint_light",
      brushRadius: 3,
      renderMode:  "combined",
      physics:     { ...PHYSICS_DEFAULT },
      ui: {
        panelOpen: true,
        activeTab: "tools",
        expertMode: false,
        showBiochargeOverlay: false,
        showRemoteAttackOverlay: true,
        showDefenseOverlay: true,
      },
      globalLearning: defaultGlobalLearning(),
      devMutationVault: defaultDevMutationVault(),
      placementCostEnabled: false,
    },
    world: null,
    sim: {
      tick: 0, running: false,
      aliveCount: 0, aliveRatio: 0,
      meanLAlive: 0, meanEnergyAlive: 0, meanReserveAlive: 0,
      meanNutrientField: 0, meanToxinField: 0, meanSaturationField: 0, meanPlantField: 0,
      meanBiochargeField: 0,
      lineageDiversity: 0,
      evolutionStageMean: 1,
      evolutionStageMax: 1,
      networkRatio: 0, clusterRatio: 0,
      birthsLastStep: 0, deathsLastStep: 0, mutationsLastStep: 0,
      raidEventsLastStep: 0, infectionsLastStep: 0, conflictKillsLastStep: 0, superCellsLastStep: 0,
      remoteAttacksLastStep: 0, remoteAttackKillsLastStep: 0, defenseActivationsLastStep: 0, resourceStolenLastStep: 0,
      expansionCount: 0, lastExpandTick: -99999, expansionWork: 0, nextExpandCost: 120,
      stockpileTicks: 0,
      winMode: "supremacy",
      gameResult: "", gameEndTick: 0,
    },
  };
}

// V4 Wrapper for Simulation Logic
function runWorldSimV4(world, meta, sim, rng) {
  // Core contract: simulation must not mutate store-owned state.
  // Store deep-freeze does not protect TypedArray elements, so we must clone any
  // TypedArrays that sim.js may write to, and then emit them back via patches.
  const worldMutable = { ...world };

  const cloneTA = (v) => (v && ArrayBuffer.isView(v)) ? new v.constructor(v) : v;
  // Arrays mutated by sim.js (kept explicit to avoid copying read-only fields).
  const TA_MUT_KEYS = [
    "alive", "E", "L", "R", "W", "Sat", "P", "B", "plantKind",
    "reserve", "link", "clusterField", "hue", "lineageId", "trait", "age", "born", "died",
    // lazily-created buffers inside sim.js:
    "actionMap",
  ];
  for (const k of TA_MUT_KEYS) {
    if (worldMutable[k] && ArrayBuffer.isView(worldMutable[k])) {
      worldMutable[k] = cloneTA(worldMutable[k]);
    }
  }

  // sim.js also mutates these plain objects.
  worldMutable.lineageMemory = cloneJson(world?.lineageMemory || {});
  worldMutable.clusterAttackState = cloneJson(world?.clusterAttackState || {});
  worldMutable.lineageThreatMemory = cloneJson(world?.lineageThreatMemory || {});
  worldMutable.lineageDefenseReadiness = cloneJson(world?.lineageDefenseReadiness || {});
  if (world?.balanceGovernor && typeof world.balanceGovernor === "object") worldMutable.balanceGovernor = cloneJson(world.balanceGovernor);
  if (world?.worldAiAudit && typeof world.worldAiAudit === "object") worldMutable.worldAiAudit = cloneJson(world.worldAiAudit);
  const metrics = simStep(worldMutable, {
    ...meta.physics,
    playerLineageId: (meta.playerLineageId | 0) || 1,
    cpuLineageId: (meta.cpuLineageId | 0) || 2,
    seasonLength: meta.physics?.seasonLength || 300,
  }, sim.tick);
  return { world: worldMutable, metrics };
}

export function reducer(state, action, { rng }) {
  switch (action.type) {

    case "GEN_WORLD": {
      const { meta } = state;
      const tunedPhysics = seededStartPhysics(meta.seed, PHYSICS_DEFAULT);
      const world = generateWorld(
        meta.gridW, meta.gridH,
        meta.seed,
        tunedPhysics
      );
      applyGlobalLearningToWorld(world, meta.globalLearning);
      world.devMutationVault = cloneJson(meta.devMutationVault || defaultDevMutationVault());
      // P3-02: zoneMap initialisieren — alle Zonen = 0 ('none')
      world.zoneMap = new Int8Array(meta.gridW * meta.gridH);
      
      const patches = [{ op: "set", path: "/meta/physics", value: tunedPhysics }];
      // Drift hardening: only patch known world keys.
      pushKeysPatches(patches, world, WORLD_KEYS, "/world");
      pushKeysPatches(patches, makeInitialState().sim, SIM_KEYS, "/sim");
      // P1-03: Fraktions-IDs deterministisch setzen (fix: 1 = player, 2 = cpu)
      patches.push({ op: "set", path: "/meta/playerLineageId", value: 1 });
      patches.push({ op: "set", path: "/meta/cpuLineageId", value: 2 });

      // Fix: compute initial alive count so UI shows correct stats at t=0
      // (sim stats are normally computed in simStepPatch, but we seed them here
      //  so the HUD does not display "alive 0" while the canvas already shows cells).
      const N = (meta.gridW | 0) * (meta.gridH | 0);
      let initialAlive = 0;
      for (let _i = 0; _i < N; _i++) { if (world.alive[_i] === 1) initialAlive++; }
      patches.push({ op: "set", path: "/sim/aliveCount", value: initialAlive });
      patches.push({ op: "set", path: "/sim/aliveRatio",  value: N > 0 ? initialAlive / N : 0 });

      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "TOGGLE_RUNNING": {
      const running = action.payload?.running ?? !state.sim.running;
      if (!state.world && running) return [];
      const patches = [{ op: "set", path: "/sim/running", value: running }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "SIM_STEP":
      // Core standard: SIM_STEP mutations happen in simStepPatch (separate phase + gate).
      return [];

    case "APPLY_BUFFERED_SIM_STEP": {
      const src = action.payload && typeof action.payload === "object" ? action.payload : {};
      const patches = Array.isArray(src.patches) ? src.patches : [];
      // Specialized gate: reject drift / wrong typed arrays early.
      assertSimPatchesAllowed(manifest, state, "SIM_STEP", patches);
      return patches;
    }

    case "SET_SPEED":
      return [{ op: "set", path: "/meta/speed", value: Math.max(1, Math.min(60, action.payload)) }];

    case "SET_SEED":
      return [{ op: "set", path: "/meta/seed", value: action.payload }];

    case "SET_SIZE":
      return [
        { op: "set", path: "/meta/gridW", value: action.payload.w },
        { op: "set", path: "/meta/gridH", value: action.payload.h }
      ];

    case "SET_RENDER_MODE":
      return [{ op: "set", path: "/meta/renderMode", value: String(action.payload || "combined") }];

    case "SET_PHYSICS": {
      const prev = (state.meta && state.meta.physics && typeof state.meta.physics === "object") ? state.meta.physics : {};
      const src = (action.payload && typeof action.payload === "object") ? action.payload : {};
      const next = { ...prev };
      for (const k of Object.keys(src)) {
        if (!PHYSICS_KEYS.has(k)) continue;
        const v = Number(src[k]);
        if (!Number.isFinite(v)) continue;
        next[k] = v;
      }
      return [{ op: "set", path: "/meta/physics", value: next }];
    }

    case "SET_BRUSH": {
      const patches = [];
      const src = (action.payload && typeof action.payload === "object") ? action.payload : {};
      if (typeof src.brushMode === "string" && src.brushMode.length > 0) {
        patches.push({ op: "set", path: "/meta/brushMode", value: src.brushMode });
      }
      if (src.brushRadius !== undefined) {
        const r = Math.max(1, Math.min(10, Number(src.brushRadius) | 0));
        patches.push({ op: "set", path: "/meta/brushRadius", value: r });
      }
      return patches;
    }

    case "SET_UI": {
      const prev = (state.meta && state.meta.ui && typeof state.meta.ui === "object") ? state.meta.ui : {};
      const src = (action.payload && typeof action.payload === "object") ? action.payload : {};
      const clean = {};
      for (const k of Object.keys(src)) {
        if (!UI_KEYS.has(k)) continue;
        const v = src[k];
        if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") clean[k] = v;
      }
      return [{ op: "set", path: "/meta/ui", value: { ...prev, ...clean } }];
    }

    case "SET_GLOBAL_LEARNING": {
      const prev = state.meta.globalLearning || defaultGlobalLearning();
      const enabled = action.payload?.enabled ?? prev.enabled;
      const strength = clamp(Number(action.payload?.strength ?? prev.strength), 0, 1);
      const next = { ...prev, enabled, strength };
      const patches = [{ op: "set", path: "/meta/globalLearning", value: next }];
      if (state.world) patches.push({ op: "set", path: "/world/globalLearning", value: cloneJson(next) });
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "RESET_GLOBAL_LEARNING": {
      const reset = defaultGlobalLearning();
      const patches = [{ op: "set", path: "/meta/globalLearning", value: reset }];
      if (state.world) {
        patches.push({ op: "set", path: "/world/globalLearning", value: cloneJson(reset) });
        patches.push({ op: "set", path: "/world/lineageMemory", value: {} });
      }
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "PAINT_BRUSH": {
      const world = state.world;
      if (!world) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const mode = String(action.payload?.mode || "light");
      const radius = Math.max(1, Math.min(10, Number(action.payload?.radius) | 0));

      let key = null;
      let delta = 0;
      let op = "add";
      if (mode === "light") { key = "L"; delta = +0.12; }
      else if (mode === "light_remove") { key = "L"; delta = -0.12; }
      else if (mode === "nutrient") { key = "R"; delta = +0.12; }
      else if (mode === "toxin") { key = "W"; delta = +0.12; }
      else if (mode === "saturation_reset") { key = "Sat"; op = "reset"; }
      else return [];

      const base = world[key];
      if (!base || !ArrayBuffer.isView(base)) return [];
      const next = cloneTypedArray(base);

      paintCircle({
        w, h, x, y, radius,
        cb: (idx, falloff) => {
          if (op === "reset") {
            next[idx] = 0;
            return;
          }
          const v = Number(next[idx] || 0) + delta * falloff;
          next[idx] = clamp(v, 0, 1);
        }
      });

      const patches = [{ op: "set", path: `/world/${key}`, value: next }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "PLACE_CELL": {
      const world = state.world;
      if (!world) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const idx = y * w + x;
      const remove = !!action.payload?.remove;

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

      if (remove) {
        // Player actions may only delete player-owned living cells.
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
        // Placement may only fill empty tiles and always belongs to the player.
        if (alive[idx] === 1) return [];
        if (costEnabled && playerDNA < cost) return [];
        alive[idx] = 1;
        if (born) born[idx] = 1;
        if (died) died[idx] = 0;
        if (age) age[idx] = 0;
        if (E) E[idx] = 0.40;
        if (reserve) reserve[idx] = 0.10;
        if (link) link[idx] = 0;
        if (W) W[idx] = Math.max(0, Math.min(1, Number(W[idx] || 0) * 0.5));

        lineageId[idx] = playerLineageId >>> 0;

        // Prefer neighbouring player traits/hue so placement respects current evolution.
        let sourceIdx = -1;
        const neigh = [-1, +1, -w, +w, -w-1, -w+1, +w-1, +w+1];
        for (let k = 0; k < neigh.length; k++) {
          const j = idx + neigh[k];
          if (j < 0 || j >= w * h) continue;
          if (alive[j] === 1 && (Number(lineageId[j]) | 0) === playerLineageId) { sourceIdx = j; break; }
        }

        if (sourceIdx >= 0 && trait) {
          const dst = idx * TRAIT_COUNT;
          const src = sourceIdx * TRAIT_COUNT;
          for (let t = 0; t < TRAIT_COUNT; t++) trait[dst + t] = Number(trait[src + t] ?? TRAIT_DEFAULT[t]);
        } else if (trait) {
          const o = idx * TRAIT_COUNT;
          for (let t = 0; t < TRAIT_COUNT; t++) trait[o + t] = TRAIT_DEFAULT[t];
        }

        if (hue) {
          if (sourceIdx >= 0) hue[idx] = wrapHue(Number(hue[sourceIdx] || 0));
          else hue[idx] = wrapHue((playerLineageId % 360) + (rng01(playerLineageId, (idx ^ state.sim.tick) | 0) - 0.5) * 8);
        }
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
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "DEV_BALANCE_RUN_AI": {
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
        .map((name) => DEV_MUTATION_CATALOG.buffAlias[name])
        .filter(Boolean);
      const buffs = buffIds
        .map((id) => DEV_MUTATION_CATALOG.buffs.find((b) => b.id === id))
        .filter(Boolean);
      if (!buffs.length || !nextTrait) {
        const audit = { tick: state.sim.tick, mode, intensity, blocks, targets, applied: 0, reason: !nextTrait ? "trait_missing" : "no_buffs" };
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
        if (applied > 4096) break; // hard safety

        // Fast exit when all targets exhausted.
        let anyLeft = false;
        for (const v of targetMap.values()) { if (v.remaining > 0) { anyLeft = true; break; } }
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

      const prevVault = state.meta.devMutationVault || defaultDevMutationVault();
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

    case "HARVEST_CELL": {
      if (!state.world) return [];
      const world = state.world;
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;

      // Guard: mindestens 5 eigene lebende Zellen müssen vorhanden sein
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

      // Guard: nur eigene lebende Zelle erntbar
      if (alive[idx] !== 1 || (Number(lineageId[idx]) | 0) !== playerLineageId) return [];

      const age = world.age;
      const playerStage = Number(state.sim.playerStage) || 1;
      const ageVal = age ? Number(age[idx]) : 0;
      // HARVEST-Zone (zoneType 1): +50% DNA-Yield
      const harvestZoneBonus = (world.zoneMap && (world.zoneMap[idx] | 0) === 1) ? 1.5 : 1.0;
      const dnaYield = Math.max(1.0, Math.min(5.0,
        1.0 + (ageVal / 500) * 1.5 + (playerStage - 1) * 1.0
      )) * harvestZoneBonus;

      const alive_next = cloneTypedArray(alive);
      alive_next[idx] = 0;
      const E_next = cloneTypedArray(world.E);
      E_next[idx] = 0;

      const newTotalHarvested = Number(state.sim.totalHarvested || 0) + 1;

      // playerStage progression — thresholds: 5 / 15 / 30 / 60 harvests → stage 2/3/4/5
      const STAGE_THRESHOLDS = [0, 5, 15, 30, 60];
      let newStage = playerStage;
      for (let s = 2; s <= 5; s++) {
        if (newTotalHarvested >= STAGE_THRESHOLDS[s - 1] && s > newStage) newStage = s;
      }

      const patches = [
        { op: "set", path: "/sim/playerDNA",       value: Number(state.sim.playerDNA || 0) + dnaYield },
        { op: "set", path: "/sim/totalHarvested",  value: newTotalHarvested },
        { op: "set", path: "/world/alive",         value: alive_next },
        { op: "set", path: "/world/E",             value: E_next },
      ];
      if (newStage !== playerStage) {
        patches.push({ op: "set", path: "/sim/playerStage", value: newStage });
      }
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "SET_ZONE": {
      if (!state.world) return [];
      const world = state.world;
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      if (!world.zoneMap || !ArrayBuffer.isView(world.zoneMap)) return [];

      const x        = Number(action.payload?.x)        | 0;
      const y        = Number(action.payload?.y)        | 0;
      const radius   = Math.max(1, Math.min(64, Number(action.payload?.radius) | 0));
      const zoneType = Math.max(0, Math.min(5, Number(action.payload?.zoneType) | 0));

      if (x < 0 || y < 0 || x >= w || y >= h) return [];

      // zoneMap klonen — nie in-place mutieren
      const zoneMap = cloneTypedArray(world.zoneMap);
      // paintCircle-Muster analog zu PAINT_BRUSH
      paintCircle({
        w, h, x, y, radius,
        cb: (idx) => { zoneMap[idx] = zoneType; },
      });

      const patches = [{ op: "set", path: "/world/zoneMap", value: zoneMap }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "BUY_EVOLUTION": {
      if (!state.world) return [];
      const archetypeId = typeof action.payload?.archetypeId === "string"
        ? action.payload.archetypeId : "";

      // Guard: archetypeId muss in DEV_MUTATION_CATALOG.buffAlias existieren
      const buffId = DEV_MUTATION_CATALOG.buffAlias[archetypeId];
      if (!buffId) return [];
      const buff = DEV_MUTATION_CATALOG.buffs.find((b) => b.id === buffId);
      if (!buff) return [];

      const playerLineageId = state.meta.playerLineageId | 0;
      const playerStage     = Number(state.sim.playerStage) || 1;
      const playerDNA       = Number(state.sim.playerDNA)   || 0;

      // dnaCost = 5 * playerStage — keine andere Formel
      const dnaCost = 5 * playerStage;
      if (playerDNA < dnaCost) return [];

      const world       = state.world;
      const alive       = world.alive;
      const lineageId   = world.lineageId;
      if (!alive || !lineageId || !world.trait) return [];

      const nextTrait         = cloneTypedArray(world.trait);
      const nextHue           = world.hue ? cloneTypedArray(world.hue) : null;
      const nextLineageMemory = cloneJson(world.lineageMemory || {});

      const intensity = 0.02; // feste Basisintensität für Player-Käufe
      const vec = Array.isArray(buff.trait) ? buff.trait : [];
      const N = alive.length;

      // Nur Zellen mit lineageId === playerLineageId mutieren
      for (let i = 0; i < N; i++) {
        if (alive[i] !== 1) continue;
        if ((Number(lineageId[i]) | 0) !== playerLineageId) continue;

        const o = i * TRAIT_COUNT;
        for (let k = 0; k < TRAIT_COUNT; k++) {
          nextTrait[o + k] = Number(nextTrait[o + k] || TRAIT_DEFAULT[k]) + Number(vec[k] || 0) * intensity;
        }
        renormTraits(nextTrait, o);
        if (nextHue) nextHue[i] = wrapHue(Number(nextHue[i] || 0) + Number(buff.hue || 0) * intensity);
      }

      // lineageMemory für playerLineageId aktualisieren
      if (buff.mem && typeof buff.mem === "object") {
        const cur = nextLineageMemory[playerLineageId] || defaultLineageMemory();
        for (const mk of Object.keys(buff.mem)) {
          const v = Number(buff.mem[mk]);
          if (!Number.isFinite(v)) continue;
          cur[mk] = clamp(Number(cur[mk] ?? 0) + v * intensity, 0, 1);
        }
        nextLineageMemory[playerLineageId] = cur;
      }

      const patches = [
        { op: "set", path: "/sim/playerDNA",         value: playerDNA - dnaCost },
        { op: "set", path: "/world/trait",            value: nextTrait },
        { op: "set", path: "/world/lineageMemory",    value: nextLineageMemory },
      ];
      if (nextHue) patches.push({ op: "set", path: "/world/hue", value: nextHue });
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "SET_WIN_MODE": {
      const mode = typeof action.payload?.winMode === "string" ? action.payload.winMode : "supremacy";
      const allowed = ["supremacy", "stockpile", "efficiency"];
      if (!allowed.includes(mode)) return [];
      const patches = [{ op: "set", path: "/sim/winMode", value: mode }];
      assertSimPatchesAllowed(manifest, state, "SET_WIN_MODE", patches);
      return patches;
    }

    case "SET_OVERLAY": {
      const ov = String(action.payload || "none");
      const allowed = ["none", "energy", "toxin", "nutrient", "territory", "conflict"];
      if (!allowed.includes(ov)) return [];
      return [{ op: "set", path: "/meta/activeOverlay", value: ov }];
    }

    case "SET_PLACEMENT_COST": {
      const enabled = !!action.payload?.enabled;
      const patches = [{ op: "set", path: "/meta/placementCostEnabled", value: enabled }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    case "SET_UI_PREFERENCE": {
      const key = String(action.payload?.key || "");
      const value = action.payload?.value;
      if (!key) return [];
      const prev = state.meta.ui || {};
      const next = { ...prev, [key]: value };
      const patches = [{ op: "set", path: "/meta/ui", value: next }];
      assertSimPatchesAllowed(manifest, state, action.type, patches);
      return patches;
    }

    default:
      return [];
  }
}

export function simStepPatch(state, actionOrCtx, ctx) {
  // Supports both call signatures:
  //   simStepPatch(state, action, ctx)   — used by store.js (LLM_ENTRY standard)
  //   simStepPatch(state, ctx)            — legacy direct call
  const action =
    actionOrCtx && typeof actionOrCtx === "object" && typeof actionOrCtx.type === "string"
      ? actionOrCtx
      : { type: "SIM_STEP", payload: {} };
  const resolvedCtx = ctx || (action === actionOrCtx ? {} : (actionOrCtx || {}));
  const rngStreams = resolvedCtx?.rng;

  if (!state.world) return [];
  const force = !!action.payload?.force;
  if (!state.sim.running && !force) return [];

  const currentTick = state.sim.tick;
  const { world: worldMutable, metrics } = runWorldSimV4(state.world, state.meta, state.sim, rngStreams);

  const nextLearning = mergeWorldLearningIntoBank(worldMutable, state.meta.globalLearning, metrics);
  worldMutable.globalLearning = cloneJson(nextLearning);

  let simOut = {
    ...metrics,
    tick: currentTick + 1,
    running: state.sim.running,
    expansionCount: state.sim.expansionCount || 0,
    lastExpandTick: state.sim.lastExpandTick || -99999,
    expansionWork: state.sim.expansionWork || 0,
    nextExpandCost: state.sim.nextExpandCost || 120,
  };
  simOut.expansionWork = Math.max(0, simOut.expansionWork + expansionWorkGain(simOut));
  simOut.nextExpandCost = expansionWorkCost(worldMutable, simOut);

  const patches = [];

  if (shouldAutoExpand(worldMutable, simOut, currentTick)) {
    const expandedWorld = expandWorldPreserve(worldMutable, 1);
    expandedWorld.globalLearning = cloneJson(nextLearning);
    simOut.expansionWork = Math.max(0, simOut.expansionWork - expansionWorkCost(expandedWorld, simOut));
    simOut.expansionCount = (simOut.expansionCount || 0) + 1;
    simOut.lastExpandTick = currentTick;
    simOut.nextExpandCost = expansionWorkCost(expandedWorld, simOut);
    simOut.aliveRatio = simOut.aliveCount / Math.max(1, expandedWorld.w * expandedWorld.h);

    patches.push({ op: "set", path: "/meta/gridW", value: expandedWorld.w });
    patches.push({ op: "set", path: "/meta/gridH", value: expandedWorld.h });
    // Drift hardening: only patch known world keys.
    pushKeysPatches(patches, expandedWorld, WORLD_KEYS, "/world");
  } else {
    // Drift hardening: only patch known world keys.
    pushKeysPatches(patches, worldMutable, WORLD_KEYS, "/world");
  }

  patches.push({ op: "set", path: "/meta/globalLearning", value: nextLearning });

  // ── P5: Endgame — win / loss checks ──────────────────────────────────────
  // Only run if game is not already decided.
  if (!state.sim.gameResult) {
    const pEIn    = Number(simOut.playerEnergyIn    || 0);
    const pEStore = Number(simOut.playerEnergyStored|| 0);
    const pAlive  = Number(simOut.playerAliveCount  || 0);
    const pENet   = Number(simOut.playerEnergyNet   || 0);

    // cpuEnergyIn: sum of energyIn for cpuLineageId cells — approximated from
    // total energyIn minus player share (best available without second step pass).
    const cpuLineageId  = Number(state.meta.cpuLineageId || 2);
    const playerLineageId = Number(state.meta.playerLineageId || 1);
    // Compute cpu energyIn from step output if available, else carry previous.
    const cpuEIn = (typeof simOut.cpuEnergyIn === "number" && Number.isFinite(simOut.cpuEnergyIn))
      ? simOut.cpuEnergyIn
      : Number(state.sim.cpuEnergyIn || 0);
    simOut.cpuEnergyIn = cpuEIn;

    const winMode = String(state.sim.winMode || "supremacy");

    // --- Win mode 1: Energy Supremacy — pEIn > cpuEIn × 1.5 for 200 ticks
    let supTicks = Number(state.sim.energySupremacyTicks || 0);
    if (pEIn > cpuEIn * 1.5) { supTicks++; } else { supTicks = Math.max(0, supTicks - 1); }
    simOut.energySupremacyTicks = supTicks;

    // --- Win mode 2: Territory Supremacy — pAlive > cpuAlive * 1.5 for 200 ticks
    const cpuAlive = Number(simOut.cpuAliveCount || 0);
    let stockTicks = Number(state.sim.stockpileTicks || 0);
    if (pAlive > cpuAlive * 1.5 && pAlive > 30) { stockTicks++; } else { stockTicks = Math.max(0, stockTicks - 1); }
    simOut.stockpileTicks = stockTicks;

    // --- Win mode 3: Efficiency Master — pEIn / pAlive > 0.18 for 100 ticks
    let effTicks = Number(state.sim.efficiencyTicks || 0);
    const effRatio = pAlive > 0 ? pEIn / pAlive : 0;
    if (effRatio > 0.18 && pAlive > 20) { effTicks++; } else { effTicks = Math.max(0, effTicks - 1); }
    simOut.efficiencyTicks = effTicks;

    // --- Loss: playerAliveCount = 0 (and game has been running > 10 ticks)
    let lossStreak = Number(state.sim.lossStreakTicks || 0);
    if (pENet < -5 && pAlive > 0) { lossStreak++; } else { lossStreak = Math.max(0, lossStreak - 1); }
    simOut.lossStreakTicks = lossStreak;

    let gameResult = "";
    let resolvedWinMode = "";

    if (pAlive === 0 && currentTick > 20) {
      gameResult = "loss";
      resolvedWinMode = "extinction";
    } else if (lossStreak >= 150) {
      gameResult = "loss";
      resolvedWinMode = "energy_collapse";
    } else if (winMode === "supremacy" && supTicks >= 200) {
      gameResult = "win";
      resolvedWinMode = "supremacy";
    } else if (winMode === "stockpile" && stockTicks >= 200) {
      gameResult = "win";
      resolvedWinMode = "territory";
    } else if (winMode === "efficiency" && effTicks >= 100) {
      gameResult = "win";
      resolvedWinMode = "efficiency";
    }

    if (gameResult) {
      simOut.gameResult  = gameResult;
      simOut.winMode     = resolvedWinMode;
      simOut.gameEndTick = currentTick;
      // Freeze simulation on game end
      simOut.running = false;
    }
  } else {
    // Game already decided — propagate counters unchanged
    simOut.gameResult          = state.sim.gameResult;
    simOut.winMode             = state.sim.winMode;
    simOut.gameEndTick         = state.sim.gameEndTick;
    simOut.energySupremacyTicks= state.sim.energySupremacyTicks;
    simOut.efficiencyTicks     = state.sim.efficiencyTicks;
    simOut.lossStreakTicks     = state.sim.lossStreakTicks;
    simOut.stockpileTicks      = state.sim.stockpileTicks;
    simOut.cpuEnergyIn        = state.sim.cpuEnergyIn;
  }
  // ── /P5 ──────────────────────────────────────────────────────────────────

  // ── P1: Goal Logic — UI strategy coaching ─────────────────────────────────
  const pDNA       = Number(simOut.playerDNA       || 0);
  const pStage     = Number(simOut.playerStage     || 1);
  const pAlive     = Number(simOut.playerAliveCount  || 0);
  const pENet      = Number(simOut.playerEnergyNet   || 0);
  const meanTox    = Number(simOut.meanToxinField    || 0);
  const dnaCost    = pStage * 5;

  let goal = "🎯 Ernte sichern";
  if (pAlive === 0 && currentTick > 5) goal = "☠ Ausgelöscht";
  else if (pENet < -3 && pAlive > 0) goal = "🎯 Überleben: Energie!";
  else if (meanTox > 0.30)           goal = "🎯 Überleben: Toxin!";
  else if (pDNA >= dnaCost)          goal = "🎯 Evolution bereit";
  else if (pAlive < 12)              goal = "🎯 Wachstum";
  else if (pENet > 8)                goal = "🎯 Expansion";
  simOut.goal = goal;
  // ── /P1 ──────────────────────────────────────────────────────────────────

  // Drift hardening: only patch known sim keys.
  pushKeysPatches(patches, simOut, SIM_KEYS, "/sim");
  assertSimPatchesAllowed(manifest, state, "SIM_STEP", patches);
  return patches;
}
