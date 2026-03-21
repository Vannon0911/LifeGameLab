import { reduceLegacyZoneCompat } from "./legacyZoneCompat.js";

export function reduceZoneActions(state, action, deps) {
  return reduceLegacyZoneCompat(state, action, deps);
}
