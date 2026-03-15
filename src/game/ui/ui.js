import { PHYSICS_DEFAULT } from "../../core/kernel/physics.js";
import { APP_VERSION } from "../../project/project.manifest.js";
import { buildAdvisorModel } from "../../project/llm/advisorModel.js";
import { applyFogIntelToAdvisorModel } from "../render/fogOfWar.js";
import { renderLagePanel } from "./ui.lage.js";
import { renderEingriffePanel } from "./ui.eingriffe.js";
import {
  PLAYER_DOCTRINES,
  DOCTRINE_BY_ID,
  TECH_TREE,
  TECH_SYNERGIES,
  deriveCommandScore,
  hasRequiredTechs,
} from "../techTree.js";
import {
  BRUSH_MODE,
  GAME_RESULT,
  OVERLAY_MODE,
  OVERLAY_MODE_VALUES,
  RUN_PHASE,
  WIN_MODE_RESULT_LABEL,
} from "../contracts/ids.js";
import {
  ARCHETYPES,
  PANEL_BY_KEY,
  PANEL_DEFS,
  PHYSICS_KEYS,
  STATUS_GROUPS,
  TECH_LANE_LABELS,
  RENDER_DETAIL_MODE_OPTIONS,
  WORLD_PRESET_OPTIONS,
  ZONE_TYPES,
} from "./ui.constants.js";
import {
  getActionState,
  getBottleneckState,
  getGoalState,
  getInfluencePhase,
  getLeverState,
  getOverlayState,
  getPlayerMemory,
  getRiskState,
  getStructureState,
  getWinModeState,
} from "./ui.model.js";
import { el, fmt, isDesktopLayout } from "./ui.dom.js";
import { announceInLiveRegion, buildGateFeedback, createActionFeedback } from "./ui.feedback.js";

const LAB_ONLY_BRUSH_MODES = new Set([
  BRUSH_MODE.CELL_HARVEST,
  BRUSH_MODE.SPLIT_PLACE,
  BRUSH_MODE.ZONE_PAINT,
  BRUSH_MODE.CELL_ADD,
  BRUSH_MODE.CELL_REMOVE,
  BRUSH_MODE.LIGHT,
  BRUSH_MODE.LIGHT_REMOVE,
  BRUSH_MODE.NUTRIENT,
  BRUSH_MODE.TOXIN,
  BRUSH_MODE.SATURATION_RESET,
]);

function countMaskTiles(mask) {
  if (!mask || typeof mask.length !== "number") return 0;
  let total = 0;
  for (let i = 0; i < mask.length; i += 1) {
    total += (Number(mask[i] || 0) | 0) === 1 ? 1 : 0;
  }
  return total;
}

