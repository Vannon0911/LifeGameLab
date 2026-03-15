import {
  BRUSH_MODE,
  GAME_RESULT,
  GOAL_CODE,
  OVERLAY_MODE,
  WIN_MODE,
  WIN_MODE_RESULT_LABEL,
  ZONE_ROLE,
  deriveRiskCode,
  normalizeGoalCode,
} from "../../game/contracts/ids.js";
import {
  DOCTRINE_BY_ID,
  TECH_TREE,
  deriveCommandScore,
  hasRequiredTechs,
  normalizeTechArray,
} from "../../game/techTree.js";

const BOTTLENECK_ORDER = Object.freeze([
  "collapse",
  "energy",
  "toxin",
  "survival_core",
  "command",
  "dna_investment",
  "split_expansion",
  "territory_scaling",
  "win_push",
]);

const BOTTLENECK_PRIORITY = Object.freeze(
  Object.fromEntries(BOTTLENECK_ORDER.map((id, index) => [id, index]))
);

export const ACTION_LABELS = Object.freeze({
  stabilize_energy: "Energie stabilisieren",
  reduce_toxin: "Toxin-Druck senken",
  densify_core: "Kern verdichten",
  earn_dna: "DNA ernten",
  buy_relevant_tech: "Relevanten Tech kaufen",
  place_split_cluster: "Split-Cluster setzen",
  prepare_territory_expand: "Territorium vorbereiten",
  push_win_mode: "Siegpfad pushen",
  wait_and_advance_time: "Beobachten und Zeit vorspulen",
});

export const LEVER_LABELS = Object.freeze({
  none: "Noch kein Hebel offen",
  split_cluster: "Split-Cluster",
  territory_expand: "Territoriums-Ausbau",
  relevant_tech: "Relevanter Tech",
  win_path: "Siegpfad",
});

export const BOTTLENECK_LABELS = Object.freeze({
  collapse: "Kollaps",
  energy: "Energie",
  toxin: "Toxin",
  survival_core: "Kernfragilitaet",
  command: "Command-Gate",
  dna_investment: "DNA-Investition",
  split_expansion: "Split-Ausbau",
  territory_scaling: "Territoriums-Ausbau",
  win_push: "Siegdruck",
});

export const ZONE_LABELS = Object.freeze({
  none: "Keine Zone",
  harvest: "HARVEST",
  buffer: "BUFFER",
  defense: "DEFENSE",
  nexus: "NEXUS",
  quarantine: "QUARANTINE",
});

export const OVERLAY_LABELS = Object.freeze({
  [OVERLAY_MODE.NONE]: "Normal",
  [OVERLAY_MODE.ENERGY]: "Energie",
  [OVERLAY_MODE.TOXIN]: "Toxin",
  [OVERLAY_MODE.NUTRIENT]: "Naehrstoffe",
  [OVERLAY_MODE.TERRITORY]: "Territorium",
  [OVERLAY_MODE.CONFLICT]: "Konflikt",
});

export const WIN_MODE_LABELS = Object.freeze({
  [WIN_MODE.SUPREMACY]: WIN_MODE_RESULT_LABEL[WIN_MODE.SUPREMACY],
  [WIN_MODE.STOCKPILE]: WIN_MODE_RESULT_LABEL[WIN_MODE.STOCKPILE],
  [WIN_MODE.EFFICIENCY]: WIN_MODE_RESULT_LABEL[WIN_MODE.EFFICIENCY],
  [WIN_MODE.EXTINCTION]: WIN_MODE_RESULT_LABEL[WIN_MODE.EXTINCTION],
  [WIN_MODE.ENERGY_COLLAPSE]: WIN_MODE_RESULT_LABEL[WIN_MODE.ENERGY_COLLAPSE],
});

const STRUCTURE_LABELS = Object.freeze({
  single_cells: { tier: "Einzelzellen", short: "primitive Membranen" },
  biomodule_2x2: { tier: "Biomodul", short: "2x2-Cluster entstehen" },
  colony_core: { tier: "Koloniekern", short: "dichte Biomodule" },
});

