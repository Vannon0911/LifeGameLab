import { RUN_PHASE } from "../contracts/ids.js";
import { announceInLiveRegion, createActionFeedback } from "./ui.hud.js";
import { installUiInput } from "./ui.input.js";
import { installUiLayout } from "./ui.layout.js";
import { buildAppliedMapSpec } from "./ui.builder.js";
import { issueWorkerMove } from "./ui.orders.js";

const BUILDER_TILE_OPTIONS = Object.freeze([
  Object.freeze({ mode: "light", label: "Licht", hint: "Lichtwert setzen", value: 0.92, accent: "#ffd47a" }),
  Object.freeze({ mode: "nutrient", label: "Naehrstoff", hint: "Naehrstoffwert setzen", value: 0.86, accent: "#9ef08f" }),
  Object.freeze({ mode: "water", label: "Wasser", hint: "Wasserwert setzen", value: 0.86, accent: "#76d8ff" }),
  Object.freeze({ mode: "saturation", label: "Saettigung", hint: "Saettigungswert setzen", value: 0.70, accent: "#ffc977" }),
  Object.freeze({ mode: "core", label: "Kern", hint: "Zone als Kern markieren", value: 1, accent: "#98c7ff" }),
  Object.freeze({ mode: "dna", label: "DNA", hint: "Zone als DNA markieren", value: 1, accent: "#d29dff" }),
  Object.freeze({ mode: "infra", label: "Infra", hint: "Zone als Infrastruktur markieren", value: 1, accent: "#6ee7c7" }),
  Object.freeze({ mode: "founder", label: "Founder", hint: "Founder-Kachel setzen", value: 1, accent: "#f6f9ff" }),
  Object.freeze({ mode: "erase", label: "Loeschen", hint: "Override entfernen", value: 0, accent: "#ff8a7a", remove: true }),
]);

export class UI {
  constructor(store, canvas) {
    this._store = store;
    this._canvas = canvas;
    this._rInfo = null;
    this._activePointers = new Set();
    this._touchGesture = false;
    this._paintActive = false;
    this._moveSelection = null;
    this._activeContext = "lage";
    this._activeZoneType = 1;
    this._builderMode = "light";
    this._builderHover = null;
    this._builderPrevUi = null;
    this._builderTileOptions = BUILDER_TILE_OPTIONS;
    this._builderTileLookup = new Map(BUILDER_TILE_OPTIONS.map((entry) => [entry.mode, entry]));
    this._builderPaletteButtons = Object.create(null);
    this._feedbackState = createActionFeedback({ ok: true, message: "Bereit", hint: "Klick auf Kacheln setzt oder entfernt Worker." });
    this._dispatch = (action) => {
      try {
        this._store.dispatch(action);
        return true;
      } catch {
        return false;
      }
    };
    this._setActionFeedback = (payload) => {
      this._feedbackState = createActionFeedback(payload);
      this._refreshActionFeedbackView?.();
      const liveLevel = Number(this._announcer?.dataset?.ariaLevel || 1) | 0;
      const spoken = this._feedbackState.hint
        ? `${this._feedbackState.message}. ${this._feedbackState.hint}`
        : this._feedbackState.message;
      announceInLiveRegion(this._announcer, spoken, liveLevel, 1);
    };
    this._isLabOnlyBrushMode = () => false;
    this._isLaborPanelActive = () => false;
    this._ensureLabBrushIsolation = () => {};
    this._onPointerDown = (event) => {
      // Temporary UI dispatch source for Slice B: Alt+Click applies current MapSpec and rebuilds world.
      if (!event?.altKey) return;
      this._applyCurrentMapSpec();
    };
    this._build?.();
    this._bindControls?.();
    this._bindViewportMode?.();
    this._bindGlobalKeys?.();
    this._bindCanvasPaint?.();
    this._canvas?.addEventListener?.("mousedown", this._onPointerDown);
    this.sync?.(this._store?.getState?.());
  }

  setRenderInfo(info) {
    this._rInfo = info || null;
    this._syncBuilderHoverOverlay?.(this._store?.getState?.());
  }

  setCanvas(canvas) {
    if (!canvas) return;
    if (this._canvas && this._onPointerDown) {
      this._canvas.removeEventListener("mousedown", this._onPointerDown);
    }
    this._canvas = canvas;
    this._bindCanvasPaint?.();
    if (this._onPointerDown) {
      this._canvas.addEventListener("mousedown", this._onPointerDown);
    }
    this._syncBuilderHoverOverlay?.(this._store?.getState?.());
  }

