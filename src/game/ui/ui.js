import { PHYSICS_DEFAULT } from "../../core/kernel/physics.js";
import { APP_VERSION } from "../../project/project.manifest.js";

// ============================================================
// UI — Mobile-First Web App v2.1
// Bottom Sheet + Bottom Nav on mobile, Sidebar on desktop.
// Reads state, dispatches actions. Never mutates state directly.
// ============================================================

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function fmt(v, d = 2)    { return (typeof v === "number" && Number.isFinite(v)) ? v.toFixed(d) : "--"; }
function fmtSign(v, d = 2){ return (typeof v === "number" && Number.isFinite(v)) ? (v >= 0 ? "+" : "") + v.toFixed(d) : "--"; }

const isDesktop = () => window.matchMedia("(min-width:800px)").matches;

const PHYSICS_KEYS = [
  ["L_mean",       "Licht",         0.05, 0.60, 0.01],
  ["T_survive",    "Überleben",     0.02, 0.25, 0.01],
  ["U_base",       "Grundverbrauch",0.01, 0.18, 0.005],
  ["C_birth_base", "Geburtskosten", 0.10, 1.60, 0.05],
];

const STATUS_GROUPS = [
  ["Koloniezustand", [["Population","playerAliveCount",0],["Stabilität","lineageDiversity",0],["Ernteleistung","totalHarvested",0],["Bedrohung","meanToxinField",3]]],
  ["Details", [["Licht-Anteil","lightShare",3],["Nährstoff-Anteil","nutrientShare",3],["Sättigung","meanSaturationField",3],["Pflanzen-Bio","meanPlantField",3]]],
  ["CPU & Sim", [["CPU Alive","cpuAliveCount",0],["Geburten","birthsLastStep",0],["Tode","deathsLastStep",0],["Mutationen","mutationsLastStep",0]]]
];

const ARCHETYPES = [
  { id:"light_harvest",       label:"Licht-Ernte",         desc:"Maximiert Licht-Absorption. Ernte +12%.",            role:"Expansion", stage:1 },
  { id:"nutrient_harvest",    label:"Nährstoff-Ernte",     desc:"Effizienter Nährstoffzug. Weniger Upkeep.",          role:"Stabilität", stage:1 },
  { id:"toxin_resist",        label:"Toxin-Resistenz",     desc:"Überlebt giftige Zonen. Toxin-Metabolismus +.",      role:"Überleben", stage:1 },
  { id:"reserve_buffer",      label:"Energiepuffer",       desc:"Größere Energiereserve. Saisonkrisen überstehen.",   role:"Stabilität", stage:2 },
  { id:"cooperative_network", label:"Netzwerk-Kooperation",desc:"Stärkt Link-Transfer. Verbundene Zellen teilen.",   role:"Stabilität", stage:2 },
  { id:"reproductive_spread", label:"Expansionsdrang",     desc:"Schnelle Ausbreitung. Höhere Geburtenrate.",         role:"Expansion", stage:2 },
  { id:"defensive_shell",     label:"Schutzschicht",       desc:"Erhöhte Überlebensschwelle. Widerstand +.",          role:"Defensive", stage:3 },
  { id:"predator_raid",       label:"Räuber-Angriff",      desc:"Aggressive Remote-Angriffe. Energie rauben.",        role:"Aggressiv", stage:3 },
  { id:"nomadic_adapt",       label:"Nomaden-Anpassung",   desc:"Flexibel in jedem Terrain. Generalisten.",           role:"Expansion", stage:3 },
  { id:"hybrid_mixer",        label:"Hybrid-Mischer",      desc:"Kombiniert Licht + Netzwerk. Ausgewogen.",           role:"Allrounder", stage:4 },
  { id:"fortress_homeostasis",label:"Festungs-Homöostase", desc:"Maximale Stabilität. Langzeittest bestehen.",        role:"Defensive", stage:4 },
  { id:"scavenger_loop",      label:"Aasfresser-Loop",     desc:"Toxin als Energiequelle nutzen. Nische.",            role:"Nische", stage:4 },
  { id:"pioneer_explorer",    label:"Pionier-Forscher",    desc:"Erschließt neue Gebiete schnell. Expansion.",        role:"Expansion", stage:5 },
  { id:"symbiotic_bloom",     label:"Symbiotische Blüte",  desc:"Pflanzen + Netzwerk synergieren. Ökologie.",         role:"Ökologie", stage:5 },
  { id:"mutation_diversify",  label:"Mutations-Diversität",desc:"Maximale Vielfalt. XP-Booster für Lineage.",        role:"Evolution", stage:5 },
];

