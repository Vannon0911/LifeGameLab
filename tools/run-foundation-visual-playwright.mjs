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
    let shot = screenshotPath(idx++, "app_loaded");
    await page.screenshot({ path: shot, fullPage: true });
    const appLoadedSeen = {
      title: await page.title(),
      startVisible: await page.getByRole("button", { name: /Simulation starten oder pausieren/i }).isVisible(),
      newWorldVisible: await page.getByRole("button", { name: "Neue Welt generieren" }).isVisible(),
    };
    logStep({
      step: "app_loaded",
      action: "App lokal im Browser geoeffnet.",
      expect: "Titel sowie Start/Neue-Welt Controls sichtbar.",
      seen: appLoadedSeen,
      state: appLoadedSeen.startVisible && appLoadedSeen.newWorldVisible ? "ok" : "bug",
      screenshot: shot,
    });

    await page.getByRole("button", { name: "Neue Welt generieren" }).click();
    await page.waitForTimeout(350);
    shot = screenshotPath(idx++, "new_world");
    await page.screenshot({ path: shot, fullPage: true });
    const newWorldBody = await getBodyText(page);
    const newWorldSeen = {
      founderCount: (newWorldBody.match(/Founder\s*\n\s*(\d\/4)/i) || [null, null])[1],
    };
    logStep({
      step: "new_world",
      action: "Neue Welt erzeugt.",
      expect: "Genesis-Setup frisch initialisiert (Founder 0/4).",
      seen: newWorldSeen,
      state: newWorldSeen.founderCount === "0/4" ? "ok" : "unklar",
      screenshot: shot,
    });

    shot = screenshotPath(idx++, "foundation_not_ready");
    await page.screenshot({ path: shot, fullPage: true });
    const notReadyBody = await getBodyText(page);
    const foundationNotReadySeen = {
      foundationLine: notReadyBody.split("\n").find((line) => /Foundation\s+noch\s+nicht\s+bereit/i.test(line)) || null,
      confirmDisabled: await page.getByRole("button", { name: "Gruendung bestaetigen" }).isDisabled(),
    };
    logStep({
      step: "foundation_not_ready",
      action: "Foundation-Status vor gueltiger Eligibility geprueft.",
      expect: "Nicht bereit und Confirm disabled.",
      seen: foundationNotReadySeen,
      state: foundationNotReadySeen.confirmDisabled && !!foundationNotReadySeen.foundationLine ? "ok" : "bug",
      screenshot: shot,
    });

    await page.getByRole("button", { name: "Founder-Brush" }).click();
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found for founder placement.");
    const grid = 64;
    const cellW = box.width / grid;
    const cellH = box.height / grid;
    const founders = [
      { gx: 4, gy: 4 },
      { gx: 5, gy: 4 },
      { gx: 4, gy: 5 },
      { gx: 5, gy: 5 },
    ];
    for (const tile of founders) {
      await page.mouse.click(box.x + (tile.gx + 0.5) * cellW, box.y + (tile.gy + 0.5) * cellH);
      await page.waitForTimeout(110);
    }
    await page.waitForTimeout(250);
    shot = screenshotPath(idx++, "foundation_ready");
    await page.screenshot({ path: shot, fullPage: true });
    const readyBody = await getBodyText(page);
    const foundationReadySeen = {
      founderCount: (readyBody.match(/Founder\s*\n\s*(\d\/4)/i) || [null, null])[1],
      foundationReadyLine: readyBody.split("\n").find((line) => /Foundation\s+bereit/i.test(line)) || null,
      confirmDisabled: await page.getByRole("button", { name: "Gruendung bestaetigen" }).isDisabled(),
    };
    logStep({
      step: "foundation_ready",
      action: "Gueltige Founder-Konstellation gesetzt (2x2, zusammenhaengend).",
      expect: "Foundation bereit und Confirm aktiviert.",
      seen: foundationReadySeen,
      state: foundationReadySeen.founderCount === "4/4" && foundationReadySeen.confirmDisabled === false ? "ok" : "bug",
      screenshot: shot,
    });

    await page.getByRole("button", { name: "Gruendung bestaetigen" }).click();
    await page.waitForTimeout(450);
    shot = screenshotPath(idx++, "core_visible");
    await page.screenshot({ path: shot, fullPage: true });
    const coreBody = await getBodyText(page);
    const coreVisibleSeen = {
      coreButtonVisible: await page.getByRole("button", { name: "Energiekern bestaetigen" }).isVisible(),
      runPath: (coreBody.match(/Run-Pfad\s*\n\s*([^\n]+)/i) || [null, null])[1],
    };
    logStep({
      step: "core_visible",
      action: "Foundation bestaetigt.",
      expect: "Core-Schritt sichtbar.",
      seen: coreVisibleSeen,
      state: coreVisibleSeen.coreButtonVisible ? "ok" : "bug",
      screenshot: shot,
    });

    await page.getByRole("button", { name: "Energiekern bestaetigen" }).click();
    await page.waitForTimeout(900);
    shot = screenshotPath(idx++, "run_active");
    await page.screenshot({ path: shot, fullPage: true });
    const runBody = await getBodyText(page);
    const startLabel = (await page.getByRole("button", { name: /Simulation starten oder pausieren/i }).innerText()).trim();
    const runActiveSeen = {
      startLabel,
      pauseVisible: /pause/i.test(startLabel),
      runPath: (runBody.match(/Run-Pfad\s*\n\s*([^\n]+)/i) || [null, null])[1],
    };
    logStep({
      step: "run_active",
      action: "Core bestaetigt.",
      expect: "Run formal aktiv (Pause statt Start).",
      seen: runActiveSeen,
      state: runActiveSeen.pauseVisible ? "ok" : "bug",
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
