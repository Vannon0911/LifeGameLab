// ============================================================
// Viewport Controller — Zoom, Pan, Transform
// Manages canvas transform state for the Map Builder.
// ============================================================

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.1;
const PAN_BUTTON = 1; // middle mouse button

/**
 * Create a viewport controller for canvas zoom/pan.
 * @param {HTMLCanvasElement} canvas
 * @returns viewport controller API
 */
export function createViewportController(canvas) {
  let scale = 1.0;
  let offsetX = 0;
  let offsetY = 0;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panStartOffsetX = 0;
  let panStartOffsetY = 0;
  let onChangeCallback = null;

  // Touch state for pinch zoom
  let lastPinchDist = 0;
  let lastTouchMidX = 0;
  let lastTouchMidY = 0;

  function clampScale(s) {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s));
  }

  function emitChange() {
    if (typeof onChangeCallback === "function") onChangeCallback();
  }

  function zoomAt(clientX, clientY, delta) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const prevScale = scale;
    scale = clampScale(scale + delta);
    const ratio = scale / prevScale;
    offsetX = mx - ratio * (mx - offsetX);
    offsetY = my - ratio * (my - offsetY);
    emitChange();
  }

  // Mouse wheel zoom
  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    zoomAt(e.clientX, e.clientY, delta * scale);
  }

  // Middle-click pan
  function onMouseDown(e) {
    if (e.button === PAN_BUTTON) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartOffsetX = offsetX;
      panStartOffsetY = offsetY;
      canvas.style.cursor = "grabbing";
    }
  }

  function onMouseMove(e) {
    if (!isPanning) return;
    offsetX = panStartOffsetX + (e.clientX - panStartX);
    offsetY = panStartOffsetY + (e.clientY - panStartY);
    emitChange();
  }

  function onMouseUp(e) {
    if (e.button === PAN_BUTTON && isPanning) {
      isPanning = false;
      canvas.style.cursor = "";
      emitChange();
    }
  }

  // Touch: two-finger pan + pinch zoom
  function getTouchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      lastPinchDist = getTouchDist(t1, t2);
      lastTouchMidX = (t1.clientX + t2.clientX) / 2;
      lastTouchMidY = (t1.clientY + t2.clientY) / 2;
      isPanning = true;
      panStartOffsetX = offsetX;
      panStartOffsetY = offsetY;
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = getTouchDist(t1, t2);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      // Pinch zoom
      if (lastPinchDist > 0) {
        const pinchDelta = (dist - lastPinchDist) * 0.005 * scale;
        zoomAt(midX, midY, pinchDelta);
      }

      // Two-finger pan
      offsetX += midX - lastTouchMidX;
      offsetY += midY - lastTouchMidY;

      lastPinchDist = dist;
      lastTouchMidX = midX;
      lastTouchMidY = midY;
      emitChange();
    }
  }

  function onTouchEnd() {
    lastPinchDist = 0;
    isPanning = false;
  }

  // Bind events
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);

  return {
    get scale() { return scale; },
    get offsetX() { return offsetX; },
    get offsetY() { return offsetY; },
    get isPanning() { return isPanning; },

    getTransform() {
      return { scale, offsetX, offsetY };
    },

    /**
     * Convert screen coordinates to world (tile) coordinates.
     */
    screenToWorld(sx, sy, tilePx, gridOffX, gridOffY, dpr) {
      const d = dpr || 1;
      const wx = Math.floor(((sx * d - offsetX * d) - gridOffX) / (tilePx * scale));
      const wy = Math.floor(((sy * d - offsetY * d) - gridOffY) / (tilePx * scale));
      return { wx, wy };
    },

    /**
     * Convert world (tile) coordinates to screen coordinates.
     */
    worldToScreen(wx, wy, tilePx, gridOffX, gridOffY, dpr) {
      const d = dpr || 1;
      const sx = (gridOffX + wx * tilePx * scale + offsetX * d) / d;
      const sy = (gridOffY + wy * tilePx * scale + offsetY * d) / d;
      return { sx, sy };
    },

    zoomIn() {
      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, ZOOM_STEP * scale);
    },

    zoomOut() {
      const rect = canvas.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, -ZOOM_STEP * scale);
    },

    resetView() {
      scale = 1.0;
      offsetX = 0;
      offsetY = 0;
      emitChange();
    },

    setScale(s) {
      scale = clampScale(s);
      emitChange();
    },

    onChange(fn) {
      onChangeCallback = typeof fn === "function" ? fn : null;
    },

    rebind(newCanvas) {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas = newCanvas;
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("mousedown", onMouseDown);
      canvas.addEventListener("touchstart", onTouchStart, { passive: false });
      canvas.addEventListener("touchmove", onTouchMove, { passive: false });
      canvas.addEventListener("touchend", onTouchEnd);
    },

    destroy() {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    },
  };
}
