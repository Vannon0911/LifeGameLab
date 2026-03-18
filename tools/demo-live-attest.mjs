import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const root = process.cwd();
const outDir = path.join(root, "output", "playwright", "demo-attest");
fs.mkdirSync(outDir, { recursive: true });
const KEEP_OPEN_ON_FAIL = String(process.env.PLAYWRIGHT_KEEP_OPEN || "0") === "1";
const KEEP_OPEN_MS = Math.max(10000, Number(process.env.PLAYWRIGHT_KEEP_OPEN_MS || 600000));

const port = 8080;
const baseUrl = `http://127.0.0.1:${port}`;

function waitForPortOpen(host, targetPort, timeoutMs = 15000) {
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
        if (Date.now() - started > timeoutMs) reject(new Error(`Port ${targetPort} timeout`));
        else setTimeout(probe, 150);
      });
      socket.connect(targetPort, host);
    };
    probe();
  });
}

async function stateCore(page) {
  return page.evaluate(() => {
    const st = window.__demo?.store?.getState?.();
    const w = Number(st?.world?.w || 0) | 0;
    const sel = Number(st?.sim?.selectedUnit ?? -1);
    return {
      runPhase: String(st?.sim?.runPhase || ""),
      founderPlaced: Number(st?.sim?.founderPlaced || 0),
      running: !!st?.sim?.running,
      tick: Number(st?.sim?.tick || 0),
      selectedUnit: sel,
      lastCommand: String(st?.sim?.lastCommand || ""),
      lastAutoAction: String(st?.sim?.lastAutoAction || ""),
      totalHarvested: Number(st?.sim?.totalHarvested || 0),
      gameResult: String(st?.sim?.gameResult || ""),
      winMode: String(st?.sim?.winMode || ""),
      selectedPos: sel >= 0 && w > 0 ? { x: sel % w, y: (sel / w) | 0 } : null,
    };
  });
}

async function failWithState(page, label, extra = {}) {
  const core = await stateCore(page);
  throw new Error(`${label} state=${JSON.stringify({ ...core, ...extra })}`);
}

async function waitForHarvest(page, minTick, minHarvestTotal, waitBudget, timeoutMs = 22000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await page.evaluate(() => {
      window.__demo.stepFrame();
    });
    const info = await stateCore(page);
    if (info.tick > minTick) {
      if (info.lastAutoAction.startsWith("HARVEST_AUTO:")) {
        return { ...info, harvestDetectedBy: "lastAutoAction" };
      }
      if (Number(info.totalHarvested || 0) > Number(minHarvestTotal || 0)) {
        return { ...info, harvestDetectedBy: "totalHarvestedDelta" };
      }
    }
    await page.waitForTimeout(80);
    waitBudget.waitForTimeoutMs += 80;
  }
  await failWithState(page, `HARVEST_TIMEOUT(afterTick=${minTick})`);
}

async function pauseAndStep(page, durationMs, waitBudget) {
  const step = 100;
  let elapsed = 0;
  while (elapsed < durationMs) {
    await page.evaluate(() => {
      window.__demo.stepFrame();
      window.__demo.stepFrame();
    });
    const waitMs = Math.min(step, durationMs - elapsed);
    await page.waitForTimeout(waitMs);
    waitBudget.waitForTimeoutMs += waitMs;
    elapsed += waitMs;
  }
}

async function getWorkerPoint(page) {
  const point = await page.evaluate(() => {
    const st = window.__demo?.store?.getState?.();
    const w = Number(st?.world?.w || 0) | 0;
    const h = Number(st?.world?.h || 0) | 0;
    const alive = st?.world?.alive;
    const lineageId = st?.world?.lineageId;
    const zoneRole = st?.world?.zoneRole;
    const playerLineageId = Number(st?.meta?.playerLineageId || 1) | 0;
    let idx = Number(st?.sim?.selectedUnit ?? -1);

    const isValidWorker = (i) =>
      i >= 0 &&
      i < w * h &&
      (Number(alive?.[i] || 0) | 0) === 1 &&
      (Number(lineageId?.[i] || 0) | 0) === playerLineageId &&
      (Number(zoneRole?.[i] || 0) | 0) !== 1;

    if (!isValidWorker(idx)) {
      idx = -1;
      for (let i = 0; i < w * h; i++) {
        if (isValidWorker(i)) {
          idx = i;
          break;
        }
      }
    }

    if (idx < 0) {
      const fallback = window.__demo?.points?.worker;
      if (!fallback) return null;
      return window.__demo.toScreen(fallback);
    }

    return window.__demo.toScreen({ x: idx % w, y: (idx / w) | 0 });
  });
  return point;
}

