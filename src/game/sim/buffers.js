export function prepareStepBuffers(world, N) {
  if (!world.Sat) world.Sat = new Float32Array(N);
  if (!world.baseSat) {
    world.baseSat = new Float32Array(N);
    for (let i = 0; i < N; i++) world.baseSat[i] = 0.18;
  }
  if (!world.reserve) world.reserve = new Float32Array(N);
  if (!world.age) world.age = new Uint16Array(N);
  if (!world.actionMap) world.actionMap = new Uint8Array(N);
  if (!world.B) world.B = new Float32Array(N);
  if (!world.clusterField) world.clusterField = new Float32Array(N);
  if (!world.link) world.link = new Float32Array(N);

  world.born.fill(0);
  world.died.fill(0);
  for (let i = 0; i < N; i++) {
    const v = world.actionMap[i] | 0;
    world.actionMap[i] = v > 8 ? (v - 8) : 0;
  }
  return { Sat: world.Sat, baseSat: world.baseSat, reserve: world.reserve, age: world.age, actionMap: world.actionMap };
}

