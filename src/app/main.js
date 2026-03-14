// ============================================================
// Main — Application Bootstrap & Game Loop (V4 DETERMINISTIC)
// ============================================================

import { createStore }       from "../core/kernel/store.js";
import { manifest, APP_VERSION } from "../project/project.manifest.js";
import { reducer, simStepPatch, shouldAdvanceSimulation } from "../project/project.logic.js";
import { render }            from "../project/renderer.js";
import { UI }                from "../project/ui.js";
import { hashString }        from "../core/kernel/rng.js";
import { GAME_MODE } from "../game/contracts/ids.js";
import { createSimStepBuffer } from "../core/runtime/simStepBuffer.js";
import { createLlmCommandAdapter } from "../project/llm/commandAdapter.js";
import { assertLlmGateSync } from "../project/llm/gateSync.js";
import { registerPublicApi } from "./runtime/publicApi.js";
import { createWorldStateLog } from "./runtime/worldStateLog.js";
import { downloadTextFile, summarizeSeries } from "./runtime/reportUtils.js";
import { bindBootStatusErrorHooks, setBootStatus } from "./runtime/bootStatus.js";

bindBootStatusErrorHooks();
const WorldStateLog = createWorldStateLog(hashString);

// ── Store ─────────────────────────────────────────────────
assertLlmGateSync(manifest);
const store = createStore(manifest, {
  reducer,
  simStep: simStepPatch,
  actionAdapter: createLlmCommandAdapter(),
});
// Initialize Log with Seed from Store
WorldStateLog.init(store.getState().meta.seed);
window.__worldStateLog = WorldStateLog;
const RuntimeHooks = { onStructuralChange: null };

// ── SIM_STEP Precompute Buffer (idle-time compute) ─────────
const stepBuffer = createSimStepBuffer({
  store,
  manifest,
  project: { reducer, simStep: simStepPatch },
  maxBufferedSteps: 6,
});
stepBuffer.start();

// Invalidate precompute buffer on any non-step action (user interaction, reset, etc.).
// This keeps buffered patches aligned with the exact revision they were computed from.
const _dispatchRaw = store.dispatch.bind(store);
store.dispatch = (action) => {
  const t = action && typeof action === "object" ? action.type : "";
  if (t === "RUN_BENCHMARK") {
    Benchmark.run(store);
    return;
  }
  if (t && t !== "SIM_STEP" && t !== "APPLY_BUFFERED_SIM_STEP") stepBuffer.invalidate();
  const result = _dispatchRaw(action);
  if (t && t !== "SIM_STEP" && t !== "APPLY_BUFFERED_SIM_STEP") RuntimeHooks.onStructuralChange?.(t, action);
  return result;
};

