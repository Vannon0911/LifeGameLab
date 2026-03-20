export function hasAdjacentMarkedTile(mask, idx, w, h) {
  if (!mask || !ArrayBuffer.isView(mask)) return false;
  const x = idx % w;
  const y = (idx / w) | 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if ((Number(mask[j]) | 0) === 1) return true;
    }
  }
  return false;
}

export function hasAdjacentMarkedTile4(mask, idx, w, h) {
  if (!mask || !ArrayBuffer.isView(mask)) return false;
  const x = idx % w;
  const y = (idx / w) | 0;
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [xx, yy] of neighbors) {
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    const j = yy * w + xx;
    if ((Number(mask[j]) | 0) === 1) return true;
  }
  return false;
}

export function areIndicesConnected4(indices, w, h) {
  if (indices.length === 0) return false;
  const set = new Set(indices);
  const seen = new Set([indices[0]]);
  const queue = [indices[0]];
  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % w;
    const y = (idx / w) | 0;
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [xx, yy] of neighbors) {
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (!set.has(j) || seen.has(j)) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return seen.size === indices.length;
}

export function areIndicesConnected8(indices, w, h) {
  if (indices.length === 0) return false;
  const set = new Set(indices);
  const seen = new Set();
  const queue = [indices[0]];
  seen.add(indices[0]);
  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % w;
    const y = (idx / w) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!set.has(j) || seen.has(j)) continue;
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen.size === indices.length;
}

export function isMarked(mask, idx) {
  return !!mask && ArrayBuffer.isView(mask) && ((Number(mask[idx]) | 0) === 1);
}

export function hasAdjacentRoleTile4(zoneRole, idx, w, h, roleIds) {
  if (!zoneRole || !ArrayBuffer.isView(zoneRole)) return false;
  const wanted = new Set(Array.isArray(roleIds) ? roleIds : [roleIds]);
  const x = idx % w;
  const y = (idx / w) | 0;
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [xx, yy] of neighbors) {
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    const j = yy * w + xx;
    if (wanted.has(Number(zoneRole[j]) | 0)) return true;
  }
  return false;
}

export function isRoleMarked(zoneRole, idx, roleId) {
  return !!zoneRole && ArrayBuffer.isView(zoneRole) && ((Number(zoneRole[idx]) | 0) === (roleId | 0));
}

export function collectMaskIndices(mask) {
  if (!mask || !ArrayBuffer.isView(mask)) return [];
  const indices = [];
  for (let i = 0; i < mask.length; i++) {
    if ((Number(mask[i]) | 0) === 1) indices.push(i);
  }
  return indices;
}
