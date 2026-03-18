// UI intentionally disabled.
// Keep module/API shape so imports and app wiring remain stable.

export class UI {
  constructor(store, canvas) {
    this._store = store;
    this._canvas = canvas;
  }

  setRenderInfo(_info) {}

  setCanvas(canvas) {
    if (canvas) this._canvas = canvas;
  }

  sync(_state) {}
}
