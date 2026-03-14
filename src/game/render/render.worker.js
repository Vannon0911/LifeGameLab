// ============================================================
// Render Worker — Offscreen Canvas Drawing
// ============================================================

import { drawFrame } from "./renderer.js";

let offscreenCanvas = null;
let offscreenCtx = null;
let activeGeneration = 0;

self.onmessage = (evt) => {
  const { cmd, payload } = evt.data;

  if (cmd === "INIT") {
    offscreenCanvas = payload.canvas;
    offscreenCanvas.width = Math.max(1, Number(payload?.width || offscreenCanvas.width || 300));
    offscreenCanvas.height = Math.max(1, Number(payload?.height || offscreenCanvas.height || 150));
    offscreenCtx = offscreenCanvas.getContext("2d", { alpha: false });
    return;
  }

  if (cmd === "RESET") {
    activeGeneration = Number(evt.data?.generation || 0);
    return;
  }

  if (cmd === "RESIZE") {
    if (!offscreenCanvas) return;
    offscreenCanvas.width = Math.max(1, Number(payload?.width || offscreenCanvas.width || 1));
    offscreenCanvas.height = Math.max(1, Number(payload?.height || offscreenCanvas.height || 1));
    activeGeneration = Number(evt.data?.generation || activeGeneration);
    return;
  }

  if (cmd === "RENDER") {
    if (!offscreenCtx) return;
    activeGeneration = Number(evt.data?.generation || activeGeneration);
    const { state, perf } = payload;

    const safePerf = {
      ...(perf || {}),
      CW: Math.max(1, Number(perf?.CW || offscreenCanvas?.width || 1)),
      CH: Math.max(1, Number(perf?.CH || offscreenCanvas?.height || 1)),
    };

    // Draw the frame onto the offscreen canvas.
    const renderInfo = drawFrame(offscreenCtx, state, safePerf);

    // Send back renderInfo for UI sync and coordinate mapping.
    self.postMessage({ cmd: "RENDER_COMPLETE", generation: activeGeneration, tick: payload?.tick ?? 0, payload: renderInfo });
  }
};