const DOCTRINE_POLICY = Object.freeze({
  equilibrium: {
    tradeoff: "Ausgleich zwischen Tempo und Stabilitaet.",
    crisisZone: "buffer",
    toxinZone: "buffer",
    coreZone: "nexus",
    territoryZone: "nexus",
    territoryAction: "prepare_territory_expand",
    overlay: OVERLAY_MODE.ENERGY,
    preferredTechs: ["light_harvest", "nutrient_harvest", "cooperative_network"],
  },
  expansion: {
    tradeoff: "Mehr Birth und Income, dafuer weniger Fehlertoleranz.",
    crisisZone: "nexus",
    toxinZone: "quarantine",
    coreZone: "nexus",
    territoryZone: "nexus",
    territoryAction: "prepare_territory_expand",
    overlay: OVERLAY_MODE.TERRITORY,
    preferredTechs: ["cluster_split", "reproductive_spread", "pioneer_explorer", "symbiotic_bloom"],
  },
  conserve: {
    tradeoff: "Weniger Tempo, dafuer mehr Reserve und Stabilitaet.",
    crisisZone: "buffer",
    toxinZone: "buffer",
    coreZone: "buffer",
    territoryZone: "buffer",
    territoryAction: "densify_core",
    overlay: OVERLAY_MODE.ENERGY,
    preferredTechs: ["reserve_buffer", "defensive_shell", "fortress_homeostasis"],
  },
  harvest: {
    tradeoff: "Mehr Ertrag, dafuer weniger Tempo beim Ausbau.",
    crisisZone: "buffer",
    toxinZone: "buffer",
    coreZone: "harvest",
    territoryZone: "harvest",
    territoryAction: "earn_dna",
    overlay: OVERLAY_MODE.NUTRIENT,
    preferredTechs: ["nutrient_harvest", "light_harvest", "reserve_buffer"],
  },
  network: {
    tradeoff: "Mehr Link-Staerke, dafuer weniger lokale Wucht.",
    crisisZone: "buffer",
    toxinZone: "buffer",
    coreZone: "nexus",
    territoryZone: "nexus",
    territoryAction: "densify_core",
    overlay: OVERLAY_MODE.TERRITORY,
    preferredTechs: ["cooperative_network", "hybrid_mixer", "cluster_split"],
  },
  detox: {
    tradeoff: "Sicherer unter Toxin, dafuer langsameres Wachstum.",
    crisisZone: "buffer",
    toxinZone: "quarantine",
    coreZone: "buffer",
    territoryZone: "quarantine",
    territoryAction: "densify_core",
    overlay: OVERLAY_MODE.TOXIN,
    preferredTechs: ["toxin_resist", "scavenger_loop", "defensive_shell"],
  },
  fortress: {
    tradeoff: "Maximale Haltbarkeit, dafuer schwaechere Skalierung.",
    crisisZone: "defense",
    toxinZone: "defense",
    coreZone: "defense",
    territoryZone: "defense",
    territoryAction: "densify_core",
    overlay: OVERLAY_MODE.CONFLICT,
    preferredTechs: ["defensive_shell", "fortress_homeostasis", "reserve_buffer"],
  },
});

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function getPlayerMemory(state) {
  const playerLineageId = Number(state?.meta?.playerLineageId || 0);
  return state?.world?.lineageMemory?.[playerLineageId] || {};
}

function getDoctrinePolicy(doctrineId) {
  return DOCTRINE_POLICY[doctrineId] || DOCTRINE_POLICY.equilibrium;
}

function toClass(severity, hardCritical = false) {
  if (hardCritical || severity >= 0.8) return "critical";
  if (severity >= 0.55) return "active";
  if (severity >= 0.25) return "latent";
  return "inactive";
}

function buildReasonCodes(entries) {
  return entries
    .filter((entry) => clamp01(entry.score) >= 0.25)
    .sort((a, b) => (clamp01(b.score) - clamp01(a.score)) || a.code.localeCompare(b.code))
    .map((entry) => entry.code);
}

function buildBottleneck(id, group, entries, options = {}) {
  const hardZero = !!options.hardZero;
  const hardCritical = !!options.hardCritical;
  const severity = hardZero
    ? 0
    : (hardCritical ? 1 : entries.reduce((max, entry) => Math.max(max, clamp01(entry.score)), 0));
  return {
    id,
    group,
    severity,
    class: toClass(severity, hardCritical),
    reasonCodes: hardZero ? [] : buildReasonCodes(entries),
  };
}

function getStructureId(sim) {
  const clusterRatio = Number(sim?.clusterRatio || 0);
  const networkRatio = Number(sim?.networkRatio || 0);
  if (clusterRatio >= 0.56) return "colony_core";
  if (clusterRatio >= 0.28 || networkRatio >= 0.22) return "biomodule_2x2";
  return "single_cells";
}

function getStructureLabel(structureId) {
  return STRUCTURE_LABELS[structureId] || STRUCTURE_LABELS.single_cells;
}

function getStageTargets(playerStage) {
  if (playerStage <= 1) return { alive: 5, cluster: 0, network: 0 };
  if (playerStage === 2) return { alive: 12, cluster: 0.28, network: 0.12 };
  return { alive: 18, cluster: 0.56, network: 0.22 };
}

