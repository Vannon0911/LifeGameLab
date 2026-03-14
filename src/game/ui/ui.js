import { PHYSICS_DEFAULT } from "../../core/kernel/physics.js";
import { APP_VERSION } from "../../project/project.manifest.js";
import { buildAdvisorModel } from "../../project/llm/advisorModel.js";
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
  WIN_MODE,
  WIN_MODE_RESULT_LABEL,
} from "../contracts/ids.js";
import {
  ARCHETYPES,
  PANEL_BY_KEY,
  PANEL_DEFS,
  PHYSICS_KEYS,
  STAGE_THRESHOLDS,
  STATUS_GROUPS,
  TECH_LANE_LABELS,
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
  getZoneState,
} from "./ui.model.js";
import { el, fmt, fmtSign, isDesktopLayout } from "./ui.dom.js";
import { announceInLiveRegion, buildGateFeedback, createActionFeedback } from "./ui.feedback.js";

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
    if (contextKey === "status") return 260;
    if (contextKey === "evolution") return 900;
    if (contextKey === "tools") return 1200;
    if (contextKey === "systems") return 1200;
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
    this._sheetTitle = el("div", "nx-sheet-title", "Status");
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
      if (m >= 144) return 2; if (m >= 120) return 2;
      if (m >= 96)  return 3; if (m >= 72)  return 3;
      if (m >= 64)  return 4; if (m >= 48)  return 5;
      return 6;
    };
    this._speedForGrid = speedForGrid;

    const togglePlay = () => {
      const running = !!this._store.getState().sim.running;
      this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:!running } });
    };

    this._btnPlay.addEventListener("click", togglePlay);
    this._btnStep.addEventListener("click", () => {
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

  _applyResponsiveDefaults(forceReset = false) {
    const desktop = isDesktopLayout();
    const app = document.getElementById("app");
    app?.classList.remove("is-panel-open");
    if (desktop) {
      this._sheet.classList.add("hidden");
      this._sheetBackdrop.classList.add("hidden");
      if (forceReset || !PANEL_BY_KEY[this._activeContext]) this._activeContext = "status";
      this._renderPanelBody(this._sidebarBody, this._store.getState());
    } else if (forceReset) {
      this._activeContext = "status";
      this._sidebarBody.innerHTML = "";
      this._sheet.classList.add("hidden");
      this._sheetBackdrop.classList.add("hidden");
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

  // ── SHEET (mobile) ──────────────────────────────────────
  _toggleSheet(key) {
    if (this._activeContext === key && !this._sheet.classList.contains("hidden")) {
      this._closeSheet();
      return;
    }
    this._activeContext = key;
    this._sheetTitle.textContent = PANEL_BY_KEY[key]?.title || key;
    this._sheet.classList.remove("hidden");
    this._sheetBackdrop.classList.remove("hidden");
    document.getElementById("app")?.classList.add("is-panel-open");
    // Re-animate
    this._sheet.style.animation = "none";
    requestAnimationFrame(() => { this._sheet.style.animation = ""; });
    this._renderPanelBody(this._sheetBody, this._store.getState());
    this._updateContextButtons();
  }

  _closeSheet() {
    this._sheet.classList.add("hidden");
    this._sheetBackdrop.classList.add("hidden");
    document.getElementById("app")?.classList.remove("is-panel-open");
    this._updateContextButtons();
  }

  // ── SIDEBAR (desktop) ────────────────────────────────────
  _toggleSidebar(key) {
    this._activeContext = key;
    this._renderPanelBody(this._sidebarBody, this._store.getState());
    this._updateContextButtons();
  }

  _closeContext() {
    if (isDesktopLayout()) {
      this._activeContext = "status";
      this._renderPanelBody(this._sidebarBody, this._store.getState());
      this._updateContextButtons();
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

  _getActiveToolMeta(state) {
    const mode = String(state?.meta?.brushMode || BRUSH_MODE.OBSERVE);
    const zone = ZONE_TYPES.find((entry) => entry.id === this._activeZoneType);
    const map = {
      observe: "Beobachtung",
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
    const advisorModel = buildAdvisorModel(state, { benchmark: this._getBenchmarkState() });
    container.innerHTML = "";
    const ctx = this._activeContext;
    const panelMeta = PANEL_BY_KEY[ctx];
    if (panelMeta) {
      const hero = el("section", `nx-panel-hero nx-panel-hero-${panelMeta.tone}`);
    const eyebrow = el("div", "nx-panel-eyebrow", isDesktopLayout() ? "Cell Factory" : "Factory Dock");
      const title = el("h2", "nx-panel-title", panelMeta.title);
      const summaryMap = {
        status: "Lagebild, Risiko und Missionsfokus der aktiven Kolonie.",
        evolution: "Ein fokussierter Aufstiegspfad statt eine lange Einkaufsliste.",
        tools: "Wenige spürbare Eingriffe für eine Linie, die primär selbst wächst.",
        systems: "Spieloptionen vorn, Labor und Benchmark getrennt dahinter.",
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
	    if (ctx === "status") {
	      const playerMemory = getPlayerMemory(state);
	      const playerStage = Number(sim.playerStage || 1);
	      const playerAlive = Number(sim.playerAliveCount || 0);
	      const energyNet = Number(sim.playerEnergyNet || 0);
	      const commandScore = deriveCommandScore(sim);
	      const doctrine = DOCTRINE_BY_ID[String(playerMemory?.doctrine || "equilibrium")] || PLAYER_DOCTRINES[0];
	      const influencePhase = getInfluencePhase(playerStage, advisorModel.status.commandScore);
	      const goalState = getGoalState(advisorModel);
	      const structureState = getStructureState(advisorModel.status.structure);
	      const riskState = getRiskState(advisorModel.status.risk);
	      const bottleneckState = getBottleneckState(advisorModel.advisor.bottleneckPrimary);
	      const nextActionState = getActionState(advisorModel.advisor.nextAction);
	      const nextLeverState = getLeverState(advisorModel.advisor.nextLever);
	      const zoneState = getZoneState(advisorModel.advisor.recommendedZone);
	      const overlayState = getOverlayState(advisorModel.advisor.recommendedOverlay);
	      const winModeState = getWinModeState(advisorModel.runIdentity.winMode);
	      const gateFeedback = this._getGateFeedback(state);

	      const mkBar = (pct, cls, label) => {
        const wrap = el("div", "nx-bar-wrap");
        wrap.setAttribute("role", "progressbar");
        wrap.setAttribute("aria-valuenow", Math.round(pct * 100));
        wrap.setAttribute("aria-valuemin", "0");
        wrap.setAttribute("aria-valuemax", "100");
        wrap.setAttribute("aria-label", label);
        const fill = el("div", `nx-bar-fill ${cls}`);
        fill.style.width = `${Math.min(100, Math.max(0, pct * 100)).toFixed(1)}%`;
        wrap.appendChild(fill);
        return wrap;
      };
      const mkMetric = (label, val, cls = "nx-mono") => {
        const row = el("div", "nx-stat-row");
        row.append(el("span", "nx-label", label), el("span", cls, val));
        return row;
      };

	      let statusText = "Kolonie beobachtet ihr Umfeld. Autonomes Wachstum hat Vorrang.";
	      let statusColor = "var(--cyan)";
	      if (advisorModel.advisor.bottleneckPrimary === "collapse") {
	        statusText = "Kolonie kollabiert. Die aktive Linie hat keine tragfaehige Struktur mehr.";
	        statusColor = "var(--red)";
	      } else if (advisorModel.advisor.bottleneckPrimary === "energy") {
	        statusText = "Energie kippt ins Minus. BUFFER, Reserve oder defensivere Prioritaet zuerst.";
	        statusColor = "var(--red)";
	      } else if (advisorModel.advisor.bottleneckPrimary === "toxin") {
	        statusText = "Toxinlast steigt. Detox, Quarantaene oder robustere Korridore werden relevant.";
	        statusColor = "var(--orange)";
	      } else if (advisorModel.advisor.bottleneckPrimary === "win_push") {
	        statusText = "Keine groessere Krise blockiert den Run. Der Siegpfad darf jetzt Prioritaet bekommen.";
	        statusColor = "var(--green)";
	      } else if (advisorModel.advisor.nextAction === "wait_and_advance_time") {
	        statusText = "Kein dominanter Krisenengpass aktiv. Beobachtung und Vorspulen liefern die beste neue Information.";
	        statusColor = "var(--cyan)";
	      }

	      const alertCard = el("section", "nx-card");
	      alertCard.appendChild(el("div", "nx-card-title", "Lagebericht"));
	      const alertBox = el("div", "nx-alert-box", statusText);
	      alertBox.style.color = statusColor;
	      alertBox.style.borderColor = statusColor;
	      alertCard.appendChild(alertBox);
	      alertCard.appendChild(el("div", "nx-note", `${bottleneckState.title}: ${bottleneckState.detail}`));
	      alertCard.appendChild(el("div", "nx-note", `Reason-Codes: ${(advisorModel.advisor.reasonCodes || []).join(", ") || "none"}`));
	      container.appendChild(alertCard);

	      const missionCard = el("section", "nx-card nx-card-mission");
	      missionCard.appendChild(el("div", "nx-card-title", "Aktuelle Mission"));
	      missionCard.appendChild(el("div", "nx-mission-title", goalState.title));
	      missionCard.appendChild(el("div", "nx-mission-copy", goalState.detail));
	      missionCard.append(
	        mkMetric("Mission", goalState.short, "nx-mono nx-val-pos"),
	        mkMetric("Risiko", riskState.label, riskState.id === "stable" ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
	        mkMetric("Struktur", structureState.tier),
	        mkMetric("Run-Pfad", winModeState.label),
	        mkMetric("Win-Blocker", advisorModel.winProgress.blockerCode)
	      );
	      container.appendChild(missionCard);

	      const commandCard = el("section", "nx-card");
	      commandCard.appendChild(el("div", "nx-card-title", "Advisor"));
	      const commandHero = el("div", "nx-active-tool");
	      commandHero.append(
	        el("div", "nx-active-tool-label", influencePhase),
	        el("div", "nx-active-tool-copy", `${doctrine.label}: ${advisorModel.runIdentity.doctrineTradeoff}`)
	      );
	      commandCard.appendChild(commandHero);
	      commandCard.append(
	        mkMetric("Engpass", bottleneckState.title),
	        mkMetric("Naechste Aktion", nextActionState.label),
	        mkMetric("Naechster Hebel", nextLeverState.label),
	        mkMetric("Command-Score", `${Math.round(advisorModel.status.commandScore * 100)} / 100`, "nx-mono nx-val-pos"),
	        mkBar(advisorModel.status.commandScore, "nx-bar-stage", "Command-Score"),
	        mkMetric("Doctrine", doctrine.label),
	        mkMetric("Trade-off", advisorModel.runIdentity.doctrineTradeoff),
	        mkMetric("Split", advisorModel.status.splitReady ? "bereit" : "noch nicht", advisorModel.status.splitReady ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
	        mkMetric("Clusterstärke", `${Math.round(Number(sim.clusterRatio || 0) * 100)}%`),
	        mkMetric("Netzwerk", `${Math.round(Number(sim.networkRatio || 0) * 100)}%`),
	        mkMetric("Synergien", String((playerMemory?.synergies || []).length || 0))
	      );
	      container.appendChild(commandCard);

      const energyCard = el("section", "nx-card");
      energyCard.appendChild(el("div", "nx-card-title", "Energie & Wachstum"));
      energyCard.append(
        mkMetric("Population", String(playerAlive), playerAlive > 0 ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
        mkMetric("Netto", fmtSign(energyNet, 2), energyNet >= 0 ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
        mkMetric("Zufluss", fmt(Number(sim.playerEnergyIn || 0), 2)),
        mkMetric("Abfluss", fmt(Number(sim.playerEnergyOut || 0), 2)),
        mkMetric("Gespeichert", fmt(Number(sim.playerEnergyStored || 0), 2))
      );
      const mixGrid = el("div", "nx-stat-grid");
      const lightBlock = el("div", "nx-stat-row nx-stat-row-col");
      lightBlock.append(el("span", "nx-label", `Licht ${(Number(sim.lightShare || 0) * 100).toFixed(0)}%`), mkBar(Number(sim.lightShare || 0), "nx-bar-light", "Lichtanteil"));
      const nutrientBlock = el("div", "nx-stat-row nx-stat-row-col");
      nutrientBlock.append(el("span", "nx-label", `Nährstoffe ${(Number(sim.nutrientShare || 0) * 100).toFixed(0)}%`), mkBar(Number(sim.nutrientShare || 0), "nx-bar-nutrient", "Nährstoffanteil"));
      mixGrid.append(lightBlock, nutrientBlock);
      energyCard.appendChild(mixGrid);
      container.appendChild(energyCard);

	      const progressCard = el("section", "nx-card");
	      progressCard.appendChild(el("div", "nx-card-title", "Siegpfad & Ausbau"));
	      progressCard.append(
	        mkMetric("Stage", `S${playerStage}`, "nx-mono nx-chip-stage"),
	        mkMetric("DNA", `🧬 ${fmt(Number(sim.playerDNA || 0), 1)}`),
	        mkMetric("Ernten", String(Number(sim.totalHarvested || 0))),
	        mkMetric("Aktiver Siegpfad", winModeState.label),
	        mkMetric("Win-Fortschritt", `${advisorModel.winProgress.progress} / ${advisorModel.winProgress.target}`),
	        mkMetric("Naechste Zone", zoneState.label),
	        mkMetric("Naechster Overlay-Scan", overlayState.label)
	      );
	      progressCard.append(
	        el("div", "nx-note", `${structureState.detail} Phase ${influencePhase}: ${advisorModel.winProgress.blockerDetail}`),
	        mkBar(Math.min(1, Number(sim.energySupremacyTicks || 0) / 200), "nx-bar-light", "Suprematie-Fortschritt"),
	        mkBar(Math.min(1, Number(sim.stockpileTicks || 0) / 200), "nx-bar-nutrient", "Territorium-Fortschritt"),
	        mkBar(Math.min(1, Number(sim.efficiencyTicks || 0) / 100), "nx-bar-stage", "Effizienz-Fortschritt")
	      );
	      container.appendChild(progressCard);

      const timeCard = el("section", "nx-card");
      timeCard.appendChild(el("div", "nx-card-title", "Zeitfenster"));
      timeCard.appendChild(el("div", "nx-note", advisorModel.advisor.nextAction === "wait_and_advance_time"
        ? "Beobachtung ist gerade die beste Hauptaktion. Vorspulen macht die naechste Diagnose sichtbar."
        : "Vorspulen bleibt Analysewerkzeug. Nutze es, um die Wirkung deines letzten Eingriffs zu lesen."));
      const timeGrid = el("div", "nx-chip-grid");
      for (const [label, ms] of [["+1s", 1000], ["+5s", 5000], ["+15s", 15000]]) {
        const btn = el("button", "nx-btn nx-btn-ghost", label);
        btn.addEventListener("click", async () => {
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
          queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
        });
        timeGrid.appendChild(btn);
      }
      timeCard.appendChild(timeGrid);
      container.appendChild(timeCard);

      if (gateFeedback.length) {
        const gateCard = el("section", "nx-card");
        gateCard.appendChild(el("div", "nx-card-title", "Gate-Check"));
        for (const item of gateFeedback) {
          const row = el("div", "nx-stat-row nx-stat-row-col");
          row.appendChild(el("span", item.level === "warn" ? "nx-label nx-val-neg" : "nx-label", item.text));
          row.appendChild(el("span", "nx-note", item.next));
          gateCard.appendChild(row);
        }
        container.appendChild(gateCard);
      }

	      const ovCard = el("section", "nx-card");
	      ovCard.appendChild(el("div", "nx-card-title", "Scanner"));
	      ovCard.appendChild(el("div", "nx-note", `Empfohlen: ${overlayState.label}${overlayState.id !== "none" ? ` fuer ${bottleneckState.title}` : ""}`));
	      const ovGrid = el("div", "nx-chip-grid");
      const overlayLabels = {
        [OVERLAY_MODE.NONE]: "Normal",
        [OVERLAY_MODE.ENERGY]: "Energie",
        [OVERLAY_MODE.TOXIN]: "Toxine",
        [OVERLAY_MODE.NUTRIENT]: "Nährstoffe",
        [OVERLAY_MODE.TERRITORY]: "Besitz",
        [OVERLAY_MODE.CONFLICT]: "Konflikt",
      };
      for (const overlayId of OVERLAY_MODE_VALUES) {
        const btn = el("button", `nx-btn nx-btn-ghost ${meta.activeOverlay === overlayId ? "is-active" : ""}`, overlayLabels[overlayId] || overlayId);
        btn.setAttribute("aria-pressed", meta.activeOverlay === overlayId);
        btn.addEventListener("click", () => {
          this._dispatch(
            { type:"SET_OVERLAY", payload: overlayId },
            { ok: `Scanner auf ${overlayLabels[overlayId] || overlayId} gesetzt.`, blocked: "Scanner konnte nicht umgeschaltet werden.", hint: "Nächster Schritt: prüfe aktive Panel- und Spielzustände." }
          );
          queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
        });
	        ovGrid.appendChild(btn);
	      }
	      ovCard.appendChild(ovGrid);
	      container.appendChild(ovCard);
	      return;
    }

    // ── TOOLS (Werkzeuge Hub) ───────────────────────────────
    if (ctx === "tools") {
      const activeTool = this._getActiveToolMeta(state);
      const splitUnlocked = this._hasSplitUnlock(state);
      const playerMemory = getPlayerMemory(state);
      const playerStage = Number(sim.playerStage || 1);
      const commandScore = deriveCommandScore(sim);
      const influencePhase = getInfluencePhase(playerStage, commandScore);
      const currentDoctrine = DOCTRINE_BY_ID[String(playerMemory?.doctrine || "equilibrium")] || PLAYER_DOCTRINES[0];
      const zoneUnlocked = playerStage >= 2 || commandScore >= 0.10;
      const gateFeedback = this._getGateFeedback(state);

      const activeCard = el("section","nx-card");
      activeCard.appendChild(el("div", "nx-card-title", "Aktiver Eingriff"));
      const activeHero = el("div", "nx-active-tool");
      activeHero.append(
        el("div", "nx-active-tool-label", activeTool.label),
        el("div", "nx-active-tool-copy", activeTool.detail || "Direkte Werkzeuge sind sparsam. Wachstum bleibt autonom.")
      );
      activeCard.appendChild(activeHero);
      activeCard.appendChild(el("div", "nx-note", `Phase ${influencePhase}. Priorität ${currentDoctrine.label} steuert die Linie permanent.`));
      container.appendChild(activeCard);

      if (gateFeedback.length) {
        const gateCard = el("section", "nx-card");
        gateCard.appendChild(el("div", "nx-card-title", "Werkzeug-Gates"));
        for (const item of gateFeedback) {
          gateCard.appendChild(el("div", "nx-note", `${item.text} ${item.next}`));
        }
        container.appendChild(gateCard);
      }

      const doctrineCard = el("section","nx-card");
      doctrineCard.appendChild(el("div", "nx-card-title", "Priorität"));
      const doctrineGrid = el("div", "nx-doctrine-grid");
      for (const doctrine of PLAYER_DOCTRINES) {
        const locked = playerStage < Number(doctrine.unlockStage || 1);
        const active = doctrine.id === currentDoctrine.id;
        const card = el("button", `nx-doctrine-card${active ? " is-active" : ""}${locked ? " is-locked" : ""}`);
        card.disabled = locked;
        card.append(
          el("span", "nx-doctrine-name", doctrine.label),
          el("span", "nx-doctrine-stage", `ab S${doctrine.unlockStage}`),
          el("span", "nx-doctrine-copy", doctrine.summary)
        );
        card.addEventListener("click", () => {
          this._dispatch(
            { type:"SET_PLAYER_DOCTRINE", payload:{ doctrineId: doctrine.id } },
            {
              ok: `Priorität auf ${doctrine.label} gesetzt.`,
              blocked: `${doctrine.label} ist noch gesperrt.`,
              hint: `Nächster Schritt: Stage ${doctrine.unlockStage} erreichen.`,
            }
          );
          queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
        });
        doctrineGrid.appendChild(card);
      }
      doctrineCard.appendChild(doctrineGrid);
      container.appendChild(doctrineCard);

      const mainCard = el("section","nx-card");
      mainCard.appendChild(el("div", "nx-card-title", "Strategische Eingriffe"));
      for (const act of [
        { id:BRUSH_MODE.OBSERVE, label:"Beobachtung", desc:"Keine direkte Manipulation. Die Kolonie wächst autonom.", tag:"Standard", locked:false },
        { id:BRUSH_MODE.SPLIT_PLACE, label:"Split-Seed", desc: splitUnlocked ? "Setzt einen neuen 4x4-Cluster als kontrollierten Startpunkt." : "Benötigt Split-Kern plus Clusterstärke.", tag: splitUnlocked ? "4x4" : "gesperrt", locked:!splitUnlocked },
        { id:BRUSH_MODE.CELL_HARVEST, label:"DNA-Ernte", desc:"Erntet gezielt eine eigene Zelle für DNA.", tag:"+DNA", locked:false },
        { id:BRUSH_MODE.ZONE_PAINT, label:"Territorium", desc: zoneUnlocked ? "Markiert Harvest-, Buffer- oder Defense-Zonen." : "Erst ab stabiler Kolonie sinnvoll.", tag: zoneUnlocked ? "Zone" : "später", locked:!zoneUnlocked },
      ]) {
        const isActive = meta.brushMode === act.id;
        const row = el("div", `nx-zone-row${isActive ? " nx-zone-active" : ""}${act.locked ? " nx-archetype-locked" : ""}`);
        row.style.cursor = "pointer";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-pressed", isActive);
        if (act.locked) row.setAttribute("aria-disabled", "true");
        const left = el("div", "");
        left.appendChild(el("div", "nx-zone-name", act.label));
        left.appendChild(el("div", "nx-zone-desc", act.desc));
        row.append(left, el("span", isActive ? "nx-badge-active" : "nx-badge", act.tag));
        const trigger = () => {
          if (act.locked) return;
          this._dispatch(
            { type:"SET_BRUSH", payload:{ brushMode:act.id } },
            { ok: `${act.label} aktiviert.`, blocked: `${act.label} bleibt gesperrt.`, hint: act.locked ? "Nächster Schritt: Gate im Status-Panel erfüllen." : "" }
          );
          queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
        };
        row.addEventListener("click", trigger);
        row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
        mainCard.appendChild(row);
      }
      container.appendChild(mainCard);


      const zoneCard = el("section","nx-card");
      zoneCard.appendChild(el("div", "nx-card-title", "Zonentyp"));

      for (const z of ZONE_TYPES) {
        const isActive = this._activeZoneType === z.id && meta.brushMode === BRUSH_MODE.ZONE_PAINT;
        const row = el("div",`nx-zone-row${isActive ?" nx-zone-active":""}${!zoneUnlocked ? " nx-archetype-locked" : ""}`);
        row.append(el("span","nx-zone-name",`${z.label}`), el("span","nx-zone-desc",z.desc));
        row.style.cursor="pointer";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `Zone ${z.label}: ${z.desc}`);
        row.setAttribute("aria-pressed", isActive);
        if (!zoneUnlocked) row.setAttribute("aria-disabled", "true");

        const trigger = () => {
          if (!zoneUnlocked) return;
          this._activeZoneType=z.id;
          this._dispatch(
            { type:"SET_BRUSH", payload:{ brushMode:BRUSH_MODE.ZONE_PAINT } },
            { ok: `${z.label}-Zone aktiv.`, blocked: "Zone-Pinsel konnte nicht aktiviert werden.", hint: "Nächster Schritt: Stage/Command-Gate prüfen." }
          );
          queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
        };
        row.addEventListener("click", trigger);
        row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
        zoneCard.appendChild(row);
      }
      container.appendChild(zoneCard);

      const sandboxCard = el("section","nx-card");
      sandboxCard.appendChild(el("div", "nx-card-title", "Labormodus"));
      const sandInfo = el("div", "nx-note", "Direkte Umweltmanipulation bleibt nur fuer spaetere Tests. Sie ist bewusst aus der Primaersteuerung entfernt.");
      sandboxCard.appendChild(sandInfo);
      
      const sRow = el("div", "nx-row");
      const brush = document.createElement("select"); brush.className="nx-select";
      brush.setAttribute("aria-label", "Umwelt-Pinsel Modus wählen");
      [["light","☀ Licht +"],["light_remove","☀ Licht -"],
       ["nutrient","🌿 Nährstoff +"],["toxin","☣ Toxin +"],
       ["saturation_reset","↺ Reset"]
      ].forEach(([v,t]) => {
        const o = document.createElement("option"); o.value=v; o.textContent=t;
        if (meta.brushMode === v) o.selected=true;
        brush.appendChild(o);
      });
      brush.addEventListener("change", () => {
        this._dispatch(
          { type:"SET_BRUSH", payload:{ brushMode:brush.value } },
          { ok: `Laborpinsel ${brush.value} aktiv.`, blocked: "Laborpinsel wurde vom Brush-Gate abgewiesen.", hint: "Nächster Schritt: nur erlaubte Brush-Modi verwenden." }
        );
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      sRow.append(el("span", "nx-label", "Umwelt-Pinsel"), brush);
      sandboxCard.appendChild(sRow);

      const radRow = el("div", "nx-stat-row nx-stat-row-col");
      radRow.append(el("span", "nx-label", `Pinsel-Radius: ${meta.brushRadius || 3}`));
      const radRange = document.createElement("input");
      radRange.type = "range"; radRange.min = "1"; radRange.max = "10"; radRange.value = String(meta.brushRadius || 3);
      radRange.className = "nx-range";
      radRange.setAttribute("aria-label", "Pinsel-Radius anpassen");
      radRange.addEventListener("input", (e) => {
        this._dispatch({ type:"SET_BRUSH", payload:{ brushRadius: Number(e.target.value) } });
      });
      radRow.appendChild(radRange);
      sandboxCard.appendChild(radRow);

      const costRow = el("div", "nx-row");
      const costToggle = el("button", `nx-btn ${meta.placementCostEnabled ? "nx-btn-primary" : ""}`, meta.placementCostEnabled ? "Kosten: AN" : "Kosten: AUS");
      costToggle.setAttribute("aria-label", `Platzierungs-Kosten ${meta.placementCostEnabled ? "deaktivieren" : "aktivieren"}`);
      costToggle.setAttribute("aria-pressed", meta.placementCostEnabled);
      costToggle.addEventListener("click", () => {
        this._dispatch(
          { type:"SET_PLACEMENT_COST", payload:{ enabled:!meta.placementCostEnabled } },
          {
            ok: !meta.placementCostEnabled ? "Platzierungskosten aktiviert." : "Platzierungskosten deaktiviert.",
            blocked: "Kostenumschaltung wurde blockiert.",
            hint: "",
          }
        );
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      costRow.append(el("span", "nx-label", "Platzierungs-Kosten (0.5 DNA)"), costToggle);
      sandboxCard.appendChild(costRow);

      container.appendChild(sandboxCard);
      return;
    }

    // ── ENERGIE (Analyse) ───────────────────────────────────
    if (ctx === "energie") {
      const eIn = Number(sim.playerEnergyIn || 0), eOut = Number(sim.playerEnergyOut || 0);
      const eNet = Number(sim.playerEnergyNet || 0), eStored = Number(sim.playerEnergyStored || 0);
      const cpuEIn = Number(sim.cpuEnergyIn || 0);
      const lShare = Number(sim.lightShare || 0), nShare = Number(sim.nutrientShare || 0);
      const season = Number(sim.seasonPhase || 0);
      const pAlive = Number(sim.playerAliveCount || 0), cAlive = Number(sim.cpuAliveCount || 0);

      const flowCard = el("section", "nx-card");
      flowCard.setAttribute("aria-labelledby", "energy-flow-title");
      const flowTitle = el("div", "nx-card-title", "Energiebilanz");
      flowTitle.id = "energy-flow-title";
      flowCard.appendChild(flowTitle);

      for (const [label, val, cls] of [
        ["Einnahmen", fmt(eIn,3), "nx-val-pos"],
        ["Ausgaben",  fmt(eOut,3),"nx-val-neg"],
        ["Netto",     fmtSign(eNet,3), eNet>=0?"nx-val-pos":"nx-val-neg"],
        ["Gespeichert",fmt(eStored,2),"nx-val"],
        ["CPU Einnahmen",fmt(cpuEIn,3),"nx-val"],
      ]) {
        const row = el("div", "nx-stat-row");
        row.append(el("span", "nx-label", label), el("span", `nx-mono ${cls}`, val));
        flowCard.appendChild(row);
      }

      const mkBar = (pct, cls, label) => {
        const wrap = el("div", "nx-bar-wrap");
        wrap.setAttribute("role", "progressbar");
        wrap.setAttribute("aria-valuenow", Math.round(pct * 100));
        wrap.setAttribute("aria-valuemin", "0");
        wrap.setAttribute("aria-valuemax", "100");
        wrap.setAttribute("aria-label", label);
        const fill = el("div", `nx-bar-fill ${cls}`);
        fill.style.width = `${Math.min(100,pct*100).toFixed(1)}%`;
        wrap.appendChild(fill); return wrap;
      };
      const srcCard = el("section", "nx-card");
      srcCard.setAttribute("aria-labelledby", "energy-sources-title");
      const srcTitle = el("div", "nx-card-title", "Quellen");
      srcTitle.id = "energy-sources-title";
      srcCard.appendChild(srcTitle);

      const lRow = el("div", "nx-stat-row nx-stat-row-col");
      lRow.append(el("span","nx-label",`Licht ${(lShare*100).toFixed(1)}%`), mkBar(lShare,"nx-bar-light", "Licht-Anteil"));
      const nRow = el("div", "nx-stat-row nx-stat-row-col");
      nRow.append(el("span","nx-label",`Nährstoff ${(nShare*100).toFixed(1)}%`), mkBar(nShare,"nx-bar-nutrient", "Nährstoff-Anteil"));
      srcCard.append(lRow, nRow);

      const seaCard = el("section", "nx-card");
      seaCard.setAttribute("aria-labelledby", "energy-season-title");
      const seaTitle = el("div", "nx-card-title", "Saison");
      seaTitle.id = "energy-season-title";
      seaCard.appendChild(seaTitle);

      const seasonLabel = season<0.25?"Frühling 🌱":season<0.5?"Sommer ☀":season<0.75?"Herbst 🍂":"Winter ❄";
      const sRow = el("div", "nx-stat-row nx-stat-row-col");
      sRow.append(el("span","nx-label",`${seasonLabel} ${(season*100).toFixed(0)}%`), mkBar(season,"nx-bar-season", "Saison-Fortschritt"));
      seaCard.appendChild(sRow);

      const fracCard = el("section", "nx-card");
      fracCard.setAttribute("aria-labelledby", "energy-fractions-title");
      const fracTitle = el("div", "nx-card-title", "Fraktionen");
      fracTitle.id = "energy-fractions-title";
      fracCard.appendChild(fracTitle);

      const pRow2 = el("div", "nx-stat-row");
      pRow2.append(el("span","nx-label","Spieler alive"), el("span","nx-mono nx-val-pos", String(pAlive)));
      const cRow2 = el("div", "nx-stat-row");
      cRow2.append(el("span","nx-label","CPU alive"), el("span","nx-mono nx-val-neg", String(cAlive)));
      fracCard.append(pRow2, cRow2);

      container.append(flowCard, srcCard, seaCard, fracCard);
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


    // ── HARVEST ────────────────────────────────────────────
    if (ctx === "harvest") {
      const playerDNA = Number(sim.playerDNA || 0);
      const totalHarvested = Number(sim.totalHarvested || 0);
      const playerStage = Number(sim.playerStage || 1);
      const nextThr = playerStage < 5 ? STAGE_THRESHOLDS[playerStage] : null;

      const card = el("section", "nx-card");
      card.setAttribute("aria-labelledby", "harvest-info-title");
      const harvestTitle = el("div", "nx-card-title", "DNA-Ernte");
      harvestTitle.id = "harvest-info-title";
      card.appendChild(harvestTitle);
      
      const dnaRow = el("div", "nx-stat-row");
      dnaRow.append(el("span", "nx-label", "Verfügbare DNA"), el("span", "nx-mono nx-chip-dna", playerDNA.toFixed(1)));
      card.appendChild(dnaRow);

      const countRow = el("div", "nx-stat-row");
      countRow.append(el("span", "nx-label", "Zellen geerntet"), el("span", "nx-mono", String(totalHarvested)));
      card.appendChild(countRow);

      if (nextThr !== null) {
        const prog = Math.min(1, totalHarvested / nextThr);
        const wrap = el("div","nx-bar-wrap"); 
        wrap.setAttribute("role", "progressbar");
        wrap.setAttribute("aria-valuenow", Math.round(prog * 100));
        wrap.setAttribute("aria-label", `Meilenstein zur Stufe ${playerStage + 1}`);
        const fill = el("div","nx-bar-fill nx-bar-stage");
        fill.style.width = `${(prog*100).toFixed(1)}%`; wrap.appendChild(fill);
        const nr = el("div","nx-stat-row");
        nr.append(el("span","nx-label",`Meilenstein Stage ${playerStage+1}`), el("span","nx-mono",`${nextThr} Ernten nötig`));
        card.append(nr, wrap);
      }

      const info = el("div", "nx-note", "Tipp: Ernte eigene Zellen, um DNA zu gewinnen. In HARVEST-Zonen erhältst du +50% Yield.");
      card.appendChild(info);

      container.appendChild(card);
      return;
    }

    // ── TOOLS (Wachsen) ─────────────────────────────────────
    if (ctx === "tools") {
      const card = el("section","nx-card");
      card.appendChild(el("div","nx-card-title","Kolonie erweitern"));
      
      const infoRow = el("div", "nx-stat-row");
      infoRow.append(el("span", "nx-label", "Kosten"), el("span", "nx-mono nx-val-neg", "0.5 DNA / Zelle"));
      card.appendChild(infoRow);

      const radRow = el("div", "nx-stat-row nx-stat-row-col");
      radRow.append(el("span", "nx-label", `Pinsel-Radius: ${meta.brushRadius || 3}`));
      const radRange = document.createElement("input");
      radRange.type = "range"; radRange.min = "1"; radRange.max = "10"; radRange.value = String(meta.brushRadius || 3);
      radRange.className = "nx-range";
      radRange.addEventListener("input", (e) => {
        this._dispatch({ type:"SET_BRUSH", payload:{ brushRadius: Number(e.target.value) } });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      radRow.appendChild(radRange);
      card.appendChild(radRow);

      const hint = el("div", "nx-note", "Tipp: Platziere Zellen in der Nähe deiner Kolonie, um sie zu vergrößern. Achte auf deine Energiebilanz.");
      card.appendChild(hint);

      // Advanced tools hidden by default
      const advBtn = el("button", "nx-btn nx-btn-ghost", "Experten-Werkzeuge");
      advBtn.style.marginTop = "15px";
      advBtn.addEventListener("click", () => {
        advBtn.remove();
        const advRow = el("div", "nx-row");
        const brush = document.createElement("select"); brush.className="nx-select";
        [[BRUSH_MODE.CELL_ADD,"🌱 Zelle setzen"],[BRUSH_MODE.CELL_REMOVE,"✂ Entfernen"],[BRUSH_MODE.CELL_HARVEST,"🧬 Ernten"],
         [BRUSH_MODE.LIGHT,"☀ Licht +"],[BRUSH_MODE.LIGHT_REMOVE,"☀ Licht –"],[BRUSH_MODE.NUTRIENT,"🌿 Nährstoff +"],
         [BRUSH_MODE.TOXIN,"☣ Toxin +"],[BRUSH_MODE.SATURATION_RESET,"↺ Sättigung –"],[BRUSH_MODE.ZONE_PAINT,"🧱 Zone malen"]
        ].forEach(([v,t]) => {
          const o = document.createElement("option"); o.value=v; o.textContent=t;
          if ((meta.brushMode||BRUSH_MODE.CELL_ADD)===v) o.selected=true;
          brush.appendChild(o);
        });
        brush.addEventListener("change", () => this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:brush.value } }));
        advRow.append(el("span", "nx-label", "Modus"), brush);
        card.appendChild(advRow);
      });
      card.appendChild(advBtn);

      container.appendChild(card);
      return;
    }

    // ── ZONEN ───────────────────────────────────────────────
    if (ctx === "zonen") {
      const card = el("section","nx-card");
      card.setAttribute("aria-labelledby", "zones-placement-title");
      const zonesTitle = el("div", "nx-card-title", "Zonen-Placement");
      zonesTitle.id = "zones-placement-title";
      card.appendChild(zonesTitle);

      card.appendChild(el("div","nx-note","zone_paint-Pinsel aktivieren → Werkzeug. Dann auf Karte tippen."));
      for (const z of ZONE_TYPES) {
        const isActive = this._activeZoneType === z.id;
        const row = el("div",`nx-zone-row${isActive ?" nx-zone-active":""}`);
        row.append(el("span","nx-zone-name",`${z.id}: ${z.label}`), el("span","nx-zone-desc",z.desc));
        if (z.id !== 0) {
          row.style.cursor="pointer";
          row.setAttribute("role", "button");
          row.setAttribute("tabindex", "0");
          row.setAttribute("aria-label", `Zone ${z.label} auswählen`);
          row.setAttribute("aria-pressed", isActive);

          const trigger = () => {
            this._activeZoneType=z.id;
            this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:BRUSH_MODE.ZONE_PAINT } });
            this._renderPanelBody(container, this._store.getState());
          };
          row.addEventListener("click", trigger);
          row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
        }
        card.appendChild(row);
      }
      container.append(card);
      return;
    }

    // ── WELT ────────────────────────────────────────────────
    if (ctx === "world") {
      const card = el("section","nx-card");
      card.setAttribute("aria-labelledby", "world-settings-title");
      const worldTitle = el("div", "nx-card-title", "Welt");
      worldTitle.id = "world-settings-title";
      card.appendChild(worldTitle);

      const sizeRow = el("div","nx-row"); sizeRow.append(el("span","nx-label","Größe"));
      const size = document.createElement("select"); size.className="nx-select";
      size.setAttribute("aria-label", "Weltgröße wählen (startet Simulation neu)");
      [[32,32],[48,48],[64,64],[72,72],[96,96],[120,120],[144,144]].forEach(([w,h]) => {
        const o=document.createElement("option"); o.value=`${w}x${h}`; o.textContent=`${w}×${h}`;
        if (w===meta.gridW&&h===meta.gridH) o.selected=true;
        size.appendChild(o);
      });
      size.addEventListener("change", () => {
        const [w,h]=size.value.split("x").map(Number);
        this._dispatch({ type:"SET_SPEED", payload:this._speedForGrid(w,h) });
        this._dispatch({ type:"SET_SIZE", payload:{w,h} });
        this._dispatch({ type:"GEN_WORLD" });
        this._dispatch({ type:"TOGGLE_RUNNING", payload:{running:true} });
      });
      sizeRow.append(size);

      const speedRow = el("div","nx-stack");
      speedRow.append(el("span","nx-label",`Geschwindigkeit ${meta.speed} T/s`));
      const speed = document.createElement("input");
      speed.type="range"; speed.className="nx-range";
      speed.min="1"; speed.max="60"; speed.value=String(meta.speed);
      speed.setAttribute("aria-label", "Simulationsgeschwindigkeit anpassen");
      speed.addEventListener("input", () => this._dispatch({ type:"SET_SPEED", payload:Number(speed.value) }));
      speedRow.append(speed);

      const renderRow = el("div","nx-row"); renderRow.append(el("span","nx-label","Ansicht"));
      const render = document.createElement("select"); render.className="nx-select";
      render.setAttribute("aria-label", "Darstellungsmodus wählen");
      [["combined","Natürlich"],["light","Licht"],["fields","Felder"],["cells","Zellen"]].forEach(([v,t]) => {
        const o=document.createElement("option"); o.value=v; o.textContent=t;
        if ((meta.renderMode||"combined")===v) o.selected=true;
        render.appendChild(o);
      });
      render.addEventListener("change", () => this._dispatch({ type:"SET_RENDER_MODE", payload:render.value }));
      renderRow.append(render);
      card.append(sizeRow, speedRow, renderRow);
      container.append(card);
      return;
    }

    // ── SYSTEME ─────────────────────────────────────────────
    if (ctx === "systems") {
      const worldCard = el("section","nx-card");
      worldCard.setAttribute("aria-labelledby", "systems-world-title");
      const worldTitle = el("div", "nx-card-title", "Spielraum");
      worldTitle.id = "systems-world-title";
      worldCard.appendChild(worldTitle);

      const sizeRow = el("div","nx-row");
      sizeRow.append(el("span","nx-label","Größe"));
      const size = document.createElement("select");
      size.className = "nx-select";
      size.setAttribute("aria-label", "Weltgröße wählen");
      [[32,32],[48,48],[64,64],[72,72],[96,96],[120,120],[144,144]].forEach(([w,h]) => {
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
      speed.addEventListener("input", () => this._dispatch({ type:"SET_SPEED", payload:Number(speed.value) }));
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
      render.addEventListener("change", () => this._dispatch({ type:"SET_RENDER_MODE", payload:render.value }));
      renderRow.append(render);
      worldCard.appendChild(renderRow);

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
      container.append(worldCard, learnCard, accCard, phyCard);
      return;
    }

    // ── SIEG (Pfad & Blocker) ───────────────────────────────
    if (ctx === "sieg") {
      const currentMode = String(sim.winMode || WIN_MODE.SUPREMACY);
      const playerStage = Number(sim.playerStage || 1);
      const runLocked = Number(sim.tick || 0) > 0;
      const WIN_MODES = [
        { id: WIN_MODE.SUPREMACY, label:"Energie-Suprematie", desc:"Dominanz: EIn > CPU x 1.5", req:"Stage 2 empfohlen", stage:2 },
        { id: WIN_MODE.STOCKPILE, label:"Territorial-Dominanz", desc:"Pop-Vorteil: Pop > CPU x 1.5", req:"Stage 3 empfohlen", stage:3 },
        { id: WIN_MODE.EFFICIENCY, label:"Effizienz-Meister", desc:"Kontrolle: E/Zelle > 0.18", req:"Stage 4 empfohlen", stage:4 },
      ];

      const modeCard = el("section","nx-card");
      modeCard.setAttribute("aria-labelledby", "victory-modes-title");
      const modesTitle = el("div", "nx-card-title", "Siegpfad wählen");
      modesTitle.id = "victory-modes-title";
      modeCard.appendChild(modesTitle);
      modeCard.appendChild(el("div", "nx-note", runLocked ? "Der Run-Pfad ist nach Tick 1 fixiert. Bereitschaft bleibt sichtbar, Umschalten ist gesperrt." : "Den Run-Pfad vor Tick 1 festlegen. Stage-Hinweise bleiben Bereitschaft, kein Auswahl-Lock."));

      for (const m of WIN_MODES) {
        const isActive = currentMode === m.id;
        const ready = playerStage >= m.stage;
        const isLocked = runLocked && !isActive;
        const row = el("div",`nx-zone-row${isActive ?" nx-zone-active":""}${isLocked?" nx-archetype-locked":""}`);
        row.style.cursor = isLocked ? "default" : "pointer";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", isLocked ? "-1" : "0");
        row.setAttribute("aria-label", `Siegmodus ${m.label}: ${isLocked ? "Im laufenden Run fixiert" : m.desc}`);
        row.setAttribute("aria-pressed", isActive);
        if (isLocked) row.setAttribute("aria-disabled", "true");

        const left2 = el("div","");
        left2.appendChild(el("div","nx-zone-name",m.label));
        left2.appendChild(el("div","nx-zone-desc", `${m.desc} · ${ready ? "Bereit" : m.req}`));
        row.appendChild(left2);

        if (!isLocked) {
          if (isActive) row.appendChild(el("span","nx-val-pos","✓"));
          const trigger = () => {
            this._dispatch(
              { type:"SET_WIN_MODE", payload:{ winMode:m.id } },
              { ok: `Siegpfad ${m.label} aktiv.`, blocked: "Siegpfad konnte nicht gesetzt werden.", hint: "Nächster Schritt: Stage-Gate prüfen." }
            );
            queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
          };
          row.addEventListener("click", trigger);
          row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
        }
        modeCard.appendChild(row);
      }

      const progCard = el("section","nx-card");
      progCard.setAttribute("aria-labelledby", "victory-progress-title");
      const progressTitle = el("div", "nx-card-title", "Fortschritt & Blocker");
      progressTitle.id = "victory-progress-title";
      progCard.appendChild(progressTitle);

      const supTicks  = Number(sim.energySupremacyTicks||0);
      const effTicks  = Number(sim.efficiencyTicks||0);
      const lossStreak= Number(sim.lossStreakTicks||0);
      const stockTicks= Number(sim.stockpileTicks||0);

      const activeMode = WIN_MODES.find(m => m.id === currentMode);
      const modeLocked = playerStage < (activeMode?.stage || 0);

      const mkProg = (label, val, max, cls, active, blocker) => {
        const row = el("div","nx-stat-row nx-stat-row-col");
        const statusText = blocker ? `❌ ${blocker}` : (active ? `${val} / ${max}` : "⬡ inaktiv");
        row.appendChild(el("span", active && !blocker ?"nx-label":"nx-label nx-label-dim", `${label}: ${statusText}`));
        const wrap=el("div","nx-bar-wrap"); 
        wrap.setAttribute("role", "progressbar");
        wrap.setAttribute("aria-valuenow", Math.round((val / max) * 100));
        wrap.setAttribute("aria-label", `${label} Fortschritt`);
        const fill=el("div",`nx-bar-fill ${active && !blocker ? cls : "nx-bar-dim"}`);
        fill.style.width=`${Math.min(100,(val/max)*100).toFixed(1)}%`; wrap.appendChild(fill);
        row.appendChild(wrap); return row;
      };

      progCard.append(
        mkProg("Suprematie", supTicks,  200, "nx-bar-light", currentMode===WIN_MODE.SUPREMACY, modeLocked && currentMode===WIN_MODE.SUPREMACY ? "Stage zu niedrig" : null),
        mkProg("Territorium", stockTicks, 200, "nx-bar-nutrient", currentMode===WIN_MODE.STOCKPILE, modeLocked && currentMode===WIN_MODE.STOCKPILE ? "Stage zu niedrig" : null),
        mkProg("Effizienz",  effTicks,  100, "nx-bar-nutrient", currentMode===WIN_MODE.EFFICIENCY, modeLocked && currentMode===WIN_MODE.EFFICIENCY ? "Stage zu niedrig" : null),
        mkProg("Kollaps-Risiko", lossStreak, 150, "nx-bar-loss", true, null),
      );
      progCard.appendChild(el("div", "nx-note", `Aktiver Blocker: ${advisorModel.winProgress.blockerCode} - ${advisorModel.winProgress.blockerDetail}`));

      container.append(modeCard, progCard);
      return;
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
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); this._togglePanel("status"); }
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); this._togglePanel("evolution"); }
      else if (e.key === "w" || e.key === "W") { e.preventDefault(); this._togglePanel("tools"); }
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
    const running    = sim.running;
    const playerDNA  = Number(sim.playerDNA   || 0);
    const playerStage= Number(sim.playerStage || 1);
    const energyNet  = Number(sim.playerEnergyNet || 0);
    const season     = Number(sim.seasonPhase || 0);
    const playerAlive= Number(sim.playerAliveCount || 0);
    const advisorModel = buildAdvisorModel(state, { benchmark: this._getBenchmarkState() });
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
    this._dangerChip.textContent = `◎ ${winModeState.label}`;
    this._goalChip.textContent = `🎯 ${bottleneckState.title}`;
    this._goalChip.title = `${goalState.title}: ${goalState.detail}`;

    // UI-GAME-01: Canvas-HUD sync — Reduced to Trend arrow
    this._hudEnergyArrow.textContent = netSign ? "▲" : "▼";
    this._hudEnergyVal.textContent   = `${netSign ? "+" : ""}${energyNet.toFixed(1)} ⚡`;
    this._hudEnergy.style.color      = netSign ? "var(--green)" : "var(--red)";
    this._hudTool.textContent = `${doctrine.label}: ${advisorModel.runIdentity.doctrineTradeoff} | Hebel: ${nextLeverState.label}`;

    this._dockPlayBtn.classList.toggle("running", !!running);
    this._dockPlayBtn.querySelector(".nx-dock-icon").textContent = running ? "⏸" : "▶";
    this._dockPlayBtn.lastChild.textContent = running ? "Pause" : "Play";
    this._updateContextButtons();

    // Re-render open panel (safe update)
    if (this._activeContext) {
      const container = isDesktopLayout() ? this._sidebarBody : this._sheetBody;
      const suppressAutoRefresh = !!running && (this._activeContext === "tools" || this._activeContext === "systems");
      if (suppressAutoRefresh) return;
      const now = Date.now();
      const panelCooldown = this._getPanelRefreshCooldown(this._activeContext, !!running);
      const panelInCooldown = (now - this._lastPanelRenderAt) < panelCooldown;
      if (!panelInCooldown && !this._isPanelInteractionActive()) {
        this._renderPanelBody(container, state);
      }
    } else if (isDesktopLayout()) {
      this._activeContext = "status";
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
