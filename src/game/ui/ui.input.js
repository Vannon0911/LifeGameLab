import { BRUSH_MODE, RUN_PHASE } from "../contracts/ids.js";

export function installUiInput(UI) {
  Object.assign(UI.prototype, {
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
        const founderTarget = Math.max(1, Number(state?.sim?.founderBudget || 1) | 0);
        this._setActionFeedback({
          ok: false,
          message: "Genesis-Setup aktiv: erst Founder setzen und Gründung bestätigen.",
          hint: `Tool: Founder Place · Ziel: ${founderTarget}/${founderTarget} im Startfenster.`,
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
        const founderTarget = Math.max(1, Number(state?.sim?.founderBudget || 1) | 0);
        this._setActionFeedback({
          ok: false,
          message: "Step ist im Genesis-Setup gesperrt.",
          hint: `Setze ${founderTarget} Founder und bestätige die Gründung.`,
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
      this._dispatch({ type:"SIM_STEP", payload:{} });
    });
    this._btnNew.addEventListener("click", () => {
      this._moveSelection = null;
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
  },

  _bindViewportMode() {
    const media = window.matchMedia("(min-width:800px)");
    const onChange = () => {
      this._layoutDesktop = media.matches;
      this._applyResponsiveDefaults(true);
    };
    if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
    else if (typeof media.addListener === "function") media.addListener(onChange);
  },

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
  },

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
          hint: "Pfad muss zusammenhaengend bleiben und an Kern, DNA-Zone oder committete Infrastruktur anschliessen.",
        }
      );
      return;
    }
    if (mode === BRUSH_MODE.OBSERVE) {
      if (!start) return;
      if (String(state.sim?.runPhase || "") !== RUN_PHASE.RUN_ACTIVE) {
        this._moveSelection = null;
        return;
      }
      const idx = wy * state.meta.gridW + wx;
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      const isOwnAliveTile =
        (Number(state.world?.alive?.[idx] || 0) | 0) === 1 &&
        (Number(state.world?.lineageId?.[idx] || 0) | 0) === playerLineageId;
      const isEmptyTile = (Number(state.world?.alive?.[idx] || 0) | 0) === 0;
      const placementCostEnabled = !!state.meta.placementCostEnabled;
      const placementCost = 0.5;
      const hasPlacementBudget = Number(state.sim?.playerDNA || 0) >= placementCost;

      if (!this._moveSelection) {
        if (!isOwnAliveTile) return;
        this._moveSelection = { x: wx, y: wy, idx };
        this._setActionFeedback({
          ok: true,
          message: "Quelle markiert.",
          hint: "Waehle jetzt ein freies Ziel-Tile fuer die Bewegung.",
        });
        return;
      }

      const selected = this._moveSelection;
      if (selected.idx === idx) {
        this._moveSelection = null;
        this._setActionFeedback({
          ok: true,
          message: "Bewegung abgebrochen.",
          hint: "",
        });
        return;
      }

      if (isOwnAliveTile) {
        this._moveSelection = { x: wx, y: wy, idx };
        this._setActionFeedback({
          ok: true,
          message: "Quelle umgestellt.",
          hint: "Waehle jetzt ein freies Ziel-Tile fuer die Bewegung.",
        });
        return;
      }

      if (!isEmptyTile) {
        this._setActionFeedback({
          ok: false,
          message: "Ziel ist belegt.",
          hint: "Waehle ein freies Tile als Ziel.",
        });
        return;
      }
      if (placementCostEnabled && !hasPlacementBudget) {
        this._setActionFeedback({
          ok: false,
          message: "Bewegung blockiert.",
          hint: "Zu wenig DNA fuer das Ziel-Tile (Kosten 0.5).",
        });
        return;
      }

      const placed = this._dispatch({ type: "PLACE_CELL", payload: { x: wx, y: wy, remove: false } });
      if (!placed) {
        this._setActionFeedback({
          ok: false,
          message: "Bewegung blockiert.",
          hint: "Ziel konnte nicht gesetzt werden.",
        });
        return;
      }
      const removed = this._dispatch({ type: "PLACE_CELL", payload: { x: selected.x, y: selected.y, remove: true } });
      if (!removed) {
        this._setActionFeedback({
          ok: false,
          message: "Quelle konnte nicht entfernt werden.",
          hint: "Bitte Zustand pruefen; Ziel wurde bereits gesetzt.",
        });
        this._moveSelection = null;
        return;
      }
      this._moveSelection = null;
      this._setActionFeedback({
        ok: true,
        message: "Zelle bewegt.",
        hint: "Naechster Schritt: Main-Run-Aktion auswaehlen.",
      });
      return;
    }
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
          hint: `Nur im Startfenster, maximal ${Math.max(1, Number(state.sim?.founderBudget || 1) | 0)} Founder, vor Bestaetigung entfernbar.`,
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
  },

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
  });
}
