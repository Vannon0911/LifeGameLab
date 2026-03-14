import {
  BRUSH_MODE,
  GAME_RESULT,
  GOAL_CODE,
  OVERLAY_MODE,
  WIN_MODE,
} from "../game/contracts/ids.js";

export const SCHEMA_VERSION = 2;
export const APP_VERSION    = "2.3.0";   // Major = Schema, Minor = Feature, Patch = Bugfix

export const simGate = {
  limits: {
    maxPatches: 5000,
    maxTiles: 250000,
  },
  world: {
    traitCount: 7,
    keys: {
      w: { type: "number" },
      h: { type: "number" },
      nextLineageId: { type: "number" },
      alive: { type: "ta", ctor: "Uint8Array", len: "N" },
      E: { type: "ta", ctor: "Float32Array", len: "N" },
      L: { type: "ta", ctor: "Float32Array", len: "N" },
      R: { type: "ta", ctor: "Float32Array", len: "N" },
      W: { type: "ta", ctor: "Float32Array", len: "N" },
      Sat: { type: "ta", ctor: "Float32Array", len: "N" },
      baseSat: { type: "ta", ctor: "Float32Array", len: "N" },
      P: { type: "ta", ctor: "Float32Array", len: "N" },
      B: { type: "ta", ctor: "Float32Array", len: "N" },
      plantKind: { type: "ta", ctor: "Int8Array", len: "N" },
      reserve: { type: "ta", ctor: "Float32Array", len: "N" },
      link: { type: "ta", ctor: "Float32Array", len: "N" },
      superId: { type: "ta", ctor: "Int32Array", len: "N" },
      clusterField: { type: "ta", ctor: "Float32Array", len: "N" },
      hue: { type: "ta", ctor: "Float32Array", len: "N" },
      lineageId: { type: "ta", ctor: "Uint32Array", len: "N" },
      trait: { type: "ta", ctor: "Float32Array", len: "N*TRAIT_COUNT" },
      age: { type: "ta", ctor: "Uint16Array", len: "N" },
      born: { type: "ta", ctor: "Uint8Array", len: "N" },
      died: { type: "ta", ctor: "Uint8Array", len: "N" },
      actionMap: { type: "ta", ctor: "Uint8Array", len: "N" },
      balanceGovernor: { type: "object" },
      lastFounderTick: { type: "number" },
      worldAiAudit: { type: "object" },
      globalLearning: { type: "object" },
      devMutationVault: { type: "object" },
      devAiLast: { type: "object" },
      lineageMemory: { type: "object" },
      lineageThreatMemory: { type: "object" },
      lineageDefenseReadiness: { type: "object" },
      clusterAttackState: { type: "object" },
      zoneMap: { type: "ta", ctor: "Int8Array", len: "N" },
    }
  },
  sim: {
    keys: [
      "tick", "running", "aliveCount", "aliveRatio", "meanLAlive", "meanEnergyAlive", "meanReserveAlive",
      "meanNutrientField", "meanToxinField", "meanSaturationField", "meanPlantField", "meanBiochargeField",
      "plantTileRatio", "dominantHueRatio", "lineageDiversity", "evolutionStageMean", "evolutionStageMax",
      "networkRatio", "clusterRatio", "birthsLastStep", "deathsLastStep", "mutationsLastStep",
      "raidEventsLastStep", "infectionsLastStep", "conflictKillsLastStep", "superCellsLastStep",
      "remoteAttacksLastStep", "remoteAttackKillsLastStep", "defenseActivationsLastStep", "resourceStolenLastStep",
      "plantsPrunedLastStep", "nutrientCappedTilesLastStep", "energyClearedTilesLastStep",
      "expansionCount", "lastExpandTick", "expansionWork", "nextExpandCost",
      "playerAliveCount", "cpuAliveCount", "playerEnergyIn", "playerEnergyOut",
      "playerEnergyNet", "playerEnergyStored", "lightShare", "nutrientShare", "seasonPhase",
      "playerDNA", "totalHarvested", "playerStage",
      "energySupremacyTicks", "efficiencyTicks", "lossStreakTicks", "stockpileTicks",
      "cpuEnergyIn", "gameResult", "winMode", "gameEndTick", "goal"
    ]
  }
};

