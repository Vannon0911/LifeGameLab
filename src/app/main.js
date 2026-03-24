// ============================================================
// Main — Application Bootstrap & Game Loop (V4 DETERMINISTIC)
// ============================================================

import { createStore }       from "../kernel/store/createStore.js";
import { manifest, APP_VERSION } from "../game/manifest.js";
import { reducer, simStepPatch, shouldAdvanceSimulation } from "../game/runtime/index.js";
import { render }            from "../game/render/renderer.js";
import { UI }                from "../game/ui/ui.js";
import { hashString }        from "../kernel/determinism/rng.js";
import { createWorldStateLog } from "./runtime/worldStateLog.js";
import { bindBootStatusErrorHooks, setBootStatus } from "./runtime/bootStatus.js";

bindBootStatusErrorHooks();
const WorldStateLog = createWorldStateLog(hashString);
const SIM_RUNTIME_DISABLED = false;
const TICK_RATE_MS = 1000 / 24;

// ── Store ─────────────────────────────────────────────────
const store = createStore(manifest, {
  reducer,
  simStep: simStepPatch,
});
globalThis.__LIFEGAMELAB_STORE__ = store;
// Initialize Log with Seed from Store
WorldStateLog.init(store.getState().meta.seed);
const RuntimeHooks = { onStructuralChange: null };

// Runtime dispatch wrapper for structural hooks.
const _dispatchRaw = store.dispatch.bind(store);
store.dispatch = (action) => {
  const t = action && typeof action === "object" ? action.type : "";
  if (SIM_RUNTIME_DISABLED && t === "SIM_STEP") return store.getState();
  const nextAction = (SIM_RUNTIME_DISABLED && t === "TOGGLE_RUNNING")
    ? { ...action, payload: { ...(action?.payload || {}), running: false } }
    : action;
  const result = _dispatchRaw(nextAction);
  if (t && t !== "SIM_STEP") RuntimeHooks.onStructuralChange?.(t, action);
  return result;
};


// ── Bootstrap: generate and start world ──────────────────
store.dispatch({ type: "GEN_WORLD" });
store.dispatch({ type: "SET_RENDER_MODE", payload: { mode: "cells" } });
store.dispatch({ type: "SET_SPEED", payload: { speed: 24 } });

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
  RenderManager.flush?.(reason);
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: false } });
  store.dispatch({ type: "GEN_WORLD" });
}

if (!hasRunnableWorld(store.getState())) {
  recoverWorld("bootstrap_invalid_world");
}
setBootStatus("");

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
          return;
        }
        if (e.data.cmd === "RENDER_ERROR") {
          console.warn("[RenderManager] Worker render failed:", e.data?.error || "unknown");
          this.flush("worker_render_error");
          canvas = this.replaceCanvas("main");
          this.mode = "main";
        }
      };
      this.worker.onerror = (err) => {
        console.warn("[RenderManager] Worker crashed:", err?.message || err);
        this.flush("worker_error");
        canvas = this.replaceCanvas("main");
        this.mode = "main";
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

  summarizeWorldView(state) {
    const world = state?.world || {};
    const countOnes = (mask) => {
      if (!mask || !ArrayBuffer.isView(mask)) return 0;
      let total = 0;
      for (let i = 0; i < mask.length; i++) {
        if ((Number(mask[i] || 0) | 0) === 1) total++;
      }
      return total;
    };
    return [
      countOnes(world.visibility),
      countOnes(world.explored),
      countOnes(world.infraCandidateMask),
    ].join(":");
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
      String(state?.sim?.runPhase || ""),
      String(state?.sim?.infraBuildMode || ""),
      Number(state?.sim?.running || 0),
      this.summarizeWorldView(state),
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
globalThis.__LIFEGAMELAB_UI__ = ui;

// Prime render info once so runtime click hooks have deterministic coordinates immediately.
try {
  const initialRenderInfo = render(canvas, store.getState(), {
    quality: 3,
    dprCap: 2,
    alpha: 1,
    fps: 60,
    frameMs: 16.7,
    renderMs: 5,
    targetMinFps: 30,
    targetMaxFps: 60,
  });
  if (initialRenderInfo) ui.setRenderInfo(initialRenderInfo);
} catch (err) {
  console.warn("[runtime] initial render prime failed:", String(err?.message || err));
}

// ── Game Loop ────────────────────────────────────────────
// Note: performance.now() is allowed in the Loop (outside Reducer) for pacing
let lastTs = globalThis.performance ? globalThis.performance.now() : 0;
let renderInfo = null;
let recoveryCount = 0;
let frameId = 0;
let latestPerfStats = null;

let lastSyncTick = -1;
let lastSyncTs   = 0;
let simIntervalId = null;
let lastSimStepTs = globalThis.performance ? globalThis.performance.now() : 0;
let lastMoveStepTick = -1;
let lastMoveStepTs = lastSimStepTs;

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
  latestPerfStats = {
    fpsEma: Number(PerfBudget.fpsEma.toFixed(2)),
    frameMsEma: Number(PerfBudget.frameMsEma.toFixed(2)),
    renderMsEma: Number(PerfBudget.renderMsEma.toFixed(2)),
    quality: PerfBudget.quality,
    renderEvery: PerfBudget.renderEvery,
    dprCap: PerfBudget.dprCap,
    maxSimStepsPerFrame: PerfBudget.maxSimStepsPerFrame,
    maxSimFrameBudgetMs: PerfBudget.maxSimFrameBudgetMs,
    maxCatchupMs: PerfBudget.maxCatchupMs,
    stepBufferSize: 0,
    offscreenMode: RenderManager.mode,
    offscreenAuto: RenderManager.shouldUseOffscreen(state),
    tick: Number(state?.sim?.tick || 0),
    grid: `${gridW}x${gridH}`,
    cells: gridW * gridH,
  };
  return latestPerfStats;
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
    RenderManager.flush(type);
    PerfBudget.lastRenderedTick = -1;
    publishPerfStats();
  }
};

