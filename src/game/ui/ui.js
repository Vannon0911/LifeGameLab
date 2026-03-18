import { deriveCommandScore } from "../techTree.js";
import { getPlayerMemory } from "./ui.model.js";
import { isDesktopLayout } from "./ui.dom.js";
import { buildGateFeedback, createActionFeedback, announceInLiveRegion } from "./ui.feedback.js";
import { installUiLayout } from "./ui.layout.js";
import { installUiInput } from "./ui.input.js";
import { installUiPanels } from "./ui.panels.js";
import { installUiOverlay } from "./ui.overlay.js";

// ============================================================
// UI — Mobile-First Web App v2.1
// Bottom Sheet + Bottom Nav on mobile, Sidebar on desktop.
// Reads state, dispatches actions. Never mutates state directly.
// ============================================================

export class UI {
  constructor(store, canvas) {
    this._store = store;
    this._canvas = canvas;
    this._rInfo = null;
    this._paintActive = false;
    this._activePointers = new Set();
    this._touchGesture = false;
    this._physicsInputs = {};
    this._activeContext = null;
    this._activeZoneType = 1;
    this._moveSelection = null;
    this._lastGameResult = "";
    this._lastDNA         = 0;
    this._lastStage       = 1;
    this._lastGameEndTick = 0;
    this._layoutDesktop = isDesktopLayout();
    this._actionFeedback = null;
    this._lastPanelRenderAt = 0;
    this._panelRenderCooldownMs = 220;

    this._build();
    queueMicrotask(() => this._bindControls());
    this._bindGlobalKeys();
    this._bindCanvasPaint();
    this._bindViewportMode();
    queueMicrotask(() => this._applyResponsiveDefaults());
  }

  setRenderInfo(info) { this._rInfo = info; }

  setCanvas(canvas) {
    if (!canvas || canvas === this._canvas) return;
    this._canvas = canvas;
    this._canvas.id = "cv";
    this._bindCanvasPaint();
  }

  _dispatch(action, feedback = null) {
    const before = this._store.getDoc().revisionCount | 0;
    this._store.dispatch(action);
    const after = this._store.getDoc().revisionCount | 0;
    const changed = after > before;
    if (feedback) {
      this._setActionFeedback({
        ok: changed,
        message: changed ? feedback.ok : feedback.blocked,
        hint: feedback.hint || "",
      });
    }
    return changed;
  }

  _setActionFeedback(payload) {
    this._actionFeedback = createActionFeedback(payload, Date.now());
    if (this._actionFeedback.message) {
      this._announce(this._actionFeedback.message, this._actionFeedback.ok ? 2 : 1);
    }
  }

  _getGateFeedback(state) {
    const playerMemory = getPlayerMemory(state);
    const playerStage = Number(state?.sim?.playerStage || 1);
    const commandScore = deriveCommandScore(state?.sim || {});
    return buildGateFeedback(playerMemory, playerStage, commandScore);
  }

  _announce(message, level = 1) { // level 1: critical, 2: all
    const ariaLevel = Number(this._store.getState().meta.ui.ariaLevel || 1);
    announceInLiveRegion(this._announcer, message, ariaLevel, level);
  }
}

installUiLayout(UI);
installUiInput(UI);
installUiPanels(UI);
installUiOverlay(UI);
