export function forNeighbours8(i, w, h, cb) {
  const x = i % w;
  const y = (i / w) | 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx === 0 && dy === 0) continue;
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) cb(ny * w + nx);
  }
}

