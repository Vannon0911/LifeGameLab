import { getBrushTiles } from "../sim/brushShapes.js";
import { selectAreAllTilesFilled, formatSeedDisplay } from "../sim/mapSeedGen.js";

export function selectBuilderBrushTiles(gridW, gridH, x, y, size) {
  return getBrushTiles(x, y, size, gridW, gridH);
}

export function selectCanGenerateMapSeed(state) {
  return selectAreAllTilesFilled(state);
}

export function selectSeedDisplay(seed) {
  return formatSeedDisplay(seed);
}
