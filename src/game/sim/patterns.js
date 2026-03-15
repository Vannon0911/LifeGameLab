import { ZONE_ROLE } from "../contracts/ids.js";

const EMPTY_BONUSES = Object.freeze({
  energy: 0,
  dna: 0,
  stability: 0,
  vision: 0,
  defense: 0,
  transport: 0,
});

function createEmptyCatalog() {
  return {
    line: [],
    block: [],
    loop: [],
    branch: [],
    dense_cluster: [],
  };
}

function forEachNeighbor4(idx, w, h, cb) {
  const x = idx % w;
  const y = (idx / w) | 0;
  if (x > 0) cb(idx - 1);
  if (x + 1 < w) cb(idx + 1);
  if (y > 0) cb(idx - w);
  if (y + 1 < h) cb(idx + w);
}

function collectComponents(indices, w, h) {
  const pending = new Set(indices);
  const components = [];
  while (pending.size > 0) {
    const start = pending.values().next().value;
    pending.delete(start);
    const queue = [start];
    const nodes = [];
    while (queue.length > 0) {
      const idx = queue.shift();
      nodes.push(idx);
      forEachNeighbor4(idx, w, h, (next) => {
        if (!pending.has(next)) return;
        pending.delete(next);
        queue.push(next);
      });
    }
    nodes.sort((a, b) => a - b);
    components.push(nodes);
  }
  return components;
}

function getBounds(nodes, w) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const idx of nodes) {
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function buildComponentFacts(nodes, w, h) {
  const nodeSet = new Set(nodes);
  const degrees = new Map();
  let edges = 0;
  for (const idx of nodes) {
    let degree = 0;
    forEachNeighbor4(idx, w, h, (next) => {
      if (!nodeSet.has(next)) return;
      degree += 1;
      if (next > idx) edges += 1;
    });
    degrees.set(idx, degree);
  }

  const bounds = getBounds(nodes, w);
  const width = (bounds.maxX - bounds.minX) + 1;
  const height = (bounds.maxY - bounds.minY) + 1;
  return {
    nodes,
    nodeSet,
    degrees,
    edges,
    bounds: {
      x0: bounds.minX,
      y0: bounds.minY,
      x1: bounds.maxX,
      y1: bounds.maxY,
      width,
      height,
    },
    density: nodes.length / Math.max(1, width * height),
  };
}

function addPattern(catalog, key, zoneId, role, facts, extra = {}) {
  catalog[key].push({
    zoneId,
    role,
    tileCount: facts.nodes.length,
    anchors: facts.nodes.slice(0, Math.min(4, facts.nodes.length)),
    bounds: facts.bounds,
    ...extra,
  });
}

function detectPatternsForComponent(catalog, zoneId, role, facts, w) {
  const xs = new Set();
  const ys = new Set();
  let maxDegree = 0;
  let allDegreeTwo = facts.nodes.length >= 4;
  for (const idx of facts.nodes) {
    xs.add(idx % w);
    ys.add((idx / w) | 0);
    const degree = Number(facts.degrees.get(idx) || 0);
    if (degree > maxDegree) maxDegree = degree;
    if (degree !== 2) allDegreeTwo = false;
  }

  const isLine = facts.nodes.length >= 3 && (xs.size === 1 || ys.size === 1);
  const hasBlock = facts.bounds.width >= 2 && facts.bounds.height >= 2 && facts.density >= 0.95 && facts.nodes.length >= 4;
  const isLoop = allDegreeTwo && facts.edges === facts.nodes.length;
  const isBranch = maxDegree >= 3;
  const isDenseCluster = facts.nodes.length >= 5 && facts.density >= 0.55;

  if (isLine) addPattern(catalog, "line", zoneId, role, facts, { orientation: xs.size === 1 ? "vertical" : "horizontal" });
  if (hasBlock) addPattern(catalog, "block", zoneId, role, facts);
  if (isLoop) addPattern(catalog, "loop", zoneId, role, facts);
  if (isBranch) addPattern(catalog, "branch", zoneId, role, facts, { maxDegree });
  if (isDenseCluster) addPattern(catalog, "dense_cluster", zoneId, role, facts, { density: Number(facts.density.toFixed(3)) });
}

export function buildPatternState(world) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  const zoneRole = world?.zoneRole;
  const zoneId = world?.zoneId;
  if (!N || !zoneRole || !zoneId) {
    return { patternCatalog: createEmptyCatalog(), patternBonuses: { ...EMPTY_BONUSES } };
  }

  const buckets = new Map();
  for (let i = 0; i < N; i++) {
    const role = Number(zoneRole[i] || 0) | 0;
    const id = Number(zoneId[i] || 0) | 0;
    if (role === ZONE_ROLE.NONE || id <= 0) continue;
    const key = `${role}:${id}`;
    if (!buckets.has(key)) buckets.set(key, { role, zoneId: id, indices: [] });
    buckets.get(key).indices.push(i);
  }

  const patternCatalog = createEmptyCatalog();
  for (const bucket of buckets.values()) {
    const components = collectComponents(bucket.indices, w, h);
    for (const nodes of components) {
      const facts = buildComponentFacts(nodes, w, h);
      detectPatternsForComponent(patternCatalog, bucket.zoneId, bucket.role, facts, w);
    }
  }

  const patternBonuses = { ...EMPTY_BONUSES };
  patternBonuses.energy += patternCatalog.loop.length * 0.06;
  patternBonuses.energy += patternCatalog.block.length * 0.02;
  patternBonuses.dna += patternCatalog.dense_cluster.length * 0.05;
  patternBonuses.stability += patternCatalog.block.length * 0.05;
  patternBonuses.stability += patternCatalog.loop.length * 0.04;
  patternBonuses.stability += patternCatalog.dense_cluster.length * 0.05;
  patternBonuses.vision += patternCatalog.line.length * 0.03;
  patternBonuses.defense += patternCatalog.block.length * 0.03;
  patternBonuses.defense += patternCatalog.branch.length * 0.02;
  patternBonuses.transport += patternCatalog.line.length * 0.05;
  patternBonuses.transport += patternCatalog.branch.length * 0.06;

  for (const key of Object.keys(patternBonuses)) {
    patternBonuses[key] = Number(patternBonuses[key].toFixed(3));
  }

  return { patternCatalog, patternBonuses };
}
