import { el } from "./ui.dom.js";

export function installUiLayout(UI) {
  Object.assign(UI.prototype, {
  _build() {
    const app = document.getElementById("app") || document.body;
    if (app.querySelector(".nx-minimal-shell")) return;
    while (app.firstChild) app.removeChild(app.firstChild);

    const shell = el("section", "nx-minimal-shell");
    const header = el("header", "nx-minimal-header");
    this._brand = el("div", "nx-brand", "LifeGameLab");
    this._btnPlay = el("button", "nx-btn nx-btn-primary", "▶ Start");
    this._btnPlay.setAttribute("aria-label", "Simulation starten oder pausieren");
    this._btnNew = el("button", "nx-btn", "Neue Welt");
    this._btnNew.setAttribute("aria-label", "Neue Welt generieren");
    this._btnStep = el("button", "nx-btn nx-btn-dev hidden", "+1");
    this._headerHint = el("div", "nx-minimal-hint", "Klick: Worker setzen | Worker->Ressource: Bewegung");
    const actions = el("div", "nx-top-actions");
    actions.append(this._btnPlay, this._btnNew, this._btnStep);
    header.append(this._brand, this._headerHint, actions);

    const stage = el("main", "nx-stage");
    this._canvasWrap = el("section", "nx-canvas-wrap");
    this._canvasWrap.id = "canvas-wrap";
    this._canvas.id = "cv";
    this._canvasWrap.appendChild(this._canvas);

    stage.append(this._canvasWrap);

    this._announcer = el("div", "nx-aria-announcer");
    this._announcer.setAttribute("aria-live", "polite");
    this._announcer.setAttribute("aria-atomic", "true");
    this._announcer.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";

    shell.append(header, stage, this._announcer);
    app.append(shell);
  }
  });
}