export const stateSchema = {
  type: "object",
  shape: {
    meta: {
      type: "object",
      shape: {
        seed: { type: "string", default: "life-light" },
        gridW: { type: "number", default: 32 },
        gridH: { type: "number", default: 32 },
        speed: { type: "number", default: 4 },
        brushMode: { type: "string", default: BRUSH_MODE.OBSERVE },
        brushRadius: { type: "number", default: 3 },
        renderMode: { type: "string", default: "combined" },
        activeOverlay: { type: "string", default: OVERLAY_MODE.NONE },
        physics: { type: "object", shape: {}, allowUnknown: true },
        ui: {
          type: "object",
          shape: {
            panelOpen: { type: "boolean", default: false },
            activeTab: { type: "string", default: "status" },
            expertMode: { type: "boolean", default: false },
            showBiochargeOverlay: { type: "boolean", default: false },
            showRemoteAttackOverlay: { type: "boolean", default: true },
            showDefenseOverlay: { type: "boolean", default: true },
            offscreenEnabled: { type: "boolean", default: false },
            ariaLevel: { type: "number", default: 1 }
          }
        },
        globalLearning: { type: "object", shape: {}, allowUnknown: true },
        devMutationVault: { type: "object", shape: {}, allowUnknown: true },
        playerLineageId: { type: "number", default: 0 },
        cpuLineageId: { type: "number", default: 0 },
        placementCostEnabled: { type: "boolean", default: false }
      }
    },
    world: { type: "object", shape: {}, allowUnknown: true },
    sim: {
      type: "object",
      shape: {
        tick: { type: "number", default: 0 },
        running: { type: "boolean", default: false },
        aliveCount: { type: "number", default: 0 },
        aliveRatio: { type: "number", default: 0 },
        meanLAlive: { type: "number", default: 0 },
        meanEnergyAlive: { type: "number", default: 0 },
        meanReserveAlive: { type: "number", default: 0 },
        meanNutrientField: { type: "number", default: 0 },
        meanToxinField: { type: "number", default: 0 },
        meanSaturationField: { type: "number", default: 0 },
        meanPlantField: { type: "number", default: 0 },
        meanBiochargeField: { type: "number", default: 0 },
        plantTileRatio: { type: "number", default: 0 },
        dominantHueRatio: { type: "number", default: 0 },
        lineageDiversity: { type: "number", default: 0 },
        evolutionStageMean: { type: "number", default: 1 },
        evolutionStageMax: { type: "number", default: 1 },
        networkRatio: { type: "number", default: 0 },
        clusterRatio: { type: "number", default: 0 },
        birthsLastStep: { type: "number", default: 0 },
        deathsLastStep: { type: "number", default: 0 },
        mutationsLastStep: { type: "number", default: 0 },
        raidEventsLastStep: { type: "number", default: 0 },
        infectionsLastStep: { type: "number", default: 0 },
        conflictKillsLastStep: { type: "number", default: 0 },
        superCellsLastStep: { type: "number", default: 0 },
        remoteAttacksLastStep: { type: "number", default: 0 },
        remoteAttackKillsLastStep: { type: "number", default: 0 },
        defenseActivationsLastStep: { type: "number", default: 0 },
        resourceStolenLastStep: { type: "number", default: 0 },
        plantsPrunedLastStep: { type: "number", default: 0 },
        nutrientCappedTilesLastStep: { type: "number", default: 0 },
        energyClearedTilesLastStep: { type: "number", default: 0 },
        expansionCount: { type: "number", default: 0 },
        lastExpandTick: { type: "number", default: -99999 },
        expansionWork: { type: "number", default: 0 },
        nextExpandCost: { type: "number", default: 120 },
        playerAliveCount: { type: "number", default: 0 },
        cpuAliveCount: { type: "number", default: 0 },
        playerEnergyIn: { type: "number", default: 0 },
        playerEnergyOut: { type: "number", default: 0 },
        playerEnergyNet: { type: "number", default: 0 },
        playerEnergyStored: { type: "number", default: 0 },
        lightShare: { type: "number", default: 0 },
        nutrientShare: { type: "number", default: 0 },
        seasonPhase: { type: "number", default: 0 },
        playerDNA: { type: "number", default: 0 },
        totalHarvested: { type: "number", default: 0 },
        playerStage: { type: "number", default: 1 },
        energySupremacyTicks: { type: "number", default: 0 },
        efficiencyTicks:      { type: "number", default: 0 },
        lossStreakTicks:      { type: "number", default: 0 },
        stockpileTicks:       { type: "number", default: 0 },
        cpuEnergyIn:          { type: "number", default: 0 },
        gameResult:           { type: "string",  default: GAME_RESULT.NONE },
        winMode:              { type: "string",  default: WIN_MODE.SUPREMACY },
        gameEndTick:          { type: "number", default: 0 },
        goal:                 { type: "string", default: GOAL_CODE.HARVEST_SECURE }
      }
    }
  }
};

