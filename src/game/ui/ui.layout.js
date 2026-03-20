import { el } from "./ui.dom.js";

export function installUiLayout(UI) {
  Object.assign(UI.prototype, {
    _build() {
      const app = document.getElementById("app") || document.body;
      if (app.querySelector(".nx-minimal-shell")) return;
      while (app.firstChild) app.removeChild(app.firstChild);

      const shell = el("section", "nx-minimal-shell");
      shell.style.cssText = [
        "position:relative",
        "display:flex",
        "flex-direction:column",
        "gap:12px",
        "min-height:100vh",
        "padding:14px",
        "box-sizing:border-box",
        "background:linear-gradient(180deg,#071019 0%,#091624 45%,#0b1118 100%)",
        "color:#eaf2ff",
      ].join(";");

      const header = el("header", "nx-minimal-header");
      header.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:12px",
        "flex-wrap:wrap",
        "justify-content:space-between",
        "padding:14px 16px",
        "border-radius:20px",
        "border:1px solid rgba(170,190,230,0.16)",
        "background:linear-gradient(135deg, rgba(14,18,29,0.92), rgba(19,29,44,0.82))",
        "backdrop-filter:blur(12px)",
        "box-shadow:0 14px 34px rgba(2,6,12,0.34)",
      ].join(";");

      this._timer = el("div", "nx-header-timer", "Timer 00:00");
      this._timer.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "min-height:36px",
        "padding:0 12px",
        "border-radius:999px",
        "border:1px solid rgba(170,190,230,0.22)",
        "background:rgba(18,27,40,0.82)",
        "color:#f5fbff",
        "font:700 0.95rem/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        "letter-spacing:0.04em",
        "white-space:nowrap",
      ].join(";");

      this._headerHint = el("div", "nx-minimal-hint", "Klick: Worker setzen | Worker->Ressource: Bewegung");
      this._headerHint.style.cssText = "flex:1;min-width:220px;font:500 0.92rem/1.4 ui-sans-serif, system-ui, sans-serif;color:#bfd0eb;";

      const actions = el("div", "nx-top-actions");
      actions.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;";

      this._statusBadge = el("div", "nx-status-badge", "Bereit");
      this._statusBadge.setAttribute("aria-live", "polite");
      this._statusBadge.dataset.tone = "ok";
      this._statusBadge.style.cssText = [
        "display:inline-flex",
        "align-items:center",
        "min-height:34px",
        "padding:0 12px",
        "border-radius:999px",
        "border:1px solid rgba(122,255,182,0.55)",
        "background:rgba(28,76,48,0.72)",
        "color:#eafff2",
        "font:600 0.86rem/1.1 ui-sans-serif, system-ui, sans-serif",
        "white-space:nowrap",
      ].join(";");

      actions.append(this._statusBadge);
      header.append(this._timer, this._headerHint, actions);

      const stage = el("main", "nx-stage");
      stage.style.cssText = [
        "position:relative",
        "flex:1",
        "min-height:0",
        "display:flex",
        "align-items:stretch",
      ].join(";");

      this._canvasWrap = el("section", "nx-canvas-wrap");
      this._canvasWrap.id = "canvas-wrap";
      this._canvasWrap.style.cssText = [
        "position:relative",
        "flex:1",
        "min-height:64vh",
        "overflow:hidden",
        "border-radius:24px",
        "border:1px solid rgba(170,190,230,0.14)",
        "background:radial-gradient(circle at 20% 20%, rgba(78,104,136,0.18), rgba(8,12,18,0.92) 58%)",
        "box-shadow:inset 0 1px 0 rgba(255,255,255,0.05), 0 22px 46px rgba(0,0,0,0.38)",
      ].join(";");

      this._canvas.id = "cv";
      this._canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;";
      this._canvasWrap.appendChild(this._canvas);

      this._builderHoverFrame = el("div", "nx-builder-hover");
      this._builderHoverFrame.style.cssText = [
        "position:absolute",
        "display:none",
        "pointer-events:none",
        "box-sizing:border-box",
        "border:2px solid rgba(255,210,122,0.95)",
        "border-radius:12px",
        "background:rgba(255,210,122,0.08)",
        "box-shadow:0 0 0 1px rgba(255,210,122,0.22) inset, 0 0 24px rgba(255,210,122,0.20)",
        "z-index:8",
      ].join(";");

      this._builderHoverLabel = el("div", "nx-builder-hover-label", "");
      this._builderHoverLabel.style.cssText = [
        "position:absolute",
        "left:0",
        "top:-22px",
        "padding:2px 8px",
        "border-radius:999px",
        "background:#ffd47a",
        "color:#081018",
        "font:700 0.72rem/1.2 ui-sans-serif, system-ui, sans-serif",
        "white-space:nowrap",
        "transform:translateY(-1px)",
        "box-shadow:0 6px 14px rgba(0,0,0,0.2)",
      ].join(";");
      this._builderHoverFrame.appendChild(this._builderHoverLabel);

      this._builderPanel = el("aside", "nx-builder-panel");
      this._builderPanel.setAttribute("aria-hidden", "true");
      this._builderPanel.style.cssText = [
        "position:absolute",
        "top:14px",
        "right:14px",
        "z-index:12",
        "display:none",
        "width:min(340px, calc(100% - 28px))",
        "padding:14px",
        "border-radius:18px",
        "border:1px solid rgba(255,210,122,0.35)",
        "background:rgba(9,14,22,0.82)",
        "backdrop-filter:blur(14px)",
        "box-shadow:0 18px 42px rgba(8,18,24,0.48)",
        "color:#eaf2ff",
      ].join(";");

      const panelTop = el("div", "nx-builder-panel-top");
      panelTop.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;";
      this._builderPanelTitle = el("div", "nx-builder-panel-title", "Map Builder");
      this._builderPanelTitle.style.cssText = "font:800 0.98rem/1.1 ui-sans-serif, system-ui, sans-serif;letter-spacing:0.06em;text-transform:uppercase;";
      this._builderExitButton = el("button", "nx-btn nx-btn-ghost", "Schliessen");
      this._builderExitButton.style.cssText = "padding:0.42rem 0.72rem;";
      panelTop.append(this._builderPanelTitle, this._builderExitButton);

      this._builderPanelState = el("div", "nx-builder-panel-state", "Phase: inaktiv");
      this._builderPanelState.style.cssText = "font:700 0.9rem/1.35 ui-sans-serif, system-ui, sans-serif;color:#b9ffd9;margin-bottom:4px;";
      this._builderPanelMode = el("div", "nx-builder-panel-mode", "Aktives Werkzeug: Licht");
      this._builderPanelMode.style.cssText = "font:600 0.9rem/1.35 ui-sans-serif, system-ui, sans-serif;color:#dfe8fb;margin-bottom:8px;";
      this._builderPanelMeta = el("div", "nx-builder-panel-meta", "M schaltet den Builder um. Palette waehlt Kacheltypen.");
      this._builderPanelMeta.style.cssText = "font:500 0.82rem/1.45 ui-sans-serif, system-ui, sans-serif;color:#94a9c7;margin-bottom:10px;";

      this._builderPalette = el("div", "nx-builder-palette");
      this._builderPalette.style.cssText = "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;";
      this._builderPaletteButtons = Object.create(null);
      for (const option of this._builderTileOptions || []) {
        const btn = el("button", "nx-btn nx-builder-tile-btn", option.label);
        btn.dataset.mode = option.mode;
        btn.title = `${option.label}: ${option.hint}`;
        btn.setAttribute("aria-label", `${option.label} wählen`);
        btn.style.cssText = [
          "display:flex",
          "align-items:center",
          "justify-content:center",
          "min-height:42px",
          "padding:0.5rem 0.65rem",
          "border-radius:12px",
          "border:1px solid rgba(255,255,255,0.12)",
          "background:rgba(11,15,23,0.76)",
          "color:#d6def2",
          "font:700 0.82rem/1.1 ui-sans-serif, system-ui, sans-serif",
          "letter-spacing:0.03em",
          "text-transform:uppercase",
        ].join(";");
        this._builderPaletteButtons[option.mode] = btn;
        this._builderPalette.appendChild(btn);
      }

      this._builderPanelStatus = el("div", "nx-builder-panel-status", "Bereit");
      this._builderPanelStatus.style.cssText = "font:700 0.88rem/1.35 ui-sans-serif, system-ui, sans-serif;color:#b9ffd9;margin-bottom:4px;";
      this._builderPanelHint = el("div", "nx-builder-panel-hint", "Klicke auf eine Kachel oder waehle ein Werkzeug.");
      this._builderPanelHint.style.cssText = "font:500 0.8rem/1.45 ui-sans-serif, system-ui, sans-serif;color:#9db0cf;";

      this._builderPanel.append(panelTop, this._builderPanelState, this._builderPanelMode, this._builderPanelMeta, this._builderPalette, this._builderPanelStatus, this._builderPanelHint);
      this._canvasWrap.append(this._builderHoverFrame, this._builderPanel);

      this._announcer = el("div", "nx-aria-announcer");
      this._announcer.setAttribute("aria-live", "polite");
      this._announcer.setAttribute("aria-atomic", "true");
      this._announcer.dataset.ariaLevel = "1";
      this._announcer.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";

      stage.append(this._canvasWrap);
      shell.append(header, stage, this._announcer);
      app.append(shell);
    }
  });
}
