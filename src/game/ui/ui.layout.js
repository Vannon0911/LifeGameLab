import { PANEL_DEFS } from "./ui.constants.js";
import { el } from "./ui.dom.js";

export function installUiLayout(UI) {
  Object.assign(UI.prototype, {
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
  });
}
