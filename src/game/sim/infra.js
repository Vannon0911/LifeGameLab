export const COMMITTED_INFRA_THRESHOLD = 0.999;

export function isCommittedInfraValue(value) {
  return Number(value || 0) >= COMMITTED_INFRA_THRESHOLD;
}

export function hasAdjacentCommittedInfra4(link, idx, w, h) {
  if (!link || !ArrayBuffer.isView(link)) return false;
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
    if (isCommittedInfraValue(link[yy * w + xx])) return true;
  }
  return false;
}
