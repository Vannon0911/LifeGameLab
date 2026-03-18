// Minimal canvas input bridge for gameplay command dispatch.
// No panel/UI build; only grid-click -> dispatch wiring.

import { RUN_PHASE } from "../contracts/ids.js";
import { screenToWorld } from "../render/renderer.js";

export class UI {
  constructor(store, canvas) {
    this._store = store;
    this._canvas = canvas;
    this._rInfo = null;
    this._selected = null;
    this._onPointerDown = (ev) => this._handlePointerDown(ev);
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

  sync(_state) {}

  _handlePointerDown(ev) {
    const state = this._store.getState();
    if (String(state?.sim?.runPhase || "") !== RUN_PHASE.RUN_ACTIVE) return;
    const worldPos = screenToWorld(ev.clientX, ev.clientY, this._rInfo, state.meta);
    if (!worldPos) return;
    const { x, y } = worldPos;
    const idx = y * (Number(state.meta?.gridW || 0) | 0) + x;
    const playerLineageId = Number(state.meta?.playerLineageId || 1) | 0;
    const isOwnAlive =
      (Number(state.world?.alive?.[idx] || 0) | 0) === 1 &&
      (Number(state.world?.lineageId?.[idx] || 0) | 0) === playerLineageId;
    const isResourceTile = Number(state.world?.R?.[idx] || 0) > 0.05;

    if (!this._selected) {
      if (!isOwnAlive) return;
      this._selected = { x, y, idx };
      return;
    }

    if (this._selected.idx === idx) {
      this._selected = null;
      return;
    }
    if (isOwnAlive) {
      this._selected = { x, y, idx };
      return;
    }
    if (!isResourceTile) return;

    this._store.dispatch({
      type: "ISSUE_ORDER",
      payload: {
        fromX: this._selected.x,
        fromY: this._selected.y,
        targetX: x,
        targetY: y,
      },
    });
    this._selected = null;
  }
}
