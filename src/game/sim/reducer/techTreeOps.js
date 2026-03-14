import { rng01 } from "../../../core/kernel/rng.js";
import { clamp, defaultLineageMemory } from "../shared.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function cloneJson(x) {
  return JSON.parse(JSON.stringify(x));
}

function buildDevMutationCatalogs() {
  const seeds = [
    ["light_harvest", [ +0.12, +0.00, -0.03, -0.02, +0.00, +0.00, +0.00 ], +5, { light: +0.03 }],
    ["nutrient_harvest", [ +0.02, -0.02, +0.00, +0.00, -0.05, +0.00, +0.00 ], +12, { nutrient: +0.03 }],
    ["toxin_resist", [ +0.00, +0.02, +0.00, +0.00, +0.03, +0.00, +0.10 ], -8, { toxin: +0.04, toxinMetabolism: +0.02 }],
    ["reserve_buffer", [ +0.00, -0.03, +0.00, +0.00, +0.02, +0.04, +0.02 ], +2, { resilience: +0.04 }],
    ["cooperative_network", [ +0.00, +0.01, +0.00, +0.00, +0.00, +0.10, +0.00 ], +14, { resilience: +0.02 }],
    ["reproductive_spread", [ +0.00, +0.01, +0.00, -0.03, -0.08, +0.00, -0.01 ], +18, { nutrient: +0.01 }],
    ["defensive_shell", [ -0.02, +0.01, +0.04, +0.02, +0.04, +0.02, +0.06 ], -12, { resilience: +0.03 }],
    ["predator_raid", [ +0.05, +0.03, +0.00, +0.00, +0.02, -0.07, -0.03 ], +24, { energySense: +0.02 }],
    ["nomadic_adapt", [ +0.04, +0.00, -0.01, -0.01, +0.00, -0.01, +0.01 ], +20, { light: +0.01, nutrient: +0.01 }],
    ["hybrid_mixer", [ +0.03, +0.00, +0.01, +0.00, +0.01, +0.04, +0.03 ], +16, { resilience: +0.02 }],
    ["fortress_homeostasis", [ -0.01, -0.02, +0.03, +0.03, +0.03, +0.05, +0.05 ], -6, { resilience: +0.04 }],
    ["scavenger_loop", [ +0.01, +0.01, +0.00, +0.00, +0.01, +0.00, +0.08 ], -3, { toxin: +0.02, toxinMetabolism: +0.03 }],
    ["pioneer_explorer", [ +0.05, +0.00, -0.02, -0.02, -0.03, -0.02, +0.01 ], +26, { light: +0.02 }],
    ["symbiotic_bloom", [ +0.02, -0.01, +0.00, -0.02, -0.02, +0.09, +0.02 ], +10, { resilience: +0.02, nutrient: +0.02 }],
    ["mutation_diversify", [ +0.00, +0.00, +0.00, +0.00, +0.00, +0.00, +0.00 ], +30, { xp: +0.10 }],
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
      clamp(0.5 + Math.sin(angle) * 0.5, 0, 1),
      clamp(0.5 + Math.cos(angle * 0.83) * 0.5, 0, 1),
      clamp(0.5 + Math.sin(angle * 1.21 + 1.2) * 0.5, 0, 1),
      clamp(0.5 + Math.cos(angle * 1.37 + 0.4) * 0.5, 0, 1),
      clamp(0.5 + Math.sin(angle * 0.62 + 2.1) * 0.5, 0, 1),
      clamp(0.5 + Math.cos(angle * 0.58 + 1.4) * 0.5, 0, 1),
    ];
    const traitBias = [
      lerp(-0.05, 0.10, env[0]),
      lerp(0.04, -0.04, env[1]),
      lerp(0.04, -0.03, env[0]),
      lerp(0.03, -0.02, env[0]),
      lerp(0.05, -0.06, env[1]),
      lerp(-0.04, 0.09, env[5]),
      lerp(-0.02, 0.11, env[2]),
    ].map((v) => v * (0.65 + t * 0.8));
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

export const DEV_MUTATION_CATALOG = buildDevMutationCatalogs();

export function defaultGlobalLearning() {
  return {
    enabled: false,
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

export function defaultDevMutationVault() {
  return {
    version: 1,
    totalInvented: 0,
    entries: [],
  };
}

export function mergeWorldLearningIntoBank(world, learning, sim) {
  const out = cloneJson(learning || defaultGlobalLearning());
  if (!out || typeof out !== "object") return defaultGlobalLearning();
  if (!out.bank || typeof out.bank !== "object") out.bank = cloneJson(defaultGlobalLearning().bank);
  if (typeof out.enabled !== "boolean") out.enabled = defaultGlobalLearning().enabled;
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

export function applyGlobalLearningToWorld(world, learning) {
  if (!world) return;
  let gl = cloneJson(learning || defaultGlobalLearning());
  if (!gl || typeof gl !== "object") gl = defaultGlobalLearning();
  if (!gl.bank || typeof gl.bank !== "object") gl.bank = cloneJson(defaultGlobalLearning().bank);
  if (typeof gl.enabled !== "boolean") gl.enabled = defaultGlobalLearning().enabled;
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