  sync(state) {
    const current = state && typeof state === "object" ? state : this._store?.getState?.();
    if (!current) return;
    const tick = Math.max(0, Number(current?.sim?.tick || 0) | 0);
    if (this._timer) {
      this._timer.textContent = `Timer ${this._formatTimer(tick)}`;
    }
    const runPhase = String(current?.sim?.runPhase || "");
    const isBuilder = runPhase === RUN_PHASE.MAP_BUILDER;
    this._syncBuilderPhaseUi?.(current, isBuilder);
    this._syncBuilderHoverOverlay?.(current, isBuilder);
    this._refreshActionFeedbackView?.(current, isBuilder);
  }

  _formatTimer(tick) {
    const seconds = Math.max(0, Math.floor(tick / 24));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    const mm = String(mins % 60).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  }

  _applyCurrentMapSpec() {
    const state = this._store?.getState?.();
    if (!state) return;
    const nextMapSpec = buildAppliedMapSpec(state);
    this._store.dispatch({ type: "SET_MAPSPEC", payload: { mapSpec: nextMapSpec } });
    this._store.dispatch({ type: "GEN_WORLD", payload: {} });
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
    this._syncBuilderPhaseUi?.(this._store?.getState?.());
    if (announce) {
      this._setActionFeedback({
        ok: true,
        message: `Werkzeug: ${next.label}`,
        hint: next.hint,
      });
    }
    return next;
  }

  _setBuilderHover(hover) {
    this._builderHover = hover && typeof hover === "object" ? hover : null;
    this._syncBuilderHoverOverlay?.(this._store?.getState?.());
  }

  _refreshActionFeedbackView(state = this._store?.getState?.(), isBuilder = String(state?.sim?.runPhase || "") === RUN_PHASE.MAP_BUILDER) {
    const feedback = this._feedbackState || createActionFeedback({ ok: true, message: "Bereit", hint: "" });
    if (this._statusBadge) {
      this._statusBadge.textContent = feedback.message || "Bereit";
      this._statusBadge.title = feedback.hint || feedback.message || "";
      this._statusBadge.dataset.tone = feedback.ok ? "ok" : "warn";
      this._statusBadge.style.borderColor = feedback.ok ? "rgba(122, 255, 182, 0.55)" : "rgba(255, 144, 118, 0.65)";
      this._statusBadge.style.background = feedback.ok
        ? "rgba(28, 76, 48, 0.72)"
        : "rgba(86, 34, 34, 0.72)";
    }
    if (this._builderPanelStatus) {
      this._builderPanelStatus.textContent = feedback.message || "Bereit";
      this._builderPanelStatus.style.color = feedback.ok ? "#b9ffd9" : "#ffc2b3";
    }
    if (this._builderPanelHint) {
      this._builderPanelHint.textContent = feedback.hint || (isBuilder ? "Klicke auf eine Kachel oder waehle ein Werkzeug." : "Map Builder ist inaktiv.");
    }
    if (this._builderPanel) {
      this._builderPanel.dataset.feedback = feedback.ok ? "ok" : "warn";
      this._builderPanel.style.borderColor = feedback.ok ? "rgba(124, 255, 187, 0.35)" : "rgba(255, 144, 118, 0.45)";
      this._builderPanel.style.boxShadow = feedback.ok
        ? "0 18px 42px rgba(8, 18, 24, 0.48), 0 0 0 1px rgba(120, 255, 182, 0.12) inset"
        : "0 18px 42px rgba(8, 18, 24, 0.48), 0 0 0 1px rgba(255, 144, 118, 0.14) inset";
    }
  }

