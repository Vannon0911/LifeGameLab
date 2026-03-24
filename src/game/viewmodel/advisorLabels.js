import { OVERLAY_MODE, WIN_MODE, WIN_MODE_RESULT_LABEL } from "../contracts/ids.js";

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
  [WIN_MODE.CORE_COLLAPSE]: WIN_MODE_RESULT_LABEL[WIN_MODE.CORE_COLLAPSE],
  [WIN_MODE.VISION_BREAK]: WIN_MODE_RESULT_LABEL[WIN_MODE.VISION_BREAK],
  [WIN_MODE.NETWORK_DECAY]: WIN_MODE_RESULT_LABEL[WIN_MODE.NETWORK_DECAY],
});

export const RESULT_REASON_LABELS = Object.freeze({
  [WIN_MODE.CORE_COLLAPSE]: "Kern verloren",
  [WIN_MODE.VISION_BREAK]: "Sicht komplett erloschen",
  [WIN_MODE.NETWORK_DECAY]: "Infrastruktur kollabiert",
});
