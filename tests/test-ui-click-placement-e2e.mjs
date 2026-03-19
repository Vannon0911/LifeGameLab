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