let server;
let browser;
const roundsLog = [];
const waitBudget = { waitForTimeoutMs: 0 };

try {
  server = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", String(port)], {
    cwd: root,
    stdio: "ignore",
  });
  await waitForPortOpen("127.0.0.1", port, 15000);

  browser = await chromium.launch({ headless: false, slowMo: 80 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  await page.evaluate(async () => {
    const [{ createStore }, manifestMod, logicMod, rendererMod, uiMod, idsMod, presetsMod] = await Promise.all([
      import("/src/kernel/store/createStore.js"),
      import("/src/project/project.manifest.js"),
      import("/src/project/project.logic.js"),
      import("/src/project/renderer.js"),
      import("/src/project/ui.js"),
      import("/src/game/contracts/ids.js"),
      import("/src/game/sim/worldPresets.js"),
    ]);

    const app = document.getElementById("app") || document.body;
    app.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.id = "cv-demo";
    canvas.style.width = "1200px";
    canvas.style.height = "800px";
    app.appendChild(canvas);

    const dpr = Number(window.devicePixelRatio || 1);
    canvas.width = Math.floor(1200 * dpr);
    canvas.height = Math.floor(800 * dpr);

    const store = createStore(manifestMod.manifest, { reducer: logicMod.reducer, simStep: logicMod.simStepPatch });
    const render = rendererMod.render;
    const ui = new uiMod.UI(store, canvas);

    const assertState = (ok, label) => {
      if (ok) return;
      const st = store.getState();
      throw new Error(`${label} state=${JSON.stringify({
        runPhase: st?.sim?.runPhase,
        founderPlaced: st?.sim?.founderPlaced,
        founderBudget: st?.sim?.founderBudget,
        running: st?.sim?.running,
        tick: st?.sim?.tick,
      })}`);
    };

    store.dispatch({ type: "SET_SIZE", payload: { w: 64, h: 64 } });
    store.dispatch({ type: "SET_SPEED", payload: 24 });
    store.dispatch({ type: "GEN_WORLD", payload: {} });
    store.dispatch({ type: "SET_BRUSH", payload: { brushMode: idsMod.BRUSH_MODE.FOUNDER_PLACE } });

    const st0 = store.getState();
    const budget = Math.max(0, Number(st0?.sim?.founderBudget || 0) | 0);
    const preset = presetsMod.getWorldPreset(st0.meta.worldPresetId);
    const range = presetsMod.getStartWindowRange(preset.startWindows.player, st0.world.w, st0.world.h);

    const founderCoords = [];
    for (let i = 0; i < budget; i++) {
      const x = Math.min(range.x1 - 1, Math.max(range.x0, range.x0 + i));
      const y = range.y0;
      founderCoords.push({ x, y });
      store.dispatch({ type: "PLACE_CELL", payload: { x, y, remove: false } });
      const stAfter = store.getState();
      assertState(Number(stAfter?.sim?.founderPlaced || 0) === i + 1, `PLACE_CELL_ASSERT_FAIL:${i + 1}`);
    }

    store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
    assertState(store.getState()?.sim?.runPhase === "genesis_zone", "CONFIRM_FOUNDATION_ASSERT_FAIL");

    store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
    assertState(store.getState()?.sim?.runPhase === "run_active", "CONFIRM_CORE_ZONE_ASSERT_FAIL");

    store.dispatch({ type: "SET_PLACEMENT_COST", payload: { enabled: false } });

    const sx = founderCoords[0]?.x ?? range.x0;
    const sy = founderCoords[0]?.y ?? range.y0;
    const st1 = store.getState();
    const w = Number(st1.world.w || 64) | 0;
    const h = Number(st1.world.h || 64) | 0;
    const workerX = Math.max(0, Math.min(w - 1, sx + 1));
    const workerY = sy;

    store.dispatch({ type: "PLACE_CELL", payload: { x: workerX, y: workerY, remove: false } });

    const rxA = Math.max(0, Math.min(w - 1, sx + 5));
    const ryA = Math.max(0, Math.min(h - 1, sy + 2));
    const rxB = Math.max(0, Math.min(w - 1, sx - 3));
    const ryB = Math.max(0, Math.min(h - 1, sy + 4));
    const detourX = Math.max(0, Math.min(w - 1, sx + 2));
    const detourY = Math.max(0, Math.min(h - 1, sy + 1));

    const growResource = (x, y, target) => {
      let guard = 0;
      while (guard++ < 24) {
        const st = store.getState();
        const idx = y * w + x;
        const rv = Number(st?.world?.R?.[idx] || 0);
        if (rv >= target) break;
        store.dispatch({ type: "SET_TILE", payload: { x, y, radius: 1, mode: "nutrient", value: 1 } });
      }
    };

    growResource(rxA, ryA, 0.95);
    growResource(rxB, ryB, 0.9);
    growResource(detourX, detourY, 0.06);

    store.dispatch({ type: "SET_BRUSH", payload: { brushMode: idsMod.BRUSH_MODE.OBSERVE } });

    let rInfo = render(canvas, store.getState(), { quality: 3, dprCap: 2, alpha: 0.4 });
    ui.setRenderInfo(rInfo);
    ui.sync(store.getState());

    const stepFrame = () => {
      const st = store.getState();
      if (st?.sim?.runPhase !== "run_active") {
        rInfo = render(canvas, st, { quality: 3, dprCap: 2, alpha: 0.5 });
        ui.setRenderInfo(rInfo);
        ui.sync(st);
        return;
      }
      if (!st?.sim?.running) store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
      store.dispatch({ type: "SIM_STEP", payload: {} });
      const stAfter = store.getState();
      rInfo = render(canvas, stAfter, { quality: 3, dprCap: 2, alpha: 0.5 });
      ui.setRenderInfo(rInfo);
      ui.sync(stAfter);
    };

    const inBounds = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    const pickResourceTile = (preferredList, targetLevel) => {
      for (const p of preferredList) {
        const x = Number(p?.x ?? -1) | 0;
        const y = Number(p?.y ?? -1) | 0;
        if (!inBounds(x, y)) continue;
        growResource(x, y, targetLevel);
        const st = store.getState();
        const idx = y * w + x;
        if ((Number(st?.world?.alive?.[idx] || 0) | 0) === 1) continue;
        if (Number(st?.world?.R?.[idx] || 0) <= 0.05) continue;
        return { x, y };
      }
      const fallback = preferredList[0];
      return {
        x: Math.max(0, Math.min(w - 1, Number(fallback?.x ?? 0) | 0)),
        y: Math.max(0, Math.min(h - 1, Number(fallback?.y ?? 0) | 0)),
      };
    };
    const chooseHarvestTargets = () => {
      const a = pickResourceTile([
        { x: rxA, y: ryA },
        { x: rxA + 1, y: ryA },
        { x: rxA, y: ryA + 1 },
        { x: rxA - 1, y: ryA },
        { x: rxA, y: ryA - 1 },
      ], 0.98);
      const b = pickResourceTile([
        { x: rxB, y: ryB },
        { x: rxB - 1, y: ryB },
        { x: rxB, y: ryB - 1 },
        { x: rxB + 1, y: ryB },
        { x: rxB, y: ryB + 1 },
        { x: rxB - 1, y: ryB - 1 },
      ], 0.98);
      return { a, b };
    };

    window.__demo = {
      store,
      ui,
      canvas,
      getRenderInfo: () => rInfo,
      points: {
        founder: { x: sx, y: sy },
        worker: { x: workerX, y: workerY },
        detour: { x: detourX, y: detourY },
        resA: { x: rxA, y: ryA },
        resB: { x: rxB, y: ryB },
      },
      dpr,
      stepFrame,
      growResource,
      chooseHarvestTargets,
      toScreen(tile) {
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + rInfo.offX / dpr + (tile.x + 0.5) * (rInfo.tilePx / dpr),
          y: rect.top + rInfo.offY / dpr + (tile.y + 0.5) * (rInfo.tilePx / dpr),
        };
      },
    };
  });

  const initial = await stateCore(page);
  if (initial.runPhase !== "run_active") await failWithState(page, "PRE_RUN_PHASE_NOT_ACTIVE");

  for (let round = 1; round <= 5; round++) {
    await page.evaluate(() => {
      const pts = window.__demo.points;
      window.__demo.growResource(pts.resA.x, pts.resA.y, 0.95);
      window.__demo.growResource(pts.resB.x, pts.resB.y, 0.9);
      window.__demo.growResource(pts.detour.x, pts.detour.y, 0.06);
    });

    const before = await stateCore(page);
    if (before.runPhase !== "run_active") await failWithState(page, `ROUND_${round}_PHASE_INVALID_BEFORE`);

    const detour = await page.evaluate(() => window.__demo.toScreen(window.__demo.points.detour));
    const targets = await page.evaluate(() => {
      const t = window.__demo.chooseHarvestTargets();
      return {
        aTile: t.a,
        bTile: t.b,
        aScreen: window.__demo.toScreen(t.a),
        bScreen: window.__demo.toScreen(t.b),
      };
    });
    const resA = targets.aScreen;
    const resB = targets.bScreen;

    const workerA = await getWorkerPoint(page);
    if (!workerA) await failWithState(page, `ROUND_${round}_NO_WORKER_AT_START`);

    await page.mouse.click(workerA.x, workerA.y);
    await page.mouse.click(detour.x, detour.y);
    const cmdDetour = await stateCore(page);
    if (!cmdDetour.lastCommand.startsWith("ISSUE_ORDER:")) {
      await failWithState(page, `ROUND_${round}_DETOUR_ORDER_NOT_ISSUED`, { lastCommand: cmdDetour.lastCommand });
    }

    await pauseAndStep(page, 600, waitBudget);

    const workerB = await getWorkerPoint(page);
    if (!workerB) await failWithState(page, `ROUND_${round}_NO_WORKER_BEFORE_A`);

    await page.evaluate((tile) => {
      window.__demo.growResource(tile.x, tile.y, 0.98);
    }, targets.aTile);
    await page.mouse.click(workerB.x, workerB.y);
    await page.mouse.click(resA.x, resA.y);
    const cmdA = await stateCore(page);
    if (!cmdA.lastCommand.startsWith("ISSUE_ORDER:")) {
      await failWithState(page, `ROUND_${round}_A_ORDER_NOT_ISSUED`, { lastCommand: cmdA.lastCommand });
    }

    const harvestA = await waitForHarvest(page, before.tick, before.totalHarvested, waitBudget, 25000);
    await pauseAndStep(page, 1200, waitBudget);
    await page.screenshot({ path: path.join(outDir, `round_${round}_harvest_A.png`), fullPage: true });

    const workerC = await getWorkerPoint(page);
    if (!workerC) await failWithState(page, `ROUND_${round}_NO_WORKER_BEFORE_B`);

    await page.evaluate((tile) => {
      window.__demo.growResource(tile.x, tile.y, 0.98);
    }, targets.bTile);
    await page.mouse.click(workerC.x, workerC.y);
    await page.mouse.click(resB.x, resB.y);
    const cmdB = await stateCore(page);
    if (!cmdB.lastCommand.startsWith("ISSUE_ORDER:")) {
      await failWithState(page, `ROUND_${round}_B_ORDER_NOT_ISSUED`, { lastCommand: cmdB.lastCommand });
    }

    const harvestB = await waitForHarvest(page, harvestA.tick, harvestA.totalHarvested, waitBudget, 25000);
    await pauseAndStep(page, 1200, waitBudget);
    await page.screenshot({ path: path.join(outDir, `round_${round}_harvest_B.png`), fullPage: true });

    await pauseAndStep(page, 5000, waitBudget);

    roundsLog.push({
      runde: round,
      tick: harvestB.tick,
      position: harvestB.selectedPos,
      lastAutoAction: harvestB.lastAutoAction,
      totalHarvested: harvestB.totalHarvested,
      harvestDetectedBy: harvestB.harvestDetectedBy || "",
    });

    const afterRound = await stateCore(page);
    if (afterRound.runPhase !== "run_active") {
      await failWithState(page, `ROUND_${round}_ENDED_NOT_ACTIVE`);
    }
  }

  if (waitBudget.waitForTimeoutMs < 40000) {
    await pauseAndStep(page, 40000 - waitBudget.waitForTimeoutMs, waitBudget);
  }

  const finalState = await stateCore(page);
  await page.screenshot({ path: path.join(outDir, "final.png"), fullPage: true });

  const finalLog = {
    startedAt: new Date().toISOString(),
    rounds: roundsLog,
    final: finalState,
    waits: {
      waitForTimeoutMs: waitBudget.waitForTimeoutMs,
      minExpectedMs: 40000,
      meets40s: waitBudget.waitForTimeoutMs >= 40000,
    },
  };

  fs.writeFileSync(path.join(outDir, "final_log.json"), JSON.stringify(finalLog, null, 2));
  console.log(`DEMO_LIVE_ATTEST_OK output=${outDir}`);
} catch (err) {
  console.error(`DEMO_LIVE_ATTEST_FAIL ${String(err?.stack || err)}`);
  if (KEEP_OPEN_ON_FAIL && browser) {
    console.error(`DEMO_LIVE_ATTEST_DEBUG browser kept open for ${KEEP_OPEN_MS}ms`);
    try {
      await new Promise((resolve) => setTimeout(resolve, KEEP_OPEN_MS));
    } catch {}
  }
  process.exitCode = 1;
} finally {
  if (browser) {
    try { await browser.close(); } catch {}
  }
  if (server && !server.killed) {
    try { server.kill("SIGTERM"); } catch {}
  }
}
