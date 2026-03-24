export function reduceLegacyZoneCompat(state, action, deps) {
  switch (action.type) {
    case "PLACE_SPLIT_CLUSTER": {
      return deps.handlePlaceSplitCluster(state, action);
    }

    case "HARVEST_WORKER": {
      return deps.handleHarvestWorker(state, action);
    }

    case "SET_ZONE": {
      return deps.handleSetZone(state, action);
    }

    default:
      return null;
  }
}
