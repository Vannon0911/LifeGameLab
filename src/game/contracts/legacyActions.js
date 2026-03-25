export const LEGACY_ACTION_MAPPINGS = Object.freeze({
  SET_BRUSH: Object.freeze({
    replacement: "SELECT_ENTITY",
    compatibility: "deprecated",
    reason: "Legacy brush UX is replaced by explicit RTS selection.",
  }),
  PLACE_SPLIT_CLUSTER: Object.freeze({
    replacement: "PLACE_BUILDING",
    compatibility: "rename_path",
    reason: "Legacy split semantics are routed toward direct building placement.",
  }),
  HARVEST_WORKER: Object.freeze({
    replacement: "QUEUE_WORKER",
    compatibility: "rename_path",
    reason: "Legacy harvest command maps to queue-based worker behavior.",
  }),
  SET_ZONE: Object.freeze({
    replacement: "PLACE_BUILDING",
    compatibility: "rename_path",
    reason: "Legacy zone painting path is being replaced by explicit placement flow.",
  }),
});

export const LEGACY_ACTION_REPLACEMENTS = Object.freeze(
  Object.fromEntries(Object.entries(LEGACY_ACTION_MAPPINGS).map(([type, meta]) => [type, meta.replacement])),
);

export const LEGACY_ACTIONS = Object.freeze(Object.keys(LEGACY_ACTION_MAPPINGS));

export function isLegacyActionType(type) {
  return Object.prototype.hasOwnProperty.call(LEGACY_ACTION_REPLACEMENTS, type);
}