function getZoneCoverage(state, zoneId) {
  const world = state?.world;
  const playerLineageId = Number(state?.meta?.playerLineageId || 0);
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  const zoneMap = world?.zoneMap;
  if (!alive || !lineageId || !zoneMap || !playerLineageId) return 0;
  let total = 0;
  let covered = 0;
  for (let i = 0; i < alive.length; i++) {
    if (alive[i] !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== playerLineageId) continue;
    total++;
    if ((Number(zoneMap[i]) | 0) === zoneId) covered++;
  }
  return total > 0 ? covered / total : 0;
}

function buildCanonicalZoneSummary(state) {
  const world = state?.world;
  const zoneRole = world?.zoneRole;
  if (!zoneRole || !ArrayBuffer.isView(zoneRole)) {
    return { coreTiles: 0, dnaTiles: 0, infraTiles: 0, zoneCount: 0 };
  }
  let coreTiles = 0;
  let dnaTiles = 0;
  let infraTiles = 0;
  for (let i = 0; i < zoneRole.length; i++) {
    const roleId = Number(zoneRole[i]) | 0;
    if (roleId === ZONE_ROLE.CORE) coreTiles++;
    else if (roleId === ZONE_ROLE.DNA) dnaTiles++;
    else if (roleId === ZONE_ROLE.INFRA) infraTiles++;
  }
  const zoneCount = Object.keys(world?.zoneMeta || {}).length;
  return { coreTiles, dnaTiles, infraTiles, zoneCount };
}

function buildPatternSummary(sim) {
  const patternCatalog = sim?.patternCatalog || {};
  const patternBonuses = sim?.patternBonuses || {};
  return {
    line: Number(patternCatalog?.line?.count || 0),
    block: Number(patternCatalog?.block?.count || 0),
    loop: Number(patternCatalog?.loop?.count || 0),
    branch: Number(patternCatalog?.branch?.count || 0),
    denseCluster: Number(patternCatalog?.dense_cluster?.count || 0),
    bonuses: {
      energy: Number(patternBonuses?.energy || 0),
      dna: Number(patternBonuses?.dna || 0),
      stability: Number(patternBonuses?.stability || 0),
      vision: Number(patternBonuses?.vision || 0),
      defense: Number(patternBonuses?.defense || 0),
      transport: Number(patternBonuses?.transport || 0),
    },
  };
}

function findSplitOrigin(world, ignoreQuarantine = false) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const alive = world?.alive;
  const zoneMap = world?.zoneMap;
  if (!alive || w < 4 || h < 4) return null;
  for (let y = 0; y <= h - 4; y++) {
    for (let x = 0; x <= w - 4; x++) {
      let clear = true;
      for (let yy = y; yy < y + 4 && clear; yy++) {
        for (let xx = x; xx < x + 4; xx++) {
          const idx = yy * w + xx;
          if (alive[idx] === 1) {
            clear = false;
            break;
          }
          if (!ignoreQuarantine && zoneMap && (zoneMap[idx] | 0) === 5) {
            clear = false;
            break;
          }
        }
      }
      if (clear) return { x, y };
    }
  }
  return null;
}

function analyzeSplit(state, commandScore) {
  const sim = state?.sim || {};
  const meta = state?.meta || {};
  const memory = getPlayerMemory(state);
  const unlockedTechs = new Set(normalizeTechArray(memory.techs));
  const splitUnlock = Number(memory.splitUnlock || 0) >= 1 || unlockedTechs.has("cluster_split");
  const splitReq = 0.14;
  const commandReady = commandScore + 1e-9 >= splitReq;
  const rawSpace = findSplitOrigin(state?.world, true);
  const validSpace = findSplitOrigin(state?.world, false);
  const cost = meta.placementCostEnabled ? 8 : 0;
  const enoughDNA = Number(sim.playerDNA || 0) + 1e-9 >= cost;
  return {
    splitUnlock,
    commandReady,
    enoughDNA,
    cost,
    commandGap: Math.max(0, splitReq - commandScore),
    rawSpace,
    validSpace,
    blockedByQuarantine: !validSpace && !!rawSpace,
    blockedBySpace: !rawSpace,
    ready: splitUnlock && commandReady && enoughDNA && !!validSpace,
  };
}

