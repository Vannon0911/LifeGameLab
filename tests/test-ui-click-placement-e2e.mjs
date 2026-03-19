import assert from "node:assert/strict";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const port = 8080;
const baseUrl = `http://127.0.0.1:${port}`;

function waitForPortOpen(host, targetPort, timeoutMs = 15_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const socket = new net.Socket();
      socket.setTimeout(800);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("timeout", () => socket.destroy());
      socket.once("error", () => socket.destroy());
      socket.once("close", () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`port ${targetPort} did not open within ${timeoutMs}ms`));
        } else {
          setTimeout(probe, 150);
        }
      });
      socket.connect(targetPort, host);
    };
    probe();
  });
}

function startLocalServer() {
  const cmd = process.platform === "win32" ? "python" : "python3";
  return spawn(cmd, ["-m", "http.server", String(port)], {
    cwd: root,
    stdio: "ignore",
  });
}

let server = null;
let browser = null;

try {
  server = startLocalServer();
  await waitForPortOpen("127.0.0.1", port, 15_000);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const clickTarget = await page.evaluate(async () => {
    const store = globalThis.__LIFEGAMELAB_STORE__;
    const ui = globalThis.__LIFEGAMELAB_UI__;
    const canvas = document.querySelector("canvas#cv");
    if (!store || !ui || !canvas || !ui._rInfo) {
      return { ok: false, reason: "runtime_hooks_missing" };
    }
    const [{ BRUSH_MODE }, presetsMod] = await Promise.all([
      import("/src/game/contracts/ids.js"),
      import("/src/game/sim/worldPresets.js"),
    ]);
    store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: false } });
    store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });

    const st = store.getState();
    const preset = presetsMod.getWorldPreset(st.meta.worldPresetId);
    const range = presetsMod.getStartWindowRange(preset.startWindows.player, st.world.w, st.world.h);
    const target = { x: range.x0, y: range.y0 };
    const idx = target.y * st.meta.gridW + target.x;
    const hadFounder = (Number(st.world?.founderMask?.[idx] || 0) | 0) === 1;
    if (hadFounder) {
      return { ok: false, reason: "founder_already_present" };
    }

    const { dpr, tilePx, offX, offY } = ui._rInfo;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + (offX + (target.x + 0.5) * tilePx) / dpr;
    const clientY = rect.top + (offY + (target.y + 0.5) * tilePx) / dpr;
    return { ok: true, target, clientX, clientY };
  });

  assert.equal(clickTarget.ok, true, `runtime click target unavailable: ${clickTarget.reason || "unknown"}`);
  await page.mouse.click(clickTarget.clientX, clickTarget.clientY);
  await page.waitForTimeout(220);

  const result = await page.evaluate(({ x, y }) => {
    const store = globalThis.__LIFEGAMELAB_STORE__;
    const st = store.getState();
    const idx = y * st.meta.gridW + x;
    return {
      founderAtTile: (Number(st.world?.founderMask?.[idx] || 0) | 0) === 1,
      founderPlaced: Number(st.sim?.founderPlaced || 0),
      runPhase: String(st.sim?.runPhase || ""),
      brushMode: String(st.meta?.brushMode || ""),
    };
  }, clickTarget.target);

  assert.equal(result.founderAtTile, true, "canvas click must place founder on target tile");
  assert(result.founderPlaced >= 1, "founderPlaced must increase after click placement");

  const workerMoveResult = await page.evaluate(() => {
    const store = globalThis.__LIFEGAMELAB_STORE__;
    const st0 = store.getState();
    const w = Number(st0.meta.gridW || 0) | 0;
    const h = Number(st0.meta.gridH || 0) | 0;

    store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
    store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
    store.dispatch({ type: "SET_PHYSICS", payload: { C_birth_base: 999 } });

    const st = store.getState();
    if (String(st.sim.runPhase || "") !== "run_active") {
      return { ok: false, reason: "run_not_active", runPhase: String(st.sim.runPhase || "") };
    }

    const playerLineageId = Number(st.meta.playerLineageId || 1) | 0;
    const card = (x, y) => [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ].filter((c) => c.x >= 0 && c.y >= 0 && c.x < w && c.y < h);

    let spawn = null;
    for (let yy = 0; yy < h && !spawn; yy++) {
      for (let xx = 0; xx < w && !spawn; xx++) {
        const idx = yy * w + xx;
        if ((Number(st.world.alive?.[idx] || 0) | 0) !== 0) continue;
        const neighbors = card(xx, yy);
        const freeNeighbor = neighbors.find((c) => {
          const nIdx = c.y * w + c.x;
          return (Number(st.world.alive?.[nIdx] || 0) | 0) === 0;
        });
        if (freeNeighbor) spawn = { x: xx, y: yy, target: freeNeighbor };
      }
    }
    if (!spawn) return { ok: false, reason: "no_spawn_slot" };

    const spawnIdx = spawn.y * w + spawn.x;
    store.dispatch({ type: "PLACE_CELL", payload: { x: spawn.x, y: spawn.y, remove: false } });
    const afterSpawn = store.getState();
    const workerPlaced =
      (Number(afterSpawn.world.alive?.[spawnIdx] || 0) | 0) === 1 &&
      (Number(afterSpawn.world.lineageId?.[spawnIdx] || 0) | 0) === playerLineageId;
    if (!workerPlaced) {
      return { ok: false, reason: "worker_not_placed" };
    }

    store.dispatch({ type: "SET_TILE", payload: { x: spawn.target.x, y: spawn.target.y, radius: 1, value: 1 } });
    store.dispatch({ type: "ISSUE_ORDER", payload: { fromX: spawn.x, fromY: spawn.y, targetX: spawn.target.x, targetY: spawn.target.y } });

    const pos = () => {
      const s = store.getState();
      const idx = Number(s.sim.selectedUnit ?? -1) | 0;
      if (idx < 0) return { x: -1, y: -1 };
      return { x: idx % w, y: (idx / w) | 0 };
    };

    const p0 = pos();
    for (let i = 0; i < 23; i++) store.dispatch({ type: "SIM_STEP", payload: {} });
    const p23 = pos();
    store.dispatch({ type: "SIM_STEP", payload: {} });
    const p24 = pos();
    const d23 = Math.abs(p23.x - p0.x) + Math.abs(p23.y - p0.y);
    const d24 = Math.abs(p24.x - p0.x) + Math.abs(p24.y - p0.y);

    return {
      ok: true,
      d23,
      d24,
      moved24Ticks: d23 === 0 && d24 === 1,
      workerPlaced: true,
      lastAutoAction: String(store.getState().sim.lastAutoAction || ""),
    };
  });

  assert.equal(workerMoveResult.ok, true, `worker move setup failed: ${workerMoveResult.reason || "unknown"}`);
  assert.equal(workerMoveResult.workerPlaced, true, "worker placement in run_active must work");
  assert.equal(workerMoveResult.moved24Ticks, true, `worker should move exactly 1 tile after 24 ticks (d23=${workerMoveResult.d23}, d24=${workerMoveResult.d24}, action=${workerMoveResult.lastAutoAction})`);

  console.log(
    `UI_CLICK_PLACEMENT_E2E_OK runPhase=${result.runPhase} founderPlaced=${result.founderPlaced} brush=${result.brushMode}`,
  );
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch {}
  }
  if (server && !server.killed) {
    try {
      server.kill("SIGTERM");
    } catch {}
  }
}