const Benchmark = {
  isRunning: false,
  phase: "idle",
  frames: 0,
  results: {},
  lastReport: null,
  startedAt: "",
  targetFrames: 360,

  emitUpdate() {
    try {
      window.dispatchEvent(new CustomEvent("benchmark:update", { detail: this.getSnapshot() }));
    } catch {}
  },

  getSnapshot() {
    return {
      isRunning: this.isRunning,
      phase: this.phase,
      frames: this.frames,
      targetFrames: this.targetFrames,
      lastReport: this.lastReport,
    };
  },

  getPhaseReport(phase) {
    const res = this.results[phase];
    if (!res) return null;
    return {
      phase,
      fps: summarizeSeries(res.fps),
      render: summarizeSeries(res.render),
    };
  },

  buildReport() {
    return {
      version: APP_VERSION,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      targetFrames: this.targetFrames,
      phases: {
        main: this.getPhaseReport("main"),
        worker: this.getPhaseReport("worker"),
      },
      raw: {
        main: this.results.main || { fps: [], render: [] },
        worker: this.results.worker || { fps: [], render: [] },
      },
    };
  },

  toCsv(report = this.lastReport) {
    const rows = ["phase,metric,avg,min,max,frames"];
    for (const phase of ["main", "worker"]) {
      const phaseReport = report?.phases?.[phase];
      if (!phaseReport) continue;
      for (const metric of ["fps", "render"]) {
        const stats = phaseReport[metric];
        if (!stats) continue;
        rows.push([
          phase,
          metric,
          stats.avg.toFixed(3),
          stats.min.toFixed(3),
          stats.max.toFixed(3),
          stats.frames,
        ].join(","));
      }
    }
    return `${rows.join("\n")}\n`;
  },

  download(kind = "json") {
    const report = this.lastReport;
    if (!report) return false;
    const stamp = String(report.finishedAt || report.startedAt || "benchmark").replace(/[:.]/g, "-");
    if (kind === "csv") {
      downloadTextFile(`lifegamelab-benchmark-${stamp}.csv`, this.toCsv(report), "text/csv;charset=utf-8");
      return true;
    }
    downloadTextFile(`lifegamelab-benchmark-${stamp}.json`, JSON.stringify(report, null, 2), "application/json;charset=utf-8");
    return true;
  },
  
  async run(store) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startedAt = new Date().toISOString();
    this.lastReport = null;
    this.results = { main: { fps: [], render: [] }, worker: { fps: [], render: [] } };
    this.phase = "setup_main";
    this.frames = 0;
    stepBuffer.stop();
    console.log("=== Benchmark start ===");
    this.emitUpdate();

    // 1. Main-Thread setup
    store.dispatch({ type: "SET_UI", payload: { offscreenEnabled: false } });
    store.dispatch({ type: "SET_SIZE", payload: { w: 144, h: 144 } });
    store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
    store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for resize
    if (!this.isRunning) return;
    this.phase = "main";
    this.frames = 0;
    this.emitUpdate();
  },

  tick(perf) {
    if (!this.isRunning || this.phase === "idle" || this.phase === "done") return;
    if (this.phase === "setup_main" || this.phase === "worker_init") return;
    if (this.frames < this.targetFrames) {
      this.results[this.phase].fps.push(Number(perf?.fps ?? perf?.fpsEma ?? 0));
      this.results[this.phase].render.push(Number(perf?.renderMs ?? perf?.renderMsEma ?? 0));
      this.frames++;
      this.emitUpdate();
    } else if (this.phase === "main") {
      this.logResults("main");
      this.phase = "worker_init";
      this.emitUpdate();
      store.dispatch({ type: "SET_UI", payload: { offscreenEnabled: true } });
      setTimeout(() => {
        if (!this.isRunning) return;
        this.phase = "worker";
        this.frames = 0;
        this.results.worker = { fps: [], render: [] };
        this.emitUpdate();
      }, 2000);
    } else if (this.phase === "worker") {
      this.logResults("worker");
      this.phase = "done";
      this.isRunning = false;
      this.lastReport = this.buildReport();
      stepBuffer.start();
      this.emitUpdate();
      console.log("=== Benchmark complete ===");
    }
  },

  logResults(phase) {
    const phaseReport = this.getPhaseReport(phase);
    if (!phaseReport) return;
    console.log(
      `[${phase.toUpperCase()}] FPS avg/min/max ${phaseReport.fps.avg.toFixed(2)}/${phaseReport.fps.min.toFixed(2)}/${phaseReport.fps.max.toFixed(2)} · ` +
      `Render avg/min/max ${phaseReport.render.avg.toFixed(2)}/${phaseReport.render.min.toFixed(2)}/${phaseReport.render.max.toFixed(2)} ms`
    );
  }
};
window.__lifeGameBenchmark = Benchmark;
Benchmark.emitUpdate();


// ── Bootstrap: generate and start world ──────────────────
store.dispatch({ type: "GEN_WORLD" });

function hasRunnableWorld(state) {
  const world = state?.world;
  if (!world) return false;
  const w = Number(world.w) | 0;
  const h = Number(world.h) | 0;
  if (w <= 0 || h <= 0) return false;
  const n = w * h;
  return !!world.alive && typeof world.alive.length === "number" && world.alive.length === n;
}

function recoverWorld(reason) {
  console.error("[runtime] world recovery:", reason);
  stepBuffer.stop();
  RenderManager.flush?.(reason);
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: false } });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  stepBuffer.start();
}

if (!hasRunnableWorld(store.getState())) {
  recoverWorld("bootstrap_invalid_world");
}
setBootStatus(`v${APP_VERSION} · Boot OK`);

// ── UI ───────────────────────────────────────────────────
let canvas = document.getElementById("cv");
if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.id = "cv";
  const appRoot = document.getElementById("app") || document.body;
  appRoot.appendChild(canvas);
}

