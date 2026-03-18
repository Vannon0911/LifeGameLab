// Minimal neutral UI adapter: canvas binding only, no sim interaction.

export class UI {
  constructor(store, canvas) {
    this._store = store;
    this._canvas = canvas;
    this._rInfo = null;
    this._onPointerDown = () => {};
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
}