  _syncBuilderPhaseUi(state = this._store?.getState?.(), isBuilder = String(state?.sim?.runPhase || "") === RUN_PHASE.MAP_BUILDER) {
    const ui = state?.meta?.ui || {};
    const cfg = this._getBuilderModeConfig(this._builderMode);
    const modeLabel = cfg ? cfg.label : "Licht";
    const running = !!state?.sim?.running;
    if (this._btnBuilder) {
      this._btnBuilder.textContent = isBuilder ? "Builder an" : "Map Builder";
      this._btnBuilder.dataset.active = isBuilder ? "true" : "false";
      this._btnBuilder.style.borderColor = isBuilder ? "rgba(126, 255, 183, 0.8)" : "rgba(255,255,255,0.16)";
      this._btnBuilder.style.background = isBuilder
        ? "linear-gradient(135deg, rgba(34, 78, 46, 0.98), rgba(18, 30, 23, 0.96))"
        : "linear-gradient(135deg, rgba(30, 37, 53, 0.95), rgba(18, 22, 31, 0.93))";
      this._btnBuilder.style.color = isBuilder ? "#dffff0" : "#eaf2ff";
    }
    if (this._btnMenuBuild) {
      this._btnMenuBuild.dataset.active = isBuilder ? "true" : "false";
      this._btnMenuBuild.style.borderColor = isBuilder ? "rgba(126, 255, 183, 0.8)" : "rgba(255,255,255,0.16)";
      this._btnMenuBuild.style.background = isBuilder
        ? "linear-gradient(135deg, rgba(34, 78, 46, 0.98), rgba(18, 30, 23, 0.96))"
        : "linear-gradient(135deg, rgba(30,37,53,0.95), rgba(18,22,31,0.93))";
      this._btnMenuBuild.style.color = isBuilder ? "#dffff0" : "#eaf2ff";
    }
    if (this._btnMenuPlay) {
      this._btnMenuPlay.textContent = running ? "PAUSE" : "SPIELEN";
    }
    if (this._headerHint) {
      this._headerHint.textContent = isBuilder
        ? `Map Builder aktiv | Werkzeug: ${modeLabel} | Klick malt, Shift loescht`
        : "Klick: Worker setzen | Worker->Ressource: Bewegung";
    }
    if (this._builderPanel) {
      this._builderPanel.style.display = isBuilder ? "block" : "none";
      this._builderPanel.setAttribute("aria-hidden", isBuilder ? "false" : "true");
    }
    if (this._builderPanelState) {
      this._builderPanelState.textContent = isBuilder ? `Phase: ${String(state?.sim?.runPhase || "").replace("_", " ")}` : "Phase: inaktiv";
    }
    if (this._builderPanelMode) {
      this._builderPanelMode.textContent = `Aktives Werkzeug: ${modeLabel}`;
    }
    if (this._builderPanelMeta) {
      this._builderPanelMeta.textContent = isBuilder
        ? "M schaltet den Builder um. Palette waehlt Kacheltypen."
        : `Aktiver Tab: ${String(ui.activeTab || "lage")}`;
    }
    for (const [mode, btn] of Object.entries(this._builderPaletteButtons || {})) {
      const active = isBuilder && mode === this._builderMode;
      btn.dataset.active = active ? "true" : "false";
      const tileCfg = this._getBuilderModeConfig(mode);
      const accent = tileCfg?.accent || "#9ab3ff";
      btn.style.borderColor = active ? accent : "rgba(255,255,255,0.12)";
      btn.style.background = active
        ? `linear-gradient(135deg, ${accent}33, rgba(14, 18, 26, 0.94))`
        : "rgba(11, 15, 23, 0.76)";
      btn.style.boxShadow = active ? `0 0 0 1px ${accent}88 inset, 0 10px 24px rgba(0,0,0,0.25)` : "none";
      btn.style.color = active ? "#f8fbff" : "#d6def2";
    }
    if (this._builderExitButton) {
      this._builderExitButton.style.opacity = isBuilder ? "1" : "0.6";
    }
    if (this._canvas) {
      this._canvas.style.cursor = isBuilder ? "crosshair" : "default";
    }
  }

  _syncBuilderHoverOverlay(state = this._store?.getState?.(), isBuilder = String(state?.sim?.runPhase || "") === RUN_PHASE.MAP_BUILDER) {
    if (!this._builderHoverFrame) return;
    if (!isBuilder || !this._builderHover || !this._rInfo) {
      this._builderHoverFrame.style.display = "none";
      return;
    }
    const { x, y } = this._builderHover;
    const { tilePx, offX, offY, dpr = 1 } = this._rInfo;
    if (![x, y, tilePx, offX, offY].every((v) => Number.isFinite(Number(v)))) {
      this._builderHoverFrame.style.display = "none";
      return;
    }
    const scale = Math.max(1, dpr);
    const size = Math.max(1, tilePx / scale);
    const left = Math.max(0, offX / scale + x * size);
    const top = Math.max(0, offY / scale + y * size);
    const cfg = this._getBuilderModeConfig(this._builderMode) || this._getBuilderModeConfig("light");
    const accent = cfg?.accent || "#ffd47a";
    this._builderHoverFrame.style.display = "block";
    this._builderHoverFrame.style.left = `${left}px`;
    this._builderHoverFrame.style.top = `${top}px`;
    this._builderHoverFrame.style.width = `${size}px`;
    this._builderHoverFrame.style.height = `${size}px`;
    this._builderHoverFrame.style.borderColor = accent;
    this._builderHoverFrame.style.boxShadow = `0 0 0 1px ${accent}55 inset, 0 0 24px ${accent}22`;
    if (this._builderHoverLabel) {
      this._builderHoverLabel.textContent = `${cfg?.label || "Werkzeug"} • ${x}, ${y}`;
      this._builderHoverLabel.style.background = accent;
      this._builderHoverLabel.style.color = "#081018";
    }
  }
}

installUiLayout(UI);
installUiInput(UI);
