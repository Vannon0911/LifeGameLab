export function patchClusterRunRequirements(store) {
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        {
          op: "set",
          path: "/sim/patternCatalog",
          value: {
            line: { count: 1, zoneIds: [1], anchors: [1] },
            block: { count: 0, zoneIds: [], anchors: [] },
            loop: { count: 0, zoneIds: [], anchors: [] },
            branch: { count: 0, zoneIds: [], anchors: [] },
            dense_cluster: { count: 0, zoneIds: [], anchors: [] },
          },
        },
        { op: "set", path: "/sim/networkRatio", value: 0.20 },
      ],
    },
  });
  return store.getState();
}
