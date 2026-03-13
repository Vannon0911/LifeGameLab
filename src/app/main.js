// ============================================================
// Main — Application Bootstrap & Game Loop (V4 DETERMINISTIC)
// ============================================================

import { createStore }       from "../core/kernel/store.js";
import { manifest, APP_VERSION } from "../project/project.manifest.js";
import { reducer, simStepPatch } from "../project/project.logic.js";
import { render }            from "../project/renderer.js";
import { UI }                from "../project/ui.js";
import { hashString }        from "../core/kernel/rng.js";
import { createSimStepBuffer } from "../core/runtime/simStepBuffer.js";

function getCookie(name) {
  const safeName = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|; )${safeName}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

function setCookie(name, value) {
  // Use fixed expiration (Year 2030) to avoid Date.now() drift
  const exp = "Wed, 01 Jan 2030 00:00:00 GMT";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; samesite=lax`;
}

const WORLD_LOG_COLUMNS = [
  "t",
  "alive",
  "aliveRatio",
  "n",
  "tox",
  "sat",
  "plant",
  "bio",
  "plantTiles",
  "domHue",
  "births",
  "deaths",
  "muts",
  "raids",
  "inf",
  "kills",
  "remote",
  "remoteKills",
  "defAct",
  "stolen",
  "pruned",
  "nCapTiles",
  "eClearTiles",
  "worldMode",
  "ts",
];

const WorldStateLog = {
  cookieKey: "lifex_world_log_meta_v1",
  storagePrefix: "lifex_world_log_v1_",
  sessionId: "",
  storageKey: "",
  lastTrackedTick: -1,
  count: 0,

  init(seed) {
    let meta = {};
    try { meta = JSON.parse(getCookie(this.cookieKey) || "{}"); } catch { meta = {}; }
    
    // Deterministic Session ID based on Seed
    const seedHash = hashString(seed || "default").toString(36);
    const nowId = `ws_v4_${seedHash}`;
    
    this.sessionId = meta.sessionId || nowId;
    this.storageKey = `${this.storagePrefix}${this.sessionId}`;
    this.lastTrackedTick = Number(meta.lastTrackedTick || -1);
    try {
      const arr = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
      this.count = Array.isArray(arr) ? arr.length : 0;
    } catch {
      this.count = 0;
    }
    this.persistMeta();
    try {
      window.dispatchEvent(new CustomEvent("worldlog:update", { detail: this.getMeta() }));
    } catch {}
  },

  persistMeta() {
    setCookie(this.cookieKey, JSON.stringify({
      sessionId: this.sessionId,
      lastTrackedTick: this.lastTrackedTick,
      count: this.count,
    }));
  },

  track(state) {
    const tick = Number(state?.sim?.tick || 0);
    if (tick <= 0 || (tick % 100) !== 0 || tick === this.lastTrackedTick) return;
    const sim = state.sim || {};
    const world = state.world || {};
    const entry = {
      t: tick,
      alive: Number(sim.aliveCount || 0),
      aliveRatio: Number(sim.aliveRatio || 0),
      n: Number(sim.meanNutrientField || 0),
      tox: Number(sim.meanToxinField || 0),
      sat: Number(sim.meanSaturationField || 0),
      plant: Number(sim.meanPlantField || 0),
      bio: Number(sim.meanBiochargeField || 0),
      plantTiles: Number(sim.plantTileRatio || 0),
      domHue: Number(sim.dominantHueRatio || 0),
      births: Number(sim.birthsLastStep || 0),
      deaths: Number(sim.deathsLastStep || 0),
      muts: Number(sim.mutationsLastStep || 0),
      raids: Number(sim.raidEventsLastStep || 0),
      inf: Number(sim.infectionsLastStep || 0),
      kills: Number(sim.conflictKillsLastStep || 0),
      remote: Number(sim.remoteAttacksLastStep || 0),
      remoteKills: Number(sim.remoteAttackKillsLastStep || 0),
      defAct: Number(sim.defenseActivationsLastStep || 0),
      stolen: Number(sim.resourceStolenLastStep || 0),
      pruned: Number(sim.plantsPrunedLastStep || 0),
      nCapTiles: Number(sim.nutrientCappedTilesLastStep || 0),
      eClearTiles: Number(sim.energyClearedTilesLastStep || 0),
      worldMode: String(world?.worldAiAudit?.mode || ""),
      ts: tick, // Store tick instead of Date.now()
    };

    try {
      const arr = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
      const out = Array.isArray(arr) ? arr : [];
      out.push(entry);
      localStorage.setItem(this.storageKey, JSON.stringify(out));
      this.count = out.length;
      this.lastTrackedTick = tick;
      this.persistMeta();
      try {
        window.dispatchEvent(new CustomEvent("worldlog:update", { detail: this.getMeta() }));
      } catch {}
    } catch (err) {
      console.warn("[world-log] persist failed:", String(err?.message || err));
    }
  },

  getAll() {
    try {
      const arr = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  },

  clear() {
    try {
      localStorage.setItem(this.storageKey, "[]");
      this.count = 0;
      this.lastTrackedTick = -1;
      this.persistMeta();
      try {
        window.dispatchEvent(new CustomEvent("worldlog:update", { detail: this.getMeta() }));
      } catch {}
      return true;
    } catch {
      return false;
    }
  },

  toCsv(rows = null) {
    const arr = Array.isArray(rows) ? rows : this.getAll();
    const header = WORLD_LOG_COLUMNS;
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
      return s;
    };
    const lines = [header.join(",")];
    for (const row of arr) {
      lines.push(header.map((k) => esc(row[k])).join(","));
    }
    return `${lines.join("\n")}\n`;
  },

  getMeta() {
    return {
      sessionId: this.sessionId,
      count: this.count,
      lastTrackedTick: this.lastTrackedTick,
      storageKey: this.storageKey,
    };
  },
};

function ensureBootStatus() {
  let el = document.getElementById("boot-status");
  if (el) return el;
  const host = document.getElementById("canvas-wrap") || document.body;
  el = document.createElement("div");
  el.id = "boot-status";
  el.style.position = "absolute";
  el.style.left = "8px";
  el.style.bottom = "8px";
  el.style.zIndex = "20";
  el.style.padding = "6px 8px";
  el.style.background = "rgba(8,12,20,0.78)";
  el.style.border = "1px solid rgba(100,120,160,0.35)";
  el.style.borderRadius = "6px";
  el.style.fontFamily = "JetBrains Mono, monospace";
  el.style.fontSize = "11px";
  el.style.color = "rgba(180,200,240,0.92)";
  host.appendChild(el);
  return el;
}

function setBootStatus(text, color = "rgba(180,200,240,0.92)") {
  const el = ensureBootStatus();
  el.textContent = text;
  el.style.color = color;
}

window.addEventListener("error", (ev) => {
  setBootStatus(`Fehler: ${ev?.message || "unbekannt"}`, "rgba(255,150,150,0.95)");
});
window.addEventListener("unhandledrejection", (ev) => {
  const msg = String(ev?.reason?.message || ev?.reason || "Promise-Fehler");
  setBootStatus(`Fehler: ${msg}`, "rgba(255,150,150,0.95)");
});

// ── Store ─────────────────────────────────────────────────
const store = createStore(manifest, { reducer, simStep: simStepPatch });
// Initialize Log with Seed from Store
WorldStateLog.init(store.getState().meta.seed);
window.__worldStateLog = WorldStateLog;

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
  return _dispatchRaw(action);
};

const Benchmark = {
  isRunning: false,
  phase: "idle",
  frames: 0,
  results: {},
  
  async run(store) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("=== Benchmark start ===");

    // 1. Main-Thread
    this.phase = "main";
    this.frames = 0;
    this.results.main = { fps: [], render: [] };
    store.dispatch({ type: "SET_UI_PREFERENCE", payload: { key: "offscreenEnabled", value: false } });
    store.dispatch({ type: "SET_SIZE", payload: { w: 144, h: 144 } });
    store.dispatch({ type: "GEN_WORLD" });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for resize

    // 2. Worker-Thread
    this.phase = "worker";
    this.frames = 0;
    this.results.worker = { fps: [], render: [] };
    store.dispatch({ type: "SET_UI_PREFERENCE", payload: { key: "offscreenEnabled", value: true } });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for worker init
    
    this.phase = "done";
    this.isRunning = false;
  },

  tick(perf) {
    if (!this.isRunning || this.phase === "idle" || this.phase === "done") return;
    if (this.frames < 500) {
      this.results[this.phase].fps.push(perf.fps);
      this.results[this.phase].render.push(perf.renderMs);
      this.frames++;
    } else if (this.phase === "main") {
      this.logResults("main");
      this.phase = "worker_init";
      store.dispatch({ type: "SET_UI_PREFERENCE", payload: { key: "offscreenEnabled", value: true } });
      setTimeout(() => {
        this.phase = "worker";
        this.frames = 0;
        this.results.worker = { fps: [], render: [] };
      }, 2000);
    } else if (this.phase === "worker") {
      this.logResults("worker");
      this.phase = "done";
      this.isRunning = false;
      console.log("=== Benchmark complete ===");
    }
  },

  logResults(phase) {
    const res = this.results[phase];
    const avgFps = res.fps.reduce((a, b) => a + b, 0) / res.fps.length;
    const avgRender = res.render.reduce((a, b) => a + b, 0) / res.render.length;
    console.log(`[${phase.toUpperCase()}] Avg FPS: ${avgFps.toFixed(2)}, Avg Render: ${avgRender.toFixed(2)}ms`);
  }
};


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
  stepBuffer.invalidate();
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: false } });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
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

  init(canvas) {
    if (this.isInitialized || !("transferControlToOffscreen" in canvas)) return false;
    try {
      this.worker = new Worker(new URL("../game/render/render.worker.js", import.meta.url), { type: "module" });
      const offscreen = canvas.transferControlToOffscreen();
      this.worker.postMessage({ type: "INIT", payload: { canvas: offscreen } }, [offscreen]);
      
      this.worker.onmessage = (e) => {
        if (e.data.type === "RENDER_COMPLETE") {
          this.lastRenderInfo = e.data.payload;
          if (this.lastRenderInfo) ui.setRenderInfo(this.lastRenderInfo);
          this.isPending = false;
        }
      };
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.warn("[RenderManager] Failed to init worker:", err);
      return false;
    }
  },

  render(canvas, state, perf) {
    const useOffscreen = !!state.meta.ui?.offscreenEnabled;
    
    if (useOffscreen) {
      if (!this.isInitialized) {
        const ok = this.init(canvas);
        if (!ok) return render(canvas, state, perf);
      }
      
      if (!this.isPending) {
        this.isPending = true;
        this.worker.postMessage({ type: "RENDER", payload: { state, perf } });
      }
      return this.lastRenderInfo;
    } else {
      if (this.isInitialized) {
         if (!this.isPending) {
           this.isPending = true;
           this.worker.postMessage({ type: "RENDER", payload: { state, perf } });
         }
         return this.lastRenderInfo;
      }
      return render(canvas, state, perf);
    }
  }
};

const ui     = new UI(store, canvas);

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
    store.dispatch({ type: "GEN_WORLD" });
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
  minQuality: 2,
};

function runOneSimStep() {
  try {
    const buffered = stepBuffer.consumeOneOrNull();
    if (buffered) {
      store.dispatch({ type: "APPLY_BUFFERED_SIM_STEP", payload: { patches: buffered.patches } });
    } else {
      store.dispatch({ type: "SIM_STEP" });
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
  const t0 = globalThis.performance ? globalThis.performance.now() : 0;
  try {
    renderInfo = RenderManager.render(canvas, store.getState(), perfHints);
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

function tunePerformance(state) {
  const cells = (state?.world?.w || state.meta.gridW || 0) * (state?.world?.h || state.meta.gridH || 0);
  const isHeavyGrid = cells >= 120 * 120;
  const overloaded = PerfBudget.frameMsEma > PerfBudget.targetFrameMs * 1.15 || PerfBudget.fpsEma < 29;
  const underloaded = PerfBudget.frameMsEma < PerfBudget.targetFrameMs * 0.75 && PerfBudget.fpsEma > 52;

  if (overloaded) {
    if (PerfBudget.quality > PerfBudget.minQuality) PerfBudget.quality -= 1;
  } else if (underloaded) {
    if (PerfBudget.quality < 3) PerfBudget.quality += 1;
  }

  if (PerfBudget.isMobile && isHeavyGrid) {
    PerfBudget.renderEvery = 1;
    PerfBudget.dprCap = PerfBudget.quality === 2 ? 1.25 : 1.5;
  } else {
    PerfBudget.renderEvery = 1;
    PerfBudget.dprCap = PerfBudget.quality === 2 ? 1.4 : 2.0;
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

  if (state.sim.running) {
    acc += dt;
    if (acc >= stepMs) {
      acc -= stepMs;
      runOneSimStep();
      runDevBalanceChecks();
      WorldStateLog.track(store.getState());
    }
    if (acc > stepMs * 1.25) acc = stepMs * 1.25;
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
      `Perf ${PerfBudget.fpsEma.toFixed(0)} FPS | q${PerfBudget.quality} | dpr≤${PerfBudget.dprCap.toFixed(2)}`,
      PerfBudget.fpsEma < 30 ? "rgba(255,170,150,0.95)" : "rgba(180,220,180,0.95)"
    );
  }

  requestAnimationFrame(loop);
}

// Auto-start
store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
requestAnimationFrame(loop);

console.log(`LifexLab v${APP_VERSION} gestartet (Schema v${manifest.SCHEMA_VERSION}). store und __devBalance sind verfuegbar.`);
