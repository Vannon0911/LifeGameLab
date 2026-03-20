import { BRUSH_MODE, RUN_PHASE } from "../contracts/ids.js";
import { UI_STRINGS } from "./ui.constants.js";
import { issueWorkerMove } from "./ui.orders.js";

export function installUiInput(UI) {
  Object.assign(UI.prototype, {
  _bindControls() {
    this._speedForGrid = (w, h) => {
      const m = Math.max(w, h);
      if (m <= 16) return 2;
      if (m >= 144) return 2; if (m >= 120) return 2;
      if (m >= 96)  return 3; if (m >= 72)  return 3;
      if (m >= 64)  return 4; if (m >= 48)  return 5;
      return 6;
    };
  },

  _bindGlobalKeys() {
    window.addEventListener("keydown", (e) => {
      if (e.target && ["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        console.log("MAP_SPEC_EXPORT:", JSON.stringify(this._store.getState().map?.spec || {}, null, 2));
        this._setActionFeedback({ ok: true, message: UI_STRINGS.MAP_SPEC_EXPORT, hint: UI_STRINGS.MAP_SPEC_EXPORT_HINT });
      }
      else if (e.key === "Escape") this._moveSelection = null;
    });
  },

  _paintAtClient(clientX, clientY, start, pointerEvent = null) {
    if (!this._rInfo) return;
    const state = this._store.getState();
    const { dpr, tilePx, offX, offY } = this._rInfo;
    const rect = this._canvas.getBoundingClientRect();
    const wx = Math.floor(((clientX - rect.left)*dpr - offX) / tilePx);
    const wy = Math.floor(((clientY - rect.top)*dpr - offY) / tilePx);
    if (wx<0||wy<0||wx>=state.meta.gridW||wy>=state.meta.gridH) return;
    const runPhase = String(state.sim?.runPhase || "");
    const builderActive = runPhase === RUN_PHASE.MAP_BUILDER;
    const mode = builderActive ? this._builderMode : state.meta.brushMode;
    const radius = state.meta.brushRadius || 3;
    const idx = wy * state.meta.gridW + wx;
    const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
    const isOwnAliveTile = (Number(state.world?.alive?.[idx] || 0) | 0) === 1 && (Number(state.world?.lineageId?.[idx] || 0) | 0) === playerLineageId;
    const isOwnFounder = isOwnAliveTile && (Number(state.world?.founderMask?.[idx] || 0) | 0) === 1 && runPhase === RUN_PHASE.GENESIS_SETUP;
    const isResourceTile = Number(state.world?.R?.[idx] || 0) > 0.05;
    const shiftRemove = !!pointerEvent?.shiftKey;

    if (start && runPhase === RUN_PHASE.GENESIS_SETUP) {
      const placed = this._placeWorker({ x: wx, y: wy, remove: shiftRemove || isOwnFounder });
      this._setActionFeedback({
        ok: !!placed,
        message: placed ? ((shiftRemove || isOwnFounder) ? UI_STRINGS.FOUNDER_REMOVED : UI_STRINGS.FOUNDER_PLACED) : UI_STRINGS.FOUNDER_BLOCKED,
        hint: placed ? "" : UI_STRINGS.FOUNDER_HINT,
      });
      return;
    }

    if (String(state.sim?.infraBuildMode || "") === "path") {
      if (!start) return;
      const isSelected = (Number(state.world?.infraCandidateMask?.[idx] || 0) | 0) === 1;
      this._dispatch(
        { type: "BUILD_INFRA_PATH", payload: { x: wx, y: wy, remove: isSelected } },
        { ok: isSelected ? UI_STRINGS.INFRA_REMOVED : UI_STRINGS.INFRA_SET, blocked: UI_STRINGS.INFRA_BLOCKED, hint: UI_STRINGS.INFRA_HINT }
      );
      return;
    }

    if (mode === BRUSH_MODE.OBSERVE) {
      if (!start) return;
      if (runPhase !== RUN_PHASE.RUN_ACTIVE) { this._moveSelection = null; return; }
      if (!this._moveSelection) {
        if (!isOwnAliveTile) {
          const placed = this._placeWorker({ x: wx, y: wy, remove: shiftRemove });
          this._setActionFeedback({
            ok: !!placed,
            message: placed ? (shiftRemove ? UI_STRINGS.WORKER_REMOVED : UI_STRINGS.WORKER_PLACED) : UI_STRINGS.WORKER_BLOCKED,
            hint: placed ? "" : UI_STRINGS.WORKER_MOVE_HINT,
          });
          return;
        }
        this._moveSelection = { x: wx, y: wy, idx };
        this._setActionFeedback({ ok: true, message: UI_STRINGS.WORKER_MARKED, hint: UI_STRINGS.WORKER_MARKED_HINT });
        return;
      }
      const selected = this._moveSelection;
      if (selected.idx === idx) {
        this._moveSelection = null;
        this._setActionFeedback({ ok: true, message: UI_STRINGS.MOVE_CANCELLED, hint: "" });
        return;
      }
      if (isOwnAliveTile) {
        this._moveSelection = { x: wx, y: wy, idx };
        this._setActionFeedback({ ok: true, message: UI_STRINGS.WORKER_REPOSITIONED, hint: UI_STRINGS.WORKER_MARKED_HINT });
        return;
      }
      if (!isResourceTile) {
        this._setActionFeedback({ ok: false, message: UI_STRINGS.NO_RESOURCE_TARGET, hint: UI_STRINGS.NO_RESOURCE_TARGET_HINT });
        return;
      }
      const ordered = issueWorkerMove(this._dispatch, { x: selected.x, y: selected.y }, { x: wx, y: wy });
      this._setActionFeedback({
        ok: !!ordered,
        message: ordered ? UI_STRINGS.ORDER_SET : UI_STRINGS.ORDER_BLOCKED,
        hint: ordered ? UI_STRINGS.ORDER_SET_HINT : UI_STRINGS.ORDER_BLOCKED_HINT,
      });
      this._moveSelection = null;
      return;
    }
    if (mode === BRUSH_MODE.WORKER_HARVEST) {
      if (!start) return;
      this._dispatch({ type:"HARVEST_WORKER", payload:{ x:wx, y:wy } }, { ok: UI_STRINGS.HARVEST_OK, blocked: UI_STRINGS.HARVEST_BLOCKED, hint: UI_STRINGS.HARVEST_HINT });
      return;
    }
    if (mode === BRUSH_MODE.SPLIT_PLACE) {
      if (!start) return;
      this._dispatch({ type:"PLACE_SPLIT_CLUSTER", payload:{ x:wx, y:wy } }, { ok: UI_STRINGS.SPLIT_OK, blocked: UI_STRINGS.SPLIT_BLOCKED, hint: UI_STRINGS.SPLIT_HINT });
      return;
    }
    if (String(state.sim?.runPhase || "") === RUN_PHASE.DNA_ZONE_SETUP) {
      if (!start) return;
      const isSelected = (Number(state.world?.dnaZoneMask?.[idx] || 0) | 0) === 1;
      this._dispatch({ type: "TOGGLE_DNA_ZONE_WORKER", payload: { x: wx, y: wy, remove: isSelected } }, { ok: isSelected ? UI_STRINGS.DNA_ZONE_REMOVED : UI_STRINGS.DNA_ZONE_SET, blocked: UI_STRINGS.DNA_ZONE_BLOCKED, hint: UI_STRINGS.DNA_ZONE_HINT });
      return;
    }
    if (builderActive) {
      if (!start) return;
      const cfg = this._builderTileLookup.get(String(mode)) || this._builderTileLookup.get("light");
      const value = Number.isFinite(Number(cfg?.value)) ? Number(cfg.value) : 0.8;
      const remove = !!shiftRemove || !!cfg?.remove;
      this._dispatch({ type: "SET_MAP_TILE", payload: { x: wx, y: wy, mode: cfg.mode, value: remove ? 0 : value, remove } }, { ok: UI_STRINGS.MAP_TILE_OK, blocked: UI_STRINGS.MAP_TILE_BLOCKED, hint: UI_STRINGS.MAP_TILE_HINT });
      return;
    }
    this._dispatch({ type:"SET_TILE", payload:{ x:wx, y:wy, radius, mode } });
  },

  _bindCanvasPaint() {
    this._canvas.style.touchAction = "none";
    this._canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    const updateHover = (e) => {
      if (!this._rInfo) return;
      const state = this._store.getState();
      if (String(state?.sim?.runPhase || "") !== RUN_PHASE.MAP_BUILDER) { this._builderHover = null; return; }
      const { dpr, tilePx, offX, offY } = this._rInfo;
      const rect = this._canvas.getBoundingClientRect();
      const wx = Math.floor(((e.clientX - rect.left) * dpr - offX) / tilePx);
      const wy = Math.floor(((e.clientY - rect.top) * dpr - offY) / tilePx);
      if (wx < 0 || wy < 0 || wx >= state.meta.gridW || wy >= state.meta.gridH) { this._builderHover = null; return; }
      this._builderHover = { x: wx, y: wy };
    };
    this._canvas.addEventListener("pointerdown", (e) => {
      this._activePointers.add(e.pointerId);
      this._paintActive = !(e.pointerType==="touch" && this._activePointers.size>1);
      this._canvas.setPointerCapture(e.pointerId);
      if (this._paintActive) { updateHover(e); this._paintAtClient(e.clientX, e.clientY, true, e); }
    });
    this._canvas.addEventListener("pointermove", (e) => {
      updateHover(e);
      if (this._paintActive) this._paintAtClient(e.clientX, e.clientY, false, e);
    });
    const end = (e) => {
      this._activePointers.delete(e.pointerId);
      if (this._activePointers.size===0) this._touchGesture=false;
      this._paintActive=false;
    };
    this._canvas.addEventListener("pointerup", end);
    this._canvas.addEventListener("pointercancel", end);
    this._canvas.addEventListener("pointerleave", () => { this._builderHover = null; });
  }
  });
}
