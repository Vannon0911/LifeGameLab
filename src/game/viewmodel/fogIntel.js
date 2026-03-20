import { getTileFogState, FOG_HIDDEN, FOG_VISIBLE } from "../render/fogOfWar.js";

function cpuSignatureBand(count) {
  if (count <= 0) return "none";
  if (count <= 2) return "faint";
  if (count <= 6) return "cluster";
  return "strong";
}

export function buildFogIntel(state) {
  const world = state?.world;
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  const cpuLineageId = Number(state?.meta?.cpuLineageId || 0) | 0;
  const N = Number(world?.w || 0) * Number(world?.h || 0);
  let visibleTiles = 0;
  let exploredTiles = 0;
  let visibleCpuAlive = 0;
  let exploredCpuAlive = 0;

  for (let i = 0; i < N; i++) {
    const fogState = getTileFogState(world, i);
    if (fogState === FOG_VISIBLE) visibleTiles++;
    if (fogState !== FOG_HIDDEN) exploredTiles++;
    if (!alive || !lineageId || alive[i] !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== cpuLineageId) continue;
    if (fogState === FOG_VISIBLE) visibleCpuAlive++;
    else exploredCpuAlive++;
  }

  const signatureBand = cpuSignatureBand(exploredCpuAlive);
  let mode = "hidden";
  if (visibleCpuAlive > 0) mode = "visible";
  else if (signatureBand !== "none") mode = "signature";

  let summary = "CPU ausserhalb Sicht unbekannt";
  if (mode === "visible") {
    summary = visibleCpuAlive === 1 ? "1 CPU in Sicht" : `${visibleCpuAlive} CPU in Sicht`;
    if (signatureBand !== "none") summary += ", weitere Signaturen ausserhalb Sicht";
  } else if (mode === "signature") {
    summary = signatureBand === "faint"
      ? "Schwache CPU-Signatur"
      : signatureBand === "cluster"
        ? "Mehrere CPU-Signaturen"
        : "Starke CPU-Signatur";
  } else if (exploredTiles > 0) {
    summary = "Keine CPU-Signatur im erkundeten Bereich";
  }

  return {
    visibleTiles,
    exploredTiles,
    unseenTiles: Math.max(0, N - exploredTiles),
    cpuIntel: {
      mode,
      precise: mode === "visible",
      visibleAlive: visibleCpuAlive,
      signatureBand,
      summary,
    },
  };
}

function redactCpuBlockerDetail(winProgress, cpuIntel) {
  const blockerCode = String(winProgress?.blockerCode || "");
  const affected = new Set([
    "energy_advantage_missing",
    "population_advantage_missing",
    "maintain_advantage",
    "maintain_population_lead",
  ]);
  if (!affected.has(blockerCode) || cpuIntel.precise) return winProgress;
  return {
    ...winProgress,
    blockerCode: "cpu_intel_limited",
    blockerDetail: cpuIntel.mode === "signature"
      ? "CPU ausserhalb Sicht nur signaturhaft erkennbar; ein Vorsprung ist derzeit nicht praezise bestaetigbar."
      : "CPU aktuell nicht in Sicht; ein Vorsprung ist derzeit nicht praezise bestaetigbar.",
  };
}

export function applyFogIntelToAdvisorModel(advisorModel, state) {
  const base = advisorModel && typeof advisorModel === "object" ? advisorModel : {};
  const fog = buildFogIntel(state);
  return {
    ...base,
    fog,
    cpuIntel: fog.cpuIntel,
    cpuAlive: fog.cpuIntel.precise ? fog.cpuIntel.visibleAlive : null,
    winProgress: redactCpuBlockerDetail(base.winProgress || {}, fog.cpuIntel),
  };
}