const RenderManager = {
  worker: null,
  isInitialized: false,
  isPending: false,
  lastRenderInfo: null,
  generation: 0,
  lastSignature: "",
  lastSubmittedTick: -1,
  mode: "main",
  canvasMode: "main",
  hasMainContext: false,

  replaceCanvas(nextMode = "main") {
    const prev = canvas;
    if (!prev?.parentNode) return canvas;
    const replacement = document.createElement("canvas");
    replacement.id = prev.id || "cv";
    replacement.className = prev.className;
    replacement.style.cssText = prev.style.cssText;
    const rect = prev.getBoundingClientRect();
    replacement.width = Math.max(1, prev.width || Math.floor(rect.width) || 300);
    replacement.height = Math.max(1, prev.height || Math.floor(rect.height) || 150);
    prev.parentNode.replaceChild(replacement, prev);
    canvas = replacement;
    ui?.setCanvas?.(replacement);
    this.isInitialized = false;
    this.isPending = false;
    this.lastRenderInfo = null;
    this.lastSignature = "";
    this.lastSubmittedTick = -1;
    this.canvasMode = nextMode === "worker" ? "fresh" : "main";
    this.hasMainContext = false;
    return replacement;
  },

  init(canvas, retry = false) {
    if (this.isInitialized || !("transferControlToOffscreen" in canvas)) return false;
    try {
      this.worker = new Worker(new URL("../game/render/render.worker.js", import.meta.url), { type: "module" });
      const offscreen = canvas.transferControlToOffscreen();
      this.worker.postMessage({
        cmd: "INIT",
        payload: { canvas: offscreen, width: canvas.width || 300, height: canvas.height || 150 },
      }, [offscreen]);
      
      this.worker.onmessage = (e) => {
        if (e.data.cmd === "RENDER_COMPLETE") {
          if (Number(e.data?.generation || 0) !== this.generation) return;
          this.lastRenderInfo = e.data.payload;
          if (this.lastRenderInfo) ui.setRenderInfo(this.lastRenderInfo);
          this.isPending = false;
        }
      };
      this.isInitialized = true;
      this.canvasMode = "worker";
      return true;
    } catch (err) {
      const msg = String(err?.message || err || "");
      if (!retry && msg.includes("Cannot transfer control from a canvas that has a rendering context")) {
        const fresh = this.replaceCanvas("worker");
        return this.init(fresh, true);
      }
      console.warn("[RenderManager] Failed to init worker:", err);
      return false;
    }
  },

  flush(reason = "reset") {
    this.generation++;
    this.isPending = false;
    this.lastRenderInfo = null;
    this.lastSignature = "";
    this.lastSubmittedTick = -1;
    try {
      this.worker?.postMessage({ cmd: "RESET", generation: this.generation, reason });
    } catch {}
  },

  shouldUseOffscreen(state) {
    const cells = Number(state?.meta?.gridW || state?.world?.w || 0) * Number(state?.meta?.gridH || state?.world?.h || 0);
    const autoThreshold = PerfBudget.isMobile ? 72 * 72 : 96 * 96;
    const pref = state?.meta?.ui?.offscreenEnabled;
    if (!("transferControlToOffscreen" in canvas)) return false;
    return pref == null ? cells >= autoThreshold : !!pref;
  },

  makeSignature(state, perf) {
    const ui = state?.meta?.ui || {};
    return [
      Number(state?.sim?.tick || 0),
      Number(state?.meta?.gridW || 0),
      Number(state?.meta?.gridH || 0),
      String(state?.meta?.renderMode || "combined"),
      Number(perf?.quality || 0),
      Number(perf?.dprCap || 0),
      Number(ui.showBiochargeOverlay || 0),
      Number(ui.showRemoteAttackOverlay ?? 1),
      Number(ui.showDefenseOverlay ?? 1),
      String(ui.renderDetailMode || "auto"),
      this.shouldUseOffscreen(state) ? 1 : 0,
    ].join("|");
  },

  render(canvas, state, perf) {
    const useOffscreen = this.shouldUseOffscreen(state);
    const tick = Number(state?.sim?.tick || 0);
    const signature = this.makeSignature(state, perf);
    this.mode = useOffscreen ? "worker" : "main";
    if (useOffscreen && this.hasMainContext) {
      canvas = this.replaceCanvas("worker");
    } else if (!useOffscreen && this.canvasMode === "worker") {
      canvas = this.replaceCanvas("main");
    }
    const dpr = Number.isFinite(perf?.dpr) ? perf.dpr : 1;
    const rect = canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.floor(rect.width * dpr));
    const ch = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      // Offscreen canvas can't be resized via DOM canvas after transferControlToOffscreen().
      const hasTransferredCanvas = this.canvasMode === "worker";
      const canResizeDomCanvas = !(useOffscreen && (this.isInitialized || hasTransferredCanvas));
      if (canResizeDomCanvas) {
        canvas.width = cw;
        canvas.height = ch;
      }
      this.lastSignature = "";
      this.lastSubmittedTick = -1;
      try {
        this.worker?.postMessage({ cmd: "RESIZE", payload: { width: cw, height: ch }, generation: this.generation });
      } catch {}
    }
    
    if (useOffscreen) {
      if (!this.isInitialized) {
        const ok = this.init(canvas);
        if (!ok) {
          // Conservative recovery: swap to fresh main canvas if worker init failed.
          canvas = this.replaceCanvas("main");
          this.mode = "main";
          const info = render(canvas, state, perf);
          this.hasMainContext = true;
          return info;
        }
      }
      
      if (!this.isPending && (signature !== this.lastSignature || tick !== this.lastSubmittedTick)) {
        this.isPending = true;
        this.lastSignature = signature;
        this.lastSubmittedTick = tick;
        this.worker.postMessage({ cmd: "RENDER", generation: this.generation, payload: { state, perf, tick } });
      }
      return this.lastRenderInfo;
    } else {
      const info = render(canvas, state, perf);
      this.hasMainContext = true;
      this.canvasMode = "main";
      return info;
    }
  }
};