function scoreTechCandidate(tech, winMode, doctrinePolicy) {
  let score = 1;
  if (Array.isArray(doctrinePolicy.preferredTechs) && doctrinePolicy.preferredTechs.includes(tech.id)) score += 4;
  if (winMode === WIN_MODE.SUPREMACY && (tech.lane === "growth" || tech.lane === "cluster")) score += 2;
  if (winMode === WIN_MODE.STOCKPILE && (tech.lane === "cluster" || tech.lane === "survival")) score += 2;
  if (winMode === WIN_MODE.EFFICIENCY && (tech.lane === "metabolism" || tech.lane === "survival")) score += 2;
  if (tech.id === "cluster_split") score += 1.5;
  return score;
}

function pickTechTargets(state, commandScore, doctrinePolicy) {
  const sim = state?.sim || {};
  const playerStage = Number(sim.playerStage || 1);
  const memory = getPlayerMemory(state);
  const unlocked = new Set(normalizeTechArray(memory.techs));
  const winMode = String(sim.winMode || WIN_MODE.SUPREMACY);
  const scored = [];
  for (const tech of TECH_TREE) {
    if (unlocked.has(tech.id)) continue;
    if (Number(tech.stage || 1) > playerStage) continue;
    if (!hasRequiredTechs(unlocked, tech.requires)) continue;
    scored.push({
      tech,
      score: scoreTechCandidate(tech, winMode, doctrinePolicy),
    });
  }
  scored.sort((a, b) => (b.score - a.score) || a.tech.id.localeCompare(b.tech.id));
  const buyCandidate = scored.find((entry) => commandScore + 1e-9 >= Number(entry.tech.commandReq || 0)) || null;
  const commandCandidate = scored.find((entry) => commandScore + 1e-9 < Number(entry.tech.commandReq || 0)) || null;
  return { buyCandidate, commandCandidate };
}

function buildWinProgress(state, crisisActive) {
  const sim = state?.sim || {};
  const mode = String(sim.winMode || WIN_MODE.SUPREMACY);
  const playerStage = Number(sim.playerStage || 1);
  const playerAlive = Number(sim.playerAliveCount || 0);
  const cpuAlive = Number(sim.cpuAliveCount || 0);
  const playerEnergyIn = Number(sim.playerEnergyIn || 0);
  const cpuEnergyIn = Number(sim.cpuEnergyIn || 0);
  const efficiencyRatio = playerAlive > 0 ? playerEnergyIn / Math.max(1, playerAlive) : 0;
  let progress = 0;
  let target = 1;
  let blockerCode = "none";
  let blockerDetail = "Run beobachtet noch den Aufbau.";

  if (mode === WIN_MODE.SUPREMACY) {
    progress = Number(sim.energySupremacyTicks || 0);
    target = 200;
    if (crisisActive) {
      blockerCode = "crisis_active";
      blockerDetail = "Krisenengpass blockiert den Siegpfad.";
    } else if (playerStage < 2) {
      blockerCode = "stage_not_ready";
      blockerDetail = "Suprematie wird erst mit Stage 2 ernsthaft pushbar.";
    } else if (playerEnergyIn <= cpuEnergyIn * 1.5) {
      blockerCode = "energy_advantage_missing";
      blockerDetail = "Der Energiezufluss liegt noch nicht stabil ueber der CPU.";
    } else {
      blockerCode = "maintain_advantage";
      blockerDetail = "Vorsprung halten, bis der Zaehler voll ist.";
    }
  } else if (mode === WIN_MODE.STOCKPILE) {
    progress = Number(sim.stockpileTicks || 0);
    target = 200;
    const requiredPop = Math.max(30, cpuAlive * 1.5);
    if (crisisActive) {
      blockerCode = "crisis_active";
      blockerDetail = "Krisenengpass blockiert den Siegpfad.";
    } else if (playerStage < 3) {
      blockerCode = "stage_not_ready";
      blockerDetail = "Territoriums-Dominanz braucht erst eine reife Midgame-Struktur.";
    } else if (playerAlive <= requiredPop) {
      blockerCode = "population_advantage_missing";
      blockerDetail = "Es fehlt noch der noetige Populationsvorsprung.";
    } else {
      blockerCode = "maintain_population_lead";
      blockerDetail = "Vorsprung halten, bis der Territoriumszaehler voll ist.";
    }
  } else if (mode === WIN_MODE.EFFICIENCY) {
    progress = Number(sim.efficiencyTicks || 0);
    target = 100;
    if (crisisActive) {
      blockerCode = "crisis_active";
      blockerDetail = "Krisenengpass blockiert den Siegpfad.";
    } else if (playerStage < 4) {
      blockerCode = "stage_not_ready";
      blockerDetail = "Effizienz laesst sich erst mit Stage 4 sauber pushen.";
    } else if (playerAlive <= 20) {
      blockerCode = "population_floor_missing";
      blockerDetail = "Es fehlen genug stabile Zellen fuer einen Effizienz-Run.";
    } else if (efficiencyRatio <= 0.18) {
      blockerCode = "efficiency_threshold_missing";
      blockerDetail = "Pro Zelle kommt noch zu wenig Energie herein.";
    } else {
      blockerCode = "maintain_efficiency";
      blockerDetail = "Die Quote passt, jetzt Effizienz halten.";
    }
  }

  if (String(sim.gameResult || GAME_RESULT.NONE) !== GAME_RESULT.NONE) {
    blockerCode = "resolved";
    blockerDetail = "Der Run ist bereits entschieden.";
  }

  return {
    mode,
    progress,
    target,
    blockerCode,
    blockerDetail,
  };
}

