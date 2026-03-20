// ============================================================
// UI — Canvas-only bootstrap shell (v0.8.9)
// ============================================================

import { RUN_PHASE } from "../contracts/ids.js";
import { BUILDER_TILE_OPTIONS } from "./ui.constants.js";
import { buildAppliedMapSpec } from "./ui.builder.js";
import { issueWorkerMove } from "./ui.orders.js";
import { installUiInput } from "./ui.input.js";
import { renderStats } from "./ui.stats.js";

export class UI {
  constructor(store, canvas) {
    this._store   = store;
    this._canvas  = canvas;
    this._rInfo   = null;
    this._hubBar  = document.getElementById("rts-hub-bar");
    this._statusBar = document.getElementById("rts-status-bar");

    this._activePointers    = new Set();
    this._touchGesture      = false;
    this._paintActive       = false;
    this._moveSelection     = null;
    this._activeContext     = "lage";
    this._activeZoneType    = 1;
    this._builderMode       = "light";
    this._builderHover      = null;

    this._builderTileOptions = BUILDER_TILE_OPTIONS;
    this._builderTileLookup  = new Map(BUILDER_TILE_OPTIONS.map((e) => [e.mode, e]));

    this._feedbackState = { ok: true, message: "Bereit", hint: "" };
    this._setActionFeedback = (payload) => { 
      this._feedbackState = payload || this._feedbackState; 
      this._renderStatus();
    };

    this._dispatch = (action, feedback = null) => {
      try { 
        this._store.dispatch(action); 
        if (feedback) this._setActionFeedback({ ok: true, message: feedback.ok, hint: feedback.hint || "" });
        return true; 
      }
      catch { 
        if (feedback) this._setActionFeedback({ ok: false, message: feedback.blocked, hint: feedback.hint || "" });
        return false; 
      }
    };

    this._onPointerDown = (event) => {
      if (!event?.altKey) return;
      this._applyCurrentMapSpec();
    };

    this._bindControls();
    this._bindGlobalKeys();
    this._bindCanvasPaint();
    this._canvas?.addEventListener?.("mousedown", this._onPointerDown);
    this.sync();
    this._renderStatus();
  }

  _renderStatus() {
    if (!this._statusBar) return;
    const { ok, message, hint } = this._feedbackState;
    const color = ok ? "#4fd1c5" : "#fc8181";
    this._statusBar.innerHTML = `<span class="status-msg" style="color:${color}">${message}</span><span class="status-hint">${hint}</span>`;
  }

  setRenderInfo(info) { this._rInfo = info || null; }

  setCanvas(canvas) {
    if (!canvas) return;
    if (this._canvas && this._onPointerDown) this._canvas.removeEventListener("mousedown", this._onPointerDown);
    this._canvas = canvas;
    this._bindCanvasPaint();
    if (this._onPointerDown) this._canvas.addEventListener("mousedown", this._onPointerDown);
  }

  sync(state) {
    const current = state && typeof state === "object" ? state : this._store?.getState?.();
    if (!current) return;
    const isBuilder = String(current?.sim?.runPhase || "") === RUN_PHASE.MAP_BUILDER;
    if (this._canvas) this._canvas.style.cursor = isBuilder ? "crosshair" : "default";
    if (this._hubBar) renderStats(current, this._hubBar);
  }

  _applyCurrentMapSpec() {
    const state = this._store?.getState?.();
    if (!state) return;
    this._dispatch({ type: "SET_MAPSPEC", payload: { mapSpec: buildAppliedMapSpec(state) } });
    this._dispatch({ type: "GEN_WORLD", payload: {} });
  }

  _issueMove(from, target) {
    return issueWorkerMove(this._dispatch, from, target);
  }

  _placeWorker({ x, y, remove = false }) {
    return this._dispatch({ type: "PLACE_WORKER", payload: { x, y, remove: !!remove } });
  }

  _getBuilderModeConfig(mode = this._builderMode) {
    return this._builderTileLookup.get(String(mode || "")) || this._builderTileLookup.get("light") || null;
  }

  _setBuilderMode(mode, announce = false) {
    const next = this._getBuilderModeConfig(mode) || this._getBuilderModeConfig("light");
    if (!next) return null;
    this._builderMode = next.mode;
    if (announce) {
      this._setActionFeedback({ ok: true, message: `Werkzeug: ${next.label}`, hint: next.hint });
    }
    return next;
  }

  _setBuilderHover(hover) { this._builderHover = hover && typeof hover === "object" ? hover : null; }
}

installUiInput(UI);