const ui     = new UI(store, canvas);
window.__lifeGameStore = store;

// ── Dev Balance ──────────────────────────────────────────
const DevBalance = {
  enabled: false,
  episode: 0,
  lastTuneTick: -999,
  lastExtinctionTick: -1,
  peakAlive: 0,
  status: "Aus",
  log: [],
  lineageSnapshot: new Map(),
  config: {
    profile: "auto",
    intensity: 0.020,
    targets: 4,
    chainLength: 4,
    maxCellsPerLineage: 48,
  },

  toggle() {
    this.enabled = !this.enabled;
    const s = store.getState();
    this.peakAlive = s.sim.aliveCount;
    this.lineageSnapshot = new Map();
    this.status = this.enabled ? "Aktiv – beobachtet" : "Aus";
    updateDevStatus();
    return this.enabled;
  },

  setConfig(next) {
    this.config = {
      ...this.config,
      ...next,
      intensity: Math.max(0.005, Math.min(0.060, Number(next?.intensity ?? this.config.intensity))),
      targets: Math.max(1, Math.min(8, Number(next?.targets ?? this.config.targets) | 0)),
      chainLength: Math.max(2, Math.min(8, Number(next?.chainLength ?? this.config.chainLength) | 0)),
      maxCellsPerLineage: Math.max(16, Math.min(96, Number(next?.maxCellsPerLineage ?? this.config.maxCellsPerLineage) | 0)),
    };
  },

  getConfig() {
    return { ...this.config };
  },

  buildBlocks(mode) {
    const pools = {
      diversify: ["mutation_diversify", "nomadic_adapt", "reproductive_spread", "nutrient_harvest", "predator_raid", "hybrid_mixer"],
      stabilize: ["reserve_buffer", "cooperative_network", "light_harvest", "toxin_resist", "defensive_shell", "fortress_homeostasis"],
      counter: ["defensive_shell", "toxin_resist", "mutation_diversify", "nutrient_harvest", "scavenger_loop", "pioneer_explorer"],
      expand: ["mutation_diversify", "reproductive_spread", "nutrient_harvest", "nomadic_adapt", "symbiotic_bloom", "pioneer_explorer"],
      chaos: ["mutation_diversify", "predator_raid", "nomadic_adapt", "hybrid_mixer", "scavenger_loop", "symbiotic_bloom"],
    };
    const base = pools[mode] || pools.diversify;
    const out = [];
    for (let i = 0; i < this.config.chainLength; i++) out.push(base[i % base.length]);
    return out;
  },

  nudge(state) {
    const sim = state.sim;
    const tick = sim.tick;
    if (tick - this.lastTuneTick < 40) return;

    const dist = this.collectLineages(state);
    if (dist.length === 0) return;
    const dominant = dist[0];
    const weakest = dist[dist.length - 1];
    const lowDiversity = (sim.lineageDiversity || 0) < 6;
    const collapseRisk = (sim.aliveCount || 0) < Math.max(8, this.peakAlive * 0.24);
    const dominanceRisk = dominant.ratio > 0.58 && dist.length >= 2;
    if (!lowDiversity && !collapseRisk && !dominanceRisk) return;

    this.lastTuneTick = tick;
    let mode = "diversify";
    let blocks = this.buildBlocks("diversify");
    let targets = [{ lineageId: weakest.lid, weight: 1.0 }];
    let intensity = this.config.intensity;

    if (collapseRisk) {
      mode = "stabilize";
      blocks = this.buildBlocks("stabilize");
      targets = dist.slice(0, Math.min(this.config.targets, dist.length)).map((x, i) => ({ lineageId: x.lid, weight: i === 0 ? 1 : 0.8 }));
      intensity = this.config.intensity * 0.85;
    } else if (dominanceRisk) {
      mode = "counter";
      blocks = this.buildBlocks("counter");
      targets = dist.slice(1, Math.min(this.config.targets + 1, dist.length)).map((x, i) => ({ lineageId: x.lid, weight: 1 - i * 0.1 }));
      intensity = this.config.intensity * 1.05;
    } else if (lowDiversity) {
      mode = "expand";
      blocks = this.buildBlocks("expand");
      targets = dist.slice(Math.max(0, dist.length - this.config.targets)).map((x, i) => ({ lineageId: x.lid, weight: 1 - i * 0.08 }));
      intensity = this.config.intensity * 1.10;
    }

    if (this.config.profile !== "auto") {
      mode = this.config.profile;
      blocks = this.buildBlocks(mode);
      targets = mode === "stabilize"
        ? dist.slice(0, Math.min(this.config.targets, dist.length)).map((x, i) => ({ lineageId: x.lid, weight: i === 0 ? 1 : 0.85 }))
        : dist.slice(Math.max(0, dist.length - this.config.targets)).map((x, i) => ({ lineageId: x.lid, weight: 1 - i * 0.08 }));
      intensity = this.config.intensity;
    }

    store.dispatch({
      type: "DEV_BALANCE_RUN_AI",
      payload: {
        mode,
        preferredBlocks: blocks,
        targets,
        intensity,
        chainLength: this.config.chainLength,
        maxCellsPerLineage: this.config.maxCellsPerLineage,
      },
    });
    const msg = `T${tick}: ${mode} target=${targets.length} dom=${(dominant.ratio * 100).toFixed(0)}%`;
    this.log.unshift(msg);
    this.log.length = Math.min(10, this.log.length);
    this.status = msg;
    updateDevStatus();
  },

  collectLineages(state) {
    const world = state.world;
    if (!world?.alive || !world?.lineageId) return [];
    const counts = new Map();
    const alive = world.alive;
    const lineage = world.lineageId;
    for (let i = 0; i < alive.length; i++) {
      if (alive[i] !== 1) continue;
      const lid = Number(lineage[i]) | 0;
      if (!lid) continue;
      counts.set(lid, (counts.get(lid) || 0) + 1);
    }
    const total = Math.max(1, state.sim.aliveCount || 1);
    const out = [...counts.entries()].map(([lid, count]) => {
      const prev = this.lineageSnapshot.get(lid) || count;
      const growth = count - prev;
      this.lineageSnapshot.set(lid, count);
      return { lid, count, growth, ratio: count / total };
    });
    return out.sort((a, b) => b.count - a.count);
  },

  onExtinction(state) {
    const tick = state.sim.tick;
    if (this.lastExtinctionTick === tick) return;
    this.lastExtinctionTick = tick;
    this.episode++;
    this.status = `Episode ${this.episode} – Aussterben bei T${tick}. Neue Welt…`;
    updateDevStatus();
    store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
    store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  },
};