function selectPrimary(bottlenecks) {
  const sorted = [...bottlenecks].sort((a, b) => {
    const classDelta = classRank(b.class) - classRank(a.class);
    if (classDelta) return classDelta;
    if (Math.abs(b.severity - a.severity) >= 0.10) return b.severity - a.severity;
    const priorityDelta = BOTTLENECK_PRIORITY[a.id] - BOTTLENECK_PRIORITY[b.id];
    if (priorityDelta) return priorityDelta;
    return a.id.localeCompare(b.id);
  });
  return sorted[0] || null;
}

function selectSecondary(bottlenecks, primary) {
  if (!primary) return null;
  const candidates = bottlenecks.filter((entry) => {
    if (entry.id === primary.id) return false;
    if (entry.class === "inactive") return false;
    if (entry.group === primary.group) return false;
    return (primary.severity - entry.severity) <= 0.20;
  });
  if (!candidates.length) return null;
  return selectPrimary(candidates);
}

function classRank(value) {
  if (value === "critical") return 4;
  if (value === "active") return 3;
  if (value === "latent") return 2;
  return 1;
}

function zoneToOverlay(zoneId) {
  if (zoneId === "harvest") return OVERLAY_MODE.NUTRIENT;
  if (zoneId === "quarantine") return OVERLAY_MODE.TOXIN;
  if (zoneId === "defense") return OVERLAY_MODE.CONFLICT;
  if (zoneId === "nexus") return OVERLAY_MODE.TERRITORY;
  if (zoneId === "buffer") return OVERLAY_MODE.ENERGY;
  return OVERLAY_MODE.NONE;
}

function getZoneRecommendation(primary, doctrinePolicy, state) {
  if (!primary || primary.class === "inactive") return "none";
  if (primary.id === "energy" || primary.id === "collapse") {
    return getZoneCoverage(state, 2) >= 0.35 ? "none" : doctrinePolicy.crisisZone;
  }
  if (primary.id === "toxin") {
    return getZoneCoverage(state, 5) >= 0.22 ? "none" : doctrinePolicy.toxinZone;
  }
  if (primary.id === "survival_core" || primary.id === "command") {
    return getZoneCoverage(state, 4) >= 0.30 ? "none" : doctrinePolicy.coreZone;
  }
  if (primary.id === "dna_investment" && primary.reasonCodes.includes("dna_shortfall")) {
    return getZoneCoverage(state, 1) >= 0.35 ? "none" : "harvest";
  }
  if (primary.id === "territory_scaling" && primary.class !== "inactive") {
    return getZoneCoverage(state, 4) >= 0.30 ? "none" : doctrinePolicy.territoryZone;
  }
  return "none";
}

function getOverlayRecommendation(primary, doctrinePolicy, zoneRecommendation, techTargets, winProgress) {
  if (!primary || primary.class === "inactive") return OVERLAY_MODE.NONE;
  if (primary.id === "energy" || primary.id === "collapse") return OVERLAY_MODE.ENERGY;
  if (primary.id === "toxin") return OVERLAY_MODE.TOXIN;
  if (primary.id === "survival_core" || primary.id === "command" || primary.id === "split_expansion" || primary.id === "territory_scaling") {
    return OVERLAY_MODE.TERRITORY;
  }
  if (primary.id === "dna_investment") {
    if (techTargets.buyCandidate) return OVERLAY_MODE.NONE;
    return OVERLAY_MODE.NUTRIENT;
  }
  if (primary.id === "win_push") {
    if (winProgress.mode === WIN_MODE.SUPREMACY) return OVERLAY_MODE.ENERGY;
    if (winProgress.mode === WIN_MODE.STOCKPILE) return OVERLAY_MODE.TERRITORY;
    if (winProgress.mode === WIN_MODE.EFFICIENCY) return OVERLAY_MODE.NUTRIENT;
  }
  return zoneToOverlay(zoneRecommendation) || doctrinePolicy.overlay || OVERLAY_MODE.NONE;
}

