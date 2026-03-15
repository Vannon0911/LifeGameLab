export const PLAYER_DOCTRINES = [
  {
    id: "equilibrium",
    label: "Gleichgewicht",
    summary: "Stabiler Grundmodus mit leichtem Wachstum und solider Resilienz.",
    unlockStage: 1,
    effects: { energyIn: 1.02, upkeep: 0.98, birth: 1.00, survival: 0.02, link: 1.00, toxin: 1.00 },
  },
  {
    id: "expansion",
    label: "Expansion",
    summary: "Priorisiert autonome Teilung und schnelle Flächenausbreitung.",
    unlockStage: 1,
    effects: { energyIn: 1.06, upkeep: 1.02, birth: 1.20, survival: -0.02, link: 0.98, toxin: 0.98 },
  },
  {
    id: "conserve",
    label: "Sparen",
    summary: "Drosselt Verbrauch und hält fragile Cluster länger am Leben.",
    unlockStage: 1,
    effects: { energyIn: 0.96, upkeep: 0.90, birth: 0.90, survival: 0.05, link: 1.00, toxin: 1.02 },
  },
  {
    id: "harvest",
    label: "Ernte",
    summary: "Erhöht DNA- und Reservenfokus, aber ohne aggressives Wachstum.",
    unlockStage: 2,
    effects: { energyIn: 1.04, upkeep: 1.00, birth: 0.96, survival: 0.02, link: 1.04, toxin: 1.00 },
  },
  {
    id: "network",
    label: "Netzwerk",
    summary: "Verdichtet Cluster und stärkt verbundene Linien.",
    unlockStage: 2,
    effects: { energyIn: 1.00, upkeep: 0.98, birth: 1.06, survival: 0.03, link: 1.18, toxin: 1.00 },
  },
  {
    id: "detox",
    label: "Detox",
    summary: "Fängt toxische Phasen ab und erlaubt längere Beobachtung.",
    unlockStage: 2,
    effects: { energyIn: 0.98, upkeep: 0.96, birth: 0.94, survival: 0.07, link: 1.00, toxin: 1.16 },
  },
  {
    id: "fortress",
    label: "Festung",
    summary: "Spätere, defensive Kommandostufe für starke Cluster.",
    unlockStage: 3,
    effects: { energyIn: 0.94, upkeep: 0.92, birth: 0.88, survival: 0.11, link: 1.08, toxin: 1.10 },
  },
];

export const DOCTRINE_BY_ID = Object.fromEntries(PLAYER_DOCTRINES.map((entry) => [entry.id, entry]));

export const TECH_TREE = [
  { id: "light_harvest", label: "Photonenfang", desc: "Lichtzug steigt, frühe Autonomie wird sicherer.", stage: 1, lane: "metabolism", requires: [], commandReq: 0.00 },
  { id: "nutrient_harvest", label: "Nährstoffzug", desc: "Stabiler Rohstofffluss für wachsende Cluster.", stage: 1, lane: "metabolism", requires: [], commandReq: 0.00 },
  { id: "toxin_resist", label: "Toxinfilter", desc: "Entlastet fragile Linien in giftigen Feldern.", stage: 1, lane: "survival", requires: [], commandReq: 0.00 },
  { id: "reserve_buffer", label: "Reservekern", desc: "Mehr Energiespeicher für längere autonome Phasen.", stage: 2, lane: "survival", requires: ["nutrient_harvest"], commandReq: 0.08, runRequirements: { minZoneTier: 2 } },
  { id: "cooperative_network", label: "Signalnetz", desc: "Verbundene Zellen bilden belastbare Cluster.", stage: 2, lane: "cluster", requires: ["light_harvest"], commandReq: 0.10, runRequirements: { minPatternClasses: 1, minNetworkRatio: 0.10 } },
  { id: "cluster_split", label: "Split-Kern", desc: "Strategisches 4x4-Split als neue Gruppen-Seedung.", stage: 2, lane: "cluster", requires: ["cooperative_network"], commandReq: 0.14, runRequirements: { requiresInfra: true } },
  { id: "reproductive_spread", label: "Teilungsdrang", desc: "Autonome Teilung wird bevorzugt, nicht manuelles Platzieren.", stage: 2, lane: "growth", requires: ["nutrient_harvest"], commandReq: 0.10 },
  { id: "defensive_shell", label: "Schutzhülle", desc: "Gibt dichten Clustern mehr Fehlertoleranz.", stage: 3, lane: "survival", requires: ["reserve_buffer", "toxin_resist"], commandReq: 0.18 },
  { id: "predator_raid", label: "Raid-Reflex", desc: "Öffnet aggressive Fernaktionen für starke Kolonien.", stage: 3, lane: "growth", requires: ["cooperative_network"], commandReq: 0.20 },
  { id: "nomadic_adapt", label: "Nomadenpfad", desc: "Macht autonome Expansion robuster über wechselnde Felder.", stage: 3, lane: "growth", requires: ["reproductive_spread"], commandReq: 0.18 },
  { id: "hybrid_mixer", label: "Hybridmischer", desc: "Verzahnt Licht und Netzwerk für dichte Produktionskerne.", stage: 4, lane: "cluster", requires: ["light_harvest", "cooperative_network"], commandReq: 0.25 },
  { id: "fortress_homeostasis", label: "Festungshomöostase", desc: "Massive Stabilität für ausgereifte Cluster.", stage: 4, lane: "survival", requires: ["defensive_shell", "reserve_buffer"], commandReq: 0.28 },
  { id: "scavenger_loop", label: "Aasfresser-Loop", desc: "Bindet toxische Restfelder produktiv zurück.", stage: 4, lane: "survival", requires: ["toxin_resist", "predator_raid"], commandReq: 0.25 },
  { id: "pioneer_explorer", label: "Pionierpfad", desc: "Belohnt weit verzweigte, stabile Kolonieketten.", stage: 5, lane: "growth", requires: ["nomadic_adapt", "cluster_split"], commandReq: 0.34 },
  { id: "symbiotic_bloom", label: "Symbiotische Blüte", desc: "Plantagen und Cluster erzeugen sich gegenseitig stabiler.", stage: 5, lane: "cluster", requires: ["nutrient_harvest", "hybrid_mixer"], commandReq: 0.32 },
  { id: "mutation_diversify", label: "Mutationsfächer", desc: "Verstärkt langfristige Evolution über starke Cluster.", stage: 5, lane: "evolution", requires: ["hybrid_mixer", "scavenger_loop"], commandReq: 0.34, runRequirements: { requiresInfra: true, minPatternClasses: 3, patternEnergyBonus: true } },
];

