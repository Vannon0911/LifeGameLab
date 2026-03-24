export const FOG_VISIBLE = "visible";
export const FOG_MEMORY = "memory";
export const FOG_HIDDEN = "hidden";

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

export function getTileFogState(world, idx) {
  const visibility = world?.visibility;
  const explored = world?.explored;
  const hasVisibility = visibility && ArrayBuffer.isView(visibility) && visibility.length > idx;
  const hasExplored = explored && ArrayBuffer.isView(explored) && explored.length > idx;
  if (!hasVisibility && !hasExplored) return FOG_VISIBLE;
  if ((Number(world?.visibility?.[idx] || 0) | 0) === 1) return FOG_VISIBLE;
  if ((Number(world?.explored?.[idx] || 0) | 0) === 1) return FOG_MEMORY;
  return FOG_HIDDEN;
}

export function applyFogToColor(rgb, fogState) {
  const [r, g, b] = rgb;
  if (fogState === FOG_VISIBLE) return rgb;
  if (fogState === FOG_MEMORY) {
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
    return [
      Math.round(clamp(12 + lum * 0.26 + r * 0.12, 0, 255)),
      Math.round(clamp(14 + lum * 0.32 + g * 0.10, 0, 255)),
      Math.round(clamp(18 + lum * 0.38 + b * 0.08, 0, 255)),
    ];
  }
  return [7, 10, 15];
}

