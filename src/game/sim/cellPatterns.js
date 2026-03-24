const NEIGHBOR_DIRS = Object.freeze([
  [1, 0],   // E
  [1, 1],   // SE
  [0, 1],   // S
  [-1, 1],  // SW
  [-1, 0],  // W
  [-1, -1], // NW
  [0, -1],  // N
  [1, -1],  // NE
]);

function createEmptyCounts() {
  return { line: 0, angle: 0, triangle: 0, loop: 0 };
}

function isPlayerAlive(world, idx, playerLineageId) {
  return (Number(world?.alive?.[idx] || 0) | 0) === 1
    && (Number(world?.lineageId?.[idx] || 0) | 0) === (playerLineageId | 0);
}

function buildPlayerGraph(world, playerLineageId) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  const adj = new Map();
  if (w <= 0 || h <= 0 || !N) return { adj, w, h };

  for (let idx = 0; idx < N; idx++) {
    if (!isPlayerAlive(world, idx, playerLineageId)) continue;
    const x = idx % w;
    const y = (idx / w) | 0;
    const neighbors = [];
    for (let d = 0; d < NEIGHBOR_DIRS.length; d++) {
      const [dx, dy] = NEIGHBOR_DIRS[d];
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const j = yy * w + xx;
      if (!isPlayerAlive(world, j, playerLineageId)) continue;
      neighbors.push({ idx: j, dir: d });
    }
    adj.set(idx, neighbors);
  }

  return { adj, w, h };
}

function countLineAndAngle(adj) {
  let line = 0;
  let angle = 0;
  for (const [, neighbors] of adj) {
    if (neighbors.length !== 2) continue;
    const a = neighbors[0].dir;
    const b = neighbors[1].dir;
    const opposite = ((a + 4) % 8) === b || ((b + 4) % 8) === a;
    if (opposite) line++;
    else angle++;
  }
  return { line, angle };
}

function hasEdge(adj, a, b) {
  const neighbors = adj.get(a);
  if (!neighbors) return false;
  for (let i = 0; i < neighbors.length; i++) {
    if (neighbors[i].idx === b) return true;
  }
  return false;
}

function countTriangles(adj) {
  const nodes = [...adj.keys()].sort((a, b) => a - b);
  let triangles = 0;
  for (let i = 0; i < nodes.length; i++) {
    const u = nodes[i];
    const uNeighbors = (adj.get(u) || []).map((n) => n.idx).filter((v) => v > u).sort((a, b) => a - b);
    for (let a = 0; a < uNeighbors.length; a++) {
      const v = uNeighbors[a];
      for (let b = a + 1; b < uNeighbors.length; b++) {
        const w = uNeighbors[b];
        if (!hasEdge(adj, v, w)) continue;
        triangles++;
      }
    }
  }
  return triangles;
}

function countLoopComponents(adj) {
  const seen = new Set();
  let loops = 0;
  for (const node of adj.keys()) {
    if (seen.has(node)) continue;
    const stack = [node];
    const component = [];
    seen.add(node);
    while (stack.length) {
      const cur = stack.pop();
      component.push(cur);
      const neighbors = adj.get(cur) || [];
      for (let i = 0; i < neighbors.length; i++) {
        const next = neighbors[i].idx;
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    if (component.length < 4) continue;
    let allDeg2 = true;
    for (let i = 0; i < component.length; i++) {
      const deg = (adj.get(component[i]) || []).length;
      if (deg !== 2) {
        allDeg2 = false;
        break;
      }
    }
    if (allDeg2) loops++;
  }
  return loops;
}

export function scanCellTopologyPatterns(world, playerLineageId) {
  const lid = Number(playerLineageId || 0) | 0;
  if (!lid) return createEmptyCounts();
  const { adj } = buildPlayerGraph(world, lid);
  if (!adj.size) return createEmptyCounts();

  const lineAngle = countLineAndAngle(adj);
  const triangle = countTriangles(adj);
  const loop = countLoopComponents(adj);
  return {
    line: Number(lineAngle.line || 0),
    angle: Number(lineAngle.angle || 0),
    triangle: Number(triangle || 0),
    loop: Number(loop || 0),
  };
}