export const TECH_BY_ID = Object.fromEntries(TECH_TREE.map((tech) => [tech.id, tech]));

export const TECH_SYNERGIES = [
  {
    id: "photon_mesh",
    label: "Photonen-Mesh",
    desc: "Photonenfang + Signalnetz erhöhen autonomen Teilungsdruck in stabilen Clustern.",
    requires: ["light_harvest", "cooperative_network"],
    hue: 10,
    mem: { light: 0.05, resilience: 0.04, energySense: 0.03 },
    trait: [0.02, -0.01, 0.00, -0.01, -0.02, 0.05, 0.00],
  },
  {
    id: "split_bloom",
    label: "Split-Bloom",
    desc: "Split-Kern + Teilungsdrang priorisieren autonome Expansion nach neuem Gruppen-Seed.",
    requires: ["cluster_split", "reproductive_spread"],
    hue: 14,
    mem: { nutrient: 0.05, resilience: 0.02 },
    trait: [0.01, 0.00, 0.00, -0.02, -0.04, 0.02, 0.00],
  },
  {
    id: "fortress_grid",
    label: "Festungs-Gitter",
    desc: "Reservekern + Schutzhülle + Festungshomöostase machen Cluster deutlich zäher.",
    requires: ["reserve_buffer", "defensive_shell", "fortress_homeostasis"],
    hue: -8,
    mem: { resilience: 0.08, toxin: 0.03 },
    trait: [-0.01, -0.02, 0.03, 0.01, 0.02, 0.04, 0.04],
  },
  {
    id: "toxin_recycling",
    label: "Toxin-Recycling",
    desc: "Toxinfilter + Aasfresser-Loop reduzieren toxische Einbrüche stark.",
    requires: ["toxin_resist", "scavenger_loop"],
    hue: 6,
    mem: { toxin: 0.07, toxinMetabolism: 0.08 },
    trait: [0.00, -0.01, 0.01, 0.00, 0.00, 0.01, 0.06],
  },
  {
    id: "bloom_protocol",
    label: "Blütenprotokoll",
    desc: "Nährstoffzug + Symbiotische Blüte erzeugen einen spürbar produktiveren Clusterkern.",
    requires: ["nutrient_harvest", "symbiotic_bloom"],
    hue: 18,
    mem: { nutrient: 0.08, light: 0.03, resilience: 0.03 },
    trait: [0.02, -0.01, 0.00, -0.01, -0.03, 0.03, 0.01],
  },
];

export const SYNERGY_BY_ID = Object.fromEntries(TECH_SYNERGIES.map((entry) => [entry.id, entry]));

export function normalizeTechArray(value) {
  return Array.isArray(value) ? [...new Set(value.map(String))].sort() : [];
}

export function hasRequiredTechs(unlocked, requires) {
  const set = unlocked instanceof Set ? unlocked : new Set(normalizeTechArray(unlocked));
  return (requires || []).every((req) => set.has(req));
}

export function deriveCommandScore(sim) {
  const playerAlive = Math.max(0, Number(sim?.playerAliveCount || 0));
  const stage = Math.max(1, Number(sim?.playerStage || 1));
  const cluster = Math.max(0, Number(sim?.clusterRatio || 0));
  const network = Math.max(0, Number(sim?.networkRatio || 0));
  const density = Math.min(1, playerAlive / 24);
  return Math.max(0, Math.min(1,
    density * 0.28 +
    cluster * 0.34 +
    network * 0.22 +
    Math.min(1, (stage - 1) / 4) * 0.16
  ));
}

export function computeUnlockedSynergies(unlocked) {
  const set = unlocked instanceof Set ? unlocked : new Set(normalizeTechArray(unlocked));
  return TECH_SYNERGIES
    .filter((entry) => hasRequiredTechs(set, entry.requires))
    .map((entry) => entry.id)
    .sort();
}