window.__devBalance = DevBalance;

function updateDevStatus() {
  const el = document.getElementById("dev-status");
  if (el) el.textContent = DevBalance.status;
  const logEl = document.getElementById("dev-log");
  if (logEl) logEl.innerHTML = DevBalance.log.map(l => `<div class="dev-log-line">${l}</div>`).join("");
}

const devBtn = document.getElementById("btn-dev-balance");
if (devBtn) {
  devBtn.addEventListener("click", () => {
    DevBalance.toggle();
    devBtn.classList.toggle("btn-active", DevBalance.enabled);
    devBtn.textContent = DevBalance.enabled ? "Dev-Balance: An" : "Dev-Balance: Aus";
  });
}

// ── Game Loop ────────────────────────────────────────────
let acc    = 0;
// Note: performance.now() is allowed in the Loop (outside Reducer) for pacing
let lastTs = globalThis.performance ? globalThis.performance.now() : 0;
let renderInfo = null;
let recoveryCount = 0;
let frameId = 0;

let lastSyncTick = -1;
let lastSyncTs   = 0;

const PerfBudget = {
  isMobile: !!(globalThis.matchMedia && globalThis.matchMedia("(pointer: coarse)").matches),
  targetMinFps: 30,
  targetMaxFps: 60,
  targetFrameMs: 22,
  fpsEma: 60,
  frameMsEma: 16.7,
  renderMsEma: 5.0,
  quality: 3,
  renderEvery: 1,
  dprCap: 2.0,
  lastHudTs: 0,
  minQuality: 1,
  maxSimStepsPerFrame: 3,
  maxSimFrameBudgetMs: 7.5,
  maxCatchupMs: 130,
  lastRenderedTick: -1,
};

