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
    this._lastHarvestValue = null;
    this._hud = null;
    this._onPointerDown = (ev) => this._handlePointerDown(ev);
    this._canvas?.addEventListener?.("mousedown", this._onPointerDown);
    this._ensureHud();
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
    this._positionHud();
  }

  sync(_state) {
    const state = this._store.getState();
    const nextValue = Math.max(0, Math.floor(Number(state?.sim?.totalHarvested || 0)));
    this._positionHud();
    if (this._lastHarvestValue === nextValue) return;
    this._lastHarvestValue = nextValue;
    if (this._hud) this._hud.textContent = `🌿 ${nextValue}`;
  }

  _ensureHud() {
    if (this._hud) return;
    const hud = document.createElement("div");
    hud.setAttribute("data-ui-harvest-hud", "1");
    hud.style.position = "fixed";
    hud.style.left = "12px";
    hud.style.top = "12px";
    hud.style.zIndex = "30";
    hud.style.pointerEvents = "none";
    hud.style.padding = "6px 10px";
    hud.style.borderRadius = "8px";
    hud.style.background = "rgba(6, 14, 10, 0.78)";
    hud.style.color = "#d7ffdc";
    hud.style.fontFamily = "\"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif";
    hud.style.fontSize = "16px";
    hud.style.lineHeight = "1";
    hud.textContent = "🌿 0";
    (document.body || document.documentElement).appendChild(hud);
    this._hud = hud;
    this._positionHud();
  }

  _positionHud() {
    if (!this._hud || !this._canvas?.getBoundingClientRect) return;
    const rect = this._canvas.getBoundingClientRect();
    this._hud.style.left = `${Math.max(8, Math.floor(rect.left) + 8)}px`;
    this._hud.style.top = `${Math.max(8, Math.floor(rect.top) + 8)}px`;
  }

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
