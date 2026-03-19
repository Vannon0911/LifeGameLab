// Minimal neutral UI adapter: canvas binding only, no sim interaction.

export class UI {
  constructor(store, canvas) {
    this._store = store;
    this._canvas = canvas;
    this._rInfo = null;
    this._onPointerDown = (event) => {
      // Temporary UI dispatch source for Slice B: Alt+Click applies current MapSpec and rebuilds world.
      if (!event?.altKey) return;
      this._applyCurrentMapSpec();
    };
    this._canvas?.addEventListener?.("mousedown", this._onPointerDown);
  }

  setRenderInfo(info) {
    this._rInfo = info || null;
  }

  setCanvas(canvas) {
    if (!canvas) return;
    if (this._canvas && this._onPointerDown) {
      this._canvas.removeEventListener("mousedown", this._onPointerDown);
    }
    this._canvas = canvas;
    if (this._onPointerDown) {
      this._canvas.addEventListener("mousedown", this._onPointerDown);
    }
  }

  sync(_state) {
    // Intentionally empty while sim-driven UI is blocked.
  }

  _applyCurrentMapSpec() {
    const state = this._store?.getState?.();
    if (!state) return;
    const mapSpec = state?.map?.spec && typeof state.map.spec === "object" ? state.map.spec : {};
    const presetId = String(mapSpec.presetId || state?.meta?.worldPresetId || "river_delta");
    const gridW = Math.max(1, Math.trunc(Number(mapSpec.gridW ?? state?.meta?.gridW ?? 16)));
    const gridH = Math.max(1, Math.trunc(Number(mapSpec.gridH ?? state?.meta?.gridH ?? 16)));
    const nextMapSpec = {
      name: String(mapSpec.name || ""),
      presetId,
      gridW,
      gridH,
      tileSize: Math.max(1, Math.trunc(Number(mapSpec.tileSize ?? 1))),
    };
    this._store.dispatch({ type: "SET_MAPSPEC", payload: { mapSpec: nextMapSpec } });
    this._store.dispatch({ type: "GEN_WORLD", payload: {} });
  }
}
