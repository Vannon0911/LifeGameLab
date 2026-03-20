export function reduceEconomyActions(state, action, deps) {
  switch (action.type) {
    case "SET_GLOBAL_LEARNING": {
      const prev = state.meta.globalLearning || deps.defaultGlobalLearning();
      const enabled = action.payload?.enabled ?? prev.enabled;
      const strength = deps.clamp(Number(action.payload?.strength ?? prev.strength), 0, 1);
      const next = { ...prev, enabled, strength };
      const patches = [{ op: "set", path: "/meta/globalLearning", value: next }];
      if (state.world) patches.push({ op: "set", path: "/world/globalLearning", value: deps.cloneJson(next) });
      return patches;
    }

    case "RESET_GLOBAL_LEARNING": {
      const reset = deps.defaultGlobalLearning();
      const patches = [{ op: "set", path: "/meta/globalLearning", value: reset }];
      if (state.world) {
        patches.push({ op: "set", path: "/world/globalLearning", value: deps.cloneJson(reset) });
        patches.push({ op: "set", path: "/world/lineageMemory", value: {} });
      }
      return patches;
    }

    case "SET_TILE": {
      const world = state.world;
      if (!world) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const mode = String(action.payload?.mode || "set");
      const radius = Math.max(1, Math.min(10, Number(action.payload?.radius) | 0));
      const base = world.R;
      if (!base || !ArrayBuffer.isView(base)) return [];
      const next = deps.cloneTypedArray(base);
      const clear = !!action.payload?.clear || mode === "clear" || mode === "erase" || mode === "remove";
      const rawValue = Number(action.payload?.value);
      const value = clear ? 0 : deps.clamp(Number.isFinite(rawValue) ? rawValue : 1, 0, 1);

      deps.paintCircle({
        w, h, x, y, radius,
        cb: (idx) => {
          next[idx] = value;
        }
      });

      return [{ op: "set", path: "/world/R", value: next }];
    }

    default:
      return null;
  }
}
