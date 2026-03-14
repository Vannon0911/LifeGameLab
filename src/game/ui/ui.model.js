import { GOAL_CODE, deriveRiskCode, normalizeGoalCode } from "../contracts/ids.js";
import { deriveCommandScore } from "../techTree.js";

export function getPlayerMemory(state) {
  const playerLineageId = Number(state?.meta?.playerLineageId || 0);
  return state?.world?.lineageMemory?.[playerLineageId] || null;
}

export function getInfluencePhase(stage, commandScore) {
  if (stage >= 4 && commandScore >= 0.28) return "Kommandieren";
  if (stage >= 2 && commandScore >= 0.12) return "Lenken";
  return "Beobachten";
}

export function getRiskState(sim) {
  const id = deriveRiskCode(sim);
  if (id === "collapse") return { id, label: "Kollaps", chip: "☠ Kollaps", color: "var(--red)" };
  if (id === "critical") return { id, label: "Kritisch", chip: "⚠ Kritisch", color: "var(--red)" };
  if (id === "toxic") return { id, label: "Toxisch", chip: "☣ Toxisch", color: "var(--orange)" };
  if (id === "unstable") return { id, label: "Instabil", chip: "◌ Instabil", color: "var(--gold)" };
  return { id, label: "Stabil", chip: "● Stabil", color: "var(--green)" };
}

export function getGoalState(sim, doctrine) {
  const stage = Number(sim?.playerStage || 1);
  const harvested = Number(sim?.totalHarvested || 0);
  const commandScore = deriveCommandScore(sim);
  const goalCode = normalizeGoalCode(sim?.goal || GOAL_CODE.HARVEST_SECURE);
  const map = {
    [GOAL_CODE.EXTINCT]: { title: "Linie retten", short: "Reset oder neue Welt", detail: "Die aktive Linie ist kollabiert. Starte neu oder sichere zuerst wieder einen tragfähigen Kern." },
    [GOAL_CODE.SURVIVE_ENERGY]: { title: "Energie stabilisieren", short: "Netto wieder positiv", detail: "Reduziere Upkeep, stärke Cluster oder aktiviere defensive Prioritäten." },
    [GOAL_CODE.SURVIVE_TOXIN]: { title: "Toxin-Druck brechen", short: "Detox priorisieren", detail: "Leite die Linie in robuste Bereiche oder nutze Resistenz-/Buffer-Pfade." },
    [GOAL_CODE.EVOLUTION_READY]: { title: "Evolution auslösen", short: "Tech jetzt kaufen", detail: "DNA reicht für den nächsten Durchbruch. Nutze den Ring mit der höchsten Hebelwirkung." },
    [GOAL_CODE.GROWTH]: { title: "Erstes Cluster stabilisieren", short: `Stabilisiere ${Math.max(18, Number(sim?.playerAliveCount || 0) + 8)} Zellen`, detail: "Halte den Kern am Leben, sammle DNA und vermeide negative Energiebilanzen." },
    [GOAL_CODE.EXPANSION]: { title: "Expansion starten", short: doctrine?.label || "Directive", detail: "Die Linie ist stabil genug. Nutze Doctrine, Synergien und Split-Seeds für den nächsten Schub." },
    [GOAL_CODE.HARVEST_SECURE]: { title: `Stage ${Math.min(5, stage + 1)} vorbereiten`, short: `${harvested} DNA-Ernten`, detail: "Ernte gezielt und halte den Cluster kompakt, bis der nächste Entwicklungsschub frei wird." },
  };
  if (map[goalCode]) return map[goalCode];
  if (commandScore < 0.18) {
    return { title: "Clusterstärke aufbauen", short: `${Math.round(commandScore * 100)}/18 Command`, detail: "Verdichte Kerne und Netzwerke, damit neue Techs und Split-Seeds zuverlässig greifen." };
  }
  return { title: doctrine?.label || "Directive", short: doctrine?.label || "Directive", detail: "Die Linie ist stabil genug. Nutze Doctrine, Synergien und Split-Seeds für den nächsten Durchbruch." };
}

export function getStructureState(sim) {
  const clusterRatio = Number(sim?.clusterRatio || 0);
  const networkRatio = Number(sim?.networkRatio || 0);
  if (clusterRatio >= 0.56) return { tier: "Koloniekern", short: "dichte Biomodule", detail: "Mehrere reife Kerne tragen die Linie. Split und Synergien wirken sichtbar." };
  if (clusterRatio >= 0.28 || networkRatio >= 0.22) return { tier: "Biomodul", short: "2x2-Cluster entstehen", detail: "Die Linie verlässt die Einzelzellenphase. Verdichtete 2x2-Strukturen tragen das Wachstum." };
  return { tier: "Einzelzellen", short: "primitive Membranen", detail: "Die Kolonie besteht noch überwiegend aus einzelnen Zellen. Wachstum ist fragil und lokal." };
}