function publishPerfStats(state = store.getState()) {
  const gridW = Number(state?.meta?.gridW || state?.world?.w || 0);
  const gridH = Number(state?.meta?.gridH || state?.world?.h || 0);
  window.__lifeGamePerfStats = {
    fpsEma: Number(PerfBudget.fpsEma.toFixed(2)),
    frameMsEma: Number(PerfBudget.frameMsEma.toFixed(2)),
    renderMsEma: Number(PerfBudget.renderMsEma.toFixed(2)),
    quality: PerfBudget.quality,
    renderEvery: PerfBudget.renderEvery,
    dprCap: PerfBudget.dprCap,
    maxSimStepsPerFrame: PerfBudget.maxSimStepsPerFrame,
    maxSimFrameBudgetMs: PerfBudget.maxSimFrameBudgetMs,
    maxCatchupMs: PerfBudget.maxCatchupMs,
    stepBufferSize: stepBuffer.size(),
    offscreenMode: RenderManager.mode,
    offscreenAuto: RenderManager.shouldUseOffscreen(state),
    tick: Number(state?.sim?.tick || 0),
    grid: `${gridW}x${gridH}`,
    cells: gridW * gridH,
  };
}

RuntimeHooks.onStructuralChange = (type, action) => {
  const shouldFlush =
    type === "SET_SIZE" ||
    type === "GEN_WORLD" ||
    type === "SET_SEED" ||
    type === "TOGGLE_RUNNING" ||
    (type === "SET_UI" && (
      Object.prototype.hasOwnProperty.call(action?.payload || {}, "offscreenEnabled") ||
      Object.prototype.hasOwnProperty.call(action?.payload || {}, "showBiochargeOverlay") ||
      Object.prototype.hasOwnProperty.call(action?.payload || {}, "showRemoteAttackOverlay") ||
      Object.prototype.hasOwnProperty.call(action?.payload || {}, "showDefenseOverlay") ||
      Object.prototype.hasOwnProperty.call(action?.payload || {}, "renderDetailMode")
    ));
  if (shouldFlush) {
    stepBuffer.stop();
    RenderManager.flush(type);
    stepBuffer.start();
    PerfBudget.lastRenderedTick = -1;
    publishPerfStats();
  }
};

