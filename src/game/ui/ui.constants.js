export const PHYSICS_KEYS = [
  ["L_mean", "Licht", 0.05, 0.60, 0.01],
  ["T_survive", "Überleben", 0.02, 0.25, 0.01],
  ["U_base", "Grundverbrauch", 0.01, 0.18, 0.005],
  ["C_birth_base", "Geburtskosten", 0.10, 1.60, 0.05],
];

export const STATUS_GROUPS = [
  ["Koloniezustand", [["Population", "playerAliveCount", 0], ["Stabilität", "lineageDiversity", 0], ["Ernteleistung", "totalHarvested", 0], ["Bedrohung", "meanToxinField", 3]]],
  ["Details", [["Licht-Anteil", "lightShare", 3], ["Nährstoff-Anteil", "nutrientShare", 3], ["Sättigung", "meanSaturationField", 3], ["Pflanzen-Bio", "meanPlantField", 3]]],
  ["CPU & Sim", [["CPU Alive", "cpuAliveCount", 0], ["Geburten", "birthsLastStep", 0], ["Tode", "deathsLastStep", 0], ["Mutationen", "mutationsLastStep", 0]]],
];

export const ARCHETYPES = [
  { id: "light_harvest", label: "Licht-Ernte", desc: "Maximiert Licht-Absorption. Ernte +12%.", role: "Expansion", stage: 1 },
  { id: "nutrient_harvest", label: "Nährstoff-Ernte", desc: "Effizienter Nährstoffzug. Weniger Upkeep.", role: "Stabilität", stage: 1 },
  { id: "toxin_resist", label: "Toxin-Resistenz", desc: "Überlebt giftige Zonen. Toxin-Metabolismus +.", role: "Überleben", stage: 1 },
  { id: "reserve_buffer", label: "Energiepuffer", desc: "Größere Energiereserve. Saisonkrisen überstehen.", role: "Stabilität", stage: 2 },
  { id: "cooperative_network", label: "Netzwerk-Kooperation", desc: "Stärkt Link-Transfer. Verbundene Zellen teilen.", role: "Stabilität", stage: 2 },
  { id: "cluster_split", label: "Split-Kern", desc: "Schaltet Split frei: ein platzierbarer 4x4-Koloniebrocken als Evo-Tool.", role: "Feature", stage: 2 },
  { id: "reproductive_spread", label: "Expansionsdrang", desc: "Schnelle Ausbreitung. Höhere Geburtenrate.", role: "Expansion", stage: 2 },
  { id: "defensive_shell", label: "Schutzschicht", desc: "Erhöhte Überlebensschwelle. Widerstand +.", role: "Defensive", stage: 3 },
  { id: "predator_raid", label: "Räuber-Angriff", desc: "Aggressive Remote-Angriffe. Energie rauben.", role: "Aggressiv", stage: 3 },
  { id: "nomadic_adapt", label: "Nomaden-Anpassung", desc: "Flexibel in jedem Terrain. Generalisten.", role: "Expansion", stage: 3 },
  { id: "hybrid_mixer", label: "Hybrid-Mischer", desc: "Kombiniert Licht + Netzwerk. Ausgewogen.", role: "Allrounder", stage: 4 },
  { id: "fortress_homeostasis", label: "Festungs-Homöostase", desc: "Maximale Stabilität. Langzeittest bestehen.", role: "Defensive", stage: 4 },
  { id: "scavenger_loop", label: "Aasfresser-Loop", desc: "Toxin als Energiequelle nutzen. Nische.", role: "Nische", stage: 4 },
  { id: "pioneer_explorer", label: "Pionier-Forscher", desc: "Erschließt neue Gebiete schnell. Expansion.", role: "Expansion", stage: 5 },
  { id: "symbiotic_bloom", label: "Symbiotische Blüte", desc: "Pflanzen + Netzwerk synergieren. Ökologie.", role: "Ökologie", stage: 5 },
  { id: "mutation_diversify", label: "Mutations-Diversität", desc: "Maximale Vielfalt. XP-Booster für Lineage.", role: "Evolution", stage: 5 },
];

export const ZONE_TYPES = [
  { id: 0, label: "Keine", desc: "Standard-Wachstum" },
  { id: 1, label: "HARVEST", desc: "Wirtschaft: DNA-Yield ×1.5" },
  { id: 2, label: "BUFFER", desc: "Stabilität: Upkeep ×0.8" },
  { id: 3, label: "DEFENSE", desc: "Frontlinie: Schaden ×0.5" },
  { id: 4, label: "NEXUS", desc: "Zentrum: Energie-Fokus ×1.2" },
  { id: 5, label: "QUARANTINE", desc: "Bremse: Keine Geburten" },
];

export const STAGE_THRESHOLDS = [0, 5, 15, 30, 60];

export const PANEL_DEFS = [
  { key: "status", icon: "📊", label: "Status", desktopLabel: "Status", title: "Statusraum", tone: "status" },
  { key: "evolution", icon: "🧪", label: "Evolution", desktopLabel: "Evolution", title: "Evolution", tone: "evolution" },
  { key: "tools", icon: "🛠", label: "Werkzeuge", desktopLabel: "Werkzeuge", title: "Werkzeuge", tone: "tools" },
  { key: "systems", icon: "⚙️", label: "Systeme", desktopLabel: "Systeme", title: "Systeme", tone: "systems" },
];

export const PANEL_BY_KEY = Object.fromEntries(PANEL_DEFS.map((panel) => [panel.key, panel]));

export const TECH_LANE_LABELS = {
  metabolism: "Metabolismus",
  survival: "Überleben",
  cluster: "Cluster",
  growth: "Wachstum",
  evolution: "Evolution",
};

