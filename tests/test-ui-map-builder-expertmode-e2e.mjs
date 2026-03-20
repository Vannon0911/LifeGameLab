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
  await page.waitForTimeout(350);

  const result = await page.evaluate(async () => {
    const [{ createStore }, manifestMod, logicMod, uiMod] = await Promise.all([
      import("/src/kernel/store/createStore.js"),
      import("/src/project/project.manifest.js"),
      import("/src/project/project.logic.js"),
      import("/src/project/ui.js"),
    ]);

    const app = document.getElementById("app") || document.body;
    app.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.id = "cv";
    canvas.width = 640;
    canvas.height = 360;
    app.appendChild(canvas);

    const store = createStore(manifestMod.manifest, { reducer: logicMod.reducer, simStep: logicMod.simStepPatch });
    new uiMod.UI(store, canvas);

    const getButtons = () => {
      const builderButton = document.querySelector('button[aria-label="Map Builder umschalten"]');
      const exitButton = Array.from(document.querySelectorAll("button")).find(
        (btn) => String(btn.textContent || "").trim() === "Schliessen",
      );
      return { builderButton, exitButton };
    };

    const cycle = (initialExpertMode) => {
      store.dispatch({
        type: "SET_UI",
        payload: {
          expertMode: !!initialExpertMode,
          activeTab: "lage",
          panelOpen: false,
          runPhase: "genesis_setup",
        },
      });
      const { builderButton, exitButton } = getButtons();
      if (!builderButton || !exitButton) {
        return Object.freeze({
          initialExpertMode: !!initialExpertMode,
          error: "builder_controls_missing",
        });
      }

      builderButton.click();
      const afterEnterState = store.getState();
      const afterEnter = {
        runPhase: String(afterEnterState?.sim?.runPhase || ""),
        expertMode: !!afterEnterState?.meta?.ui?.expertMode,
      };

      exitButton.click();
      const afterExitState = store.getState();
      const afterExit = {
        runPhase: String(afterExitState?.sim?.runPhase || ""),
        expertMode: !!afterExitState?.meta?.ui?.expertMode,
      };
      return Object.freeze({ initialExpertMode: !!initialExpertMode, afterEnter, afterExit });
    };

    return Object.freeze({
      cycleFalse: cycle(false),
      cycleTrue: cycle(true),
    });
  });

  const cycleFalse = result.cycleFalse;
  const cycleTrue = result.cycleTrue;
  assert.equal(cycleFalse.error || "", "", "builder controls must exist in mounted UI");
  assert.equal(cycleTrue.error || "", "", "builder controls must exist in mounted UI");
  assert.equal(cycleFalse.afterEnter.runPhase, "map_builder", "Map Builder toggle must enter map_builder");
  assert.equal(cycleFalse.afterEnter.expertMode, true, "Map Builder enter must force expertMode=true");
  assert.equal(cycleFalse.afterExit.runPhase, "genesis_setup", "Map Builder toggle must exit to genesis_setup");
  assert.equal(cycleFalse.afterExit.expertMode, false, "Map Builder exit must restore false expertMode");
  assert.equal(cycleTrue.afterEnter.runPhase, "map_builder", "Map Builder toggle must enter map_builder");
  assert.equal(cycleTrue.afterEnter.expertMode, true, "Map Builder enter must keep expertMode=true");
  assert.equal(cycleTrue.afterExit.runPhase, "genesis_setup", "Map Builder toggle must exit to genesis_setup");
  assert.equal(cycleTrue.afterExit.expertMode, true, "Map Builder exit must restore true expertMode");

  console.log(
    `UI_MAP_BUILDER_EXPERTMODE_E2E_OK restore_false=${cycleFalse.afterExit.expertMode} restore_true=${cycleTrue.afterExit.expertMode}`,
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