function runOneSimStep(options = null) {
  const force = !!options?.force;
  const useBuffer = options?.useBuffer !== false;
  try {
    const buffered = useBuffer ? stepBuffer.consumeOneOrNull() : null;
    if (buffered) {
      store.dispatch({ type: "APPLY_BUFFERED_SIM_STEP", payload: { patches: buffered.patches } });
    } else {
      store.dispatch({ type: "SIM_STEP", payload: force ? { force: true } : {} });
    }
    return true;
  } catch (err) {
    console.error("[runtime] SIM_STEP failed:", String(err?.message || err));
    recoveryCount++;
    recoverWorld("sim_step_failed");
    return false;
  }
}

function runDevBalanceChecks() {
  if (!DevBalance.enabled) return;
  const s = store.getState();
  DevBalance.peakAlive = Math.max(DevBalance.peakAlive, s.sim.aliveCount);
  if (s.sim.aliveCount === 0 && s.sim.tick > 10) {
    DevBalance.onExtinction(s);
  } else {
    DevBalance.nudge(s);
  }
}

function runRender(perfHints) {
  const state = store.getState();
  const tick = Number(state?.sim?.tick || 0);
  if (RenderManager.mode !== "worker" && tick === PerfBudget.lastRenderedTick && PerfBudget.renderEvery > 1) return;
  const t0 = globalThis.performance ? globalThis.performance.now() : 0;
  try {
    renderInfo = RenderManager.render(canvas, state, perfHints);
    if (renderInfo) ui.setRenderInfo(renderInfo);
  } catch (err) {
    console.error("[runtime] render failed:", String(err?.message || err));
    if (recoveryCount < 3) {
      recoveryCount++;
      recoverWorld("render_failed");
    }
  }
  const rdt = (globalThis.performance ? globalThis.performance.now() : 0) - t0;
  PerfBudget.renderMsEma += (rdt - PerfBudget.renderMsEma) * 0.10;
  PerfBudget.lastRenderedTick = tick;
  publishPerfStats(state);
}

function runUiSync() {
  const now  = globalThis.performance ? globalThis.performance.now() : 0;
  const tick = store.getState().sim.tick;
  if ((tick !== lastSyncTick && now - lastSyncTs > 70) || now - lastSyncTs > 220) {
    ui.sync(store.getState());
    lastSyncTick = tick;
    lastSyncTs   = now;
  }
}

const publicApi = registerPublicApi({
  windowObj: window,
  store,
  benchmark: Benchmark,
  runOneSimStep,
  runRender,
  runUiSync,
  publishPerfStats,
  perfBudget: PerfBudget,
});
function renderGameToText() {
  return publicApi.renderGameToText();
}
async function advanceTime(ms = 1000) {
  return publicApi.advanceTime(ms);
}
window.render_game_to_text = renderGameToText;
window.advanceTime = advanceTime;
publishPerfStats();

