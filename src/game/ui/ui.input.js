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

    const toggleMapBuilder = () => {
      const state = this._store.getState();
      const runPhase = String(state?.sim?.runPhase || "");
      const entering = runPhase !== RUN_PHASE.MAP_BUILDER;
      const ui = state?.meta?.ui || {};
      if (entering) {
        this._builderPrevUi = {
          activeTab: String(ui.activeTab || "lage"),
          panelOpen: !!ui.panelOpen,
        };
      }
      const payload = entering
        ? {
            runPhase: RUN_PHASE.MAP_BUILDER,
            panelOpen: true,
            activeTab: "builder",
            expertMode: true,
          }
        : {
            runPhase: RUN_PHASE.GENESIS_SETUP,
            panelOpen: !!this._builderPrevUi?.panelOpen,
            activeTab: String(this._builderPrevUi?.activeTab || "lage"),
          };
      this._dispatch({ type: "SET_UI", payload });
      if (!entering) {
        this._setBuilderHover(null);
      }
      this._setActionFeedback({
        ok: true,
        message: entering ? "Map Builder aktiv" : "Map Builder beendet",
        hint: entering
          ? "Palette waehlt Kacheltypen. Klick malt, Shift loescht Overrides."
          : "Zurueck im Startmodus.",
      });
    };

    const bindBuilderPalette = () => {
      for (const [mode, btn] of Object.entries(this._builderPaletteButtons || {})) {
        btn.addEventListener("click", () => {
          const cfg = this._setBuilderMode(mode, false);
          if (!cfg) return;
          this._setActionFeedback({
            ok: true,
            message: `Werkzeug: ${cfg.label}`,
            hint: cfg.hint,
          });
        });
      }
    };
    this._toggleMapBuilder = toggleMapBuilder;

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

    this._btnPlay?.addEventListener("click", togglePlay);
    this._btnStep?.addEventListener("click", () => {
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
    this._btnNew?.addEventListener("click", () => {
      this._moveSelection = null;
      this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:false } });
      this._dispatch({ type:"GEN_WORLD" });
    });
    this._btnBuilder?.addEventListener("click", toggleMapBuilder);
    this._builderExitButton?.addEventListener("click", toggleMapBuilder);
    bindBuilderPalette();

    if (this._dockPlayBtn) this._dockPlayBtn.addEventListener("click", togglePlay);
    if (this._sheetClose) this._sheetClose.addEventListener("click", () => this._closeSheet?.());
    if (this._sheetBackdrop) this._sheetBackdrop.addEventListener("click", () => this._closeSheet?.());
    if (this._dockTabBtns && typeof this._dockTabBtns === "object") {
      for (const [key, btn] of Object.entries(this._dockTabBtns)) {
        btn.addEventListener("click", () => this._togglePanel?.(key));
      }
    }
    if (this._ctxButtons && typeof this._ctxButtons === "object") {
      for (const [key, btn] of Object.entries(this._ctxButtons)) {
        btn.addEventListener("click", () => this._togglePanel?.(key));
      }
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
      else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        this._toggleMapBuilder?.();
      }
      else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const state = this._store.getState();
        console.log("MAP_SPEC_EXPORT:", JSON.stringify(state.map?.spec || {}, null, 2));
        this._setActionFeedback({ ok: true, message: "MapSpec in Konsole exportiert.", hint: "F12 fuer Log" });
      }
      else if (e.key === "Escape") this._closeContext?.();
    });
  },

  _paintAtClient(clientX, clientY, start, pointerEvent = null) {
    if (!this._rInfo) return;
    const state = this._store.getState();
    const { dpr, tilePx, offX, offY } = this._rInfo;
    const rect = this._canvas.getBoundingClientRect();
    const sx = clientX - rect.left, sy = clientY - rect.top;
    const wx = Math.floor((sx*dpr - offX) / tilePx);
    const wy = Math.floor((sy*dpr - offY) / tilePx);
    if (wx<0||wy<0||wx>=state.meta.gridW||wy>=state.meta.gridH) return;
    const runPhase = String(state.sim?.runPhase || "");
    const shiftRemove = !!pointerEvent?.shiftKey;
    const builderActive = runPhase === RUN_PHASE.MAP_BUILDER;
    const mode = builderActive ? this._builderMode : state.meta.brushMode;
    const radius = state.meta.brushRadius || 3;
    const idx = wy * state.meta.gridW + wx;
    const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
    const isOwnAliveTile =
      (Number(state.world?.alive?.[idx] || 0) | 0) === 1 &&
      (Number(state.world?.lineageId?.[idx] || 0) | 0) === playerLineageId;
    const isOwnFounder =
      isOwnAliveTile &&
      (Number(state.world?.founderMask?.[idx] || 0) | 0) === 1 &&
      runPhase === RUN_PHASE.GENESIS_SETUP;
    const resourceValue = Number(state.world?.R?.[idx] || 0);
    const isResourceTile = resourceValue > 0.05;

    if (start && runPhase === RUN_PHASE.GENESIS_SETUP) {
      const placed = this._placeCoreCompat({ x: wx, y: wy, remove: shiftRemove || isOwnFounder });
      this._setActionFeedback({
        ok: !!placed,
        message: placed
          ? ((shiftRemove || isOwnFounder) ? "Founder entfernt." : "Founder platziert.")
          : "Founder-Aktion blockiert.",
        hint: placed ? "" : "Genesis: Startkachel anklicken, dann bestaetigen.",
      });
      return;
    }

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
      if (runPhase !== RUN_PHASE.RUN_ACTIVE) {
        this._moveSelection = null;
        return;
      }
      if (!this._moveSelection) {
        if (!isOwnAliveTile) {
          const placed = this._placeCoreCompat({ x: wx, y: wy, remove: shiftRemove });
          this._setActionFeedback({
            ok: !!placed,
            message: placed
              ? (shiftRemove ? "Worker entfernt." : "Worker platziert.")
              : "Worker-Aktion blockiert.",
            hint: placed ? "" : "Setzen auf freie Kacheln, Shift+Klick entfernt.",
          });
          return;
        }
        this._moveSelection = { x: wx, y: wy, idx };
        this._setActionFeedback({
          ok: true,
          message: "Worker markiert.",
          hint: "Waehle jetzt ein Ressource-Tile als Ziel.",
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
          message: "Worker umgestellt.",
          hint: "Waehle jetzt ein Ressource-Tile als Ziel.",
        });
        return;
      }

      if (!isResourceTile) {
        if (!isOwnAliveTile) {
          const placed = this._placeCoreCompat({ x: wx, y: wy, remove: shiftRemove });
          this._setActionFeedback({
            ok: !!placed,
            message: placed
              ? (shiftRemove ? "Worker entfernt." : "Worker platziert.")
              : "Worker-Aktion blockiert.",
            hint: placed ? "" : "Setzen auf freie Kacheln, Shift+Klick entfernt.",
          });
          return;
        }
        this._setActionFeedback({
          ok: false,
          message: "Kein Ressourcen-Ziel.",
          hint: "Waehle ein Tile mit sichtbarer Ressource.",
        });
        return;
      }

      const ordered = this._issueMoveCompat(
        { x: selected.x, y: selected.y },
        { x: wx, y: wy },
      );
      if (!ordered) {
        this._setActionFeedback({
          ok: false,
          message: "Order blockiert.",
          hint: "Pruefe Start-Worker und Ressourcen-Ziel.",
        });
      } else {
        this._setActionFeedback({
          ok: true,
          message: "Order gesetzt.",
          hint: "Der Worker bewegt sich tickbasiert zum Ressourcen-Ziel.",
        });
      }
      this._moveSelection = null;
      return;
    }
    if (mode === BRUSH_MODE.WORKER_HARVEST) {
      if (!start) return;
      this._dispatch(
        { type:"HARVEST_WORKER", payload:{ x:wx, y:wy } },
        { ok: "DNA-Ernte ausgeführt.", blocked: "Ernte blockiert.", hint: "Nächster Schritt: eigenen Worker wählen und Mindestpopulation halten." }
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
      const placed = this._placeCoreCompat({ x: wx, y: wy, remove: isOwnFounder });
      this._setActionFeedback({
        ok: !!placed,
        message: placed
          ? (isOwnFounder ? "Founder entfernt." : "Founder platziert.")
          : "Founder-Aktion blockiert.",
        hint: placed
          ? ""
          : `Nur im Startfenster, maximal ${Math.max(1, Number(state.sim?.founderBudget || 1) | 0)} Founder, vor Bestaetigung entfernbar.`,
      });
      return;
    }
    if (String(state.sim?.runPhase || "") === RUN_PHASE.DNA_ZONE_SETUP) {
      if (!start) return;
      const idx = wy * state.meta.gridW + wx;
      const isSelected = (Number(state.world?.dnaZoneMask?.[idx] || 0) | 0) === 1;
      this._dispatch(
        { type: "TOGGLE_DNA_ZONE_WORKER", payload: { x: wx, y: wy, remove: isSelected } },
        {
          ok: isSelected ? "DNA-Kachel entfernt." : "DNA-Kachel gesetzt.",
          blocked: "DNA-Kachel blockiert.",
          hint: "Nur lebende eigene Kacheln, nicht im Energiekern, angrenzend an Kern oder DNA-Zone.",
        }
      );
      return;
    }
    if (builderActive) {
      if (!start) return;
      const builderCfg = this._getBuilderModeConfig?.(mode) || this._getBuilderModeConfig?.("light");
      const mapMode = builderCfg?.mode || mode;
      const value = Number.isFinite(Number(builderCfg?.value)) ? Number(builderCfg.value) : 0.8;
      const remove = !!shiftRemove || !!builderCfg?.remove;
      this._dispatch(
        { type: "SET_MAP_TILE", payload: { x: wx, y: wy, mode: mapMode, value: remove ? 0 : value, remove } },
        { ok: "Map-Tile aktualisiert.", blocked: "Fehler beim Setzen.", hint: "Shift+Klick entfernt Overrides." }
      );
      return;
    }
    if (mode === BRUSH_MODE.WORKER_ADD || mode === BRUSH_MODE.WORKER_REMOVE) {
      if (!start) return;
      const removed = mode === BRUSH_MODE.WORKER_REMOVE;
      const placed = this._placeCoreCompat({ x: wx, y: wy, remove: removed });
      this._setActionFeedback({
        ok: !!placed,
        message: placed
          ? (removed ? "Worker entfernt." : "Worker platziert.")
          : "Worker-Aktion blockiert.",
        hint: placed ? "" : "Nächster Schritt: Besitz/Gate und DNA-Kosten prüfen.",
      });
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
      if (String(state?.sim?.runPhase || "") !== RUN_PHASE.MAP_BUILDER) {
        this._setBuilderHover(null);
        return;
      }
      const { dpr, tilePx, offX, offY } = this._rInfo;
      const rect = this._canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const wx = Math.floor((sx * dpr - offX) / tilePx);
      const wy = Math.floor((sy * dpr - offY) / tilePx);
      if (wx < 0 || wy < 0 || wx >= state.meta.gridW || wy >= state.meta.gridH) {
        this._setBuilderHover(null);
        return;
      }
      this._setBuilderHover({ x: wx, y: wy });
    };
    this._canvas.addEventListener("pointerdown", (e) => {
      this._activePointers.add(e.pointerId);
      this._touchGesture = e.pointerType==="touch" && this._activePointers.size>1;
      this._paintActive = !this._touchGesture;
      this._canvas.setPointerCapture(e.pointerId);
      if (this._touchGesture) return;
      updateHover(e);
      this._paintAtClient(e.clientX, e.clientY, true, e);
    });
    this._canvas.addEventListener("pointermove", (e) => {
      updateHover(e);
      if (this._touchGesture||!this._paintActive) return;
      this._paintAtClient(e.clientX, e.clientY, false, e);
    });
    const end = (e) => {
      this._activePointers.delete(e.pointerId);
      if (this._activePointers.size===0) this._touchGesture=false;
      this._paintActive=false;
    };
    this._canvas.addEventListener("pointerup", end);
    this._canvas.addEventListener("pointercancel", end);
    this._canvas.addEventListener("pointerleave", () => this._setBuilderHover(null));
  }
  });
}
