// ============================================================
// World Generation — procedural world algorithm (no presets)
// ============================================================

import { TRAIT_DEFAULT, TRAIT_COUNT } from "./life.data.js";
import { rng01, hashString } from "../../core/kernel/rng.js";

function gauss(cx, cy, x, y, sigma, amp) {
  const dx = x - cx, dy = y - cy;
  return amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}

function makeWorldDescriptor(seedBase) {
  let s = 1;
  const f = () => rng01(seedBase, s++);

  const hotspotCount = 2 + Math.floor(f() * 4); // 2..5
  const hotspots = [];
  for (let i = 0; i < hotspotCount; i++) {
    hotspots.push({
      cx: 0.10 + f() * 0.80,
      cy: 0.10 + f() * 0.80,
      sigma: 0.06 + f() * 0.16,
      amp: 1.2 + f() * 2.2,
    });
  }

  const bandCount = Math.floor(f() * 3); // 0..2
  const bands = [];
  for (let i = 0; i < bandCount; i++) {
    bands.push({
      axis: f() > 0.5 ? "x" : "y",
      pos: 0.08 + f() * 0.84,
      width: 0.07 + f() * 0.22,
      amp: 0.6 + f() * 1.8,
    });
  }

  const clusterCount = 2 + Math.floor(f() * 4); // 2..5
  const clusters = [];
  for (let i = 0; i < clusterCount; i++) {
    clusters.push({
      cx: 0.10 + f() * 0.80,
      cy: 0.10 + f() * 0.80,
      r: 2 + Math.floor(f() * 3),
      hue: Math.floor(f() * 360),
    });
  }

  return { hotspots, bands, clusters };
}

function buildLightField(w, h, descriptor) {
  const L = new Float32Array(w * h);
  const base = 0.10;

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let v = base;
      const nx = i / Math.max(1, w - 1);
      const ny = j / Math.max(1, h - 1);

      for (const hs of descriptor.hotspots) {
        v += gauss(hs.cx, hs.cy, nx, ny, hs.sigma, hs.amp * 0.45);
      }

      for (const b of descriptor.bands) {
        const pos = b.axis === "x" ? nx : ny;
        const d = Math.abs(pos - b.pos) / (b.width * 0.5);
        if (d < 1) v += b.amp * 0.45 * (1 - d * d);
      }

      L[j * w + i] = Math.min(1, Math.max(0, v));
    }
  }

  return L;
}