function getNextLever(primary, splitState, territoryScaling, techTargets, winProgress) {
  if (!primary || primary.class === "inactive") return "none";
  if (primary.id === "split_expansion") return "split_cluster";
  if (primary.id === "territory_scaling") return "territory_expand";
  if (primary.id === "win_push") return "win_path";
  if (techTargets.buyCandidate || techTargets.commandCandidate) return "relevant_tech";
  if (splitState.splitUnlock) return "split_cluster";
  if (territoryScaling.class !== "inactive") return "territory_expand";
  return "none";
}

function getNextAction(primary, doctrinePolicy, context) {
  const {
    techTargets,
    splitState,
    territoryScaling,
    crisisActive,
    winProgress,
  } = context;

  if (!primary || primary.class === "inactive") return "wait_and_advance_time";
  if (primary.id === "collapse" || primary.id === "energy") return "stabilize_energy";
  if (primary.id === "toxin") return "reduce_toxin";
  if (primary.id === "survival_core" || primary.id === "command") return "densify_core";
  if (primary.id === "dna_investment") {
    return techTargets.buyCandidate ? "buy_relevant_tech" : "earn_dna";
  }
  if (primary.id === "split_expansion") return splitState.ready ? "place_split_cluster" : "densify_core";
  if (primary.id === "territory_scaling") {
    if (doctrinePolicy.territoryAction === "densify_core") return "densify_core";
    return territoryScaling.severity >= 0.55 ? "prepare_territory_expand" : "wait_and_advance_time";
  }
  if (primary.id === "win_push") return crisisActive ? "wait_and_advance_time" : "push_win_mode";
  if (!crisisActive && winProgress.blockerCode === "none") return "wait_and_advance_time";
  return "wait_and_advance_time";
}

function buildGoalCode(state, techTargets, splitState, territoryScaling) {
  const sim = state?.sim || {};
  const rawGoal = normalizeGoalCode(sim.goal || GOAL_CODE.HARVEST_SECURE);
  if (rawGoal === GOAL_CODE.EVOLUTION_READY && !techTargets.buyCandidate) return GOAL_CODE.HARVEST_SECURE;
  if (rawGoal === GOAL_CODE.EXPANSION && !splitState.ready && territoryScaling.class === "inactive") return GOAL_CODE.GROWTH;
  return rawGoal;
}