const ZONE_TYPES = [
  { id:0, label:"Keine",      desc:"Standard-Wachstum" },
  { id:1, label:"HARVEST",    desc:"Wirtschaft: DNA-Yield ×1.5" },
  { id:2, label:"BUFFER",     desc:"Stabilität: Upkeep ×0.8" },
  { id:3, label:"DEFENSE",    desc:"Frontlinie: Schaden ×0.5" },
  { id:4, label:"NEXUS",      desc:"Zentrum: Energie-Fokus ×1.2" },
  { id:5, label:"QUARANTINE", desc:"Bremse: Keine Geburten" },
];

const STAGE_THRESHOLDS = [0, 5, 15, 30, 60];

// ── Dock navigation tabs ───────────────────────────────────
const DOCK_TABS = [
  { key:"status",    icon:"📊", label:"Status"    },
  { key:"evolution", icon:"🧪", label:"Evolution" },
  { key:"play",      icon:"▶", label:"Play"      },
  { key:"tools",     icon:"🌱", label:"Werkzeug"  },
  { key:"systems",   icon:"⚙️",  label:"System"    },
];

// ── Desktop sidebar tabs ───────────────────────────────────
const SIDEBAR_TABS = [
  { key:"status",    icon:"📊", label:"Lagebericht" },
  { key:"tools",     icon:"🌱", label:"Werkzeuge"   },
  { key:"evolution", icon:"🧪", label:"Evolution"   },
  { key:"sieg",      icon:"🏆", label:"Siegpfad"    },
  { key:"energie",   icon:"⚡", label:"Energie"    },
  { key:"world",     icon:"🌍", label:"Welt"        },
  { key:"systems",   icon:"⚙️",  label:"Systeme"     },
];

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

    this._build();
    queueMicrotask(() => this._bindControls());
    this._bindGlobalKeys();
    this._bindCanvasPaint();
  }

  setRenderInfo(info) { this._rInfo = info; }
  _dispatch(action) { this._store.dispatch(action); }

  _announce(message, level = 1) { // level 1: critical, 2: all
    if (!this._announcer || !message || typeof message !== "string") return;
    const ariaLevel = Number(this._store.getState().meta.ui.ariaLevel || 1);
    if (ariaLevel < level) return;
    this._announcer.textContent = ""; // Clear to ensure announcement
    queueMicrotask(() => {
      this._announcer.textContent = message;
    });
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
    const left = el("div", "nx-top-left");
    const center = el("div", "nx-top-center");
    const right = el("div", "nx-top-right");

    this._brand   = el("div", "nx-brand", "LifeGameLab");
    this._btnPlay = el("button", "nx-btn nx-btn-primary", "▶ Spielen");
    this._btnPlay.setAttribute("aria-label", "Simulation starten oder pausieren");
    this._btnNew  = el("button", "nx-btn", "Neue Welt");
    this._btnNew.setAttribute("aria-label", "Neue Welt generieren");
    this._btnStep = el("button", "nx-btn nx-btn-dev hidden", "+1");
    this._btnStep.setAttribute("aria-label", "Einzelnen Simulationsschritt ausführen");

    // Desktop nav buttons in center — only strategy relevant
    this._ctxButtons = {};
    for (const { key, label } of SIDEBAR_TABS) {
      const btn = el("button", "nx-btn nx-btn-ghost", label);
      btn.dataset.ctx = key;
      btn.setAttribute("aria-label", `${label} Panel öffnen`);
      this._ctxButtons[key] = btn;
      center.appendChild(btn);
    }

    // UI-GAME-02: 5 strategy chips — DNA, Energy, Stage, Danger, Goal
    this._dnaChip    = el("span", "nx-chip nx-chip-dna",    "🧬 0.0");
    this._energyChip = el("span", "nx-chip nx-chip-energy", "⚡ +0.0");
    this._stageChip  = el("span", "nx-chip nx-chip-stage",  "⬢ S1");
    this._dangerChip = el("span", "nx-chip nx-chip-danger", "☣ stabil");
    this._goalChip   = el("span", "nx-chip nx-chip-goal",   "🎯 Kolonie");

    // Hidden debug chips
    this._tickChip   = el("span", "nx-chip nx-mono hidden", "t0");
    this._aliveChip  = el("span", "nx-chip nx-mono hidden", "alive 0");
    this._playerChip = el("span", "nx-chip nx-mono hidden", "p 0");
    this._seasonChip = el("span", "nx-chip nx-mono hidden", "☀ 0%");

    right.append(this._dnaChip, this._energyChip, this._stageChip, this._dangerChip, this._goalChip,
                 this._tickChip, this._aliveChip, this._playerChip, this._seasonChip);
    left.append(this._brand, this._btnPlay, this._btnNew, this._btnStep);
    top.append(left, center, right);

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

    this._hud.append(this._hudEnergy);
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
    for (const { key, icon, label } of DOCK_TABS) {
      const btn = el("button", "nx-dock-btn");
      if (key === "play") btn.classList.add("is-primary");
      btn.dataset.ctx = key;
      btn.setAttribute("aria-label", `${label} Panel öffnen`);
      btn.append(el("span", "nx-dock-icon", icon), el("span", "", label));
      this._dockTabBtns[key] = btn;
      this._mobileDock.appendChild(btn);
    }

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
      if (m >= 144) return 5; if (m >= 120) return 6;
      if (m >= 96)  return 8; if (m >= 72)  return 10;
      if (m >= 64)  return 11;if (m >= 48)  return 14;
      return 18;
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
      this._dispatch({ type:"TOGGLE_RUNNING", payload:{ running:true } });
    });

    // Dock tab buttons
    for (const [key, btn] of Object.entries(this._dockTabBtns)) {
      if (key === "play") {
        btn.addEventListener("click", togglePlay);
      } else {
        btn.addEventListener("click", () => this._toggleSheet(key));
      }
    }

    // Sheet close
    this._sheetClose.addEventListener("click", () => this._closeSheet());
    this._sheetBackdrop.addEventListener("click", () => this._closeSheet());

    // Desktop context buttons (top center nav)
    for (const [key, btn] of Object.entries(this._ctxButtons)) {
      btn.addEventListener("click", () => {
        if (isDesktop()) this._toggleSidebar(key);
        else if (key === "play") togglePlay();
        else this._toggleSheet(key);
      });
    }
  }

  // ── SHEET (mobile) ──────────────────────────────────────
  _toggleSheet(key) {
    // Strategy tool auto-switch
    if (key === "tools") this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:"cell_add" } });
    if (key === "harvest") this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:"cell_harvest" } });
    if (key === "zonen") this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:"zone_paint" } });

    if (this._activeContext === key && !this._sheet.classList.contains("hidden")) {
      this._closeSheet();
      return;
    }
    this._activeContext = key;
    const titles = { status:"Status", energie:"Energie", evolution:"Evolution",
      tools:"Werkzeug", zonen:"Zonen", world:"Welt", systems:"Systeme", sieg:"Sieg-Konfiguration" };
    this._sheetTitle.textContent = titles[key] || key;
    this._sheet.classList.remove("hidden");
    this._sheetBackdrop.classList.remove("hidden");
    // Re-animate
    this._sheet.style.animation = "none";
    requestAnimationFrame(() => { this._sheet.style.animation = ""; });
    this._renderPanelBody(this._sheetBody, this._store.getState());
    for (const [k, btn] of Object.entries(this._dockTabBtns))
      btn.classList.toggle("is-active", k === key);
  }

  _closeSheet() {
    this._sheet.classList.add("hidden");
    this._sheetBackdrop.classList.add("hidden");
    this._activeContext = null;
    for (const btn of Object.values(this._dockTabBtns)) btn.classList.remove("is-active");
    for (const btn of Object.values(this._ctxButtons)) btn.classList.remove("is-active");
  }

  // ── SIDEBAR (desktop) ────────────────────────────────────
  _toggleSidebar(key) {
    if (this._activeContext === key) {
      this._activeContext = null;
      this._sidebarBody.innerHTML = "";
      for (const btn of Object.values(this._ctxButtons)) btn.classList.remove("is-active");
      return;
    }
    this._activeContext = key;
    this._renderPanelBody(this._sidebarBody, this._store.getState());
    for (const [k, btn] of Object.entries(this._ctxButtons))
      btn.classList.toggle("is-active", k === key);
  }

  _closeContext() {
    this._closeSheet();
    this._activeContext = null;
    for (const btn of Object.values(this._ctxButtons)) btn.classList.remove("is-active");
    this._sidebarBody.innerHTML = "";
  }

  // ── PANEL BODY RENDERER (shared by sheet + sidebar) ─────
  _renderPanelBody(container, state) {
    if (!this._activeContext) return;
    const { meta, sim } = state;
    container.innerHTML = "";
    const ctx = this._activeContext;

    // ── STATUS (Lagebericht) ────────────────────────────────
    if (ctx === "status") {
      // 1. SITUATION SUMMARY (Alerts)
      const toxin = Number(sim.meanToxinField || 0);
      const energyNet = Number(sim.playerEnergyNet || 0);
      const playerAlive = Number(sim.playerAliveCount || 0);
      const isPoisoned = toxin > 0.30;
      const isStarving = energyNet < -3 && playerAlive > 0;
      const isUnstable = energyNet < 0.5 && !isStarving;

      const alertCard = el("section", "nx-card");
      alertCard.setAttribute("aria-labelledby", "status-alert-title");
      const alertTitle = el("div", "nx-card-title", "Lagebericht");
      alertTitle.id = "status-alert-title";
      alertCard.appendChild(alertTitle);
      
      let statusText = "Systeme stabil. Normale Operation.";
      let statusColor = "var(--green)";
      
      if (playerAlive === 0 && sim.tick > 10) {
        statusText = "KOLONIE KOLLABIERT. Neustart erforderlich.";
        statusColor = "var(--red)";
      } else if (isStarving) {
        statusText = "WARNUNG: Energiemangel! Expansion stoppen.";
        statusColor = "var(--red)";
      } else if (isPoisoned) {
        statusText = "GEFAHR: Hohe Toxinbelastung. Resistenzen prüfen.";
        statusColor = "var(--orange)";
      } else if (isUnstable) {
        statusText = "HINWEIS: Energiebilanz knapp. Effizienz steigern.";
        statusColor = "var(--yellow)";
      }
      
      const alertBox = el("div", "nx-alert-box", statusText);
      alertBox.style.color = statusColor;
      alertBox.style.borderColor = statusColor;
      alertBox.setAttribute("role", "status");
      alertCard.appendChild(alertBox);
      container.appendChild(alertCard);

      // 2. CORE METRICS
      const metricCard = el("section", "nx-card");
      metricCard.setAttribute("aria-labelledby", "status-metrics-title");
      const metricTitle = el("div", "nx-card-title", "Metriken");
      metricTitle.id = "status-metrics-title";
      metricCard.appendChild(metricTitle);
      
      const mkMetric = (label, val, unit, isGood) => {
        const row = el("div", "nx-stat-row");
        const valSpan = el("span", "nx-mono", `${val} ${unit}`);
        if (isGood !== undefined) valSpan.classList.add(isGood ? "nx-val-pos" : "nx-val-neg");
        row.append(el("span", "nx-label", label), valSpan);
        return row;
      };

      metricCard.append(
        mkMetric("Population", playerAlive, "", playerAlive > 0),
        mkMetric("Energie-Trend", fmtSign(energyNet, 1), "⚡", energyNet >= 0),
        mkMetric("Diversität", fmt(sim.lineageDiversity || 0, 2), "", true),
        mkMetric("Ernte-Total", sim.totalHarvested || 0, "", true)
      );
      container.appendChild(metricCard);

      // 3. VISUAL ANALYSIS (Overlays) - Moved from Energie
      const ovCard = el("section", "nx-card");
      ovCard.setAttribute("aria-labelledby", "status-scanner-title");
      const ovTitle = el("div", "nx-card-title", "Sichtmodi (Scanner)");
      ovTitle.id = "status-scanner-title";
      ovCard.appendChild(ovTitle);

      const ovGrid = el("div", "nx-top-center");
      ovGrid.style.display = "flex"; ovGrid.style.flexWrap = "wrap"; ovGrid.style.gap = "4px";
      
      const overlays = [
        { id:"none", label:"Normal" },
        { id:"energy", label:"Energie" },
        { id:"toxin", label:"Toxine" },
        { id:"nutrient", label:"Nährstoffe" },
        { id:"territory", label:"Besitz" },
        { id:"conflict", label:"Konflikt" }
      ];

      for (const ov of overlays) {
        const btn = el("button", `nx-btn nx-btn-ghost ${meta.activeOverlay === ov.id ? "is-active" : ""}`, ov.label);
        btn.style.fontSize = "10px";
        btn.setAttribute("aria-label", `Scanner-Modus ${ov.label} aktivieren`);
        btn.setAttribute("aria-pressed", meta.activeOverlay === ov.id);
        btn.addEventListener("click", () => {
          this._dispatch({ type:"SET_OVERLAY", payload: ov.id });
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
      const mainCard = el("section","nx-card");
      mainCard.setAttribute("aria-labelledby", "tools-main-title");
      const mainTitle = el("div", "nx-card-title", "Kolonie-Werkzeuge");
      mainTitle.id = "tools-main-title";
      mainCard.appendChild(mainTitle);
      
      const actions = [
        { id:"cell_add", label:"🌱 Wachsen", desc:"Platziert eine Zelle", cost:"0.5 DNA" },
        { id:"cell_harvest", label:"🧬 Ernten", desc:"Wandelt Zelle in DNA", cost:"+1.0 DNA" },
        { id:"cell_remove", label:"✂ Entfernen", desc:"Löscht eigene Zellen", cost:"0.0 DNA" },
      ];

      for (const act of actions) {
        const isActive = meta.brushMode === act.id;
        const row = el("div", `nx-zone-row${isActive ? " nx-zone-active" : ""}`);
        row.style.cursor = "pointer";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `${act.label}: ${act.desc} (Kosten: ${act.cost})`);
        row.setAttribute("aria-pressed", isActive);
        
        const left = el("div", "");
        left.appendChild(el("div", "nx-zone-name", act.label));
        left.appendChild(el("div", "nx-zone-desc", act.desc));
        
        const right = el("span", isActive ? "nx-badge-active" : "nx-badge", act.cost);
        if (act.id === "cell_harvest") right.style.color = "var(--green)";
        
        row.append(left, right);
        const trigger = () => {
          this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:act.id } });
          queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
        };
        row.addEventListener("click", trigger);
        row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
        mainCard.appendChild(row);
      }
      container.appendChild(mainCard);


      const zoneCard = el("section","nx-card");
      zoneCard.setAttribute("aria-labelledby", "tools-zones-title");
      const zoneTitle = el("div", "nx-card-title", "Territorium (Zonen)");
      zoneTitle.id = "tools-zones-title";
      zoneCard.appendChild(zoneTitle);

      for (const z of ZONE_TYPES) {
        const isActive = this._activeZoneType === z.id && meta.brushMode === "zone_paint";
        const row = el("div",`nx-zone-row${isActive ?" nx-zone-active":""}`);
        row.append(el("span","nx-zone-name",`${z.label}`), el("span","nx-zone-desc",z.desc));
        row.style.cursor="pointer";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `Zone ${z.label}: ${z.desc}`);
        row.setAttribute("aria-pressed", isActive);

        const trigger = () => {
          this._activeZoneType=z.id;
          this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:"zone_paint" } });
          queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
        };
        row.addEventListener("click", trigger);
        row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
        zoneCard.appendChild(row);
      }
      container.appendChild(zoneCard);

      const sandboxCard = el("section","nx-card");
      sandboxCard.setAttribute("aria-labelledby", "tools-sandbox-title");
      const sandboxTitle = el("div", "nx-card-title", "Simulation (Sandbox)");
      sandboxTitle.id = "tools-sandbox-title";
      sandboxCard.appendChild(sandboxTitle);

      const sandInfo = el("div", "nx-note", "Manipuliert die Umwelt direkt. Verbraucht keine DNA.");
      sandboxCard.appendChild(sandInfo);
      
      const sRow = el("div", "nx-row");
      const brush = document.createElement("select"); brush.className="nx-select";
      brush.setAttribute("aria-label", "Umwelt-Pinsel Modus wählen");
      [["paint_light","☀ Licht +"],["paint_light_remove","☀ Licht –"],
       ["paint_nutrient","🌿 Nährstoff +"],["paint_toxin","☣ Toxin +"],
       ["paint_reset","↺ Reset"]
      ].forEach(([v,t]) => {
        const o = document.createElement("option"); o.value=v; o.textContent=t;
        if ((meta.brushMode||"cell_add")===v) o.selected=true;
        brush.appendChild(o);
      });
      brush.addEventListener("change", () => {
        this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:brush.value } });
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
        this._dispatch({ type:"SET_PLACEMENT_COST", payload:{ enabled:!meta.placementCostEnabled } });
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
      const totalHarvested = Number(sim.totalHarvested || 0);
      const dnaCost = 5 * playerStage;
      const canAfford = playerDNA >= dnaCost;

      const infoCard = el("section", "nx-card");
      infoCard.setAttribute("aria-labelledby", "evolution-info-title");
      const infoTitle = el("div", "nx-card-title", "Evolutions-Zentrum");
      infoTitle.id = "evolution-info-title";
      infoCard.appendChild(infoTitle);
      
      const progressGrid = el("div", "nx-stat-row");
      progressGrid.append(el("span", "nx-label", `Stage ${playerStage} / 5`), el("span", "nx-mono nx-val-pos", `${totalHarvested} Ernten`));
      infoCard.append(progressGrid);
      
      const nextThr = playerStage < 5 ? STAGE_THRESHOLDS[playerStage] : 60;
      const prevThr = STAGE_THRESHOLDS[playerStage - 1] || 0;
      const pct = playerStage >= 5 ? 100 : ((totalHarvested - prevThr) / (nextThr - prevThr)) * 100;
      
      const bar = el("div", "nx-bar-wrap");
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuenow", Math.round(pct));
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
      bar.setAttribute("aria-label", "Evolutions-Fortschritt zur nächsten Stufe");
      const fill = el("div", "nx-bar-fill nx-bar-stage");
      fill.style.width = `${Math.min(100, pct)}%`;
      bar.appendChild(fill);
      infoCard.appendChild(bar);
      
      const dnaRow = el("div", "nx-stat-row");
      dnaRow.append(el("span", "nx-label", "DNA-Reserve"), el("span", "nx-mono", `🧬 ${playerDNA.toFixed(1)}`));
      infoCard.appendChild(dnaRow);
      container.appendChild(infoCard);

      // Archetype groups by Stage
      const stages = [1, 2, 3]; // Show first 3 stages as a tree
      for (const s of stages) {
        const isLocked = playerStage < s;
        const groupDiv = el("div", `nx-archetype-group${isLocked ? " nx-archetype-locked" : ""}`);
        const groupTitle = s === 1 ? "Basis-Stoffwechsel" : s === 2 ? "Anpassung" : "Spezialisierung";
        groupDiv.appendChild(el("div", "nx-archetype-stage-label", `${groupTitle} (Stage ${s}${isLocked ? " [GESPERRT]" : ""})`));
        
        const stageArchetypes = ARCHETYPES.filter(a => a.stage === s);
        for (const arch of stageArchetypes) {
          const card = el("div", "nx-archetype-card");
          const head = el("div", "nx-archetype-head");
          head.append(el("span", "nx-archetype-name", arch.label), el("span", "nx-archetype-cost", `${dnaCost} DNA`));
          
          const btn = el("button", `nx-btn nx-btn-evolve${!canAfford || isLocked ? " nx-btn-disabled" : ""}`, "Integrieren");
          btn.setAttribute("aria-label", `${arch.label} integrieren: ${arch.desc} (Kosten: ${dnaCost} DNA)`);
          if (!canAfford || isLocked) btn.disabled = true;
          btn.addEventListener("click", () => {
            this._dispatch({ type: "BUY_EVOLUTION", payload: { archetypeId: arch.id } });
          });
          
          card.append(head, el("div", "nx-archetype-desc", arch.desc), btn);
          groupDiv.appendChild(card);
        }
        container.appendChild(groupDiv);
      }
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
        [["cell_add","🌱 Zelle setzen"],["cell_remove","✂ Entfernen"],["cell_harvest","🧬 Ernten"],
         ["light","☀ Licht +"],["light_remove","☀ Licht –"],["nutrient","🌿 Nährstoff +"],
         ["toxin","☣ Toxin +"],["saturation_reset","↺ Sättigung –"],["zone_paint","🧱 Zone malen"]
        ].forEach(([v,t]) => {
          const o = document.createElement("option"); o.value=v; o.textContent=t;
          if ((meta.brushMode||"cell_add")===v) o.selected=true;
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
            this._dispatch({ type:"SET_BRUSH", payload:{ brushMode:"zone_paint" } });
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
      const gl = meta.globalLearning || { enabled:true, strength:0.42 };
      const learnCard = el("section","nx-card");
      learnCard.setAttribute("aria-labelledby", "systems-learning-title");
      const learnTitle = el("div", "nx-card-title", "Lernen");
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
      const accTitle = el("div", "nx-card-title", "Barrierefreiheit");
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
        this._dispatch({ type: "SET_UI_PREFERENCE", payload: { key: "ariaLevel", value: Number(ariaSel.value) } });
      });
      ariaRow.appendChild(ariaSel);
      accCard.appendChild(ariaRow);

      const offscreenEnabled = !!meta.ui?.offscreenEnabled;
      const offRow = el("div", "nx-row");
      const offToggle = el("button", `nx-btn ${offscreenEnabled ? "nx-btn-primary" : ""}`, offscreenEnabled ? "Threading: AN" : "Threading: AUS");
      offToggle.setAttribute("aria-label", `Performance-Threading ${offscreenEnabled ? "deaktivieren" : "aktivieren"} (Experimentell)`);
      offToggle.setAttribute("aria-pressed", offscreenEnabled);
      offToggle.addEventListener("click", () => {
        this._dispatch({ type: "SET_UI_PREFERENCE", payload: { key: "offscreenEnabled", value: !offscreenEnabled } });
        queueMicrotask(() => this._renderPanelBody(container, this._store.getState()));
      });
      offRow.append(el("span", "nx-label", "Offscreen-Rendering"), offToggle);
      accCard.appendChild(offRow);

      const benchmarkBtn = el("button", "nx-btn", "Start Benchmark");
      benchmarkBtn.setAttribute("aria-label", "Performance-Benchmark starten");
      benchmarkBtn.addEventListener("click", () => this._dispatch({ type: "RUN_BENCHMARK" }));
      accCard.appendChild(benchmarkBtn);

      const phyCard = el("section","nx-card");
      phyCard.setAttribute("aria-labelledby", "systems-physics-title");
      const physicsTitle = el("div", "nx-card-title", "Kern-Parameter");
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
      container.append(learnCard, accCard, phyCard);
      return;
    }

    // ── SIEG (Pfad & Blocker) ───────────────────────────────
    if (ctx === "sieg") {
      const currentMode = String(sim.winMode || "supremacy");
      const playerStage = Number(sim.playerStage || 1);
      const WIN_MODES = [
        { id:"supremacy", label:"Energie-Suprematie", desc:"Dominanz: EIn > CPU × 1.5", req:"Stage 2 benötigt", stage:2 },
        { id:"stockpile",  label:"Territorial-Dominanz", desc:"Pop-Vorteil: Pop > CPU × 1.5", req:"Stage 3 benötigt", stage:3 },
        { id:"efficiency", label:"Effizienz-Meister", desc:"Kontrolle: E/Zelle > 0.18", req:"Stage 4 benötigt", stage:4 },
      ];

      const modeCard = el("section","nx-card");
      modeCard.setAttribute("aria-labelledby", "victory-modes-title");
      const modesTitle = el("div", "nx-card-title", "Siegpfad wählen");
      modesTitle.id = "victory-modes-title";
      modeCard.appendChild(modesTitle);

      for (const m of WIN_MODES) {
        const isLocked = playerStage < m.stage;
        const isActive = currentMode === m.id;
        const row = el("div",`nx-zone-row${isActive ?" nx-zone-active":""}${isLocked?" nx-archetype-locked":""}`);
        row.style.cursor = isLocked ? "default" : "pointer";
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", isLocked ? "-1" : "0");
        row.setAttribute("aria-label", `Siegmodus ${m.label}: ${isLocked ? "Gesperrt (" + m.req + ")" : m.desc}`);
        row.setAttribute("aria-pressed", isActive);
        if (isLocked) row.setAttribute("aria-disabled", "true");

        const left2 = el("div","");
        left2.appendChild(el("div","nx-zone-name",m.label));
        left2.appendChild(el("div","nx-zone-desc",isLocked ? `🔒 ${m.req}` : m.desc));
        row.appendChild(left2);

        if (!isLocked) {
          if (isActive) row.appendChild(el("span","nx-val-pos","✓"));
          const trigger = () => {
            this._dispatch({ type:"SET_WIN_MODE", payload:{ winMode:m.id } });
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
        mkProg("Suprematie", supTicks,  200, "nx-bar-light", currentMode==="supremacy", modeLocked && currentMode==="supremacy" ? "Stage zu niedrig" : null),
        mkProg("Territorium", stockTicks, 200, "nx-bar-nutrient", currentMode==="stockpile", modeLocked && currentMode==="stockpile" ? "Stage zu niedrig" : null),
        mkProg("Effizienz",  effTicks,  100, "nx-bar-nutrient", currentMode==="efficiency", modeLocked && currentMode==="efficiency" ? "Stage zu niedrig" : null),
        mkProg("Kollaps-Risiko", lossStreak, 150, "nx-bar-loss", true, null),
      );

      container.append(modeCard, progCard);
      return;
    }
    }

    // ── GAME OVER OVERLAY ───────────────────────────────────

  _showGameOverlay(sim) {
    const isWin = sim.gameResult === "win";
    const modeLbl = { supremacy:"Energie-Suprematie", stockpile:"Energie-Depot",
      efficiency:"Effizienz-Meister", extinction:"Ausrottung", energy_collapse:"Energie-Kollaps" }[sim.winMode] || sim.winMode;
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
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); this._toggleSheet("status"); }
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); this._toggleSheet("evolution"); }
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
    if (mode === "cell_harvest") {
      if (!start) return;
      this._dispatch({ type:"HARVEST_CELL", payload:{ x:wx, y:wy } }); return;
    }
    if (mode === "zone_paint") {
      this._dispatch({ type:"SET_ZONE", payload:{ x:wx, y:wy, radius, zoneType:this._activeZoneType } }); return;
    }
    if (mode === "cell_add" || mode === "cell_remove") {
      if (!start) return;
      this._dispatch({ type:"PLACE_CELL", payload:{ x:wx, y:wy, remove:mode==="cell_remove" } }); return;
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
    const seasonIcon = season<0.25?"🌱":season<0.5?"☀":season<0.75?"🍂":"❄";

    // Topbar play btn
    this._btnPlay.textContent = running ? "Pause" : "Start";

    // KPI chips
    this._tickChip.textContent   = `t${sim.tick}`;
    this._aliveChip.textContent  = `alive ${sim.aliveCount}`;
    this._playerChip.textContent = `p ${playerAlive}`;
    this._dnaChip.textContent    = `🧬 ${playerDNA.toFixed(1)}`;
    this._stageChip.textContent  = `⬢ S${playerStage}`;
    this._energyChip.textContent = `⚡ ${fmtSign(energyNet,1)}`;
    this._seasonChip.textContent = `${seasonIcon} ${(season*100).toFixed(0)}%`;
    this._energyChip.style.color = energyNet>=0 ? "var(--green)" : "var(--red)";

    // UI-GAME-02: Strategy HUD sync — Danger
    const toxin   = Number(sim.meanToxinField   || 0);
    const netSign = energyNet >= 0;

    // Danger chip logic (Lagebericht)
    const isPoisoned = toxin > 0.30;
    const isStarving = energyNet < -3 && playerAlive > 0;
    const isExtinct  = playerAlive === 0 && sim.tick > 5;
    const isUnstable = energyNet < 0.5 && !isStarving && !isExtinct;

    let dangerMsg = "☣ stabil";
    let dangerColor = "var(--green)";
    if (isExtinct) { dangerMsg = "☠ Kollaps"; dangerColor = "var(--red)"; }
    else if (isStarving) { dangerMsg = "⚠ Kritisch"; dangerColor = "var(--red)"; }
    else if (isPoisoned) { dangerMsg = "☣ Toxisch"; dangerColor = "var(--orange)"; }
    else if (isUnstable) { dangerMsg = "⚙ instabil"; dangerColor = "var(--yellow)"; }

    this._dangerChip.textContent = dangerMsg;
    this._dangerChip.style.color = dangerColor;

    // UI-GAME-02: Strategy HUD sync — Goal
    this._goalChip.textContent = sim.goal || "🎯 Kolonie";

    // UI-GAME-01: Canvas-HUD sync — Reduced to Trend arrow
    this._hudEnergyArrow.textContent = netSign ? "▲" : "▼";
    this._hudEnergyVal.textContent   = `${netSign ? "+" : ""}${energyNet.toFixed(1)} ⚡`;
    this._hudEnergy.style.color      = netSign ? "var(--green)" : "var(--red)";

    // Dock active states
    for (const [k, btn] of Object.entries(this._dockTabBtns)) {
      if (k === "play") {
        btn.classList.toggle("running", !!running);
        btn.querySelector(".nx-dock-icon").textContent = running ? "⏸" : "▶";
      } else {
        btn.classList.toggle("is-active", k === this._activeContext);
      }
    }

    // Re-render open panel (safe update)
    if (this._activeContext) {
      const container = isDesktop() ? this._sidebarBody : this._sheetBody;
      this._renderPanelBody(container, state);
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
      if (sim.gameResult === "win") this._announce(`Sieg! (${sim.winMode})`);
      else if (sim.gameResult === "loss") this._announce(`Niederlage! (${sim.winMode})`);
      this._lastGameEndTick = sim.gameEndTick;
    }

    // --- Dev panel ─────────────────────────────────────────
  }
}
