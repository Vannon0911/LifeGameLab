import { BRUSH_MODE, RUN_PHASE, isBuilderBrushMode } from "../contracts/ids.js";
import { getBrushTiles } from "../sim/brushShapes.js";
import { selectAreAllTilesFilled, formatSeedDisplay } from "../sim/mapSeedGen.js";

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
          expertMode: !!ui.expertMode,
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
            runPhase: RUN_PHASE.RUN_ACTIVE,
            panelOpen: !!this._builderPrevUi?.panelOpen,
            activeTab: String(this._builderPrevUi?.activeTab || "lage"),
            expertMode: !!this._builderPrevUi?.expertMode,
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
      const running = !!state.sim.running;
      this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:!running } });
    };

    const openBuilder = () => {
      const state = this._store.getState();
      const runPhase = String(state?.sim?.runPhase || "");
      if (runPhase === RUN_PHASE.MAP_BUILDER) {
        this._setActionFeedback({
          ok: true,
          message: "Builder ist bereits aktiv.",
          hint: "Klick malt, Shift entfernt Overrides.",
        });
        return;
      }
      toggleMapBuilder();
    };

    this._btnPlay?.addEventListener("click", togglePlay);
    this._btnStep?.addEventListener("click", () => {
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
    this._btnMenuPlay?.addEventListener("click", togglePlay);
    this._btnMenuBuild?.addEventListener("click", openBuilder);
    this._btnMenuMore?.addEventListener("click", () => {
      this._setActionFeedback({
        ok: true,
        message: "Mehr-Menü folgt.",
        hint: "Platzhalter fuer weitere Optionen.",
      });
    });
    this._builderExitButton?.addEventListener("click", toggleMapBuilder);
    bindBuilderPalette();

    // Builder tool dropdown
    this._builderToolDropdown?.addEventListener("change", (e) => {
      const mode = e.target.value;
      this._setBuilderMode?.(mode, false);
      const opt = (this._builderToolOptions || []).find((o) => o.mode === mode);
      this._setActionFeedback({ ok: true, message: `Werkzeug: ${opt?.label || mode}`, hint: opt?.hint || "" });
    });

    // Builder brush size slider
    this._builderBrushSlider?.addEventListener("input", (e) => {
      const size = Number(e.target.value) | 0;
      this._builderBrushSize = size;
      this._dispatch({ type: "SET_BUILDER_BRUSH_SIZE", payload: { size } });
      if (this._builderBrushLabel) this._builderBrushLabel.textContent = `Pinsel: ${size}`;
    });

    // Builder undo/redo buttons
    this._builderUndoBtn?.addEventListener("click", () => this._builderUndo?.());
    this._builderRedoBtn?.addEventListener("click", () => this._builderRedo?.());

    // Seed generation button
    this._builderSeedGenBtn?.addEventListener("click", () => {
      const state = this._store.getState();
      if (!selectAreAllTilesFilled(state)) {
        this._setActionFeedback({ ok: false, message: "Nicht alle Tiles belegt.", hint: "Alle Tiles muessen belegt sein." });
        return;
      }
      this._dispatch({ type: "GENERATE_MAP_SEED", payload: {} });
      const nextState = this._store.getState();
      const seed = nextState?.map?.spec?.generatedSeed || "";
      if (this._builderSeedLabel) this._builderSeedLabel.textContent = `Seed: ${seed ? formatSeedDisplay(seed) : "\u2014"}`;
      this._setActionFeedback({ ok: true, message: `Seed: ${seed ? formatSeedDisplay(seed) : "\u2014"}`, hint: "" });
    });

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
      const state = this._store.getState();
      const isBuilder = String(state?.sim?.runPhase || "") === RUN_PHASE.MAP_BUILDER;
      if (e.code === "Space") {
        e.preventDefault();
        this._btnPlay?.click?.();
      }
      else if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) && !e.shiftKey && isBuilder) {
        e.preventDefault();
        this._builderUndo?.();
      }
      else if (((e.key === "y" || e.key === "Y") && (e.ctrlKey || e.metaKey)) && isBuilder) {
        e.preventDefault();
        this._builderRedo?.();
      }
      else if (((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) && e.shiftKey) && isBuilder) {
        e.preventDefault();
        this._builderRedo?.();
      }
      else if (e.key === "[" && isBuilder) {
        e.preventDefault();
        const next = Math.max(1, (this._builderBrushSize || 1) - 1);
        this._builderBrushSize = next;
        this._dispatch({ type: "SET_BUILDER_BRUSH_SIZE", payload: { size: next } });
        this._setActionFeedback({ ok: true, message: `Pinsel: ${next}`, hint: "" });
      }
      else if (e.key === "]" && isBuilder) {
        e.preventDefault();
        const next = Math.min(5, (this._builderBrushSize || 1) + 1);
        this._builderBrushSize = next;
        this._dispatch({ type: "SET_BUILDER_BRUSH_SIZE", payload: { size: next } });
        this._setActionFeedback({ ok: true, message: `Pinsel: ${next}`, hint: "" });
      }
      else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        this._btnNew?.click?.();
      }
      else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        console.log("MAP_SPEC_EXPORT:", JSON.stringify(state.map?.spec || {}, null, 2));
        this._setActionFeedback({ ok: true, message: "MapSpec in Konsole exportiert.", hint: "F12 fuer Log" });
      }
      else if (e.key === "Escape") this._closeContext?.();
    });
  },

  _builderUndo() {
    if (!this._builderHistory) return;
    const result = this._builderHistory.undo();
    if (!result) {
      this._setActionFeedback({ ok: false, message: "Nichts zum Rueckgaengig machen.", hint: "" });
      return;
    }
    this._dispatch({ type: "BUILDER_UNDO", payload: { inverse: result.inverse } });
    this._setActionFeedback({ ok: true, message: `Rueckgaengig: ${result.label}`, hint: "" });
  },

  _builderRedo() {
    if (!this._builderHistory) return;
    const result = this._builderHistory.redo();
    if (!result) {
      this._setActionFeedback({ ok: false, message: "Nichts zum Wiederherstellen.", hint: "" });
      return;
    }
    this._dispatch({ type: "BUILDER_REDO", payload: { forward: result.forward } });
    this._setActionFeedback({ ok: true, message: `Wiederherstellen: ${result.label}`, hint: "" });
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
    const resourceValue = Number(state.world?.R?.[idx] || 0);
    const isResourceTile = resourceValue > 0.05;

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
    if (mode === BRUSH_MODE.OBSERVE) {
      if (!start) return;
      if (runPhase !== RUN_PHASE.RUN_ACTIVE) {
        this._moveSelection = null;
        return;
      }
      if (!this._moveSelection) {
        if (!isOwnAliveTile) {
          const placed = this._placeWorker({ x: wx, y: wy, remove: shiftRemove });
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
          const placed = this._placeWorker({ x: wx, y: wy, remove: shiftRemove });
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

      const ordered = this._issueMove(
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
    if (builderActive) {
      if (!start) return;
      // Handle new builder brush modes (surface, resource, eraser)
      if (isBuilderBrushMode(mode)) {
        const brushSize = this._builderBrushSize || 1;
        const gridW = state.meta.gridW || 16;
        const gridH = state.meta.gridH || 16;
        const tiles = getBrushTiles(wx, wy, brushSize, gridW, gridH);
        if (!tiles.length) return;
        const spec = state.map?.spec || {};
        const prevSurfacePlan = spec.surfacePlan && typeof spec.surfacePlan === "object" ? { ...spec.surfacePlan } : {};
        const prevResourcePlan = spec.resourcePlan && typeof spec.resourcePlan === "object" ? { ...spec.resourcePlan } : {};

        if (mode === BRUSH_MODE.SURFACE_PAINT) {
          const surfaceType = this._builderSurfaceType || "grass";
          this._builderHistory?.push({
            forward: { surfacePlan: (() => { const n = { ...prevSurfacePlan }; for (const t of tiles) n[String(t.y * gridW + t.x)] = { type: surfaceType }; return n; })() },
            inverse: { surfacePlan: prevSurfacePlan },
            label: "Surface Paint",
          });
          this._dispatch({ type: "SET_SURFACE_TILE", payload: { tiles, surfaceType } });
          this._setActionFeedback({ ok: true, message: "Oberflaeche gemalt.", hint: "" });
        } else if (mode === BRUSH_MODE.RESOURCE_PLACE) {
          const resourceKind = this._builderResourceKind || "tree";
          const resourceStage = this._builderResourceStage || "placed";
          this._builderHistory?.push({
            forward: { resourcePlan: (() => { const n = { ...prevResourcePlan }; for (const t of tiles) n[String(t.y * gridW + t.x)] = { kind: resourceKind, stage: resourceStage }; return n; })() },
            inverse: { resourcePlan: prevResourcePlan },
            label: "Resource Place",
          });
          this._dispatch({ type: "SET_RESOURCE_TILE", payload: { tiles, resourceKind, resourceStage } });
          this._setActionFeedback({ ok: true, message: "Ressource platziert.", hint: "" });
        } else if (mode === BRUSH_MODE.ERASER) {
          this._builderHistory?.push({
            forward: { surfacePlan: (() => { const n = { ...prevSurfacePlan }; for (const t of tiles) delete n[String(t.y * gridW + t.x)]; return n; })(), resourcePlan: (() => { const n = { ...prevResourcePlan }; for (const t of tiles) delete n[String(t.y * gridW + t.x)]; return n; })() },
            inverse: { surfacePlan: prevSurfacePlan, resourcePlan: prevResourcePlan },
            label: "Erase",
          });
          this._dispatch({ type: "ERASE_TILE_CONTENT", payload: { tiles, layer: "all" } });
          this._setActionFeedback({ ok: true, message: "Inhalt geloescht.", hint: "" });
        }
        return;
      }
      // Legacy builder modes
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
      const placed = this._placeWorker({ x: wx, y: wy, remove: removed });
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
