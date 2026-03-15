import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-phase-g-cleanup.mjs");

import fs from "node:fs";
import path from "node:path";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const uiSource = fs.readFileSync(path.resolve("src/game/ui/ui.js"), "utf8");
const rendererSource = fs.readFileSync(path.resolve("src/game/render/renderer.js"), "utf8");

for (const legacyCtx of [
  "legacy_energie",
  "legacy_harvest",
  "legacy_tools",
  "legacy_zonen",
  "legacy_sieg",
]) {
  assert(!uiSource.includes(legacyCtx), `ui cleanup drift: found stale legacy context '${legacyCtx}'`);
}

assert(uiSource.includes("LAB_ONLY_BRUSH_MODES"), "ui cleanup drift: LAB_ONLY_BRUSH_MODES guard missing");
assert(uiSource.includes("_isLaborPanelActive"), "ui cleanup drift: labor panel guard helper missing");
assert(
  uiSource.includes("Labor-Rohwerkzeuge sind ausserhalb des Labor-Panels gesperrt."),
  "ui cleanup drift: missing blocked feedback for raw brushes outside labor",
);
assert(
  uiSource.includes("this._ensureLabBrushIsolation(this._activeContext || \"lage\", state);"),
  "ui cleanup drift: canvas path no longer resets stale labor brush state",
);

assert(
  rendererSource.includes("function shouldDrawLegacyZoneOverlay(meta)"),
  "renderer cleanup drift: legacy zone overlay gate helper missing",
);
assert(
  rendererSource.includes("if (quality >= 1 && shouldDrawLegacyZoneOverlay(meta)) drawZoneOverlay(ctx, world, offX, offY, tilePx);"),
  "renderer cleanup drift: legacy zone overlay no longer gated to labor context",
);

for (const deadHelper of [
  "writeBackgroundPixels",
  "writeCellColorPixels",
  "drawCanvasHud",
  "getRenderContext",
  "_renderCtxCache",
  "_pixelCanvas",
  "_cellCanvas",
]) {
  assert(!rendererSource.includes(deadHelper), `renderer cleanup drift: stale helper '${deadHelper}' still present`);
}

console.log("PHASE_G_CLEANUP_OK legacy panel/render branches removed and labor-only gates enforced");