function summarizeFog(world) {
  const total = Number(world?.w || 0) * Number(world?.h || 0);
  if (!total) return { visible: 0, explored: 0, hidden: 0 };
  const visible = countMaskTiles(world?.visibility);
  const exploredAll = countMaskTiles(world?.explored);
  const explored = Math.max(0, exploredAll - visible);
  const hidden = Math.max(0, total - visible - explored);
  return { visible, explored, hidden };
}

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
    this._bindBenchmarkUpdates();
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

  _isPanelInteractionActive() {
    if (!this._activeContext) return false;
    const active = document.activeElement;
    if (!active || !(active instanceof HTMLElement)) return false;
    const tag = String(active.tagName || "");
    const interactive =
      tag === "SELECT" ||
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      !!active.isContentEditable;
    if (!interactive) return false;
    const container = isDesktopLayout() ? this._sidebarBody : this._sheetBody;
    return !!(container && container.contains(active));
  }

  _getPanelRefreshCooldown(contextKey, running) {
    if (!running) return this._panelRenderCooldownMs;
    if (contextKey === "lage") return 260;
    if (contextKey === "evolution") return 900;
    if (contextKey === "eingriffe") return 1200;
    if (contextKey === "labor") return 1200;
    return 700;
  }

  _build() {
    const app = document.getElementById("app") || document.body;
    // Preservation check: only clear if app is empty or doesn't have our main structure
    if (!app.querySelector(".nx-topbar")) {
      while (app.firstChild) app.removeChild(app.firstChild);
    } else {
      return; // Already built
    }

    // ── TOPBAR ──────────────────────────────────────────────
    const top = el("header", "nx-topbar");
    const topMain = el("div", "nx-top-main");
    const left = el("div", "nx-top-left");
    const center = el("nav", "nx-top-center");
    center.setAttribute("aria-label", "Primäre Navigation");
    const actions = el("div", "nx-top-actions");
    const kpis = el("div", "nx-top-kpis");

    this._brand   = el("div", "nx-brand", "LifeGameLab");
    this._btnPlay = el("button", "nx-btn nx-btn-primary", "▶ Spielen");
    this._btnPlay.setAttribute("aria-label", "Simulation starten oder pausieren");
    this._btnNew  = el("button", "nx-btn", "Neue Welt");
    this._btnNew.setAttribute("aria-label", "Neue Welt generieren");
    this._btnStep = el("button", "nx-btn nx-btn-dev hidden", "+1");
    this._btnStep.setAttribute("aria-label", "Einzelnen Simulationsschritt ausführen");

    // Shared panel buttons
    this._ctxButtons = {};
    for (const { key, desktopLabel } of PANEL_DEFS) {
      const btn = el("button", "nx-btn nx-btn-ghost", desktopLabel);
      btn.dataset.ctx = key;
      btn.textContent = desktopLabel;
      btn.setAttribute("aria-label", `${desktopLabel} Panel öffnen`);
      this._ctxButtons[key] = btn;
      center.appendChild(btn);
    }

    this._dnaChipWrap = el("div", "nx-kpi");
    this._energyChipWrap = el("div", "nx-kpi");
    this._stageChipWrap = el("div", "nx-kpi");
    this._dangerChipWrap = el("div", "nx-kpi");
    this._goalChipWrap = el("div", "nx-kpi nx-kpi-goal");
    this._dnaLabel = el("span", "nx-kpi-label", "Kolonie");
    this._energyLabel = el("span", "nx-kpi-label", "DNA");
    this._stageLabel = el("span", "nx-kpi-label", "Risiko");
    this._dangerLabel = el("span", "nx-kpi-label", "Directive");
    this._goalLabel = el("span", "nx-kpi-label", "Mission");
    this._dnaChip    = el("span", "nx-chip nx-chip-player", "◉ 0");
    this._energyChip = el("span", "nx-chip nx-chip-dna",    "🧬 0.0");
    this._stageChip  = el("span", "nx-chip nx-chip-danger", "● Stabil");
    this._dangerChip = el("span", "nx-chip nx-chip-energy", "◎ Beobachten");
    this._goalChip   = el("span", "nx-chip nx-chip-goal",   "🎯 Ersten Kern sichern");
    this._dnaChipWrap.append(this._dnaLabel, this._dnaChip);
    this._energyChipWrap.append(this._energyLabel, this._energyChip);
    this._stageChipWrap.append(this._stageLabel, this._stageChip);
    this._dangerChipWrap.append(this._dangerLabel, this._dangerChip);
    this._goalChipWrap.append(this._goalLabel, this._goalChip);

    // Hidden debug chips
    this._tickChip   = el("span", "nx-chip nx-mono hidden", "t0");
    this._aliveChip  = el("span", "nx-chip nx-mono hidden", "alive 0");
    this._playerChip = el("span", "nx-chip nx-mono hidden", "p 0");
    this._seasonChip = el("span", "nx-chip nx-mono hidden", "☀ 0%");

    kpis.append(this._dnaChipWrap, this._energyChipWrap, this._stageChipWrap, this._dangerChipWrap, this._goalChipWrap,
                 this._tickChip, this._aliveChip, this._playerChip, this._seasonChip);
    left.append(this._brand);
    actions.append(this._btnPlay, this._btnNew, this._btnStep);
    topMain.append(left, center, actions);
    top.append(topMain, kpis);

    // ── CANVAS STAGE ────────────────────────────────────────
    const stage = el("main", "nx-stage");
    this._canvasWrap = el("section", "nx-canvas-wrap");
    this._canvasWrap.id = "canvas-wrap";
    this._canvas.id = "cv";
    this._canvasWrap.appendChild(this._canvas);

    // UI-GAME-01: Minimal In-Canvas HUD (Energy Only)
    this._hud = el("div", "nx-hud");

    this._hudEnergy = el("div", "nx-hud-energy");
    this._hudEnergyArrow = el("span", "nx-hud-energy-arrow", "▲");
    this._hudEnergyVal   = el("span", "nx-hud-energy-val",   "+0");
    this._hudEnergy.append(this._hudEnergyArrow, this._hudEnergyVal);
    this._hudTool = el("div", "nx-hud-tool", "Tool: Beobachtung");

    this._hud.append(this._hudEnergy, this._hudTool);
    this._canvasWrap.appendChild(this._hud);

    this._gameOverlay = el("div", "nx-game-overlay hidden");
    this._gameOverlayInner = el("div", "nx-game-overlay-inner");
    this._gameOverlay.appendChild(this._gameOverlayInner);
    this._canvasWrap.appendChild(this._gameOverlay);

    stage.append(this._canvasWrap);

    // ── DESKTOP SIDEBAR ─────────────────────────────────────
    this._sidebar = el("aside", "nx-sidebar");
    this._sidebarBody = el("div", "nx-sidebar-body");

    this._sidebar.append(this._sidebarBody);

    // ── MOBILE DOCK ─────────────────────────────────────────
    this._mobileDock = el("div", "nx-mobile-dock");
    this._dockTabBtns = {};
    for (const { key, icon, label } of PANEL_DEFS) {
      const btn = el("button", "nx-dock-btn");
      btn.dataset.ctx = key;
      btn.setAttribute("aria-label", `${label} Panel öffnen`);
      btn.append(el("span", "nx-dock-icon", icon), el("span", "", label));
      this._dockTabBtns[key] = btn;
      this._mobileDock.appendChild(btn);
    }
    this._dockPlayBtn = el("button", "nx-dock-btn is-primary");
    this._dockPlayBtn.dataset.ctx = "play";
    this._dockPlayBtn.setAttribute("aria-label", "Simulation starten oder pausieren");
    this._dockPlayBtn.append(el("span", "nx-dock-icon", "▶"), el("span", "", "Play"));
    this._mobileDock.insertBefore(this._dockPlayBtn, this._mobileDock.children[2]);

    // ── BOTTOM SHEET ────────────────────────────────────────
    this._sheetBackdrop = el("div", "nx-sheet-backdrop hidden");
    this._sheet = el("div", "nx-sheet hidden");
    const handle = el("div", "nx-sheet-handle");
    const head   = el("div", "nx-sheet-head");
    this._sheetTitle = el("div", "nx-sheet-title", "Lage");
    this._sheetClose = el("button", "nx-sheet-close", "✕");
    head.append(this._sheetTitle, this._sheetClose);
    this._sheetBody = el("div", "nx-sheet-body");
    this._sheet.append(handle, head, this._sheetBody);

    // ── ARIA ANNOUNCER ──────────────────────────────────────
    this._announcer = el("div", "nx-aria-announcer");
    this._announcer.setAttribute("aria-live", "polite");
    this._announcer.setAttribute("aria-atomic", "true");
    this._announcer.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";

    app.append(top, stage, this._sidebar, this._mobileDock, this._sheetBackdrop, this._sheet, this._announcer);
  }

  _bindControls() {
    const speedForGrid = (w, h) => {
      const m = Math.max(w, h);
      if (m <= 16) return 2;
      if (m >= 144) return 2; if (m >= 120) return 2;
      if (m >= 96)  return 3; if (m >= 72)  return 3;
      if (m >= 64)  return 4; if (m >= 48)  return 5;
      return 6;
    };
    this._speedForGrid = speedForGrid;

    const togglePlay = () => {
      const state = this._store.getState();
      const runPhase = String(state?.sim?.runPhase || "");
      if (runPhase === RUN_PHASE.GENESIS_SETUP) {
        this._setActionFeedback({
          ok: false,
          message: "Genesis-Setup aktiv: erst vier Founder setzen und Gründung bestätigen.",
          hint: "Tool: Founder Place · Ziel: 4/4 zusammenhängend im Startfenster.",
        });
        return;
      }
      if (runPhase === RUN_PHASE.GENESIS_ZONE) {
        this._setActionFeedback({
          ok: false,
          message: "Genesis-Zone aktiv: erst Energiekern bestaetigen.",
          hint: "Founder sind fixiert. Bestaetige jetzt den Energiekern, erst danach startet der Run.",
        });
        return;
      }
      if (runPhase === RUN_PHASE.DNA_ZONE_SETUP) {
        this._setActionFeedback({
          ok: false,
          message: "DNA-Zone-Setup aktiv: erst DNA-Zone bestaetigen.",
          hint: "Waehle bis zu vier gueltige DNA-Kacheln und bestaetige dann Zone 2.",
        });
        return;
      }
      const running = !!state.sim.running;
      this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:!running } });
    };

    this._btnPlay.addEventListener("click", togglePlay);
    this._btnStep.addEventListener("click", () => {
      const state = this._store.getState();
      const runPhase = String(state?.sim?.runPhase || "");
      if (runPhase === RUN_PHASE.GENESIS_SETUP) {
        this._setActionFeedback({
          ok: false,
          message: "Step ist im Genesis-Setup gesperrt.",
          hint: "Setze vier Founder und bestätige die Gründung.",
        });
        return;
      }
      if (runPhase === RUN_PHASE.GENESIS_ZONE) {
        this._setActionFeedback({
          ok: false,
          message: "Step ist in der Genesis-Zone gesperrt.",
          hint: "Ohne bestaetigten Energiekern gibt es keinen aktiven Lauf.",
        });
        return;
      }
      if (runPhase === RUN_PHASE.DNA_ZONE_SETUP) {
        this._setActionFeedback({
          ok: false,
          message: "Step ist im DNA-Zone-Setup gesperrt.",
          hint: "Zone 2 wird erst nach bestaetigter DNA-Zone wieder aktiv fortgesetzt.",
        });
        return;
      }
      if (this._store.getState().sim.running)
        this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:false } });
      this._dispatch({ type:"SIM_STEP", payload:{ force:true } });
    });
    this._btnNew.addEventListener("click", () => {
      this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:false } });
      this._dispatch({ type:"GEN_WORLD" });
    });

    // Dock tab buttons
    for (const [key, btn] of Object.entries(this._dockTabBtns)) {
      btn.addEventListener("click", () => this._togglePanel(key));
    }
    this._dockPlayBtn.addEventListener("click", togglePlay);

    // Sheet close
    this._sheetClose.addEventListener("click", () => this._closeSheet());
    this._sheetBackdrop.addEventListener("click", () => this._closeSheet());

    // Desktop context buttons
    for (const [key, btn] of Object.entries(this._ctxButtons)) {
      btn.addEventListener("click", () => this._togglePanel(key));
    }
  }

  _bindViewportMode() {
    const media = window.matchMedia("(min-width:800px)");
    const onChange = () => {
      this._layoutDesktop = media.matches;
      this._applyResponsiveDefaults(true);
    };
    if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
    else if (typeof media.addListener === "function") media.addListener(onChange);
  }

  _bindBenchmarkUpdates() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    window.addEventListener("benchmark:update", () => {
      if (this._activeContext !== "labor") return;
      const state = this._store.getState();
      const target = isDesktopLayout() ? this._sidebarBody : this._sheetBody;
      if (!target) return;
      this._renderPanelBody(target, state);
    });
  }

  _applyResponsiveDefaults(forceReset = false) {
    const desktop = isDesktopLayout();
    const app = document.getElementById("app");
    app?.classList.remove("is-panel-open");
    if (desktop) {
      this._sheet.classList.add("hidden");
      this._sheetBackdrop.classList.add("hidden");
      if (forceReset || !PANEL_BY_KEY[this._activeContext]) this._activeContext = "lage";
      this._ensureLabBrushIsolation(this._activeContext || "lage");
      this._renderPanelBody(this._sidebarBody, this._store.getState());
    } else if (forceReset) {
      this._activeContext = "lage";
      this._sidebarBody.innerHTML = "";
      this._sheet.classList.add("hidden");
      this._sheetBackdrop.classList.add("hidden");
      this._ensureLabBrushIsolation("lage");
    }
    this._updateContextButtons();
  }

  _updateContextButtons() {
    const mobileOpen = !this._sheet.classList.contains("hidden");
    for (const [key, btn] of Object.entries(this._ctxButtons)) {
      btn.classList.toggle("is-active", key === this._activeContext && isDesktopLayout());
    }
    for (const [key, btn] of Object.entries(this._dockTabBtns)) {
      btn.classList.toggle("is-active", mobileOpen && key === this._activeContext);
    }
  }

  _togglePanel(key) {
    if (isDesktopLayout()) this._toggleSidebar(key);
    else this._toggleSheet(key);
  }

  _syncUiPanelState(panelOpen, activeTab) {
    const ui = this._store.getState()?.meta?.ui || {};
    if (ui.panelOpen === panelOpen && String(ui.activeTab || "lage") === String(activeTab || "lage")) return;
    this._dispatch({
      type: "SET_UI",
      payload: {
        panelOpen: !!panelOpen,
        activeTab: String(activeTab || "lage"),
      },
    });
  }

  // ── SHEET (mobile) ──────────────────────────────────────
  _toggleSheet(key) {
    if (this._activeContext === key && !this._sheet.classList.contains("hidden")) {
      this._closeSheet();
      return;
    }
    this._activeContext = key;
    this._ensureLabBrushIsolation(key);
    this._sheetTitle.textContent = PANEL_BY_KEY[key]?.title || key;
    this._sheet.classList.remove("hidden");
    this._sheetBackdrop.classList.remove("hidden");
    document.getElementById("app")?.classList.add("is-panel-open");
    // Re-animate
    this._sheet.style.animation = "none";
    requestAnimationFrame(() => { this._sheet.style.animation = ""; });
    this._renderPanelBody(this._sheetBody, this._store.getState());
    this._updateContextButtons();
    this._syncUiPanelState(true, key);
  }

  _closeSheet() {
    this._sheet.classList.add("hidden");
    this._sheetBackdrop.classList.add("hidden");
    document.getElementById("app")?.classList.remove("is-panel-open");
    this._ensureLabBrushIsolation("lage");
    this._updateContextButtons();
    this._syncUiPanelState(false, this._activeContext || "lage");
  }

  // ── SIDEBAR (desktop) ────────────────────────────────────
  _toggleSidebar(key) {
    this._activeContext = key;
    this._ensureLabBrushIsolation(key);
    this._renderPanelBody(this._sidebarBody, this._store.getState());
    this._updateContextButtons();
    this._syncUiPanelState(true, key);
  }

  _closeContext() {
    if (isDesktopLayout()) {
      this._activeContext = "lage";
      this._ensureLabBrushIsolation("lage");
      this._renderPanelBody(this._sidebarBody, this._store.getState());
      this._updateContextButtons();
      this._syncUiPanelState(true, "lage");
      return;
    }
    this._closeSheet();
  }

  _hasSplitUnlock(state) {
    const memory = getPlayerMemory(state);
    if (!memory) return false;
    return Number(memory.splitUnlock || 0) >= 1 || (Array.isArray(memory.techs) && memory.techs.includes("cluster_split"));
  }

  _getBenchmarkState() {
    const bench = window.__lifeGameBenchmark;
    if (!bench || typeof bench.getSnapshot !== "function") return null;
    return bench.getSnapshot();
  }

  _isLabOnlyBrushMode(mode) {
    return LAB_ONLY_BRUSH_MODES.has(String(mode || ""));
  }

  _isLaborPanelActive(state = this._store.getState()) {
    const activeTab = String(state?.meta?.ui?.activeTab || this._activeContext || "");
    const panelOpen = state?.meta?.ui?.panelOpen;
    return activeTab === "labor" && panelOpen !== false;
  }

  _ensureLabBrushIsolation(nextContext = this._activeContext, state = this._store.getState()) {
    if (String(nextContext || "") === "labor") return;
    const mode = String(state?.meta?.brushMode || BRUSH_MODE.OBSERVE);
    if (!this._isLabOnlyBrushMode(mode)) return;
    this._dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.OBSERVE } });
  }

  _getActiveToolMeta(state) {
    if (String(state?.sim?.infraBuildMode || "") === "path") {
      const staged = countMaskTiles(state?.world?.infraCandidateMask);
      return {
        mode: "infra_path",
        label: "Infrastrukturpfad",
        detail: staged > 0
          ? `${staged} Kacheln vorgemerkt. Klick setzt/entfernt Pfad, bestaetigen commitet, leer bestaetigen bricht ab.`
          : "Klick setzt/entfernt Pfad. Leer bestaetigen bricht ab und setzt den Run fort.",
      };
    }
    const mode = String(state?.meta?.brushMode || BRUSH_MODE.OBSERVE);
    const zone = ZONE_TYPES.find((entry) => entry.id === this._activeZoneType);
    const map = {
      observe: "Beobachtung",
      founder_place: "Founder setzen",
      cell_harvest: "DNA-Ernte",
      split_place: "Split-Seed 4x4",
      zone_paint: zone ? `Zone: ${zone.label}` : "Zone",
      light: "Licht +",
      paint_light: "Licht +",
      light_remove: "Licht -",
      paint_light_remove: "Licht -",
      nutrient: "Nährstoffe +",
      paint_nutrient: "Nährstoffe +",
      toxin: "Toxine +",
      paint_toxin: "Toxine +",
      saturation_reset: "Reset",
      paint_reset: "Reset",
    };
    return {
      mode,
      label: map[mode] || mode,
      detail:
        mode === BRUSH_MODE.OBSERVE ? "Autonomes Wachstum läuft selbst. Dein Einfluss liegt in Prioritäten, Evolution und Split-Seeds." :
        mode === BRUSH_MODE.FOUNDER_PLACE ? "Setze bis zu vier Founder im linken Startfenster. Eigene Founder können vor Bestätigung entfernt werden." :
        mode === BRUSH_MODE.SPLIT_PLACE ? "Ein Klick setzt einen neuen 4x4-Cluster als strategischen Seed." :
        mode === BRUSH_MODE.CELL_HARVEST ? "Ein Klick erntet eine eigene Zelle für DNA." :
        mode === BRUSH_MODE.ZONE_PAINT && zone ? zone.desc : "",
    };
  }

  // ── PANEL BODY RENDERER (shared by sheet + sidebar) ─────
  _renderPanelBody(container, state) {
    if (!this._activeContext) return;
    this._lastPanelRenderAt = Date.now();
    const { meta, sim } = state;
    const advisorModel = applyFogIntelToAdvisorModel(
      buildAdvisorModel(state, { benchmark: this._getBenchmarkState() }),
      state
    );
    const rerenderPanel = () => {
      queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
    };
    container.innerHTML = "";
    const ctx = this._activeContext;
    const panelMeta = PANEL_BY_KEY[ctx];
    if (panelMeta) {
      const hero = el("section", `nx-panel-hero nx-panel-hero-${panelMeta.tone}`);
    const eyebrow = el("div", "nx-panel-eyebrow", isDesktopLayout() ? "Cell Factory" : "Factory Dock");
      const title = el("h2", "nx-panel-title", panelMeta.title);
      const summaryMap = {
        lage: "Koloniezustand, Warnungen und Zielspannung der aktiven Linie.",
        eingriffe: "Organische Main-Run-Eingriffe mit sichtbarer Weltreaktion.",
        evolution: "Ein fokussierter Aufstiegspfad statt eine lange Einkaufsliste.",
        welt: "Preset, Seed und Raumgroesse fuer den naechsten Run.",
        labor: "Diagnose, Benchmark, Overlays und Rohwerkzeuge bleiben hier.",
      };
      const copy = el("p", "nx-panel-copy", summaryMap[ctx] || "");
      hero.append(eyebrow, title, copy);
      container.appendChild(hero);
    }
    const isFeedbackFresh = this._actionFeedback && (Date.now() - this._actionFeedback.at) < 8000;
    if (isFeedbackFresh) {
      const fb = el("section", "nx-card");
      fb.appendChild(el("div", "nx-card-title", this._actionFeedback.ok ? "Aktion ausgeführt" : "Aktion blockiert"));
      const msg = el("div", this._actionFeedback.ok ? "nx-note nx-val-pos" : "nx-note nx-val-neg", this._actionFeedback.message);
      fb.appendChild(msg);
      if (this._actionFeedback.hint) fb.appendChild(el("div", "nx-note", this._actionFeedback.hint));
      container.appendChild(fb);
    }

	    // ── STATUS (Lagebericht) ────────────────────────────────
    if (ctx === "lage") {
      renderLagePanel({
        container,
        state,
        sim,
        advisorModel,
        gateFeedback: this._getGateFeedback(state),
        actions: {
          useFounderBrush: () => {
            this._dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
            rerenderPanel();
          },
          confirmFoundation: () => {
            this._dispatch(
              { type: "CONFIRM_FOUNDATION", payload: {} },
              {
                ok: "Gruendung bestaetigt. Genesis-Zone aktiv, Energiekern wartet.",
                blocked: "Gruendung blockiert.",
                hint: "Erforderlich: exakt 4 eigene, zusammenhaengende Founder im Startfenster.",
              }
            );
            rerenderPanel();
          },
          confirmCoreZone: () => {
            this._dispatch(
              { type: "CONFIRM_CORE_ZONE", payload: {} },
              {
                ok: "Energiekern bestaetigt. Run aktiv.",
                blocked: "Energiekern blockiert.",
                hint: "Erforderlich: exakt die bestaetigte Founder-Komponente als gueltiger Kernkandidat.",
              }
            );
            rerenderPanel();
          },
          confirmDnaZone: () => {
            this._dispatch(
              { type: "CONFIRM_DNA_ZONE", payload: {} },
              {
                ok: "DNA-Zone bestaetigt. Zone 2 aktiv.",
                blocked: "DNA-Zone blockiert.",
                hint: "Erforderlich: genau vier gueltige DNA-Kacheln als zusammenhaengende Komponente.",
              }
            );
            rerenderPanel();
          },
          startDnaZone: () => {
            this._dispatch(
              { type: "START_DNA_ZONE_SETUP", payload: {} },
              {
                ok: "DNA-Zone-Setup aktiv.",
                blocked: "DNA-Zone-Setup blockiert.",
                hint: "Erforderlich: volles DNA-Meter fuer Zone 2.",
              }
            );
            rerenderPanel();
          },
          startInfra: () => {
            this._dispatch(
              { type: "BEGIN_INFRA_BUILD", payload: {} },
              {
                ok: "Infrastrukturpfad aktiv. Canvas-Klicks stagen jetzt die Verbindung.",
                blocked: "Infrastrukturstart blockiert.",
                hint: "Erforderlich: RUN_ACTIVE, bestaetigte DNA-Zone, INFRA als naechster Unlock sowie genug DNA und gespeicherte Energie.",
              }
            );
            rerenderPanel();
          },
          confirmInfra: () => {
            const currentState = this._store.getState();
            const emptyBefore = countMaskTiles(currentState.world?.infraCandidateMask) === 0;
            this._dispatch(
              { type: "CONFIRM_INFRA_PATH", payload: {} },
              {
                ok: emptyBefore ? "Infrastrukturpfad beendet. Leerer Staging-Pfad hat nichts committed." : "Infrastrukturpfad committed.",
                blocked: "Infrastrukturpfad blockiert.",
                hint: emptyBefore
                  ? "Leeres Confirm beendet nur den Build-Modus. Fuer Commit braucht der Pfad eine gueltige zusammenhaengende Verbindung."
                  : "Pfad muss zusammenhaengend sein und an Kern, DNA-Zone oder bestehende commitete Infrastruktur anschliessen.",
              }
            );
            rerenderPanel();
          },
          advanceTime: async (ms, label) => {
            if (typeof window.advanceTime !== "function") {
              this._setActionFeedback({ ok: false, message: "advanceTime ist im aktuellen Runtime-Kontext nicht verfuegbar.", hint: "" });
              return;
            }
            const beforeTick = Number(this._store.getState()?.sim?.tick || 0);
            const result = await window.advanceTime(ms);
            this._setActionFeedback({
              ok: true,
              message: `${label} vorgespult.`,
              hint: `Tick ${beforeTick} -> ${Number(result?.tick || beforeTick)} in ${Number(result?.steps || 0)} Schritten.`,
            });
            rerenderPanel();
          },
        },
      });
      return;
    }

    // ── EINGRIFFE ───────────────────────────────────────────
    if (ctx === "eingriffe") {
      const mainRunActions = [
        { type: "HARVEST_PULSE", label: "Ernten", what: "Loest einen lokalen Erntepuls ueber die eigene Kolonie aus.", gain: "DNA und Harvest-Yield steigen.", risk: "Pflanzenmasse und lokale Saettigung sinken.", where: "Stark in nassen, dichten Korridoren." },
        { type: "PRUNE_CLUSTER", label: "Pflegen", what: "Schneidet ueberwuchernde oder toxische Cluster zurueck.", gain: "Prune-Yield und Raumkontrolle steigen.", risk: "Zu harte Rueckschnitte kosten kurzzeitig Biomasse.", where: "Gut in toxischen, dichten Clustern." },
        { type: "RECYCLE_PATCH", label: "Regenerieren", what: "Fuehrt toxinbelastete Flaechen in Naehrstofffluss zurueck.", gain: "Recycle-Yield und lokale Fruchtbarkeit steigen.", risk: "Braucht vorhandenen Toxindruck als Material.", where: "Am besten in belasteten Ufer- oder Sumpfsaeumen." },
        { type: "SEED_SPREAD", label: "Aussaeen", what: "Verteilt neue Pflanzen- und Biocharge-Impulse entlang der Linie.", gain: "Seed-Yield, Pflanzenmasse und Oekologie wachsen.", risk: "Verbraucht kurzfristig DNA.", where: "Besonders stark in Riverlands und Nasswald." },
      ];
      const mainRunActionHandlers = new Map();
      for (const action of mainRunActions) {
        mainRunActionHandlers.set(action.type, () => {
          this._dispatch(
            { type: action.type, payload: {} },
            { ok: `${action.label} ausgeloest.`, blocked: `${action.label} wurde blockiert.`, hint: `${action.gain} ${action.risk}` }
          );
          rerenderPanel();
        });
      }
      renderEingriffePanel({
        container,
        state,
        sim,
        actionDefs: mainRunActions,
        actions: {
          setDoctrine: (doctrine) => {
            this._dispatch(
              { type:"SET_PLAYER_DOCTRINE", payload:{ doctrineId: doctrine.id } },
              { ok: `Prioritaet auf ${doctrine.label} gesetzt.`, blocked: `${doctrine.label} ist noch gesperrt.`, hint: `Naechster Schritt: Stage ${doctrine.unlockStage} erreichen.` }
            );
            rerenderPanel();
          },
          runMainAction: (action) => {
            mainRunActionHandlers.get(action.type)?.();
          },
        },
      });
      return;
    }

    // ── EVOLUTION (Tech-Pfad) ───────────────────────────────
    if (ctx === "evolution") {
      const playerDNA = Number(sim.playerDNA || 0);
      const playerStage = Number(sim.playerStage || 1);
      const commandScore = deriveCommandScore(sim);
      const playerMemory = getPlayerMemory(state);
      const unlockedTechs = new Set(Array.isArray(playerMemory?.techs) ? playerMemory.techs.map(String) : []);
      const unlockedSynergies = new Set(Array.isArray(playerMemory?.synergies) ? playerMemory.synergies.map(String) : []);
      const visibleStages = new Set([Math.max(1, playerStage - 1), playerStage, Math.min(5, playerStage + 1)]);
      const gateHints = [];
      for (const tech of TECH_TREE) {
        if (unlockedTechs.has(tech.id)) continue;
        if (tech.stage > playerStage + 1) continue;
        const cost = 5 * Math.max(1, Number(tech.stage || 1));
        if (playerStage < tech.stage) {
          gateHints.push(`Stage-Gate: ${tech.label} ab S${tech.stage}.`);
          continue;
        }
        if (!hasRequiredTechs(unlockedTechs, tech.requires)) {
          gateHints.push(`Prereq-Gate: ${tech.label} benötigt ${tech.requires.join(", ")}.`);
          continue;
        }
        if (commandScore + 1e-9 < Number(tech.commandReq || 0)) {
          gateHints.push(`Command-Gate: ${tech.label} braucht ${Math.round((tech.commandReq || 0) * 100)} Command.`);
          continue;
        }
        if (playerDNA < cost) {
          gateHints.push(`DNA-Gate: ${tech.label} kostet ${cost} DNA.`);
          continue;
        }
      }

      const infoCard = el("section", "nx-card");
      infoCard.appendChild(el("div", "nx-card-title", "Tech-Kern"));
      infoCard.append(
        el("div", "nx-note", "Evo ist ein Aufstiegspfad. Sichtbar bleiben nur der aktuelle Ring, der nächste Ring und die gerade entstehenden Synergien."),
        el("div", "nx-stat-row", null)
      );
      infoCard.lastChild.append(el("span", "nx-label", `Stage S${playerStage}`), el("span", "nx-mono nx-val-pos", `🧬 ${playerDNA.toFixed(1)} DNA`));
      const cmdRow = el("div", "nx-stat-row nx-stat-row-col");
      cmdRow.append(el("span", "nx-label", `Command-Score ${Math.round(commandScore * 100)} / 100`));
      const cmdBar = el("div", "nx-bar-wrap");
      const cmdFill = el("div", "nx-bar-fill nx-bar-stage");
      cmdFill.style.width = `${(commandScore * 100).toFixed(1)}%`;
      cmdBar.appendChild(cmdFill);
      cmdRow.appendChild(cmdBar);
      infoCard.appendChild(cmdRow);
      container.appendChild(infoCard);

      if (gateHints.length) {
        const gateCard = el("section", "nx-card");
        gateCard.appendChild(el("div", "nx-card-title", "Evolution-Gates"));
        const uniq = [...new Set(gateHints)].slice(0, 3);
        for (const hint of uniq) gateCard.appendChild(el("div", "nx-note", hint));
        container.appendChild(gateCard);
      }

      for (let stage = 1; stage <= 5; stage++) {
        if (!visibleStages.has(stage)) continue;
        const stageNodes = TECH_TREE.filter((node) => node.stage === stage);
        const stageWrap = el("section", `nx-tech-stage${playerStage < stage ? " is-locked" : ""}`);
        stageWrap.appendChild(el("div", "nx-tech-stage-label", `Stage ${stage}`));
        const grid = el("div", "nx-tech-grid");
        for (const tech of stageNodes) {
          const techCost = 5 * Math.max(1, Number(tech.stage || 1));
          const owned = unlockedTechs.has(tech.id);
          const stageLocked = playerStage < tech.stage;
          const depReady = hasRequiredTechs(unlockedTechs, tech.requires);
          const commandReady = commandScore + 1e-9 >= Number(tech.commandReq || 0);
          const canBuy = !owned && !stageLocked && depReady && commandReady && playerDNA >= techCost;
          const nodeCls = owned ? "is-owned" : canBuy ? "is-ready" : "is-locked";
          const card = el("article", `nx-tech-node ${nodeCls}`);
          const head = el("div", "nx-tech-head");
          head.append(el("div", "nx-tech-name", tech.label), el("span", "nx-tech-lane", TECH_LANE_LABELS[tech.lane] || tech.lane));
          card.appendChild(head);
          card.appendChild(el("div", "nx-tech-desc", tech.desc));
          const metaRow = el("div", "nx-tech-meta");
          metaRow.append(
            el("span", owned ? "nx-badge-active" : "nx-badge", owned ? "Aktiv" : `${techCost} DNA`),
            el("span", commandReady ? "nx-badge" : "nx-badge nx-badge-warn", `Cmd ${Math.round((tech.commandReq || 0) * 100)}`),
          );
          card.appendChild(metaRow);
          const reqText = tech.requires.length ? `Benötigt: ${tech.requires.map((id) => TECH_TREE.find((entry) => entry.id === id)?.label || id).join(" + ")}` : "Startknoten";
          card.appendChild(el("div", "nx-note", reqText));
          const stateText = owned ? "Freigeschaltet" :
            stageLocked ? `Stage ${tech.stage} nötig` :
            !depReady ? "Prereqs fehlen" :
            !commandReady ? "Clusterstärke zu niedrig" :
            playerDNA < techCost ? "Zu wenig DNA" :
            "Jetzt integrieren";
          const btn = el("button", `nx-btn nx-btn-evolve${canBuy ? "" : " nx-btn-disabled"}`, stateText);
          btn.disabled = !canBuy;
          btn.addEventListener("click", () => {
            this._dispatch(
              { type: "BUY_EVOLUTION", payload: { archetypeId: tech.id } },
              {
                ok: `${tech.label} integriert.`,
                blocked: `${tech.label} konnte nicht freigeschaltet werden.`,
                hint: "Nächster Schritt: DNA, Stage, Prereqs und Command-Score prüfen.",
              }
            );
          });
          card.appendChild(btn);
          grid.appendChild(card);
        }
        stageWrap.appendChild(grid);
        container.appendChild(stageWrap);
      }

      if (playerStage < 5) {
        const nextCard = el("section", "nx-card");
        nextCard.appendChild(el("div", "nx-card-title", "Spätere Pfade"));
        nextCard.appendChild(el("div", "nx-note", `Stage ${Math.min(5, playerStage + 2)}+ bleibt komprimiert, bis deine Linie dort wirklich Optionen hat.`));
        container.appendChild(nextCard);
      }

      const synergyCard = el("section", "nx-card");
      synergyCard.appendChild(el("div", "nx-card-title", "Synergien"));
      for (const synergy of TECH_SYNERGIES) {
        const active = unlockedSynergies.has(synergy.id);
        const readyCount = synergy.requires.filter((req) => unlockedTechs.has(req)).length;
        const row = el("div", `nx-synergy-card${active ? " is-active" : ""}`);
        const left = el("div", "");
        left.append(
          el("div", "nx-zone-name", synergy.label),
          el("div", "nx-zone-desc", `${readyCount}/${synergy.requires.length} Techs · ${synergy.desc}`)
        );
        row.append(left, el("span", active ? "nx-badge-active" : "nx-badge", active ? "live" : "wartet"));
        synergyCard.appendChild(row);
      }
      container.appendChild(synergyCard);
      return;
    }

    // ── WELT ────────────────────────────────────────────────
    if (ctx === "welt") {
      const card = el("section","nx-card");
      card.setAttribute("aria-labelledby", "world-settings-title");
      const worldTitle = el("div", "nx-card-title", "Welt");
      worldTitle.id = "world-settings-title";
      card.appendChild(worldTitle);

      const presetRow = el("div", "nx-stack");
      presetRow.append(el("span", "nx-label", "Preset"));
      const preset = document.createElement("select"); preset.className = "nx-select";
      preset.setAttribute("aria-label", "Welt-Preset waehlen");
      for (const entry of WORLD_PRESET_OPTIONS) {
        const option = document.createElement("option");
        option.value = entry.id;
        option.textContent = entry.label;
        if (String(meta.worldPresetId || "river_delta") === entry.id) option.selected = true;
        preset.appendChild(option);
      }
      preset.addEventListener("change", () => {
        this._dispatch({ type: "SET_WORLD_PRESET", payload: { presetId: preset.value } });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      presetRow.appendChild(preset);
      const presetDef = WORLD_PRESET_OPTIONS.find((entry) => entry.id === String(meta.worldPresetId || "river_delta"));
      presetRow.appendChild(el("div", "nx-note", presetDef?.desc || ""));
      card.appendChild(presetRow);

      const seedRow = el("div", "nx-stack");
      seedRow.append(el("span", "nx-label", "Seed"));
      const seedInput = document.createElement("input");
      seedInput.type = "text";
      seedInput.className = "nx-select";
      seedInput.value = String(meta.seed || "");
      seedInput.setAttribute("aria-label", "Seed setzen");
      const seedApply = el("button", "nx-btn nx-btn-ghost", "Seed anwenden");
      seedApply.addEventListener("click", () => {
        this._dispatch({ type: "SET_SEED", payload: seedInput.value });
        this._dispatch({ type: "GEN_WORLD" });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      seedRow.append(seedInput, seedApply);
      card.appendChild(seedRow);

      const sizeRow = el("div","nx-row"); sizeRow.append(el("span","nx-label","Größe"));
      const size = document.createElement("select"); size.className="nx-select";
      size.setAttribute("aria-label", "Weltgröße wählen (startet Simulation neu)");
      [[16,16],[32,32],[48,48],[64,64],[72,72],[96,96],[120,120],[144,144]].forEach(([w,h]) => {
        const o=document.createElement("option"); o.value=`${w}x${h}`; o.textContent=`${w}×${h}`;
        if (w===meta.gridW&&h===meta.gridH) o.selected=true;
        size.appendChild(o);
      });
      size.addEventListener("change", () => {
        const [w,h]=size.value.split("x").map(Number);
        this._dispatch({ type:"SET_SPEED", payload:this._speedForGrid(w,h) });
        this._dispatch({ type:"SET_SIZE", payload:{w,h} });
        this._dispatch({ type:"GEN_WORLD" });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      sizeRow.append(size);
      card.appendChild(sizeRow);

      const speedRow = el("div","nx-stack");
      speedRow.append(el("span","nx-label",`Geschwindigkeit ${meta.speed} T/s`));
      const speed = document.createElement("input");
      speed.type="range"; speed.className="nx-range";
      speed.min="1"; speed.max="60"; speed.value=String(meta.speed);
      speed.setAttribute("aria-label", "Simulationsgeschwindigkeit anpassen");
      speed.addEventListener("input", () => {
        this._dispatch({ type:"SET_SPEED", payload:Number(speed.value) });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      speedRow.append(speed);
      card.appendChild(speedRow);

      const fog = summarizeFog(state.world);
      const fogCard = el("section", "nx-card");
      fogCard.appendChild(el("div", "nx-card-title", "Sicht-Legende"));
      fogCard.appendChild(el("div", "nx-note", "Sichtbar bleibt klar, erkundet wird gedimmt erinnert, unbesucht bleibt stark verdeckt."));
      fogCard.append(
        el("div", "nx-note", `Sichtbar: ${fog.visible}`),
        el("div", "nx-note", `Erkundet: ${fog.explored}`),
        el("div", "nx-note", `Unbesucht: ${fog.hidden}`)
      );
      container.append(card, fogCard);
      return;
    }

    // ── LABOR ───────────────────────────────────────────────
    if (ctx === "labor") {
      const worldCard = el("section","nx-card");
      worldCard.setAttribute("aria-labelledby", "systems-world-title");
      const worldTitle = el("div", "nx-card-title", "Laboransicht");
      worldTitle.id = "systems-world-title";
      worldCard.appendChild(worldTitle);

      const sizeRow = el("div","nx-row");
      sizeRow.append(el("span","nx-label","Größe"));
      const size = document.createElement("select");
      size.className = "nx-select";
      size.setAttribute("aria-label", "Weltgröße wählen");
      [[16,16],[32,32],[48,48],[64,64],[72,72],[96,96],[120,120],[144,144]].forEach(([w,h]) => {
        const option = document.createElement("option");
        option.value = `${w}x${h}`;
        option.textContent = `${w}×${h}`;
        if (w === meta.gridW && h === meta.gridH) option.selected = true;
        size.appendChild(option);
      });
      size.addEventListener("change", () => {
        const [w, h] = size.value.split("x").map(Number);
        this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:false } });
        this._dispatch({ type:"SET_SPEED", payload:this._speedForGrid(w,h) });
        this._dispatch({ type:"SET_SIZE", payload:{ w, h } });
        this._dispatch({ type:"GEN_WORLD" });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      sizeRow.append(size);
      worldCard.appendChild(sizeRow);

      const speedRow = el("div","nx-stack");
      speedRow.append(el("span","nx-label", `Geschwindigkeit ${meta.speed} T/s`));
      const speed = document.createElement("input");
      speed.type = "range";
      speed.className = "nx-range";
      speed.min = "1";
      speed.max = "60";
      speed.value = String(meta.speed);
      speed.setAttribute("aria-label", "Simulationsgeschwindigkeit anpassen");
      speed.addEventListener("input", () => {
        this._dispatch({ type:"SET_SPEED", payload:Number(speed.value) });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      speedRow.append(speed);
      worldCard.appendChild(speedRow);

      const renderRow = el("div","nx-row");
      renderRow.append(el("span","nx-label","Ansicht"));
      const render = document.createElement("select");
      render.className = "nx-select";
      render.setAttribute("aria-label", "Darstellungsmodus wählen");
      [["combined","Natürlich"],["light","Licht"],["fields","Felder"],["cells","Zellen"]].forEach(([v,t]) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = t;
        if ((meta.renderMode || "combined") === v) option.selected = true;
        render.appendChild(option);
      });
      render.addEventListener("change", () => {
        this._dispatch({ type:"SET_RENDER_MODE", payload:render.value });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      renderRow.append(render);
      worldCard.appendChild(renderRow);

      const overlayRow = el("div","nx-row");
      overlayRow.append(el("span","nx-label","Overlay"));
      const overlay = document.createElement("select");
      overlay.className = "nx-select";
      overlay.setAttribute("aria-label", "Diagnose-Overlay waehlen");
      [["none","Kanonisch"],["energy","Energie"],["toxin","Toxin"],["nutrient","Naehrstoffe"],["territory","Territorium"],["conflict","Konflikt"]].forEach(([v, t]) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = t;
        if ((meta.activeOverlay || "none") === v) option.selected = true;
        overlay.appendChild(option);
      });
      overlay.addEventListener("change", () => {
        this._dispatch({ type:"SET_OVERLAY", payload: overlay.value });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      overlayRow.append(overlay);
      worldCard.appendChild(overlayRow);

      const gl = meta.globalLearning || { enabled:false, strength:0.42 };
      const learnCard = el("section","nx-card nx-card-lab");
      learnCard.setAttribute("aria-labelledby", "systems-learning-title");
      const learnTitle = el("div", "nx-card-title", "Lab: Lernen");
      learnTitle.id = "systems-learning-title";
      learnCard.appendChild(learnTitle);

      const toggle = el("button","nx-btn", gl.enabled?"Learning an":"Learning aus");
      toggle.setAttribute("aria-label", `Globales Lernen ${gl.enabled ? "deaktivieren" : "aktivieren"}`);
      toggle.setAttribute("aria-pressed", gl.enabled);
      toggle.addEventListener("click", () => this._dispatch({ type:"SET_GLOBAL_LEARNING", payload:{ enabled:!gl.enabled } }));

      const reset = el("button","nx-btn","Learning reset");
      reset.setAttribute("aria-label", "Lernfortschritt zurücksetzen");
      reset.addEventListener("click", () => this._dispatch({ type:"RESET_GLOBAL_LEARNING" }));

      const strRow = el("div","nx-stack");
      strRow.append(el("span","nx-label",`Stärke ${fmt(Number(gl.strength||0.42),2)}`));
      const strength = document.createElement("input");
      strength.type="range"; strength.className="nx-range";
      strength.min="0"; strength.max="1"; strength.step="0.01"; strength.value=String(Number(gl.strength||0.42));
      strength.setAttribute("aria-label", "Lernintensität anpassen");
      strength.addEventListener("input", () => this._dispatch({ type:"SET_GLOBAL_LEARNING", payload:{ strength:Number(strength.value) } }));
      strRow.append(strength);
      learnCard.append(toggle, reset, strRow);

      // ARIA & Accessibility Settings
      const accCard = el("section", "nx-card");
      accCard.setAttribute("aria-labelledby", "systems-acc-title");
      const accTitle = el("div", "nx-card-title", "Zugang & Darstellung");
      accTitle.id = "systems-acc-title";
      accCard.appendChild(accTitle);

      const ariaLevel = Number(meta.ui?.ariaLevel || 1);
      const ariaRow = el("div", "nx-row");
      ariaRow.append(el("span", "nx-label", "Ansagen-Level"));
      const ariaSel = document.createElement("select"); ariaSel.className = "nx-select";
      ariaSel.setAttribute("aria-label", "Detailgrad der Screenreader-Ansagen");
      [[0, "Aus"], [1, "Kritisch"], [2, "Voll"]].forEach(([v, t]) => {
        const o = document.createElement("option"); o.value = String(v); o.textContent = t;
        if (ariaLevel === v) o.selected = true;
        ariaSel.appendChild(o);
      });
      ariaSel.addEventListener("change", () => {
      this._dispatch({ type: "SET_UI", payload: { ariaLevel: Number(ariaSel.value) } });
      });
      ariaRow.appendChild(ariaSel);
      accCard.appendChild(ariaRow);

      const offscreenEnabled = !!meta.ui?.offscreenEnabled;
      const offRow = el("div", "nx-row");
      const offToggle = el("button", `nx-btn ${offscreenEnabled ? "nx-btn-primary" : ""}`, offscreenEnabled ? "Threading: AN" : "Threading: AUS");
      offToggle.setAttribute("aria-label", `Performance-Threading ${offscreenEnabled ? "deaktivieren" : "aktivieren"} (Experimentell)`);
      offToggle.setAttribute("aria-pressed", offscreenEnabled);
      offToggle.addEventListener("click", () => {
      this._dispatch({ type: "SET_UI", payload: { offscreenEnabled: !offscreenEnabled } });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      offRow.append(el("span", "nx-label", "Offscreen-Rendering"), offToggle);
      accCard.appendChild(offRow);

      const detailMode = String(meta.ui?.renderDetailMode || "auto");
      const detailRow = el("div", "nx-stack");
      detailRow.append(el("span", "nx-label", "Detailsteuerung"));
      const detailSel = document.createElement("select");
      detailSel.className = "nx-select";
      detailSel.setAttribute("aria-label", "Darstellungsdetails steuern");
      for (const entry of RENDER_DETAIL_MODE_OPTIONS) {
        const option = document.createElement("option");
        option.value = entry.id;
        option.textContent = entry.label;
        if (entry.id === detailMode) option.selected = true;
        detailSel.appendChild(option);
      }
      detailSel.addEventListener("change", () => {
        this._dispatch({ type: "SET_UI", payload: { renderDetailMode: String(detailSel.value || "auto") } });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      const detailDef = RENDER_DETAIL_MODE_OPTIONS.find((entry) => entry.id === detailMode);
      detailRow.append(detailSel, el("div", "nx-note", detailDef?.desc || ""));
      accCard.appendChild(detailRow);

      const benchState = this._getBenchmarkState();
      const benchCard = el("section", "nx-card nx-card-lab");
      benchCard.setAttribute("aria-labelledby", "systems-benchmark-title");
      const benchTitle = el("div", "nx-card-title", "Lab: Benchmark");
      benchTitle.id = "systems-benchmark-title";
      benchCard.appendChild(benchTitle);
      const benchStatus = benchState?.isRunning
        ? `Läuft: ${benchState.phase} (${benchState.frames}/${benchState.targetFrames})`
        : benchState?.lastReport
          ? `Letzter Lauf: ${benchState.lastReport.finishedAt}`
          : "Noch kein Lauf vorhanden.";
      benchCard.appendChild(el("div", "nx-note", benchStatus));

      const benchActions = el("div", "nx-chip-grid");
      const benchmarkBtn = el("button", "nx-btn", benchState?.isRunning ? "Benchmark läuft" : "Start Benchmark");
      benchmarkBtn.setAttribute("aria-label", "Performance-Benchmark starten");
      benchmarkBtn.disabled = !!benchState?.isRunning;
      benchmarkBtn.addEventListener("click", () => this._dispatch({ type: "RUN_BENCHMARK" }));
      benchActions.appendChild(benchmarkBtn);

      const jsonBtn = el("button", "nx-btn nx-btn-ghost", "Log JSON");
      jsonBtn.disabled = !benchState?.lastReport;
      jsonBtn.addEventListener("click", () => window.__lifeGameBenchmark?.download?.("json"));
      benchActions.appendChild(jsonBtn);

      const csvBtn = el("button", "nx-btn nx-btn-ghost", "Log CSV");
      csvBtn.disabled = !benchState?.lastReport;
      csvBtn.addEventListener("click", () => window.__lifeGameBenchmark?.download?.("csv"));
      benchActions.appendChild(csvBtn);
      benchCard.appendChild(benchActions);

      if (benchState?.lastReport?.phases) {
        for (const phase of ["main", "worker"]) {
          const phaseReport = benchState.lastReport.phases[phase];
          if (!phaseReport) continue;
          const row = el("div", "nx-stat-row");
          row.append(
            el("span", "nx-label", phase === "main" ? "Main Thread" : "Worker"),
            el("span", "nx-mono", `${phaseReport.fps.avg.toFixed(1)} FPS · ${phaseReport.render.avg.toFixed(2)} ms`)
          );
          benchCard.appendChild(row);
        }
      }
      accCard.appendChild(benchCard);

      const phyCard = el("section","nx-card nx-card-lab");
      phyCard.setAttribute("aria-labelledby", "systems-physics-title");
      const physicsTitle = el("div", "nx-card-title", "Lab: Kern-Parameter");
      physicsTitle.id = "systems-physics-title";
      phyCard.appendChild(physicsTitle);

      const p = meta.physics || PHYSICS_DEFAULT;
      for (const [key,label,min,max,step] of PHYSICS_KEYS) {
        const row = el("div","nx-stack");
        row.append(el("span","nx-label",`${label} ${fmt(Number(p[key]),step<0.01?3:2)}`));
        const inp = document.createElement("input");
        inp.type="range"; inp.className="nx-range";
        inp.min=String(min); inp.max=String(max); inp.step=String(step); inp.value=String(Number(p[key]));
        inp.setAttribute("aria-label", `${label} anpassen`);
        inp.addEventListener("input", () => this._dispatch({ type:"SET_PHYSICS", payload:{ [key]:Number(inp.value) } }));
        row.append(inp); phyCard.append(row);
      }

      const rawCard = el("section", "nx-card nx-card-lab");
      rawCard.appendChild(el("div", "nx-card-title", "Lab: Rohwerkzeuge"));
      rawCard.appendChild(el("div", "nx-note", "Direkte Brushes, Zonen und Legacy-Ernte bleiben hier isoliert und sind kein Main-Run-Pfad."));

      const rawBrushRow = el("div", "nx-row");
      const brush = document.createElement("select"); brush.className = "nx-select";
      brush.setAttribute("aria-label", "Labor-Brush waehlen");
      [
        [BRUSH_MODE.OBSERVE, "Beobachtung"],
        [BRUSH_MODE.CELL_HARVEST, "Legacy Ernte"],
        [BRUSH_MODE.SPLIT_PLACE, "Split-Seed"],
        [BRUSH_MODE.ZONE_PAINT, "Zone malen"],
        [BRUSH_MODE.CELL_ADD, "Zelle setzen"],
        [BRUSH_MODE.CELL_REMOVE, "Zelle entfernen"],
        [BRUSH_MODE.LIGHT, "Licht +"],
        [BRUSH_MODE.LIGHT_REMOVE, "Licht -"],
        [BRUSH_MODE.NUTRIENT, "Naehrstoff +"],
        [BRUSH_MODE.TOXIN, "Toxin +"],
        [BRUSH_MODE.SATURATION_RESET, "Reset"],
      ].forEach(([v, t]) => {
        const option = document.createElement("option");
        option.value = v;
        option.textContent = t;
        if ((meta.brushMode || BRUSH_MODE.OBSERVE) === v) option.selected = true;
        brush.appendChild(option);
      });
      brush.addEventListener("change", () => this._dispatch({ type:"SET_BRUSH", payload:{ brushMode: brush.value } }));
      rawBrushRow.append(el("span", "nx-label", "Brush"), brush);
      rawCard.appendChild(rawBrushRow);

      const zoneRow = el("div", "nx-row");
      zoneRow.append(el("span", "nx-label", "Zone"));
      const zone = document.createElement("select"); zone.className = "nx-select";
      for (const entry of ZONE_TYPES) {
        const option = document.createElement("option");
        option.value = String(entry.id);
        option.textContent = entry.label;
        if (this._activeZoneType === entry.id) option.selected = true;
        zone.appendChild(option);
      }
      zone.addEventListener("change", () => {
        this._activeZoneType = Number(zone.value);
        this._dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.ZONE_PAINT } });
      });
      zoneRow.append(zone);
      rawCard.appendChild(zoneRow);

      const radiusRow = el("div","nx-stack");
      radiusRow.append(el("span","nx-label", `Pinsel-Radius ${meta.brushRadius || 3}`));
      const radius = document.createElement("input");
      radius.type = "range";
      radius.className = "nx-range";
      radius.min = "1";
      radius.max = "10";
      radius.value = String(meta.brushRadius || 3);
      radius.setAttribute("aria-label", "Pinsel-Radius anpassen");
      radius.addEventListener("input", () => this._dispatch({ type:"SET_BRUSH", payload:{ brushRadius:Number(radius.value) } }));
      radiusRow.append(radius);
      rawCard.appendChild(radiusRow);

      container.append(worldCard, learnCard, accCard, phyCard, rawCard);
      return;
    }
  }

    // ── GAME OVER OVERLAY ───────────────────────────────────

  _showGameOverlay(sim) {
    const isWin = sim.gameResult === GAME_RESULT.WIN;
    const modeLbl = WIN_MODE_RESULT_LABEL[sim.winMode] || sim.winMode;
    const inner = this._gameOverlayInner;
    inner.innerHTML = "";
    const icon  = el("div","nx-go-icon",  isWin?"🏆":"☠");
    const title = el("div","nx-go-title", isWin?"SIEG":"NIEDERLAGE");
    title.style.color = isWin?"var(--green)":"var(--red)";
    const sub  = el("div","nx-go-sub",   modeLbl);
    const tick = el("div","nx-go-tick",  `Tick ${sim.gameEndTick}`);
    const stats = el("div","nx-go-stats");
    for (const [label,val] of [
      ["DNA gesammelt", (sim.playerDNA||0).toFixed(1)],
      ["Gesamte Harvests", String(sim.totalHarvested||0)],
      ["Stage erreicht", `${sim.playerStage||1} / 5`],
      ["Energie gespeichert", (sim.playerEnergyStored||0).toFixed(2)],
      ["Suprematie-Ticks", String(sim.energySupremacyTicks||0)],
    ]) {
      const row = el("div","nx-go-stat-row");
      row.append(el("span","nx-go-stat-label",label), el("span","nx-go-stat-val",val));
      stats.appendChild(row);
    }
    const btnNew = el("button","nx-btn nx-btn-primary nx-go-btn","Neue Welt");
    btnNew.addEventListener("click", () => {
      this._gameOverlay.classList.add("hidden");
      this._lastGameResult = "";
      this._btnNew.click();
    });
    inner.append(icon, title, sub, tick, stats, btnNew);
    this._gameOverlay.classList.remove("hidden");
  }

  // ── GLOBAL KEYS ─────────────────────────────────────────
  _bindGlobalKeys() {
    window.addEventListener("keydown", (e) => {
      if (e.target && ["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "Space") { e.preventDefault(); this._btnPlay.click(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); this._btnNew.click(); }
      else if (e.key === "Escape") this._closeContext();
      else if (e.key === "l" || e.key === "L") { e.preventDefault(); this._togglePanel("lage"); }
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); this._togglePanel("evolution"); }
      else if (e.key === "i" || e.key === "I") { e.preventDefault(); this._togglePanel("eingriffe"); }
      else if (e.key === "w" || e.key === "W") { e.preventDefault(); this._togglePanel("welt"); }
      else if (e.key === "b" || e.key === "B") { e.preventDefault(); this._togglePanel("labor"); }
    });
  }

  // ── CANVAS PAINT ────────────────────────────────────────
  _paintAtClient(clientX, clientY, start) {
    if (!this._rInfo) return;
    const state = this._store.getState();
    const { dpr, tilePx, offX, offY } = this._rInfo;
    const rect = this._canvas.getBoundingClientRect();
    const sx = clientX - rect.left, sy = clientY - rect.top;
    const wx = Math.floor((sx*dpr - offX) / tilePx);
    const wy = Math.floor((sy*dpr - offY) / tilePx);
    if (wx<0||wy<0||wx>=state.meta.gridW||wy>=state.meta.gridH) return;
    const mode = state.meta.brushMode;
    const radius = state.meta.brushRadius || 3;
    if (this._isLabOnlyBrushMode(mode) && !this._isLaborPanelActive(state)) {
      this._ensureLabBrushIsolation(this._activeContext || "lage", state);
      if (start) {
        this._setActionFeedback({
          ok: false,
          message: "Labor-Rohwerkzeuge sind ausserhalb des Labor-Panels gesperrt.",
          hint: "Wechsle in Labor fuer Legacy-Brushes oder nutze Main-Run-Eingriffe.",
        });
      }
      return;
    }
    if (String(state.sim?.infraBuildMode || "") === "path") {
      if (!start) return;
      const idx = wy * state.meta.gridW + wx;
      const isSelected = (Number(state.world?.infraCandidateMask?.[idx] || 0) | 0) === 1;
      this._dispatch(
        { type: "BUILD_INFRA_PATH", payload: { x: wx, y: wy, remove: isSelected } },
        {
          ok: isSelected ? "Infrastrukturkachel entfernt." : "Infrastrukturkachel vorgemerkt.",
          blocked: "Infrastrukturpfad blockiert.",
          hint: "Pfad muss zusammenhaengend bleiben und an Kern, DNA-Zone oder commitete Infrastruktur anschliessen.",
        }
      );
      return;
    }
    if (mode === BRUSH_MODE.OBSERVE) return;
    if (mode === BRUSH_MODE.CELL_HARVEST) {
      if (!start) return;
      this._dispatch(
        { type:"HARVEST_CELL", payload:{ x:wx, y:wy } },
        { ok: "DNA-Ernte ausgeführt.", blocked: "Ernte blockiert.", hint: "Nächster Schritt: eigene Zelle wählen und Mindestpopulation halten." }
      );
      return;
    }
    if (mode === BRUSH_MODE.ZONE_PAINT) {
      this._dispatch({ type:"SET_ZONE", payload:{ x:wx, y:wy, radius, zoneType:this._activeZoneType } }); return;
    }
    if (mode === BRUSH_MODE.SPLIT_PLACE) {
      if (!start) return;
      this._dispatch(
        { type:"PLACE_SPLIT_CLUSTER", payload:{ x:wx, y:wy } },
        { ok: "Split-Seed gesetzt.", blocked: "Split-Seed blockiert.", hint: "Nächster Schritt: Split-Tech, Command-Score und freie 4x4-Zone prüfen." }
      );
      return;
    }
    if (mode === BRUSH_MODE.FOUNDER_PLACE) {
      if (!start) return;
      const idx = wy * state.meta.gridW + wx;
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      const isOwnFounder =
        (Number(state.world?.alive?.[idx] || 0) | 0) === 1 &&
        (Number(state.world?.lineageId?.[idx] || 0) | 0) === playerLineageId &&
        (Number(state.world?.founderMask?.[idx] || 0) | 0) === 1 &&
        String(state.sim?.runPhase || "") === "genesis_setup";
      this._dispatch(
        { type:"PLACE_CELL", payload:{ x:wx, y:wy, remove:isOwnFounder } },
        {
          ok: isOwnFounder ? "Founder entfernt." : "Founder platziert.",
          blocked: "Founder-Aktion blockiert.",
          hint: "Nur im Startfenster, maximal 4 Founder, vor Bestätigung entfernbar.",
        }
      );
      return;
    }
    if (String(state.sim?.runPhase || "") === RUN_PHASE.DNA_ZONE_SETUP) {
      if (!start) return;
      const idx = wy * state.meta.gridW + wx;
      const isSelected = (Number(state.world?.dnaZoneMask?.[idx] || 0) | 0) === 1;
      this._dispatch(
        { type: "TOGGLE_DNA_ZONE_CELL", payload: { x: wx, y: wy, remove: isSelected } },
        {
          ok: isSelected ? "DNA-Kachel entfernt." : "DNA-Kachel gesetzt.",
          blocked: "DNA-Kachel blockiert.",
          hint: "Nur lebende eigene Kacheln, nicht im Energiekern, angrenzend an Kern oder DNA-Zone.",
        }
      );
      return;
    }
    if (mode === BRUSH_MODE.CELL_ADD || mode === BRUSH_MODE.CELL_REMOVE) {
      if (!start) return;
      this._dispatch(
        { type:"PLACE_CELL", payload:{ x:wx, y:wy, remove:mode===BRUSH_MODE.CELL_REMOVE } },
        { ok: mode===BRUSH_MODE.CELL_REMOVE ? "Zelle entfernt." : "Zelle platziert.", blocked: "Zellaktion blockiert.", hint: "Nächster Schritt: Besitz/Gate und DNA-Kosten prüfen." }
      );
      return;
    }
    this._dispatch({ type:"PAINT_BRUSH", payload:{ x:wx, y:wy, radius, mode } });
  }

  _bindCanvasPaint() {
    this._canvas.style.touchAction = "none";
    this._canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this._canvas.addEventListener("pointerdown", (e) => {
      this._activePointers.add(e.pointerId);
      this._touchGesture = e.pointerType==="touch" && this._activePointers.size>1;
      this._paintActive = !this._touchGesture;
      this._canvas.setPointerCapture(e.pointerId);
      if (this._touchGesture) return;
      this._paintAtClient(e.clientX, e.clientY, true);
    });
    this._canvas.addEventListener("pointermove", (e) => {
      if (this._touchGesture||!this._paintActive) return;
      this._paintAtClient(e.clientX, e.clientY, false);
    });
    const end = (e) => {
      this._activePointers.delete(e.pointerId);
      if (this._activePointers.size===0) this._touchGesture=false;
      this._paintActive=false;
    };
    this._canvas.addEventListener("pointerup", end);
    this._canvas.addEventListener("pointercancel", end);
  }

  // ── SYNC (every frame) ──────────────────────────────────
  sync(state) {
    const { meta, sim } = state;
    const runPhase = String(sim.runPhase || "");
    const inGenesisSetup = runPhase === RUN_PHASE.GENESIS_SETUP;
    const inGenesisZone = runPhase === RUN_PHASE.GENESIS_ZONE;
    const inDnaZoneSetup = runPhase === RUN_PHASE.DNA_ZONE_SETUP;
    if (inGenesisSetup && String(meta.brushMode || BRUSH_MODE.OBSERVE) !== BRUSH_MODE.FOUNDER_PLACE) {
      this._dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
    }
    const running    = sim.running;
    const playerDNA  = Number(sim.playerDNA   || 0);
    const playerStage= Number(sim.playerStage || 1);
    const energyNet  = Number(sim.playerEnergyNet || 0);
    const season     = Number(sim.seasonPhase || 0);
    const playerAlive= Number(sim.playerAliveCount || 0);
    const advisorModel = applyFogIntelToAdvisorModel(
      buildAdvisorModel(state, { benchmark: this._getBenchmarkState() }),
      state
    );
    const doctrine = DOCTRINE_BY_ID[String(advisorModel.runIdentity.doctrine || "equilibrium")] || PLAYER_DOCTRINES[0];
    const riskState = getRiskState(advisorModel.status.risk);
    const goalState = getGoalState(advisorModel);
    const structureState = getStructureState(advisorModel.status.structure);
    const bottleneckState = getBottleneckState(advisorModel.advisor.bottleneckPrimary);
    const nextLeverState = getLeverState(advisorModel.advisor.nextLever);
    const winModeState = getWinModeState(advisorModel.runIdentity.winMode);
    const seasonIcon = season<0.25?"🌱":season<0.5?"☀":season<0.75?"🍂":"❄";

    // Topbar play btn
    this._btnPlay.textContent = running ? "Pause" : "Start";

    // KPI chips
    this._tickChip.textContent   = `t${sim.tick}`;
    this._aliveChip.textContent  = `alive ${sim.aliveCount}`;
    this._playerChip.textContent = `p ${playerAlive}`;
    this._dnaChip.textContent    = `◉ ${playerAlive}`;
    this._energyChip.textContent = `🧬 ${playerDNA.toFixed(1)}`;
    this._stageLabel.textContent = "Risiko";
    this._dangerLabel.textContent = "Run-Pfad";
    this._goalLabel.textContent = "Engpass";
    this._stageChip.textContent  = riskState.chip;
    this._seasonChip.textContent = `${seasonIcon} ${(season*100).toFixed(0)}%`;
    this._stageChip.style.color = riskState.color;
    this._stageChip.style.borderColor = riskState.color;

    const netSign = energyNet >= 0;
    if (inGenesisSetup) {
      this._dangerChip.textContent = "◎ Gruenden";
      this._goalChip.textContent = "🎯 4 Founder setzen";
      this._goalChip.title = "Genesis-Setup: Vier zusammenhaengende Founder im Startfenster setzen und Gruendung bestaetigen.";
    } else if (inGenesisZone) {
      this._dangerChip.textContent = "◎ Energiekern";
      this._goalChip.textContent = "🎯 Kern bestaetigen";
      this._goalChip.title = "Genesis-Zone: Founder sind fixiert. Bestaetige jetzt den Energiekern fuer RUN_ACTIVE.";
    } else if (inDnaZoneSetup) {
      this._dangerChip.textContent = "◎ DNA-Zone";
      this._goalChip.textContent = "🎯 Zone 2 bestaetigen";
      this._goalChip.title = "DNA-Zone-Setup: Waehle gueltige DNA-Kacheln und bestaetige dann Zone 2.";
    } else {
      this._dangerChip.textContent = `◎ ${winModeState.label}`;
      this._goalChip.textContent = `🎯 ${bottleneckState.title}`;
      this._goalChip.title = `${goalState.title}: ${goalState.detail}`;
    }

    // UI-GAME-01: Canvas-HUD sync — Reduced to Trend arrow
    this._hudEnergyArrow.textContent = netSign ? "▲" : "▼";
    this._hudEnergyVal.textContent   = `${netSign ? "+" : ""}${energyNet.toFixed(1)} ⚡`;
    this._hudEnergy.style.color      = netSign ? "var(--green)" : "var(--red)";
    if (inGenesisSetup) {
      this._hudTool.textContent = "Genesis-Setup | Founder Place: 4/4 zusammenhaengend im Startfenster";
    } else if (inGenesisZone) {
      this._hudTool.textContent = "Genesis-Zone | Energiekern bestaetigen, dann startet RUN_ACTIVE";
    } else if (inDnaZoneSetup) {
      this._hudTool.textContent = "DNA-Zone-Setup | DNA-Kacheln waehlen und Zone 2 bestaetigen";
    } else {
      this._hudTool.textContent = `${doctrine.label}: ${advisorModel.runIdentity.doctrineTradeoff} | Hebel: ${nextLeverState.label}`;
    }

    this._dockPlayBtn.classList.toggle("running", !!running);
    this._dockPlayBtn.querySelector(".nx-dock-icon").textContent = running ? "⏸" : "▶";
    this._dockPlayBtn.lastChild.textContent = running ? "Pause" : "Play";
    this._updateContextButtons();

    // Re-render open panel (safe update)
    if (this._activeContext) {
      const container = isDesktopLayout() ? this._sidebarBody : this._sheetBody;
      const suppressAutoRefresh = !!running && (this._activeContext === "eingriffe" || this._activeContext === "labor");
      if (suppressAutoRefresh) return;
      const now = Date.now();
      const panelCooldown = this._getPanelRefreshCooldown(this._activeContext, !!running);
      const panelInCooldown = (now - this._lastPanelRenderAt) < panelCooldown;
      if (!panelInCooldown && !this._isPanelInteractionActive()) {
        this._renderPanelBody(container, state);
      }
    } else if (isDesktopLayout()) {
      this._activeContext = "lage";
      this._renderPanelBody(this._sidebarBody, state);
      this._updateContextButtons();
    }

    // --- Critical ARIA Announcements ───────────────────────
    if (sim.playerDNA > this._lastDNA) {
      this._announce(`DNA erhöht auf ${sim.playerDNA.toFixed(1)}`);
    } else if (sim.playerDNA < this._lastDNA) {
      this._announce(`DNA reduziert auf ${sim.playerDNA.toFixed(1)}`);
    }
    this._lastDNA = sim.playerDNA;

    if (sim.playerStage > this._lastStage) {
      this._announce(`Evolution-Stufe ${sim.playerStage} erreicht!`, 2);
    }
    this._lastStage = sim.playerStage;

    if (sim.gameResult && sim.gameEndTick === sim.tick && sim.gameEndTick !== this._lastGameEndTick) {
      if (sim.gameResult === GAME_RESULT.WIN) this._announce(`Sieg! (${sim.winMode})`);
      else if (sim.gameResult === GAME_RESULT.LOSS) this._announce(`Niederlage! (${sim.winMode})`);
      this._lastGameEndTick = sim.gameEndTick;
    }

    // --- Dev panel ─────────────────────────────────────────
  }
}

