import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PLAYWRIGHT_MODULE = path.join(
  process.env.APPDATA || "",
  "npm",
  "node_modules",
  "playwright",
  "index.mjs"
);
const PANEL_FLOW = [
  { key: "lage", buttonName: "Lage Panel öffnen" },
  { key: "eingriffe", buttonName: "Eingriffe Panel öffnen" },
  { key: "evolution", buttonName: "Evolution Panel öffnen" },
  { key: "welt", buttonName: "Welt Panel öffnen" },
  { key: "labor", buttonName: "Labor Panel öffnen" },
];

function parseArgs(argv) {
  const args = {
    url: "http://127.0.0.1:8091/",
    iterations: 2,
    speed: 24,
    advanceMs: 2000,
    settleMs: 350,
    headless: true,
    outDir: path.join("output", "web-game", "debug-loop"),
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--url" && next) {
      args.url = next;
      i++;
    } else if (arg === "--iterations" && next) {
      args.iterations = Math.max(1, Number.parseInt(next, 10) || args.iterations);
      i++;
    } else if (arg === "--speed" && next) {
      args.speed = Math.max(1, Number.parseInt(next, 10) || args.speed);
      i++;
    } else if (arg === "--advance-ms" && next) {
      args.advanceMs = Math.max(0, Number.parseInt(next, 10) || args.advanceMs);
      i++;
    } else if (arg === "--settle-ms" && next) {
      args.settleMs = Math.max(0, Number.parseInt(next, 10) || args.settleMs);
      i++;
    } else if (arg === "--headless" && next) {
      args.headless = next !== "0" && next !== "false";
      i++;
    } else if (arg === "--out-dir" && next) {
      args.outDir = next;
      i++;
    }
  }
  return args;
}

async function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    DEFAULT_PLAYWRIGHT_MODULE,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const abs = path.resolve(candidate);
    if (!fs.existsSync(abs)) continue;
    return import(pathToFileURL(abs).href);
  }
  throw new Error(
    `Playwright-Modul nicht gefunden. Erwartet unter ${DEFAULT_PLAYWRIGHT_MODULE} oder via PLAYWRIGHT_MODULE.`
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function readState(page) {
  return page.evaluate(() => ({
    text: typeof window.render_game_to_text === "function" ? JSON.parse(window.render_game_to_text()) : null,
    perf: window.__lifeGamePerfStats || null,
  }));
}

async function setRunSpeed(page, speed) {
  return page.evaluate((value) => {
    const store = window.__lifeGameStore;
    if (!store || typeof store.dispatch !== "function") return false;
    store.dispatch({ type: "SET_SPEED", payload: value });
    return Number(store.getState?.()?.meta?.speed || 0);
  }, speed);
}

async function ensureRunning(page) {
  const before = await page.evaluate(() => ({
    running: !!window.__lifeGameStore?.getState?.()?.sim?.running,
  }));
  if (before.running) return true;
  const startButton = page.getByRole("button", { name: "Simulation starten oder pausieren" });
  await startButton.click();
  return page.evaluate(() => !!window.__lifeGameStore?.getState?.()?.sim?.running);
}

async function advance(page, ms) {
  if (!ms) return null;
  return page.evaluate(async (duration) => {
    if (typeof window.advanceTime !== "function") return null;
    return window.advanceTime(duration);
  }, ms);
}

async function clearBrowserData(page, context) {
  await page.evaluate(async () => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    try {
      if (typeof indexedDB?.databases === "function") {
        const dbs = await indexedDB.databases();
        await Promise.all(
          (dbs || [])
            .map((entry) => String(entry?.name || ""))
            .filter(Boolean)
            .map((name) => new Promise((resolve) => {
              try {
                const req = indexedDB.deleteDatabase(name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              } catch {
                resolve();
              }
            }))
        );
      }
    } catch {}
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {}
  });
  await context.clearCookies();
}

async function capture(page, outPath) {
  try {
    const session = await page.context().newCDPSession(page);
    const shot = await session.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    fs.writeFileSync(outPath, Buffer.from(String(shot.data || ""), "base64"));
    return;
  } catch {}
  await page.screenshot({
    path: outPath,
    fullPage: false,
    type: "png",
    timeout: 10000,
  });
}

async function capturePanelRaster(page, outDir, prefix) {
  const panels = [];
  for (const panel of PANEL_FLOW) {
    const button = page.getByRole("button", { name: panel.buttonName });
    await button.click();
    await page.waitForTimeout(180);
    const panelPath = path.join(outDir, `${prefix}-panel-${panel.key}.png`);
    await capture(page, panelPath);
    panels.push(panelPath);
  }
  return panels;
}

async function main() {
  const args = parseArgs(process.argv);
  ensureDir(args.outDir);
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    headless: args.headless,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const runSummary = [];

  try {
    for (let i = 0; i < args.iterations; i++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
      const page = await context.newPage();
      const consoleLog = [];
      page.on("console", (msg) => {
        consoleLog.push({
          type: msg.type(),
          text: msg.text(),
        });
      });
      page.on("pageerror", (err) => {
        consoleLog.push({
          type: "pageerror",
          text: String(err?.message || err),
        });
      });

      const prefix = `iter-${String(i + 1).padStart(2, "0")}`;
      try {
        await page.goto(args.url, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(args.settleMs);

        const boot = await readState(page);
        await capture(page, path.join(args.outDir, `${prefix}-boot.png`));
        fs.writeFileSync(path.join(args.outDir, `${prefix}-boot.json`), JSON.stringify(boot, null, 2));

        const started = await ensureRunning(page);
        const appliedSpeed = await setRunSpeed(page, args.speed);
        await page.waitForTimeout(args.settleMs);
        const advanced = await advance(page, args.advanceMs);
        await page.waitForTimeout(args.settleMs);
        const running = await readState(page);
        const panelRaster = await capturePanelRaster(page, args.outDir, prefix);

        await capture(page, path.join(args.outDir, `${prefix}-run.png`));
        fs.writeFileSync(path.join(args.outDir, `${prefix}-run.json`), JSON.stringify({
          ...running,
          loop: {
            requestedSpeed: args.speed,
            appliedSpeed,
            started,
            advanced,
            panelRaster,
          },
        }, null, 2));
        fs.writeFileSync(path.join(args.outDir, `${prefix}-console.json`), JSON.stringify(consoleLog, null, 2));

        runSummary.push({
          iteration: i + 1,
          started,
          appliedSpeed,
          tick: Number(running?.text?.tick || 0),
          running: !!running?.text?.running,
          playerAlive: Number(running?.text?.playerAlive || 0),
          rasterPanels: panelRaster.length,
          consoleErrors: consoleLog.filter((entry) => entry.type === "error" || entry.type === "pageerror").length,
        });
      } finally {
        await clearBrowserData(page, context);
        await page.goto("about:blank");
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(args.outDir, "summary.json"), JSON.stringify(runSummary, null, 2));
  console.log(JSON.stringify({ ok: true, outDir: args.outDir, runs: runSummary }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(`PLAYWRIGHT_DEBUG_LOOP_FAIL: ${String(err?.stack || err)}`);
  process.exit(1);
});