function clustersFromLight(L, w, h, count) {
  const ranked = new Array(L.length);
  for (let i = 0; i < L.length; i++) ranked[i] = i;
  ranked.sort((a, b) => L[b] - L[a]);

  const out = [];
  const minDist = Math.max(4, Math.round(Math.min(w, h) * 0.10));
  const minDist2 = minDist * minDist;
  for (let r = 0; r < ranked.length && out.length < count; r++) {
    const idx = ranked[r];
    const x = idx % w;
    const y = (idx / w) | 0;
    let ok = true;
    for (let k = 0; k < out.length; k++) {
      const px = Math.round(out[k].cx * (w - 1));
      const py = Math.round(out[k].cy * (h - 1));
      const dx = x - px;
      const dy = y - py;
      if (dx * dx + dy * dy < minDist2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    out.push({
      cx: x / Math.max(1, w - 1),
      cy: y / Math.max(1, h - 1),
      r: 2,
      hue: (out.length * 137.5) % 360,
    });
  }
  return out;
}

function buildSpawnClusters(descriptor, L, w, h) {
  const bright = clustersFromLight(L, w, h, 2);
  const leftBright = clustersFromLight(
    L.map((v, idx) => ((idx % w) < (w * 0.45) ? v : -1)),
    w, h, 1
  )[0];
  const rightBright = clustersFromLight(
    L.map((v, idx) => ((idx % w) > (w * 0.55) ? v : -1)),
    w, h, 1
  )[0];
  const spawn = [];
  // Opposing founder lineages are always seeded on opposite sides.
  if (leftBright && rightBright) {
    spawn.push({ cx: leftBright.cx, cy: leftBright.cy, r: 3, hue: 0 });
    spawn.push({ cx: rightBright.cx, cy: rightBright.cy, r: 3, hue: 0 });
  }
  // Exactly two founders at start.
  if (spawn.length < 2 && bright.length >= 2) {
    spawn.push({ cx: bright[0].cx, cy: bright[0].cy, r: 3, hue: 0 });
    spawn.push({ cx: bright[1].cx, cy: bright[1].cy, r: 3, hue: 0 });
  }
  if (spawn.length === 1) {
    spawn.push({ cx: 0.75, cy: 0.75, r: 3, hue: 0 });
  }
  return spawn;
}

function placeClusters(state, clusters, seedBase) {
  const { w, h } = state;
  let stream = 5000;

  for (let ci = 0; ci < clusters.length; ci++) {
    const cl = clusters[ci];
    // Deterministic founder IDs: first cluster = 1 (player), second = 2 (cpu).
    // Higher clusters get hash-based IDs starting above 2.
    const founderLineage = ci < 2 ? (ci + 1) : ((hashString(`founder:${cl.cx}:${cl.cy}:${cl.r}`) >>> 0) || (ci + 3));
    const cx = Math.round(cl.cx * (w - 1));
    const cy = Math.round(cl.cy * (h - 1));
    const r = cl.r || 3;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        if (rng01(seedBase, stream++) > 0.78) continue;

        const idx = y * w + x;
        state.alive[idx] = 1;
        state.E[idx] = 0.32 + rng01(seedBase, stream++) * 0.28; // survival-focused start energy
        state.age[idx] = Math.floor(rng01(seedBase, stream++) * 120);
        state.reserve[idx] = 0.05 + rng01(seedBase, stream++) * 0.12;
        state.hue[idx] = 0;
        state.lineageId[idx] = founderLineage;

        const o = idx * TRAIT_COUNT;
        for (let t = 0; t < TRAIT_COUNT; t++) {
          state.trait[o + t] = TRAIT_DEFAULT[t];
        }
      }
    }
  }
}

function placePlants(state, phy, seedBase) {
  const { w, h, plantKind } = state;
  const density = phy.plantCloudDensity || 0.82;
  const count = Math.round(w * h * 0.05 * density);
  let stream = 9000;

  for (let k = 0; k < count; k++) {
    const x = Math.floor(rng01(seedBase, stream++) * w);
    const y = Math.floor(rng01(seedBase, stream++) * h);
    const r = 1 + Math.floor(rng01(seedBase, stream++) * 3);
    const peak = 0.38 + rng01(seedBase, stream++) * 0.52;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > r * r) continue;
        const px = x + dx, py = y + dy;
        if (px < 0 || px >= w || py < 0 || py >= h) continue;
        const t = 1 - Math.sqrt(d2) / Math.max(1, r);
        const idx = py * w + px;
        state.P[idx] = Math.min(1, state.P[idx] + peak * t * t);
        state.R[idx] = Math.min(1, state.R[idx] + peak * t * 0.45);
        state.Sat[idx] = Math.min(1, state.Sat[idx] + peak * t * 0.10);
        if (plantKind[idx] === 0) {
          plantKind[idx] = rng01(seedBase, stream++) > 0.5 ? 1 : -1; // +1 toxic, -1 detox
        }
      }
    }
  }
}

