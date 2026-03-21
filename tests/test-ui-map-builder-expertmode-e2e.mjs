import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { startLocalHttpServer } from "./support/localHttpServer.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

let server = null;
let browser = null;

try {
  server = await startLocalHttpServer(root);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto(server.baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const store = globalThis.__LIFEGAMELAB_STORE__;
    const ui = globalThis.__LIFEGAMELAB_UI__;
    return !!store && !!ui;
  }, { timeout: 5000 });

  const result = await page.evaluate(() => {
    const store = globalThis.__LIFEGAMELAB_STORE__;
    const ui = globalThis.__LIFEGAMELAB_UI__;
    if (!store || !ui) {
      return Object.freeze({
        cycleFalse: { initialExpertMode: false, error: "runtime_hooks_missing" },
        cycleTrue: { initialExpertMode: true, error: "runtime_hooks_missing" },
      });
    }

    const getButtons = () => {
      const builderButton =
        document.querySelector('button[aria-label="Builder öffnen"]') ||
        document.querySelector('button[aria-label="Map Builder umschalten"]') ||
        Array.from(document.querySelectorAll("button")).find((btn) => {
          const text = String(btn.textContent || "").trim().toLowerCase();
          return text === "bauen" || text.includes("map builder");
        });
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
          runPhase: "run_active",
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
  assert.equal(cycleFalse.afterExit.runPhase, "run_active", "Map Builder toggle must exit to run_active");
  assert.equal(cycleFalse.afterExit.expertMode, false, "Map Builder exit must restore false expertMode");
  assert.equal(cycleTrue.afterEnter.runPhase, "map_builder", "Map Builder toggle must enter map_builder");
  assert.equal(cycleTrue.afterEnter.expertMode, true, "Map Builder enter must keep expertMode=true");
  assert.equal(cycleTrue.afterExit.runPhase, "run_active", "Map Builder toggle must exit to run_active");
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
  if (server) {
    try {
      server.stop();
    } catch {}
  }
}
