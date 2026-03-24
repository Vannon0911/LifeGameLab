export function findNextStepBfs4(world, fromIdx, targetIdx, w, h) {
  if (fromIdx === targetIdx) return fromIdx;
  const total = w * h;
  if (fromIdx < 0 || targetIdx < 0 || fromIdx >= total || targetIdx >= total) return -1;
  const alive = world?.alive;
  if (!alive || !ArrayBuffer.isView(alive)) return -1;

  const prev = new Int32Array(total);
  prev.fill(-1);
  const seen = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qh = 0;
  let qt = 0;
  queue[qt++] = fromIdx;
  seen[fromIdx] = 1;

  while (qh < qt) {
    const idx = queue[qh++];
    if (idx === targetIdx) break;
    const x = idx % w;
    const y = (idx / w) | 0;
    const candidates = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of candidates) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (seen[nIdx]) continue;
      if (nIdx !== targetIdx && (Number(alive[nIdx] || 0) | 0) === 1) continue;
      seen[nIdx] = 1;
      prev[nIdx] = idx;
      queue[qt++] = nIdx;
    }
  }

  if (!seen[targetIdx]) return -1;
  let step = targetIdx;
  while (prev[step] !== -1 && prev[step] !== fromIdx) {
    step = prev[step];
  }
  return prev[step] === fromIdx ? step : targetIdx;
}

export function moveEntityTile(world, fromIdx, toIdx) {
  if (fromIdx === toIdx) return;
  const scalarKeys = ["E", "reserve", "link", "lineageId", "hue", "age", "born", "died", "W", "clusterField", "superId"];
  for (const key of scalarKeys) {
    const arr = world?.[key];
    if (!arr || !ArrayBuffer.isView(arr)) continue;
    arr[toIdx] = arr[fromIdx];
    arr[fromIdx] = 0;
  }
  if (world?.alive && ArrayBuffer.isView(world.alive)) {
    world.alive[toIdx] = 1;
    world.alive[fromIdx] = 0;
  }
  const trait = world?.trait;
  if (trait && ArrayBuffer.isView(trait)) {
    const fromOff = fromIdx * 7;
    const toOff = toIdx * 7;
    for (let i = 0; i < 7; i++) {
      trait[toOff + i] = trait[fromOff + i];
      trait[fromOff + i] = 0;
    }
  }
}
