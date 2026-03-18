import { GAME_RESULT, WIN_MODE_RESULT_LABEL } from "../contracts/ids.js";
import { el, fmt } from "./ui.dom.js";

export function installUiOverlay(UI) {
  Object.assign(UI.prototype, {
  _showGameOverlay(sim) {
    const summary = sim?.runSummary && typeof sim.runSummary === "object" ? sim.runSummary : {};
    const result = String(summary.result || "");
    const summaryWinMode = String(summary.winMode || "");
    const summaryTick = Number(summary.tick ?? 0);
    const summaryStage = Number(summary.stage ?? 1);
    const summaryCpuDelta = Number(summary.cpuDelta ?? 0);
    const summaryDNA = Number(summary.playerDNA ?? 0);
    const summaryEnergyNet = Number(summary.playerEnergyNet ?? 0);
    const summaryHarvested = Number(summary.totalHarvested ?? 0);
    const summaryActiveBiomes = Number(summary.activeBiomeCount ?? 0);
    const summaryTopology = String(summary.dominantTopology || "");
    const isWin = result === GAME_RESULT.WIN;
    const modeLbl = WIN_MODE_RESULT_LABEL[summaryWinMode] || summaryWinMode;
    const inner = this._gameOverlayInner;
    inner.innerHTML = "";
    const icon  = el("div","nx-go-icon",  isWin?"🏆":"☠");
    const title = el("div","nx-go-title", isWin?"SIEG":"NIEDERLAGE");
    title.style.color = isWin?"var(--green)":"var(--red)";
    const sub  = el("div","nx-go-sub",   modeLbl);
    const tick = el("div","nx-go-tick",  `Tick ${summaryTick}`);
    const dominantPattern = summaryTopology || "keine";
    const cpuDelta = summaryCpuDelta;
    const stats = el("div","nx-go-stats");
    for (const [label,val] of [
      ["Ausgang", isWin ? "Sieg" : "Niederlage"],
      ["Siegpfad", modeLbl],
      ["End-Tick", String(summaryTick || 0)],
      ["Stage", `${summaryStage||1} / 5`],
      ["Population", String(sim.playerAliveCount || 0)],
      ["CPU Delta", `${cpuDelta >= 0 ? "+" : ""}${cpuDelta}`],
      ["DNA", summaryDNA.toFixed(1)],
      ["Energie Netto", `${summaryEnergyNet >= 0 ? "+" : ""}${fmt(summaryEnergyNet, 2)}`],
      ["Harvest Total", String(summaryHarvested || 0)],
      ["Aktive Biome", String(summaryActiveBiomes || 0)],
      ["Dominante Topologie", dominantPattern],
    ]) {
      const row = el("div","nx-go-stat-row");
      row.append(el("span","nx-go-stat-label",label), el("span","nx-go-stat-val",val));
      stats.appendChild(row);
    }

    const controls = el("div", "nx-chip-grid");
    const btnRematch = el("button","nx-btn nx-go-btn","REMATCH");
    btnRematch.addEventListener("click", () => {
      const currentSeed = String(this._store.getState()?.meta?.seed || "life-seed");
      const rematchSeed = `${currentSeed}_rematch`;
      this._gameOverlay.classList.add("hidden");
      this._lastGameResult = "";
      this._dispatch({ type: "TOGGLE_RUNNING", payload: { running: false } });
      this._dispatch({ type: "SET_SEED", payload: rematchSeed });
      this._dispatch({ type: "GEN_WORLD", payload: {} });
    });
    const btnDaily = el("button","nx-btn nx-go-btn","DAILY CHALLENGE");
    btnDaily.disabled = true;
    btnDaily.title = "Daily Challenge wird erst mit einer deterministischen Daily-Quelle aktiviert.";
    const btnNew = el("button","nx-btn nx-btn-primary nx-go-btn","Neue Welt");
    btnNew.addEventListener("click", () => {
      this._gameOverlay.classList.add("hidden");
      this._lastGameResult = "";
      this._btnNew.click();
    });
    controls.append(btnRematch, btnDaily, btnNew);
    inner.append(icon, title, sub, tick, stats, controls);
    this._gameOverlay.classList.remove("hidden");
  }
  });
}
