import { PHYSICS_DEFAULT } from "../../kernel/store/physics.js";
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
  WIN_MODE_SELECTABLE,
  WIN_MODE_RESULT_LABEL,
} from "../contracts/ids.js";
import {
  ARCHETYPES,
  PANEL_BY_KEY,
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

export function installUiPanels(UI) {
  Object.assign(UI.prototype, {
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
  },

  _getPanelRefreshCooldown(contextKey, running) {
    if (!running) return this._panelRenderCooldownMs;
    if (contextKey === "lage") return 260;
    if (contextKey === "evolution") return 900;
    if (contextKey === "eingriffe") return 1200;
    if (contextKey === "labor") return 1200;
    return 700;
  },

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
  },

  _updateContextButtons() {
    const mobileOpen = !this._sheet.classList.contains("hidden");
    for (const [key, btn] of Object.entries(this._ctxButtons)) {
      btn.classList.toggle("is-active", key === this._activeContext && isDesktopLayout());
    }
    for (const [key, btn] of Object.entries(this._dockTabBtns)) {
      btn.classList.toggle("is-active", mobileOpen && key === this._activeContext);
    }
  },

  _togglePanel(key) {
    if (isDesktopLayout()) this._toggleSidebar(key);
    else this._toggleSheet(key);
  },

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
  },

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
  },

  _closeSheet() {
    this._sheet.classList.add("hidden");
    this._sheetBackdrop.classList.add("hidden");
    document.getElementById("app")?.classList.remove("is-panel-open");
    this._ensureLabBrushIsolation("lage");
    this._updateContextButtons();
    this._syncUiPanelState(false, this._activeContext || "lage");
  },

  _toggleSidebar(key) {
    this._activeContext = key;
    this._ensureLabBrushIsolation(key);
    this._renderPanelBody(this._sidebarBody, this._store.getState());
    this._updateContextButtons();
    this._syncUiPanelState(true, key);
  },

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
  },

  _hasSplitUnlock(state) {
    const memory = getPlayerMemory(state);
    if (!memory) return false;
    return Number(memory.splitUnlock || 0) >= 1 || (Array.isArray(memory.techs) && memory.techs.includes("cluster_split"));
  },

  _getBenchmarkState() {
    return null;
  },

  _isLabOnlyBrushMode(mode) {
    return LAB_ONLY_BRUSH_MODES.has(String(mode || ""));
  },

  _isLaborPanelActive(state = this._store.getState()) {
    const activeTab = String(state?.meta?.ui?.activeTab || this._activeContext || "");
    const panelOpen = state?.meta?.ui?.panelOpen;
    return activeTab === "labor" && panelOpen !== false;
  },

  _ensureLabBrushIsolation(nextContext = this._activeContext, state = this._store.getState()) {
    if (String(nextContext || "") === "labor") return;
    const mode = String(state?.meta?.brushMode || BRUSH_MODE.OBSERVE);
    if (!this._isLabOnlyBrushMode(mode)) return;
    this._dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.OBSERVE } });
  },

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
  },

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
            this._store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
            const nextState = this._store.getState();
            const movedToGenesisZone = String(nextState?.sim?.runPhase || "") === RUN_PHASE.GENESIS_ZONE;
            this._setActionFeedback({
              ok: movedToGenesisZone,
              message: movedToGenesisZone
                ? "Gruendung bestaetigt. Genesis-Zone aktiv, Energiekern wartet."
                : "Gruendung blockiert.",
              hint: movedToGenesisZone
                ? "Naechster Schritt: Energiekern bestaetigen."
                : "Erforderlich: exakt 4 eigene, zusammenhaengende Founder im Startfenster.",
            });
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
                  : "Pfad muss zusammenhaengend sein und an Kern, DNA-Zone oder bestehende committete Infrastruktur anschliessen.",
              }
            );
            rerenderPanel();
          },
          advanceTime: async (_ms, _label) => {
            this._setActionFeedback({
              ok: false,
              message: "Direktes Vorspulen wurde aus dem Live-Client entfernt.",
              hint: "Determinismus-Beweise laufen nur noch ueber externe Evidence-Tests, nicht ueber Browser-Hooks.",
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
      const winModeLocked = Number(sim.tick || 0) > 0 || String(sim.runPhase || "") === RUN_PHASE.RUN_ACTIVE;

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

      const winModeRow = el("div", "nx-stack");
      winModeRow.append(el("span", "nx-label", "Run-Pfad"));
      const winModeSel = document.createElement("select");
      winModeSel.className = "nx-select";
      winModeSel.setAttribute("aria-label", "Siegpfad waehlen");
      for (const mode of WIN_MODE_SELECTABLE) {
        const option = document.createElement("option");
        option.value = mode;
        option.textContent = WIN_MODE_RESULT_LABEL[mode] || mode;
        if (String(sim.winMode || "") === mode) option.selected = true;
        winModeSel.appendChild(option);
      }
      winModeSel.disabled = winModeLocked;
      winModeSel.addEventListener("change", () => {
        if (winModeLocked) return;
        this._dispatch({ type: "SET_WIN_MODE", payload: { winMode: String(winModeSel.value || "") } });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      winModeRow.appendChild(winModeSel);
      winModeRow.appendChild(
        el(
          "div",
          "nx-note",
          winModeLocked
            ? "Siegpfad ist ab Run-Start gesperrt."
            : "Siegpfad ist nur vor Run-Start waehlbar.",
        ),
      );
      card.appendChild(winModeRow);

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

      const benchCard = el("section", "nx-card nx-card-lab");
      benchCard.setAttribute("aria-labelledby", "systems-benchmark-title");
      const benchTitle = el("div", "nx-card-title", "Lab: Benchmark");
      benchTitle.id = "systems-benchmark-title";
      benchCard.appendChild(benchTitle);
      benchCard.appendChild(el("div", "nx-note", "Benchmark-Laborpfad wurde entfernt. Deterministische Laufpfade bleiben nur noch im Main-Run und in den Evidence-Tests."));
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
  },

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
      const resultWinMode = String(sim?.runSummary?.winMode || sim.winMode || "");
      if (sim.gameResult === GAME_RESULT.WIN) this._announce(`Sieg! (${resultWinMode})`);
      else if (sim.gameResult === GAME_RESULT.LOSS) this._announce(`Niederlage! (${resultWinMode})`);
      this._showGameOverlay(sim);
      this._lastGameEndTick = sim.gameEndTick;
    }

    // --- Dev panel ─────────────────────────────────────────
  }
  });
}