function runOneSimStep() {
  try {
    store.dispatch({ type: "SIM_STEP", payload: {} });
    return true;
  } catch (err) {
    console.error("[runtime] SIM_STEP failed:", String(err?.message || err));
    recoveryCount++;
    recoverWorld("sim_step_failed");
    return false;
  }
}

function runDevBalanceChecks() {
  return;
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

publishPerfStats();

function extractSelectedUnit(state) {
  const world = state?.world;
  const sim = state?.sim;
  const w = Number(world?.w || state?.meta?.gridW || 0) | 0;
  const h = Number(world?.h || state?.meta?.gridH || 0) | 0;
  const idx = Number(sim?.selectedUnit ?? -1) | 0;
  if (!world || idx < 0 || idx >= w * h) return null;
  return {
    index: idx,
    x: idx % w,
    y: (idx / w) | 0,
    alive: (Number(world?.alive?.[idx] || 0) | 0) === 1,
    lineageId: Number(world?.lineageId?.[idx] || 0) | 0,
    energy: Number(world?.E?.[idx] || 0),
    resource: Number(world?.R?.[idx] || 0),
  };
}

function extractWorkers(world, maxWorkers = 12) {
  const workerMap = world?.workers && typeof world.workers === "object" ? world.workers : {};
  const w = Number(world?.w || 0) | 0;
  const result = [];
  for (const [key, worker] of Object.entries(workerMap)) {
    if (result.length >= maxWorkers) break;
    const payload = worker && typeof worker === "object" ? worker : {};
    let x = Number(payload.x);
    let y = Number(payload.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const idx = Number(payload.idx ?? payload.index ?? -1);
      if (Number.isFinite(idx) && idx >= 0 && w > 0) {
        x = idx % w;
        y = (idx / w) | 0;
      }
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const m = String(key).match(/(-?\d+)[,:x](-?\d+)/i);
      if (m) {
        x = Number(m[1]);
        y = Number(m[2]);
      }
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    result.push({
      id: String(payload.id || key),
      x: Number(x) | 0,
      y: Number(y) | 0,
      task: String(payload.task || payload.state || ""),
    });
  }
  return result;
}

function extractRichResourceTiles(world, maxTiles = 8) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const res = world?.R;
  if (!res || !ArrayBuffer.isView(res) || w <= 0 || h <= 0) return [];
  const out = [];
  for (let i = 0; i < res.length; i++) {
    const amount = Number(res[i] || 0);
    if (amount < 0.45) continue;
    out.push({
      x: i % w,
      y: (i / w) | 0,
      amount: Number(amount.toFixed(3)),
    });
    if (out.length >= maxTiles) break;
  }
  return out;
}

function renderGameSnapshotText() {
  const state = store.getState();
  const world = state?.world || null;
  const sim = state?.sim || {};
  const payload = {
    coordinateSystem: "origin top-left; x increases right; y increases down; tile units",
    mode: String(sim.runPhase || ""),
    tick: Number(sim.tick || 0),
    running: !!sim.running,
    grid: {
      width: Number(world?.w || state?.meta?.gridW || 0) | 0,
      height: Number(world?.h || state?.meta?.gridH || 0) | 0,
    },
    selectedUnit: extractSelectedUnit(state),
    activeOrder: sim?.activeOrder
      ? {
          active: !!sim.activeOrder.active,
          type: String(sim.activeOrder.type || ""),
          fromX: Number(sim.activeOrder.fromX ?? -1),
          fromY: Number(sim.activeOrder.fromY ?? -1),
          targetX: Number(sim.activeOrder.targetX ?? -1),
          targetY: Number(sim.activeOrder.targetY ?? -1),
          progress: Number(sim.activeOrder.progress ?? 0),
          maxProgress: Number(sim.activeOrder.maxProgress ?? 0),
        }
      : null,
    workers: extractWorkers(world, 12),
    hotspots: extractRichResourceTiles(world, 8),
    metrics: {
      aliveCount: Number(sim.aliveCount || 0),
      playerAliveCount: Number(sim.playerAliveCount || 0),
      cpuAliveCount: Number(sim.cpuAliveCount || 0),
      playerDNA: Number(sim.playerDNA || 0),
      totalHarvested: Number(sim.totalHarvested || 0),
      lastAutoAction: String(sim.lastAutoAction || ""),
      gameResult: String(sim.gameResult || ""),
    },
    fullscreen: !!document.fullscreenElement,
  };
  return JSON.stringify(payload, null, 2);
}

function stepSimulationTime(ms) {
  const stepMs = 1000 / 60;
  const safeMs = Number.isFinite(Number(ms)) ? Math.max(0, Number(ms)) : stepMs;
  const steps = Math.max(1, Math.round(safeMs / stepMs));
  let simSteps = 0;
  for (let i = 0; i < steps; i++) {
    if (runOneSimStep()) simSteps++;
  }
  runRender({
    quality: PerfBudget.quality,
    dprCap: PerfBudget.dprCap,
    alpha: 1,
    fps: PerfBudget.fpsEma,
    frameMs: PerfBudget.frameMsEma,
    renderMs: PerfBudget.renderMsEma,
    targetMinFps: PerfBudget.targetMinFps,
    targetMaxFps: PerfBudget.targetMaxFps,
  });
  runUiSync();
  publishPerfStats();
  return {
    requestedMs: safeMs,
    frameSteps: steps,
    simSteps,
    tick: Number(store.getState()?.sim?.tick || 0),
  };
}

async function toggleFullscreen() {
  const root = canvas?.parentElement || canvas || document.documentElement;
  if (!document.fullscreenElement) {
    await root?.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
  window.dispatchEvent(new Event("resize"));
}

window.renderGameSnapshotText = renderGameSnapshotText;
window.stepSimulationTime = stepSimulationTime;
window.toggleGameFullscreen = () => toggleFullscreen();
window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
  if ((event.key === "f" || event.key === "F") && !event.repeat) {
    event.preventDefault();
    void toggleFullscreen();
    return;
  }
  if (event.key === "Escape" && document.fullscreenElement) {
    event.preventDefault();
    void document.exitFullscreen?.();
  }
});
document.addEventListener("fullscreenchange", () => {
  window.dispatchEvent(new Event("resize"));
});

