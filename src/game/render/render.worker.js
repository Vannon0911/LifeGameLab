// ============================================================
// Render Worker — Offscreen Canvas Drawing
// ============================================================

import { drawFrame } from "./renderer.js";

let offscreenCanvas = null;
let offscreenCtx = null;

self.onmessage = (evt) => {
  const { type, payload } = evt.data;

  if (type === "INIT") {
    offscreenCanvas = payload.canvas;
    offscreenCtx = offscreenCanvas.getContext("2d", { alpha: false });
    return;
  }

  if (type === "RENDER") {
    if (!offscreenCtx) return;
    const { state, perf } = payload;
    
    // Draw the frame onto the offscreen canvas
    const renderInfo = drawFrame(offscreenCtx, state, perf);
    
    // Send back renderInfo for UI sync and coordinate mapping
    self.postMessage({ type: "RENDER_COMPLETE", payload: renderInfo });
  }
};
