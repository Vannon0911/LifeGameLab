export function reduceLegacyZoneCompat(state, action, deps) {
  switch (action.type) {
    case "TOGGLE_DNA_ZONE_WORKER": {
      if (state.sim.runPhase !== deps.RUN_PHASE.DNA_ZONE_SETUP) return [];
      if (!state.sim.zone2Unlocked || state.sim.dnaZoneCommitted) return [];
      const world = state.world;
      if (!world?.alive || !world?.lineageId || !world?.coreZoneMask) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const idx = y * w + x;
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      const maxBudget = Math.max(0, Number(deps.getWorldPreset(state.meta.worldPresetId)?.phaseC?.dnaPlacementBudget || 0) | 0);
      const budget = Math.max(0, Number(state.sim.zone2PlacementBudget || 0) | 0);
      const dnaZoneMask = world.dnaZoneMask && ArrayBuffer.isView(world.dnaZoneMask)
        ? deps.cloneTypedArray(world.dnaZoneMask)
        : new Uint8Array(w * h);
      if ((Number(dnaZoneMask[idx]) | 0) === 1) {
        dnaZoneMask[idx] = 0;
        return [
          { op: "set", path: "/world/dnaZoneMask", value: dnaZoneMask },
          { op: "set", path: "/sim/zone2PlacementBudget", value: Math.min(maxBudget, budget + 1) },
        ];
      }
      if (budget <= 0) return [];
      if ((Number(world.alive[idx]) | 0) !== 1) return [];
      if ((Number(world.lineageId[idx]) | 0) !== playerLineageId) return [];
      if ((Number(world.coreZoneMask[idx]) | 0) === 1) return [];
      const touchesCore = deps.hasAdjacentMarkedTile(world.coreZoneMask, idx, w, h);
      const touchesPlaced = deps.hasAdjacentMarkedTile(dnaZoneMask, idx, w, h);
      if (!touchesCore && !touchesPlaced) return [];
      dnaZoneMask[idx] = 1;
      return [
        { op: "set", path: "/world/dnaZoneMask", value: dnaZoneMask },
        { op: "set", path: "/sim/zone2PlacementBudget", value: Math.max(0, budget - 1) },
      ];
    }

    case "BUILD_INFRA_PATH": {
      if (state.sim.runPhase !== deps.RUN_PHASE.RUN_ACTIVE) return [];
      if (String(state.sim.infraBuildMode || "") !== "path") return [];
      const world = state.world;
      if (!world?.alive || !world?.lineageId || !world?.link) return [];
      const w = Number(world.w || state.meta.gridW || 0) | 0;
      const h = Number(world.h || state.meta.gridH || 0) | 0;
      const x = Number(action.payload?.x) | 0;
      const y = Number(action.payload?.y) | 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return [];
      const idx = y * w + x;
      const remove = !!action.payload?.remove;
      const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
      const infraCandidateMask = deps.getInfraCandidateMask(world, w * h);
      if ((Number(infraCandidateMask[idx]) | 0) === 1) {
        if (!remove) return [];
        infraCandidateMask[idx] = 0;
        return [{ op: "set", path: "/world/infraCandidateMask", value: infraCandidateMask }];
      }
      if (remove) return [];
      if (!deps.isAlivePlayerOwnedTile(world, idx, playerLineageId)) return [];
      if (Number(world.link[idx] || 0) > 0) return [];
      const touchesAnchor = deps.touchesCommittedInfraAnchor(world, idx, w, h);
      const touchesCandidate = deps.hasAdjacentMarkedTile4(infraCandidateMask, idx, w, h);
      if (!touchesAnchor && !touchesCandidate) return [];
      infraCandidateMask[idx] = 1;
      return [{ op: "set", path: "/world/infraCandidateMask", value: infraCandidateMask }];
    }

    case "PLACE_SPLIT_CLUSTER": {
      if (deps.isPreRunGenesisPhase(state)) return [];
      return deps.handlePlaceSplitCluster(state, action);
    }

    case "HARVEST_WORKER": {
      if (deps.isPreRunGenesisPhase(state)) return [];
      return deps.handleHarvestWorker(state, action);
    }

    case "SET_ZONE": {
      if (deps.isPreRunGenesisPhase(state)) return [];
      return deps.handleSetZone(state, action);
    }

    default:
      return null;
  }
}
