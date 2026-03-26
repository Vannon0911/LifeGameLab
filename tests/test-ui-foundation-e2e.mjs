import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { startLocalHttpServer } from "./support/localHttpServer.mjs";

let chromium = null;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("UI_FOUNDATION_E2E_SKIPPED playwright_not_installed");
  process.exit(0);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

let server = null;
let browser = null;

try {
  server = await startLocalHttpServer(root);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const bootstrapErrors = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = String(msg.text() || "");
    if (text.includes("action.payload(") || text.includes("must be object")) bootstrapErrors.push(text);
  });
  page.on("pageerror", (err) => {
    const text = String(err?.message || err || "");
    if (text.includes("action.payload(") || text.includes("must be object")) bootstrapErrors.push(text);
  });
  await page.goto(server.baseUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(350);
  assert.equal(bootstrapErrors.length, 0, `bootstrap must not emit validation errors: ${bootstrapErrors.join(" | ")}`);

  const canvasExists = await page.locator("canvas#cv").count();
  assert.equal(canvasExists, 1, "main app must bootstrap canvas#cv");

  const e2e = await page.evaluate(async () => {
    const [{ createStore }, webDriverMod, manifestMod, logicMod] = await Promise.all([
      import("/src/kernel/store/createStore.js"),
      import("/src/platform/persistence/webDriver.js"),
      import("/src/game/manifest.js"),
      import("/src/game/runtime/index.js"),
    ]);

    const store = createStore(
      manifestMod.manifest,
      { reducer: logicMod.reducer, simStep: logicMod.simStepPatch },
      { storageDriver: webDriverMod.getDefaultWebDriver() },
    );
    store.dispatch({ type: "SET_SEED", payload: { seed: "ui-e2e-seed-main" } });
    store.dispatch({ type: "GEN_WORLD", payload: {} });
    store.dispatch({ type: "SET_UI", payload: { runPhase: "run_active" } });
    store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
    store.dispatch({ type: "SIM_STEP", payload: {} });
    const afterRun = store.getState();

    return {
      runPhase: String(afterRun.sim.runPhase || ""),
      running: !!afterRun.sim.running,
      tick: Number(afterRun.sim.tick || 0),
    };
  });

  assert.equal(e2e.runPhase, "run_active", "browser flow must reach run_active");
  assert.equal(e2e.running, true, "browser flow must set running=true");
  assert(e2e.tick >= 1, "browser flow must advance at least one sim step");

  console.log(`UI_FOUNDATION_E2E_OK runPhase=${e2e.runPhase} tick=${e2e.tick}`);
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch {}
  }
  if (server) {
    try { server.stop(); } catch {}
  }
}
