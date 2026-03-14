import {
  ACTION_LABELS,
  BOTTLENECK_LABELS,
  LEVER_LABELS,
  OVERLAY_LABELS,
  WIN_MODE_LABELS,
  ZONE_LABELS,
} from "../../project/llm/advisorModel.js";

export function getPlayerMemory(state) {
  const playerLineageId = Number(state?.meta?.playerLineageId || 0);
  return state?.world?.lineageMemory?.[playerLineageId] || null;
}

export function getInfluencePhase(stage, commandScore, runPhase = "") {
  if (String(runPhase || "") === "genesis_setup") return "Gruenden";
  if (String(runPhase || "") === "genesis_zone") return "Energiekern";
  if (stage >= 4 && commandScore >= 0.28) return "Kommandieren";
  if (stage >= 2 && commandScore >= 0.12) return "Lenken";
  return "Beobachten";
}

export function getRiskState(riskId) {
  if (riskId === "collapse") return { id: riskId, label: "Kollaps", chip: "☠ Kollaps", color: "var(--red)" };
  if (riskId === "critical") return { id: riskId, label: "Kritisch", chip: "⚠ Kritisch", color: "var(--red)" };
  if (riskId === "toxic") return { id: riskId, label: "Toxisch", chip: "☣ Toxisch", color: "var(--orange)" };
  if (riskId === "unstable") return { id: riskId, label: "Instabil", chip: "◌ Instabil", color: "var(--gold)" };
  return { id: riskId, label: "Stabil", chip: "● Stabil", color: "var(--green)" };
}

export function getGoalState(advisorModel) {
  const goalCode = String(advisorModel?.status?.goal || "harvest_secure");
  const nextAction = String(advisorModel?.advisor?.nextAction || "wait_and_advance_time");
  const primary = String(advisorModel?.advisor?.bottleneckPrimary || "none");
  const doctrine = String(advisorModel?.runIdentity?.doctrine || "equilibrium");
  const map = {
    extinct: { title: "Linie retten", short: "Reset oder neue Welt", detail: "Die aktive Linie ist kollabiert. Zuerst wieder einen tragfaehigen Kern aufbauen." },
    survive_energy: { title: "Energie stabilisieren", short: "Netto wieder positiv", detail: "Reserve, BUFFER-Zonen oder defensivere Prioritaeten loesen den Engpass." },
    survive_toxin: { title: "Toxin-Druck brechen", short: "Detox priorisieren", detail: "Leite die Linie in robustere Bereiche oder isoliere toxische Zonen." },
    evolution_ready: { title: "Evolution ausloesen", short: "Tech jetzt kaufen", detail: "DNA und Gates reichen fuer den naechsten relevanten Tech." },
    growth: { title: "Ersten Kern stabilisieren", short: "Kern verdichten", detail: "Mehr zusammenhaengende Struktur vor weiterem Ausbau herstellen." },
    expansion: { title: "Expansion starten", short: "Ausbau vorbereiten", detail: "Der Run ist stabil genug fuer Split oder Territoriums-Ausbau." },
    harvest_secure: { title: "DNA sichern", short: "Gezielt ernten", detail: "Ernte gezielt, bis der naechste Investitionszug sauber offen ist." },
  };
  if (map[goalCode]) return map[goalCode];
  return {
    title: BOTTLENECK_LABELS[primary] || "Naechster Schritt",
    short: ACTION_LABELS[nextAction] || nextAction,
    detail: `Doctrine ${doctrine} richtet die Linie auf den naechsten Schritt aus.`,
  };
}

export function getStructureState(structureId) {
  if (structureId === "colony_core") return { tier: "Koloniekern", short: "dichte Biomodule", detail: "Mehrere reife Kerne tragen die Linie. Split und Synergien wirken sichtbar." };
  if (structureId === "biomodule_2x2") return { tier: "Biomodul", short: "2x2-Cluster entstehen", detail: "Die Linie verlaesst die Einzelzellenphase. Verdichtete 2x2-Strukturen tragen das Wachstum." };
  return { tier: "Einzelzellen", short: "primitive Membranen", detail: "Die Kolonie besteht noch ueberwiegend aus einzelnen Zellen. Wachstum ist fragil und lokal." };
}

export function getBottleneckState(bottleneckId) {
  const map = {
    collapse: { title: "Kollaps stoppen", detail: "Die Linie hat keine tragfaehige Basis mehr und braucht sofortige Stabilisierung." },
    energy: { title: "Energie loesen", detail: "Der laufende Betrieb frisst mehr, als die Linie sauber erwirtschaftet." },
    toxin: { title: "Toxin-Druck loesen", detail: "Giftige Felder zerstoeren Stabilitaet und Ueberleben der Linie." },
    survival_core: { title: "Kerntragfaehigkeit bauen", detail: "Der Run lebt noch, traegt sich strukturell aber nicht sauber selbst." },
    command: { title: "Command-Gate oeffnen", detail: "Die Linie ist noch nicht dicht genug fuer den naechsten strategischen Hebel." },
    dna_investment: { title: "DNA in Hebel verwandeln", detail: "DNA und Tech-Freischaltungen muessen jetzt bewusst verbunden werden." },
    split_expansion: { title: "Split-Schub vorbereiten", detail: "Split ist der naechste strategische Ausbauzug, nicht nur eine technische Option." },
    territory_scaling: { title: "Territorium skalieren", detail: "Der Run drueckt in map-weiten Ausbau und braucht Raumplanung." },
    win_push: { title: "Siegpfad pushen", detail: "Keine groessere Krise blockiert den Run, der Siegpfad darf jetzt Prioritaet bekommen." },
    none: { title: "Beobachten", detail: "Kein akuter Engpass dominiert den Lauf. Beobachtung reicht." },
  };
  return map[bottleneckId] || map.none;
}

export function getActionState(actionId) {
  return { id: actionId, label: ACTION_LABELS[actionId] || actionId };
}

export function getLeverState(leverId) {
  return { id: leverId, label: LEVER_LABELS[leverId] || leverId };
}

export function getZoneState(zoneId) {
  return { id: zoneId, label: ZONE_LABELS[zoneId] || zoneId };
}

export function getOverlayState(overlayId) {
  return { id: overlayId, label: OVERLAY_LABELS[overlayId] || overlayId };
}

export function getWinModeState(winMode) {
  return { id: winMode, label: WIN_MODE_LABELS[winMode] || winMode };
}
