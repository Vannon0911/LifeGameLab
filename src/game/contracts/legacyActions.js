export const LEGACY_ACTION_REPLACEMENTS = Object.freeze({
  SET_BRUSH: "SELECT_ENTITY",
  PLACE_SPLIT_CLUSTER: "PLACE_BUILDING",
  HARVEST_WORKER: "QUEUE_WORKER",
  SET_ZONE: "PLACE_BUILDING",
});

export const LEGACY_ACTIONS = Object.freeze(Object.keys(LEGACY_ACTION_REPLACEMENTS));

export function isLegacyActionType(type) {
  return Object.prototype.hasOwnProperty.call(LEGACY_ACTION_REPLACEMENTS, type);
}
