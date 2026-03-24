// ============================================================
// Context-Dependent Cursor Icons
// SVG data-URI cursors per active tool/mode.
// ============================================================

function svgCursor(svg, hotX, hotY, fallback) {
  const encoded = encodeURIComponent(svg.trim());
  return `url("data:image/svg+xml,${encoded}") ${hotX} ${hotY}, ${fallback}`;
}

const PAINT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="%237cc2ff" stroke="%23fff" stroke-width="0.5"/>
  <path d="M20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="%235ba8e6" stroke="%23fff" stroke-width="0.5"/>
</svg>`;

const ERASE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="4" y="8" width="16" height="10" rx="2" fill="%23ff7a62" stroke="%23fff" stroke-width="0.5" transform="rotate(-15 12 13)"/>
  <line x1="6" y1="20" x2="18" y2="20" stroke="%23fff" stroke-width="1.5"/>
</svg>`;

const PICK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2L4 14h6v8h4v-8h6L12 2z" fill="%23ffd47a" stroke="%23fff" stroke-width="0.5"/>
</svg>`;

const MOVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2l-4 4h3v4H7V7L3 11l4 4v-3h4v4H8l4 4 4-4h-3v-4h4v3l4-4-4-4v3h-4V6h3l-4-4z" fill="%2389e37f" stroke="%23fff" stroke-width="0.5"/>
</svg>`;

const ZOOM_IN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="10" cy="10" r="7" fill="none" stroke="%237cc2ff" stroke-width="2"/>
  <line x1="15" y1="15" x2="21" y2="21" stroke="%237cc2ff" stroke-width="2"/>
  <line x1="7" y1="10" x2="13" y2="10" stroke="%237cc2ff" stroke-width="1.5"/>
  <line x1="10" y1="7" x2="10" y2="13" stroke="%237cc2ff" stroke-width="1.5"/>
</svg>`;

const RESOURCE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="14" r="6" fill="%233aaa3a" stroke="%23fff" stroke-width="0.5"/>
  <rect x="11" y="6" width="2" height="6" rx="1" fill="%23c49858"/>
  <circle cx="8" cy="8" r="3" fill="%236ec96e" opacity="0.7"/>
  <circle cx="16" cy="9" r="2.5" fill="%236ec96e" opacity="0.6"/>
</svg>`;

const SURFACE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="3" y="3" width="18" height="18" rx="3" fill="%236ec96e" stroke="%23fff" stroke-width="0.5"/>
  <line x1="3" y1="12" x2="21" y2="12" stroke="%23fff" stroke-width="0.3" opacity="0.4"/>
  <line x1="12" y1="3" x2="12" y2="21" stroke="%23fff" stroke-width="0.3" opacity="0.4"/>
</svg>`;

const BRUSH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z" fill="%23ffc46a"/>
  <path d="M20.71 4.63l-1.34-1.34a1 1 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 000-1.41z" fill="%23ffc46a" stroke="%23fff" stroke-width="0.5"/>
</svg>`;

export const CURSOR_ICONS = Object.freeze({
  paint: svgCursor(PAINT_SVG, 2, 22, "crosshair"),
  erase: svgCursor(ERASE_SVG, 12, 12, "not-allowed"),
  pick: svgCursor(PICK_SVG, 12, 2, "pointer"),
  move: svgCursor(MOVE_SVG, 12, 12, "move"),
  zoom: svgCursor(ZOOM_IN_SVG, 10, 10, "zoom-in"),
  resource: svgCursor(RESOURCE_SVG, 12, 12, "crosshair"),
  surface: svgCursor(SURFACE_SVG, 12, 12, "crosshair"),
  brush: svgCursor(BRUSH_SVG, 4, 20, "crosshair"),
  default: "default",
  crosshair: "crosshair",
});

/**
 * Get the appropriate cursor CSS value for the current tool mode.
 * @param {string} toolMode - current builder tool mode
 * @param {boolean} isErasing - whether shift is held (erase override)
 * @param {boolean} isPanning - whether panning is active
 * @returns {string} CSS cursor value
 */
export function getCursorForTool(toolMode, isErasing, isPanning) {
  if (isPanning) return "grabbing";
  if (isErasing) return CURSOR_ICONS.erase;
  switch (toolMode) {
    case "light":
    case "nutrient":
    case "water":
    case "saturation":
      return CURSOR_ICONS.paint;
    case "core":
    case "dna":
    case "infra":
    case "founder":
      return CURSOR_ICONS.pick;
    case "erase":
      return CURSOR_ICONS.erase;
    case "surface_grass":
    case "surface_sand":
    case "surface_water":
    case "surface_rock":
      return CURSOR_ICONS.surface;
    case "resource_seed":
    case "resource_sapling":
    case "resource_tree":
    case "resource_stone":
    case "resource_wood":
    case "resource_quarry":
    case "resource_mined":
    case "resource_processed":
      return CURSOR_ICONS.resource;
    case "brush":
      return CURSOR_ICONS.brush;
    default:
      return CURSOR_ICONS.crosshair;
  }
}

// Backward-compatible alias used by ui.js
export const getCursorStyle = getCursorForTool;
