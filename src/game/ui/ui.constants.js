// ── Pixel Art Renderer Constants ────────────────────────────────────────────
/** Hard-coded tile size in physical pixels (spec: 8px). */
export const TILE_SIZE = 8;

/**
 * 16-colour palette as 24-bit hex integers.
 * Index → semantic meaning:
 *  0  background / empty cell
 *  1  player worker / alive cell
 *  2  cpu worker / enemy cell
 *  3  resource tile (DNA / energy)
 *  4  infrastructure (INFRA zone)
 *  5  player territory overlay
 *  6  cpu territory overlay
 *  7–15 reserved
 */
export const PALETTE = [
  0x060c12, // 0  bg             — near-black blue
  0x3bffaa, // 1  player worker  — neon mint
  0xff4f6e, // 2  cpu worker     — hot coral
  0xffd36b, // 3  resource/DNA   — gold
  0x4dc8ff, // 4  infra          — electric blue
  0x1e4a2e, // 5  player territory (dark green)
  0x4a1e1e, // 6  cpu territory   (dark red)
  0x1a2a3a, // 7  reserved
  0x2a1a3a, // 8  reserved
  0x0e1e0e, // 9  reserved
  0x3a2a0a, // 10 reserved
  0x0a1a2a, // 11 reserved
  0x1e0e2e, // 12 reserved
  0x2e1e0e, // 13 reserved
  0x0e2e1e, // 14 reserved
  0x1e1e1e, // 15 reserved
];
// ────────────────────────────────────────────────────────────────────────────

export const UI_PHYSICS_KEYS = [
  ["L_mean", "Licht", 0.05, 0.60, 0.01],
  ["T_survive", "Überleben", 0.02, 0.25, 0.01],
  ["U_base", "Grundverbrauch", 0.01, 0.18, 0.005],
  ["C_birth_base", "Geburtskosten", 0.10, 1.60, 0.05],
];

export const STATUS_GROUPS = [
  ["Koloniezustand", [["Population", "playerAliveCount", 0], ["Stabilitaet", "stabilityScore", 3], ["Fortschritt", "stageProgressScore", 3], ["Bedrohung", "meanToxinField", 3]]],
  ["Oekologie", [["Wasserfeld", "meanWaterField", 3], ["Pflanzen-Bio", "meanPlantField", 3], ["Aktive Biome", "activeBiomeCount", 0], ["Sättigung", "meanSaturationField", 3]]],
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
  { key: "lage", icon: "📊", label: "Lage", desktopLabel: "Lage", title: "Lage", tone: "status" },
  { key: "eingriffe", icon: "✦", label: "Eingriffe", desktopLabel: "Eingriffe", title: "Eingriffe", tone: "tools" },
  { key: "evolution", icon: "🧪", label: "Evolution", desktopLabel: "Evolution", title: "Evolution", tone: "evolution" },
  { key: "welt", icon: "◌", label: "Welt", desktopLabel: "Welt", title: "Welt", tone: "status" },
  { key: "labor", icon: "⚙", label: "Labor", desktopLabel: "Labor", title: "Labor", tone: "systems" },
];

export const PANEL_BY_KEY = Object.fromEntries(PANEL_DEFS.map((panel) => [panel.key, panel]));

export const WORLD_PRESET_OPTIONS = [
  { id: "river_delta", label: "River Delta", desc: "Hoher Wasserkorridor und stabile Expansion." },
  { id: "dry_basin", label: "Dry Basin", desc: "Wenig Wasser, hoher Lichtdruck und harte Gates." },
  { id: "wet_meadow", label: "Wet Meadow", desc: "Gleichmaessige Feuchte und weichere Fruehphase." },
  { id: "smoke_sprint", label: "Smoke Sprint", desc: "Kurzer offizieller Endpfad fuer reproduzierbare Smoke-Runs." },
];

export const RENDER_DETAIL_MODE_OPTIONS = [
  { id: "auto", label: "Automatisch", desc: "System steuert Details adaptiv ueber Performance." },
  { id: "focused", label: "Fokussiert", desc: "Mehr sichtbare Details, auch bei dichterem Raster." },
  { id: "minimal", label: "Minimal", desc: "Weniger Layer und Rasterlinien fuer klare Lesbarkeit." },
];

export const TECH_LANE_LABELS = {
  metabolism: "Metabolismus",
  survival: "Überleben",
  cluster: "Cluster",
  growth: "Wachstum",
  evolution: "Evolution",
};