function startSimInterval() {
  if (simIntervalId !== null) return;
  simIntervalId = setInterval(() => {
    const state = store.getState();
    if (SIM_RUNTIME_DISABLED) return;
    if (!shouldAdvanceSimulation(state)) return;
    const stepped = runOneSimStep();
    if (stepped) lastSimStepTs = globalThis.performance ? globalThis.performance.now() : lastSimStepTs;
    runDevBalanceChecks();
    WorldStateLog.track(store.getState());
  }, TICK_RATE_MS);
}

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
  const dt = Math.max(0, ts - lastTs);
  lastTs = ts;
  frameId++;
  PerfBudget.frameMsEma += (dt - PerfBudget.frameMsEma) * 0.08;
  PerfBudget.fpsEma = 1000 / Math.max(1e-6, PerfBudget.frameMsEma);

  const state = store.getState();
  const simActive = !SIM_RUNTIME_DISABLED && shouldAdvanceSimulation(state);
  const simTick = Number(state?.sim?.tick || 0);
  const lastAutoAction = String(state?.sim?.lastAutoAction || "");
  if (lastAutoAction.startsWith("MOVE_STEP:") && simTick !== lastMoveStepTick) {
    lastMoveStepTick = simTick;
    lastMoveStepTs = ts;
  }
  const elapsedSinceMove = Math.max(0, ts - lastMoveStepTs);
  const renderAlpha = simActive
    ? Math.max(0, Math.min(1, elapsedSinceMove / 1000))
    : 1;
  tunePerformance(state);
  if ((frameId % PerfBudget.renderEvery) === 0) {
    runRender({
      quality: PerfBudget.quality,
      dprCap: PerfBudget.dprCap,
      alpha: renderAlpha,
      fps: PerfBudget.fpsEma,
      frameMs: PerfBudget.frameMsEma,
      renderMs: PerfBudget.renderMsEma,
      targetMinFps: PerfBudget.targetMinFps,
      targetMaxFps: PerfBudget.targetMaxFps,
    });
  }
  runUiSync();
  
  if (ts - PerfBudget.lastHudTs > 900) {
    PerfBudget.lastHudTs = ts;
    publishPerfStats();
  }

  requestAnimationFrame(loop);
}

startSimInterval();
requestAnimationFrame(loop);

console.log(`LifeGameLab v${APP_VERSION} gestartet (Schema v${manifest.SCHEMA_VERSION}). store ist verfuegbar.`);
