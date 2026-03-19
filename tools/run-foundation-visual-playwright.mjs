import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const baseUrl = process.env.FOUNDATION_VISUAL_BASE_URL || "http://127.0.0.1:8080";
const port = Number(new URL(baseUrl).port || 8080);
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runsRootDir = path.join(root, "output", "playwright", "foundation-block");
const outDir = path.join(runsRootDir, runId);
const runLogPath = path.join(outDir, "run-log.json");

fs.mkdirSync(outDir, { recursive: true });

const runLog = {
  runId,
  startedAt: new Date().toISOString(),
  baseUrl,
  outputDir: outDir,
  steps: [],
};

function saveRunLog() {
  fs.writeFileSync(runLogPath, `${JSON.stringify(runLog, null, 2)}\n`, "utf8");
}

function logStep({ step, action, expect, seen, state, screenshot }) {
  runLog.steps.push({
    ts: new Date().toISOString(),
    step,
    action,
    expect,
    seen,
    state,
    screenshot: path.relative(root, screenshot).split(path.sep).join("/"),
  });
}

function waitForPortOpen(host, targetPort, timeoutMs = 12_000) {
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
          setTimeout(probe, 200);
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

function screenshotPath(index, step) {
  return path.join(outDir, `${String(index).padStart(2, "0")}_${step}.png`);
}

function enforceRunRetention(maxRuns = 3) {
  fs.mkdirSync(runsRootDir, { recursive: true });
  const dirs = fs.readdirSync(runsRootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const abs = path.join(runsRootDir, entry.name);
      const stat = fs.statSync(abs);
      return {
        name: entry.name,
        abs,
        mtimeMs: Number(stat.mtimeMs || 0),
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  const removed = [];
  for (const stale of dirs.slice(maxRuns)) {
    fs.rmSync(stale.abs, { recursive: true, force: true });
    removed.push(stale.name);
  }
  return {
    kept: dirs.slice(0, maxRuns).map((d) => d.name),
    removed,
    maxRuns,
  };
}

async function getBodyText(page) {
  return page.locator("body").innerText();
}

async function main() {
  let server = null;
  let browser = null;
  try {
    let chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch {
      throw new Error("Missing playwright package. Run with: npx --yes -p playwright node tools/run-foundation-visual-playwright.mjs");
    }

    server = startLocalServer();
    await waitForPortOpen("127.0.0.1", port);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);

    let idx = 1;
    let shot = screenshotPath(idx++, "header_app_loaded");
    await page.screenshot({ path: shot, fullPage: true });
    const header = page.locator(".nx-minimal-header");
    const headerShot = screenshotPath(idx++, "header_crop");
    await header.screenshot({ path: headerShot });
    const appLoadedSeen = {
      title: await page.title(),
      headerVisible: await header.isVisible(),
      brandVisible: await page.getByText("LifeGameLab", { exact: true }).isVisible(),
      hintVisible: await page.getByText("Klick: Worker setzen | Worker->Ressource: Bewegung", { exact: true }).isVisible(),
      startVisible: await page.getByRole("button", { name: /Simulation starten oder pausieren/i }).isVisible(),
      newWorldVisible: await page.getByRole("button", { name: "Neue Welt generieren" }).isVisible(),
    };
    logStep({
      step: "header_app_loaded",
      action: "App geladen und Header-Screenshot erzeugt.",
      expect: "Minimal-Header inkl. Hint + Start/Neue-Welt Controls sichtbar.",
      seen: { ...appLoadedSeen, headerScreenshot: path.relative(root, headerShot).split(path.sep).join("/") },
      state: appLoadedSeen.headerVisible && appLoadedSeen.brandVisible && appLoadedSeen.hintVisible && appLoadedSeen.startVisible && appLoadedSeen.newWorldVisible ? "ok" : "bug",
      screenshot: shot,
    });

    await page.getByRole("button", { name: "Neue Welt generieren" }).click();
    await page.waitForTimeout(350);
    shot = screenshotPath(idx++, "header_after_new_world");
    await page.screenshot({ path: shot, fullPage: true });
    const headerShotAfter = screenshotPath(idx++, "header_after_new_world_crop");
    await header.screenshot({ path: headerShotAfter });
    const canvasSeen = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      if (!c) return { hasCanvas: false, width: 0, height: 0 };
      const r = c.getBoundingClientRect();
      return { hasCanvas: true, width: r.width, height: r.height };
    });
    logStep({
      step: "header_after_new_world",
      action: "Neue Welt erzeugt und Header erneut gescreenshottet.",
      expect: "Header bleibt stabil sichtbar, Canvas ist im Viewport.",
      seen: { ...canvasSeen, headerScreenshot: path.relative(root, headerShotAfter).split(path.sep).join("/") },
      state: canvasSeen.hasCanvas && canvasSeen.width > 64 && canvasSeen.height > 64 ? "ok" : "bug",
      screenshot: shot,
    });

    runLog.finishedAt = new Date().toISOString();
    runLog.outcome = runLog.steps.every((s) => s.state === "ok") ? "pass" : "fail";
    runLog.retention = enforceRunRetention(3);
    saveRunLog();
    console.log(`FOUNDATION_VISUAL_RUN_OK output=${path.relative(root, outDir).split(path.sep).join("/")}`);
    console.log(`FOUNDATION_VISUAL_RUN_LOG ${path.relative(root, runLogPath).split(path.sep).join("/")}`);
  } catch (error) {
    runLog.finishedAt = new Date().toISOString();
    runLog.outcome = "fail";
    runLog.error = String(error?.stack || error);
    runLog.retention = enforceRunRetention(3);
    saveRunLog();
    console.error(`FOUNDATION_VISUAL_RUN_FAIL ${runLog.error}`);
    console.error(`FOUNDATION_VISUAL_RUN_LOG ${path.relative(root, runLogPath).split(path.sep).join("/")}`);
    process.exitCode = 1;
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
}

await main();
