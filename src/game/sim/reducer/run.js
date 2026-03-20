export function reduceRunActions(state, action, deps) {
  switch (action.type) {
    case "SELECT_ENTITY": {
      const entityKind = String(action.payload?.entityKind || "");
      const entityId = String(action.payload?.entityId || "");
      return [
        { op: "set", path: "/sim/selectedEntity", value: { entityKind, entityId } },
      ];
    }

    case "ISSUE_MOVE": {
      const parsed = deps.parseWorkerEntityId(action.payload?.entityId);
      if (!parsed) return [];
      return deps.buildIssueMovePatches(
        state,
        parsed.fromX,
        parsed.fromY,
        Number(action.payload?.targetX) | 0,
        Number(action.payload?.targetY) | 0,
        "ISSUE_MOVE",
        String(action.payload?.entityId || ""),
      );
    }

    case "ISSUE_ORDER": {
      return deps.buildIssueMovePatches(
        state,
        Number(action.payload?.fromX) | 0,
        Number(action.payload?.fromY) | 0,
        Number(action.payload?.targetX) | 0,
        Number(action.payload?.targetY) | 0,
        "ISSUE_ORDER",
      );
    }

    case "SET_WIN_MODE": {
      const patches = deps.buildSetWinModePatches(state, action);
      if (!patches.length) return [];
      return patches;
    }

    case "SET_OVERLAY": {
      return deps.buildSetOverlayPatches(action);
    }

    default:
      return null;
  }
}
