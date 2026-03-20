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
    const [{ createStore }, manifestMod, logicMod, idsMod, presetsMod, foundationMod] = await Promise.all([
      import("/src/kernel/store/createStore.js"),
      import("/src/project/project.manifest.js"),
      import("/src/project/project.logic.js"),
      import("/src/game/contracts/ids.js"),
      import("/src/game/sim/worldPresets.js"),
      import("/src/game/sim/foundationEligibility.js"),
    ]);

    const store = createStore(manifestMod.manifest, { reducer: logicMod.reducer, simStep: logicMod.simStepPatch });
store.dispatch({ type: "SET_SEED", payload: { seed: "ui-e2e-seed-main" } });
    store.dispatch({ type: "GEN_WORLD", payload: {} });
    store.dispatch({ type: "SET_BRUSH", payload: { brushMode: idsMod.BRUSH_MODE.FOUNDER_PLACE } });

    const beforeInvalid = store.getSignature();
    store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
    const afterInvalid = store.getSignature();
    const blocked = beforeInvalid === afterInvalid && store.getState().sim.runPhase === "genesis_setup";

    const st = store.getState();
    const preset = presetsMod.getWorldPreset(st.meta.worldPresetId);
    const range = presetsMod.getStartWindowRange(preset.startWindows.player, st.world.w, st.world.h);
store.dispatch({ type: "PLACE_WORKER", payload: { x: range.x0, y: range.y0, remove: false } });
    const eligibility = foundationMod.evaluateFoundationEligibility(store.getState());
    store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
    store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
    store.dispatch({ type: "SIM_STEP", payload: {} });
    const afterRun = store.getState();

    return {
      blocked,
      eligibility: { eligible: !!eligibility.eligible, reason: String(eligibility.reason || "") },
      runPhase: String(afterRun.sim.runPhase || ""),
      running: !!afterRun.sim.running,
      tick: Number(afterRun.sim.tick || 0),
    };
  });

  assert.equal(e2e.blocked, true, "counterprobe: foundation must stay blocked before founder placement");
  assert.equal(e2e.eligibility.eligible, true, "foundation eligibility must become true after valid founder placement");
  assert.equal(e2e.eligibility.reason, "ok", "foundation eligibility reason must be ok after valid founder placement");
  assert.equal(e2e.runPhase, "run_active", "browser flow must reach run_active");
  assert.equal(e2e.running, true, "browser flow must set running=true");
  assert(e2e.tick >= 1, "browser flow must advance at least one sim step");

  console.log(`UI_FOUNDATION_E2E_OK runPhase=${e2e.runPhase} tick=${e2e.tick} blocked=${e2e.blocked}`);
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
