import { clamp } from "./shared.js";

export function applyDynamicDamping(world) {
  const { alive, W, Sat, B } = world;
  const N = alive.length;
  let live = 0;
  const bins = new Uint32Array(12);
  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1) continue;
    live++;
    bins[(((Number(world.hue?.[i]) || 0) % 360 + 360) % 360 / 30) | 0]++;
  }
  let dom = 0;
  for (let b = 0; b < 12; b++) if (bins[b] > dom) dom = bins[b];
  const risk = clamp(
    Math.max(0, (dom / Math.max(1, live)) - 0.72) * 1.4 +
    Math.max(0, (live / Math.max(1, N)) - 0.82) * 0.9,
    0,
    1
  );
  if (risk <= 0.02) return;
  for (let i = 0; i < N; i++) {
    B[i] *= (1 - risk * 0.22);
    W[i] *= (1 - risk * 0.08);
    Sat[i] = clamp(Sat[i] - risk * 0.012, 0, 1);
  }
}

