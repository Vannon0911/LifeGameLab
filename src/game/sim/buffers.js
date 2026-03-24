export function prepareStepBuffers(world, N) {
  const ensureTA = (key, Ctor, fillValue = null) => {
    const cur = world[key];
    if (cur && cur.constructor === Ctor && cur.length === N) return cur;
    const next = new Ctor(N);
    if (cur && ArrayBuffer.isView(cur)) {
      next.set(cur.subarray(0, Math.min(cur.length, N)));
    }
    if (fillValue != null) {
      for (let i = 0; i < N; i++) {
        if (next[i] === 0) next[i] = fillValue;
      }
    }
    world[key] = next;
    return next;
  };

  ensureTA("Sat", Float32Array);
  ensureTA("baseSat", Float32Array, 0.18);
  ensureTA("reserve", Float32Array);
  ensureTA("age", Uint16Array);
  ensureTA("actionMap", Uint8Array);
  ensureTA("B", Float32Array);
  ensureTA("clusterField", Float32Array);
  ensureTA("link", Float32Array);
  ensureTA("born", Uint8Array);
  ensureTA("died", Uint8Array);

  world.born.fill(0);
  world.died.fill(0);
  for (let i = 0; i < N; i++) {
    const v = world.actionMap[i] | 0;
    world.actionMap[i] = v > 8 ? (v - 8) : 0;
  }
  return { Sat: world.Sat, baseSat: world.baseSat, reserve: world.reserve, age: world.age, actionMap: world.actionMap };
}