export function buildAdvisorModel(state, options = {}) {
  const safeState = state && typeof state === "object" ? state : {};
  const sim = safeState.sim || {};
  const meta = safeState.meta || {};
  const memory = getPlayerMemory(safeState);
  const doctrineId = DOCTRINE_BY_ID[String(memory.doctrine || "equilibrium")] ? String(memory.doctrine || "equilibrium") : "equilibrium";
  const doctrinePolicy = getDoctrinePolicy(doctrineId);
  const commandScore = deriveCommandScore(sim);
  const splitState = analyzeSplit(safeState, commandScore);
  const techTargets = pickTechTargets(safeState, commandScore, doctrinePolicy);
  const structureId = getStructureId(sim);
  const riskId = deriveRiskCode(sim || {});
  const playerAlive = Number(sim.playerAliveCount || 0);
  const clusterRatio = Number(sim.clusterRatio || 0);
  const networkRatio = Number(sim.networkRatio || 0);
  const playerStage = Number(sim.playerStage || 1);
  const stageTargets = getStageTargets(playerStage);
  const expansionRatio = Number(sim.nextExpandCost || 0) > 0 ? Number(sim.expansionWork || 0) / Math.max(1, Number(sim.nextExpandCost || 1)) : 0;
  const aliveRatio = Number(sim.aliveRatio || 0);
  const edgePressure = clamp01(Math.max(0, aliveRatio - 0.58) / 0.16);

  const collapse = buildBottleneck(
    "collapse",
    "crisis",
    [
      { code: "population_zero", score: playerAlive === 0 && Number(sim.tick || 0) > 20 ? 1 : clamp01((4 - playerAlive) / 4) },
      { code: "loss_streak_maxed", score: clamp01(Number(sim.lossStreakTicks || 0) / 150) },
      { code: "run_resolved_loss", score: String(sim.gameResult || GAME_RESULT.NONE) === GAME_RESULT.LOSS ? 1 : 0 },
    ],
    {
      hardCritical:
        (playerAlive === 0 && Number(sim.tick || 0) > 20) ||
        Number(sim.lossStreakTicks || 0) >= 150 ||
        String(sim.gameResult || GAME_RESULT.NONE) === GAME_RESULT.LOSS,
    }
  );

  const energy = buildBottleneck(
    "energy",
    "crisis",
    [
      { code: "energy_negative", score: clamp01(-Number(sim.playerEnergyNet || 0) / 5) },
      { code: "reserve_low", score: clamp01((0.08 - Number(sim.meanReserveAlive || 0)) / 0.08) },
      { code: "loss_streak_rising", score: clamp01(Number(sim.lossStreakTicks || 0) / 90) },
    ],
    {
      hardZero:
        Number(sim.playerEnergyNet || 0) >= 0 &&
        Number(sim.meanReserveAlive || 0) >= 0.08 &&
        Number(sim.lossStreakTicks || 0) === 0,
      hardCritical:
        Number(sim.playerEnergyNet || 0) < -5 ||
        Number(sim.lossStreakTicks || 0) >= 90,
    }
  );

  const toxinValue = Number(sim.meanToxinField || 0);
  const toxin = buildBottleneck(
    "toxin",
    "crisis",
    [
      { code: "toxin_pressure", score: clamp01((toxinValue - 0.18) / (0.45 - 0.18)) },
    ],
    {
      hardZero: toxinValue < 0.18,
      hardCritical: toxinValue >= 0.45,
    }
  );

  const survivalCore = buildBottleneck("survival_core", "structure", [
    { code: "player_population_low", score: clamp01((stageTargets.alive - playerAlive) / Math.max(1, stageTargets.alive)) },
    { code: "cluster_ratio_low", score: stageTargets.cluster > 0 ? clamp01((stageTargets.cluster - clusterRatio) / stageTargets.cluster) : 0 },
    { code: "network_ratio_low", score: stageTargets.network > 0 ? clamp01((stageTargets.network - networkRatio) / stageTargets.network) : 0 },
  ]);

  const requiredCommand = techTargets.commandCandidate ? Number(techTargets.commandCandidate.tech.commandReq || 0) : 0;
  const command = buildBottleneck(
    "command",
    "progression",
    [
      {
        code: "command_gate_blocked",
        score: requiredCommand > 0 ? clamp01((requiredCommand - commandScore) / Math.max(0.001, requiredCommand)) : 0,
      },
    ],
    {
      hardZero: !techTargets.commandCandidate,
    }
  );

  const buyCost = techTargets.buyCandidate ? 5 * Math.max(1, Number(techTargets.buyCandidate.tech.stage || playerStage || 1)) : 0;
  const buyShortfall = Math.max(0, buyCost - Number(sim.playerDNA || 0));
  const dnaInvestment = buildBottleneck(
    "dna_investment",
    "progression",
    [
      { code: "dna_ready_now", score: techTargets.buyCandidate && buyShortfall <= 0 ? 0.70 : 0 },
      {
        code: "dna_shortfall",
        score: techTargets.buyCandidate && buyShortfall > 0 && buyShortfall / Math.max(1, buyCost) <= 0.40
          ? clamp01(Number(sim.playerDNA || 0) / Math.max(1, buyCost))
          : 0,
      },
    ],
    {
      hardZero: !techTargets.buyCandidate,
    }
  );

  const splitGapScore = splitState.commandReady
    ? 0
    : clamp01((0.14 - commandScore) / 0.14);
  const splitDNAScore = splitState.cost > 0
    ? clamp01((splitState.cost - Number(sim.playerDNA || 0)) / Math.max(1, splitState.cost))
    : 0;
  const splitBlockers = Number(!splitState.commandReady) + Number(!splitState.enoughDNA) + Number(!splitState.validSpace);
  const splitExpansion = buildBottleneck(
    "split_expansion",
    "expansion",
    [
      { code: "split_ready", score: splitState.ready ? 0.86 : 0 },
      { code: "split_command_low", score: splitState.splitUnlock && !splitState.commandReady ? splitGapScore : 0 },
      { code: "split_dna_low", score: splitState.splitUnlock && splitState.commandReady && !splitState.enoughDNA && splitDNAScore <= 0.35 ? 0.42 : 0 },
      { code: "split_space_blocked", score: splitState.splitUnlock && splitState.commandReady && splitState.enoughDNA && splitState.blockedBySpace ? 0.34 : 0 },
      { code: "split_quarantine_blocked", score: splitState.splitUnlock && splitState.commandReady && splitState.enoughDNA && splitState.blockedByQuarantine ? 0.44 : 0 },
    ],
    {
      hardZero: !splitState.splitUnlock || splitBlockers > 1,
    }
  );

  const territoryScaling = buildBottleneck(
    "territory_scaling",
    "expansion",
    [
      { code: "expansion_work_ready", score: clamp01(expansionRatio) },
      { code: "alive_ratio_high", score: clamp01((aliveRatio - 0.58) / 0.16) },
      { code: "edge_pressure_high", score: edgePressure },
    ],
    {
      hardZero: expansionRatio < 0.25 && aliveRatio < 0.58 && edgePressure < 0.03,
    }
  );

  const provisionalWinProgress = buildWinProgress(safeState, false);
  const crisisActive = [collapse, energy, toxin, survivalCore].some((entry) => entry.class === "active" || entry.class === "critical");
  const winProgress = buildWinProgress(safeState, crisisActive);
  const winPushBase = Number(winProgress.target || 1) > 0 ? Number(winProgress.progress || 0) / Math.max(1, Number(winProgress.target || 1)) : 0;
  const winPush = buildBottleneck(
    "win_push",
    "win",
    [
      { code: "win_progress_live", score: clamp01(winPushBase) },
      { code: winProgress.blockerCode, score: winProgress.blockerCode === "none" || winProgress.blockerCode === "resolved" ? 0 : 0.30 },
    ],
    {
      hardZero: crisisActive,
    }
  );

  const bottlenecks = [
    collapse,
    energy,
    toxin,
    survivalCore,
    command,
    dnaInvestment,
    splitExpansion,
    territoryScaling,
    winPush,
  ];

  const primary = selectPrimary(bottlenecks);
  const secondary = selectSecondary(bottlenecks, primary);
  const nextLever = getNextLever(primary, splitState, territoryScaling, techTargets, winProgress);
  const nextAction = getNextAction(primary, doctrinePolicy, {
    techTargets,
    splitState,
    territoryScaling,
    crisisActive,
    winProgress,
  });
  const recommendedZone = getZoneRecommendation(primary, doctrinePolicy, safeState);
  const recommendedOverlay = getOverlayRecommendation(primary, doctrinePolicy, recommendedZone, techTargets, winProgress);
  const goal = buildGoalCode(safeState, techTargets, splitState, territoryScaling);
  const tool = String(meta.brushMode || BRUSH_MODE.OBSERVE);
  const techs = normalizeTechArray(memory.techs);
  const synergies = normalizeTechArray(memory.synergies);
  const zoneSummary = buildCanonicalZoneSummary(safeState);
  const patternSummary = buildPatternSummary(sim);

  const out = {
    tick: Number(sim.tick || 0),
    running: !!sim.running,
    tool,
    stage: playerStage,
    dna: Number(sim.playerDNA || 0),
    playerAlive,
    cpuAlive: Number(sim.cpuAliveCount || 0),
    energyNet: Number(sim.playerEnergyNet || 0),
    clusterRatio,
    networkRatio,
    techs,
    synergies,
    runIdentity: {
      winMode: String(sim.winMode || WIN_MODE.SUPREMACY),
      doctrine: doctrineId,
      doctrineTradeoff: doctrinePolicy.tradeoff,
    },
    status: {
      risk: riskId,
      goal,
      structure: structureId,
      commandScore,
      splitReady: splitState.ready,
      expansionWork: Number(sim.expansionWork || 0),
      nextExpandCost: Number(sim.nextExpandCost || 0),
      zoneSummary,
      patternSummary,
    },
    advisor: {
      bottleneckPrimary: primary?.id || "none",
      bottleneckSecondary: secondary?.id,
      reasonCodes: primary?.reasonCodes || [],
      nextAction,
      nextLever,
      recommendedZone,
      recommendedOverlay,
    },
    winProgress,
    benchmark: options.benchmark || null,
    risk: riskId,
    mission: goal,
    structure: structureId,
    doctrine: doctrineId,
  };

  if (options.includeDebug) {
    out.debug = {
      bottlenecks: Object.fromEntries(
        bottlenecks.map((entry) => [entry.id, entry])
      ),
      splitState: {
        splitUnlock: splitState.splitUnlock,
        commandReady: splitState.commandReady,
        enoughDNA: splitState.enoughDNA,
        blockedByQuarantine: splitState.blockedByQuarantine,
        blockedBySpace: splitState.blockedBySpace,
        ready: splitState.ready,
      },
      relevantTech: {
        buyCandidate: techTargets.buyCandidate?.tech?.id || null,
        commandCandidate: techTargets.commandCandidate?.tech?.id || null,
      },
      structureLabel: getStructureLabel(structureId),
    };
  }

  return out;
}

export function buildAdvisorDebugModel(state, benchmark = null) {
  return buildAdvisorModel(state, { benchmark, includeDebug: true });
}
