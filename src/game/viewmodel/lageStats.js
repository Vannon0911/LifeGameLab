export function countMaskTiles(mask) {
  if (!mask || typeof mask.length !== "number") return 0;
  let total = 0;
  for (let i = 0; i < mask.length; i += 1) {
    total += (Number(mask[i] || 0) | 0) === 1 ? 1 : 0;
  }
  return total;
}

export function summarizeFog(world) {
  const total = Number(world?.w || 0) * Number(world?.h || 0);
  if (!total) return { visible: 0, explored: 0, hidden: 0 };
  const visible = countMaskTiles(world?.visibility);
  const exploredAll = countMaskTiles(world?.explored);
  const explored = Math.max(0, exploredAll - visible);
  const hidden = Math.max(0, total - visible - explored);
  return { visible, explored, hidden };
}

export function countZoneRoleTiles(zoneRole, roleId) {
  if (!zoneRole || typeof zoneRole.length !== "number") return 0;
  let total = 0;
  for (let i = 0; i < zoneRole.length; i += 1) {
    total += (Number(zoneRole[i] || 0) | 0) === (roleId | 0) ? 1 : 0;
  }
  return total;
}

export function getZoneMetaCount(zoneMeta) {
  if (!zoneMeta || typeof zoneMeta !== "object") return 0;
  return Object.keys(zoneMeta).length;
}

export function getPatternClassCount(patternCatalog) {
  if (!patternCatalog || typeof patternCatalog !== "object") return 0;
  return Object.keys(patternCatalog).filter((key) => {
    const entry = patternCatalog[key];
    if (Array.isArray(entry)) return entry.length > 0;
    if (entry && typeof entry === "object") return Object.keys(entry).length > 0;
    return Number(entry || 0) > 0;
  }).length;
}

export function formatPatternBonusSummary(patternBonuses, fmtSign) {
  if (!patternBonuses || typeof patternBonuses !== "object") return "keine";
  const parts = Object.entries(patternBonuses)
    .filter(([, value]) => Number(value || 0) !== 0)
    .map(([key, value]) => `${key} ${fmtSign(Number(value || 0), 2)}`);
  return parts.length ? parts.join(" · ") : "keine";
}
