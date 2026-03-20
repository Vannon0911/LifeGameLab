export function reduceGenesisActions(state, action, deps) {
  switch (action.type) {
    case "CONFIRM_FOUNDATION": {
      if (!deps.canConfirmFoundation(state)) return [];
      return [
        { op: "set", path: "/sim/runPhase", value: deps.RUN_PHASE.GENESIS_ZONE },
        { op: "set", path: "/sim/running", value: false },
      ];
    }

    default:
      return null;
  }
}