export const actionSchema = {
  GEN_WORLD: { type: "object", shape: {} },
  TOGGLE_RUNNING: { type: "object", shape: { running: { type: "boolean" } } },
  SIM_STEP: { type: "object", shape: { force: { type: "boolean" } } },
  SET_SPEED: { type: "number" },
  SET_SEED: { type: "string" },
  SET_SIZE: { type: "object", shape: { w: { type: "number" }, h: { type: "number" } } },
  SET_RENDER_MODE: { type: "string" },
  SET_PHYSICS: { type: "object", shape: {}, allowUnknown: true },
  SET_BRUSH: { type: "object", shape: {}, allowUnknown: true },
  SET_UI: { type: "object", shape: {}, allowUnknown: true },
  SET_GLOBAL_LEARNING: { type: "object", shape: {}, allowUnknown: true },
  RESET_GLOBAL_LEARNING: { type: "object", shape: {} },
  PAINT_BRUSH: { type: "object", shape: { x: { type: "number" }, y: { type: "number" }, mode: { type: "string" }, radius: { type: "number" } } },
  PLACE_CELL: { type: "object", shape: { x: { type: "number" }, y: { type: "number" }, remove: { type: "boolean" } } },
  PLACE_SPLIT_CLUSTER: { type: "object", shape: { x: { type: "number" }, y: { type: "number" } } },
  DEV_BALANCE_RUN_AI: { type: "object", shape: {}, allowUnknown: true },
  APPLY_BUFFERED_SIM_STEP: { type: "object", shape: {}, allowUnknown: true },
  HARVEST_CELL: { type: "object", shape: { x: { type: "number" }, y: { type: "number" } } },
  SET_ZONE: { type: "object", shape: { x: { type: "number" }, y: { type: "number" }, radius: { type: "number" }, zoneType: { type: "number" } } },
  BUY_EVOLUTION: { type: "object", shape: { archetypeId: { type: "string" } } },
  SET_PLAYER_DOCTRINE: { type: "object", shape: { doctrineId: { type: "string" } } },
  SET_WIN_MODE:  { type: "object", shape: { winMode: { type: "string" } } },
  SET_OVERLAY:   { type: "string" },
  SET_PLACEMENT_COST: { type: "object", shape: { enabled: { type: "boolean" } } },
  RUN_BENCHMARK: { type: "object", shape: {} },
};