export function generateWorld(w, h, seedStr, phy) {
  const seedBase = hashString(seedStr || "life-seed");
  const descriptor = makeWorldDescriptor(seedBase);
  const N = w * h;

  const state = {
    w, h,
    // Deterministic monotonic lineage allocator (initialized after seeding founders).
    nextLineageId: 1,
    alive: new Uint8Array(N),
    E: new Float32Array(N),
    L: buildLightField(w, h, descriptor),
    R: new Float32Array(N),
    W: new Float32Array(N),
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
    lineageThreatMemory: {},
    lineageDefenseReadiness: {},
    clusterAttackState: {},
  };

  // ── Terrain-Basemap: baseSat räumlich variabel (MasterPlan §04) ──────────
  // Fluss:      baseSat 0.65–0.90  — viel Wasser, Pflanzenpresse
  // Wüste:      baseSat 0.02–0.06  — viel Licht, Durst-Upkeep
  // Feuchtwiese:baseSat 0.35–0.50  — Gleichgewicht, begehrt
  // Standard:   baseSat 0.14–0.24
  let stream = 3000;
  const terrainSeed = seedBase ^ 0xdeadbeef;
  // 1–2 Fluss-Linien (diagonal oder horizontal)
  const riverCount = 1 + (rng01(terrainSeed, 1) > 0.5 ? 1 : 0);
  const rivers = [];
  for (let r = 0; r < riverCount; r++) {
    rivers.push({
      cx: 0.15 + rng01(terrainSeed, 10 + r * 3) * 0.70,
      cy: 0.15 + rng01(terrainSeed, 11 + r * 3) * 0.70,
      dx: -0.5 + rng01(terrainSeed, 12 + r * 3),   // Richtungsvektor
      dy: -0.5 + rng01(terrainSeed, 13 + r * 3),
      width: 0.04 + rng01(terrainSeed, 14 + r * 3) * 0.06,
    });
  }
  // 0–2 Wüsten-Cluster
  const desertCount = Math.floor(rng01(terrainSeed, 20) * 3);
  const deserts = [];
  for (let d = 0; d < desertCount; d++) {
    deserts.push({
      cx: 0.10 + rng01(terrainSeed, 30 + d * 2) * 0.80,
      cy: 0.10 + rng01(terrainSeed, 31 + d * 2) * 0.80,
      r:  0.12 + rng01(terrainSeed, 32 + d * 2) * 0.14,
    });
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const nx = i / Math.max(1, w - 1);
      const ny = j / Math.max(1, h - 1);
      const idx = j * w + i;
      let base = 0.14 + rng01(seedBase, stream++) * 0.10; // Standard 0.14..0.24

      // Fluss-Einfluss: Abstand zu Fluss-Linie (Punkt-auf-Linie)
      for (const rv of rivers) {
        const ex = nx - rv.cx, ey = ny - rv.cy;
        const len = Math.sqrt(rv.dx * rv.dx + rv.dy * rv.dy) || 1;
        const t = Math.max(0, Math.min(1, (ex * rv.dx + ey * rv.dy) / (len * len)));
        const px = rv.cx + t * rv.dx - nx;
        const py = rv.cy + t * rv.dy - ny;
        const dist = Math.sqrt(px * px + py * py);
        if (dist < rv.width * 2.5) {
          const strength = Math.max(0, 1 - dist / (rv.width * 2.5));
          const riverVal = 0.65 + rng01(seedBase, stream++) * 0.25; // 0.65..0.90
          base = base + (riverVal - base) * strength * strength;
        }
      }

      // Wüsten-Einfluss
      for (const ds of deserts) {
        const dx2 = nx - ds.cx, dy2 = ny - ds.cy;
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist < ds.r) {
          const strength = Math.max(0, 1 - dist / ds.r);
          const desertVal = 0.02 + rng01(seedBase, stream++) * 0.04; // 0.02..0.06
          base = base + (desertVal - base) * strength * strength;
        }
      }

      // Feuchtwiese: mittleres baseSat-Band zwischen Fluss und Standard → entsteht automatisch
      // durch Interpolation; explizit erhöhen wenn zwischen 0.25 und 0.45
      if (base > 0.25 && base < 0.45) base += rng01(seedBase, stream++) * 0.05;

      state.baseSat[idx] = Math.max(0.02, Math.min(0.92, base));
      state.Sat[idx] = state.baseSat[idx];
    }
  }

  const spawnClusters = buildSpawnClusters(descriptor, state.L, w, h);
  placePlants(state, phy, seedBase);
  placeClusters(state, spawnClusters, seedBase);
  state.superId.fill(-1);

  // Initialize nextLineageId above the max existing lineageId to avoid collisions.
  let maxLid = 0;
  for (let i = 0; i < state.lineageId.length; i++) {
    const lid = Number(state.lineageId[i]) >>> 0;
    if (lid > maxLid) maxLid = lid;
  }
  state.nextLineageId = (maxLid + 1) >>> 0;

  return state;
}
