import { reduceLegacyGenesisCompat } from "./legacyGenesisCompat.js";

export function reduceGenesisActions(state, action, deps) {
  return reduceLegacyGenesisCompat(state, action, deps);
}