export const mutationMatrix = {
  GEN_WORLD: ["/meta/physics", "/meta/playerLineageId", "/meta/cpuLineageId", "/world/", "/world/actionMap", "/sim/"],
  TOGGLE_RUNNING: ["/sim/running"],
  SIM_STEP: ["/meta/globalLearning", "/meta/gridW", "/meta/gridH", "/world/", "/sim/"],
  SET_SPEED: ["/meta/speed"],
  SET_SEED: ["/meta/seed"],
  SET_SIZE: ["/meta/gridW", "/meta/gridH"],
  SET_RENDER_MODE: ["/meta/renderMode"],
  SET_PHYSICS: ["/meta/physics"],
  SET_BRUSH: ["/meta/brushMode", "/meta/brushRadius"],
  SET_UI: ["/meta/ui"],
  SET_GLOBAL_LEARNING: ["/meta/globalLearning", "/world/globalLearning"],
  RESET_GLOBAL_LEARNING: ["/meta/globalLearning", "/world/globalLearning", "/world/lineageMemory"],
  PAINT_BRUSH: ["/world/L", "/world/R", "/world/W", "/world/Sat"],
  PLACE_CELL: ["/world/alive", "/world/E", "/world/reserve", "/world/link", "/world/lineageId", "/world/hue", "/world/trait", "/world/age", "/world/born", "/world/died", "/world/W", "/sim/playerDNA"],
  PLACE_SPLIT_CLUSTER: ["/world/alive", "/world/E", "/world/reserve", "/world/link", "/world/lineageId", "/world/hue", "/world/trait", "/world/age", "/world/born", "/world/died", "/world/W", "/sim/playerDNA"],
  DEV_BALANCE_RUN_AI: ["/meta/devMutationVault", "/world/devMutationVault", "/world/devAiLast", "/world/lineageMemory", "/world/trait", "/world/hue"],
  APPLY_BUFFERED_SIM_STEP: ["/meta/globalLearning", "/meta/gridW", "/meta/gridH", "/world/", "/sim/"],
  HARVEST_CELL: ["/sim/playerDNA", "/sim/totalHarvested", "/sim/playerStage", "/world/alive", "/world/E"],
  SET_ZONE: ["/world/zoneMap"],
  BUY_EVOLUTION: ["/sim/playerDNA", "/world/trait", "/world/hue", "/world/lineageMemory"],
  SET_PLAYER_DOCTRINE: ["/world/lineageMemory"],
  SET_WIN_MODE:  ["/sim/winMode"],
  SET_OVERLAY:   ["/meta/activeOverlay"],
  SET_PLACEMENT_COST: ["/meta/placementCostEnabled"],
  RUN_BENCHMARK: [],
};

const DISPATCH_SOURCES = Object.freeze({
  GEN_WORLD: ["src/app/main.js", "src/game/ui/ui.js"],
  TOGGLE_RUNNING: ["src/app/main.js", "src/game/ui/ui.js"],
  SIM_STEP: ["src/app/main.js", "src/game/ui/ui.js"],
  SET_SPEED: ["src/game/ui/ui.js"],
  SET_SEED: [],
  SET_SIZE: ["src/app/main.js", "src/game/ui/ui.js"],
  SET_RENDER_MODE: ["src/game/ui/ui.js"],
  SET_PHYSICS: ["src/game/ui/ui.js"],
  SET_BRUSH: ["src/game/ui/ui.js"],
  SET_UI: ["src/app/main.js", "src/game/ui/ui.js"],
  SET_GLOBAL_LEARNING: ["src/game/ui/ui.js"],
  RESET_GLOBAL_LEARNING: ["src/game/ui/ui.js"],
  PAINT_BRUSH: ["src/game/ui/ui.js"],
  PLACE_CELL: ["src/game/ui/ui.js"],
  PLACE_SPLIT_CLUSTER: ["src/game/ui/ui.js"],
  DEV_BALANCE_RUN_AI: ["src/app/main.js"],
  APPLY_BUFFERED_SIM_STEP: ["src/app/main.js"],
  HARVEST_CELL: ["src/game/ui/ui.js"],
  SET_ZONE: ["src/game/ui/ui.js"],
  BUY_EVOLUTION: ["src/game/ui/ui.js"],
  SET_PLAYER_DOCTRINE: ["src/game/ui/ui.js"],
  SET_WIN_MODE: ["src/game/ui/ui.js"],
  SET_OVERLAY: ["src/game/ui/ui.js"],
  SET_PLACEMENT_COST: ["src/game/ui/ui.js"],
  RUN_BENCHMARK: ["src/game/ui/ui.js"],
});


export const dataflow = {
  actions: Object.fromEntries(Object.keys(actionSchema).map((type) => {
    const writes = Array.isArray(mutationMatrix[type]) ? [...mutationMatrix[type]] : [];
    const dispatchSources = Array.isArray(DISPATCH_SOURCES[type]) ? [...DISPATCH_SOURCES[type]] : [];
    return [type, {
      summary: `Action ${type} with manifest-gated writes`,
      contracts: { actionSchema: type, mutationMatrix: type },
      writes,
      dispatchSources,
    }];
  })),
};

export const manifest = {
  SCHEMA_VERSION,
  APP_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow
};