function tunePerformance(state) {
  const cells = (state?.world?.w || state.meta.gridW || 0) * (state?.world?.h || state.meta.gridH || 0);
  const isHeavyGrid = cells >= 120 * 120;
  const isMediumGrid = cells >= 72 * 72;
  const overloaded = PerfBudget.frameMsEma > PerfBudget.targetFrameMs * 1.10 || PerfBudget.fpsEma < (PerfBudget.isMobile ? 24 : 29);
  const underloaded = PerfBudget.frameMsEma < PerfBudget.targetFrameMs * 0.75 && PerfBudget.fpsEma > 52;

  if (overloaded) {
    if (PerfBudget.quality > PerfBudget.minQuality) PerfBudget.quality -= 1;
  } else if (underloaded) {
    if (PerfBudget.quality < 3) PerfBudget.quality += 1;
  }

  if (PerfBudget.isMobile && isHeavyGrid) {
    PerfBudget.renderEvery = PerfBudget.fpsEma < 24 ? 3 : 2;
    PerfBudget.dprCap = PerfBudget.quality <= 1 ? 1.0 : PerfBudget.quality === 2 ? 1.15 : 1.3;
    PerfBudget.maxSimStepsPerFrame = 1;
    PerfBudget.maxSimFrameBudgetMs = 4.5;
    PerfBudget.maxCatchupMs = 90;
  } else if (isHeavyGrid) {
    PerfBudget.renderEvery = PerfBudget.fpsEma < 28 ? 3 : 2;
    PerfBudget.dprCap = PerfBudget.quality <= 1 ? 1.0 : PerfBudget.quality === 2 ? 1.2 : 1.45;
    PerfBudget.maxSimStepsPerFrame = 1;
    PerfBudget.maxSimFrameBudgetMs = 5.5;
    PerfBudget.maxCatchupMs = 110;
  } else if (isMediumGrid) {
    PerfBudget.renderEvery = overloaded ? 2 : 1;
    PerfBudget.dprCap = PerfBudget.quality <= 1 ? 1.15 : PerfBudget.quality === 2 ? 1.3 : 1.6;
    PerfBudget.maxSimStepsPerFrame = 2;
    PerfBudget.maxSimFrameBudgetMs = 6.5;
    PerfBudget.maxCatchupMs = 120;
  } else {
    PerfBudget.renderEvery = 1;
    PerfBudget.dprCap = PerfBudget.quality <= 1 ? 1.25 : PerfBudget.quality === 2 ? 1.45 : 2.0;
    PerfBudget.maxSimStepsPerFrame = 3;
    PerfBudget.maxSimFrameBudgetMs = 7.5;
    PerfBudget.maxCatchupMs = 130;
  }

  const detailMode = String(state?.meta?.ui?.renderDetailMode || "auto");
  if (detailMode === "focused") {
    PerfBudget.quality = Math.max(2, PerfBudget.quality);
    PerfBudget.renderEvery = Math.min(PerfBudget.renderEvery, 2);
    PerfBudget.dprCap = Math.max(PerfBudget.dprCap, isHeavyGrid ? 1.25 : 1.45);
  } else if (detailMode === "minimal") {
    PerfBudget.quality = 1;
    PerfBudget.renderEvery = Math.max(PerfBudget.renderEvery, isHeavyGrid ? 3 : 2);
    PerfBudget.dprCap = Math.min(PerfBudget.dprCap, 1.15);
  }
}

function loop(ts) {
  const dt = Math.max(0, Math.min(100, ts - lastTs));
  lastTs = ts;
  frameId++;
  PerfBudget.frameMsEma += (dt - PerfBudget.frameMsEma) * 0.08;
  PerfBudget.fpsEma = 1000 / Math.max(1e-6, PerfBudget.frameMsEma);

  const state   = store.getState();
  const stepMs  = 1000 / Math.max(1, state.meta.speed);

  if (shouldAdvanceSimulation(state)) {
    acc += dt;
    if (acc > PerfBudget.maxCatchupMs) acc = PerfBudget.maxCatchupMs;
    const simStart = globalThis.performance ? globalThis.performance.now() : 0;
    let stepsDone = 0;
    while (acc >= stepMs && stepsDone < PerfBudget.maxSimStepsPerFrame) {
      runOneSimStep();
      runDevBalanceChecks();
      WorldStateLog.track(store.getState());
      acc -= stepMs;
      stepsDone++;
      const spent = (globalThis.performance ? globalThis.performance.now() : simStart) - simStart;
      if (spent >= PerfBudget.maxSimFrameBudgetMs) break;
    }
  } else {
    acc = 0;
  }

  tunePerformance(state);
  if ((frameId % PerfBudget.renderEvery) === 0) {
    runRender({
      quality: PerfBudget.quality,
      dprCap: PerfBudget.dprCap,
      fps: PerfBudget.fpsEma,
      frameMs: PerfBudget.frameMsEma,
      renderMs: PerfBudget.renderMsEma,
      targetMinFps: PerfBudget.targetMinFps,
      targetMaxFps: PerfBudget.targetMaxFps,
    });
  }
  runUiSync();
  if (Benchmark.isRunning) Benchmark.tick(PerfBudget);
  
  if (ts - PerfBudget.lastHudTs > 900) {
    PerfBudget.lastHudTs = ts;
    setBootStatus(
      `Perf ${PerfBudget.fpsEma.toFixed(0)} FPS | q${PerfBudget.quality} | r/${PerfBudget.renderEvery} | dpr≤${PerfBudget.dprCap.toFixed(2)}`,
      PerfBudget.fpsEma < 30 ? "rgba(255,170,150,0.95)" : "rgba(180,220,180,0.95)"
    );
    publishPerfStats();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

console.log(`LifeGameLab v${APP_VERSION} gestartet (Schema v${manifest.SCHEMA_VERSION}). store und __devBalance sind verfuegbar.`);