export const BUILDER_TILE_OPTIONS = Object.freeze([
  Object.freeze({ mode: "light",      label: "Licht",      hint: "Lichtwert setzen",              value: 0.92, accent: "#ffd47a" }),
  Object.freeze({ mode: "nutrient",   label: "Naehrstoff", hint: "Naehrstoffwert setzen",          value: 0.86, accent: "#9ef08f" }),
  Object.freeze({ mode: "water",      label: "Wasser",     hint: "Wasserwert setzen",              value: 0.86, accent: "#76d8ff" }),
  Object.freeze({ mode: "saturation", label: "Saettigung", hint: "Saettigungswert setzen",         value: 0.70, accent: "#ffc977" }),
  Object.freeze({ mode: "core",       label: "Kern",       hint: "Zone als Kern markieren",        value: 1,    accent: "#98c7ff" }),
  Object.freeze({ mode: "dna",        label: "DNA",        hint: "Zone als DNA markieren",         value: 1,    accent: "#d29dff" }),
  Object.freeze({ mode: "infra",      label: "Infra",      hint: "Zone als Infrastruktur markieren",value: 1,   accent: "#6ee7c7" }),
  Object.freeze({ mode: "founder",    label: "Founder",    hint: "Founder-Kachel setzen",          value: 1,    accent: "#f6f9ff" }),
  Object.freeze({ mode: "erase",      label: "Loeschen",   hint: "Override entfernen",             value: 0,    accent: "#ff8a7a", remove: true }),
]);

export const UI_STRINGS = {
  MAP_SPEC_EXPORT: "MapSpec in Konsole exportiert.",
  MAP_SPEC_EXPORT_HINT: "F12 fuer Log",
  FOUNDER_REMOVED: "Founder entfernt.",
  FOUNDER_PLACED: "Founder platziert.",
  FOUNDER_BLOCKED: "Founder-Aktion blockiert.",
  FOUNDER_HINT: "Genesis: Startkachel anklicken, dann bestaetigen.",
  LAB_ONLY_BLOCKED: "Labor-Rohwerkzeuge sind ausserhalb des Labor-Panels gesperrt.",
  LAB_ONLY_HINT: "Wechsle in Labor fuer Legacy-Brushes oder nutze Main-Run-Eingriffe.",
  INFRA_REMOVED: "Infrastrukturkachel entfernt.",
  INFRA_SET: "Infrastrukturkachel vorgemerkt.",
  INFRA_BLOCKED: "Infrastrukturpfad blockiert.",
  INFRA_HINT: "Pfad muss zusammenhaengend bleiben und an Kern, DNA-Zone oder committete Infrastruktur anschliessen.",
  WORKER_REMOVED: "Worker entfernt.",
  WORKER_PLACED: "Worker platziert.",
  WORKER_BLOCKED: "Worker-Aktion blockiert.",
  WORKER_MOVE_HINT: "Setzen auf freie Kacheln, Shift+Klick entfernt.",
  WORKER_MARKED: "Worker markiert.",
  WORKER_MARKED_HINT: "Waehle jetzt ein Ressource-Tile als Ziel.",
  MOVE_CANCELLED: "Bewegung abgebrochen.",
  WORKER_REPOSITIONED: "Worker umgestellt.",
  NO_RESOURCE_TARGET: "Kein Ressourcen-Ziel.",
  NO_RESOURCE_TARGET_HINT: "Waehle ein Tile mit sichtbarer Ressource.",
  ORDER_BLOCKED: "Order blockiert.",
  ORDER_BLOCKED_HINT: "Pruefe Start-Worker und Ressourcen-Ziel.",
  ORDER_SET: "Order gesetzt.",
  ORDER_SET_HINT: "Der Worker bewegt sich tickbasiert zum Ressourcen-Ziel.",
  HARVEST_OK: "DNA-Ernte ausgeführt.",
  HARVEST_BLOCKED: "Ernte blockiert.",
  HARVEST_HINT: "Nächster Schritt: eigenen Worker wählen und Mindestpopulation halten.",
  SPLIT_OK: "Split-Seed gesetzt.",
  SPLIT_BLOCKED: "Split-Seed blockiert.",
  SPLIT_HINT: "Nächster Schritt: Split-Tech, Command-Score und freie 4x4-Zone prüfen.",
  DNA_ZONE_REMOVED: "DNA-Kachel entfernt.",
  DNA_ZONE_SET: "DNA-Kachel gesetzt.",
  DNA_ZONE_BLOCKED: "DNA-Kachel blockiert.",
  DNA_ZONE_HINT: "Nur lebende eigene Kacheln, nicht im Energiekern, angrenzend an Kern oder DNA-Zone.",
  MAP_TILE_OK: "Map-Tile aktualisiert.",
  MAP_TILE_BLOCKED: "Fehler beim Setzen.",
  MAP_TILE_HINT: "Shift+Klick entfernt Overrides."
};
