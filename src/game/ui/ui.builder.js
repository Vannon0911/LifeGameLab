export function buildAppliedMapSpec(state) {
  const mapSpec = state?.map?.spec && typeof state.map.spec === "object" ? state.map.spec : {};
  const presetId = String(mapSpec.presetId || state?.meta?.worldPresetId || "river_delta");
  return {
    name: String(mapSpec.name || ""),
    presetId,
    gridW: Math.max(1, Math.trunc(Number(mapSpec.gridW ?? state?.meta?.gridW ?? 16))),
    gridH: Math.max(1, Math.trunc(Number(mapSpec.gridH ?? state?.meta?.gridH ?? 16))),
    tileSize: Math.max(1, Math.trunc(Number(mapSpec.tileSize ?? 1))),
  };
}
