function isPlayerAliveTile(state, idx) {
  const playerLineageId = Number(state?.meta?.playerLineageId || 1) | 0;
  return (Number(state?.world?.alive?.[idx] || 0) | 0) === 1
    && (Number(state?.world?.lineageId?.[idx] || 0) | 0) === playerLineageId;
}

export function selectTileInteraction(state, x, y) {
  const gridW = Number(state?.meta?.gridW || 0) | 0;
  const gridH = Number(state?.meta?.gridH || 0) | 0;
  if (x < 0 || y < 0 || x >= gridW || y >= gridH) {
    return {
      valid: false,
      idx: -1,
      isOwnAliveTile: false,
      isResourceTile: false,
    };
  }
  const idx = y * gridW + x;
  return {
    valid: true,
    idx,
    isOwnAliveTile: isPlayerAliveTile(state, idx),
    isResourceTile: Number(state?.world?.R?.[idx] || 0) > 0.05,
  };
}
