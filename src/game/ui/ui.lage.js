import { PLAYER_DOCTRINES, DOCTRINE_BY_ID, deriveCommandScore } from "../techTree.js";
import { RUN_PHASE, ZONE_ROLE } from "../contracts/ids.js";
import { evaluateFoundationEligibility } from "../sim/foundationEligibility.js";
import {
  getActionState,
  getBottleneckState,
  getGoalState,
  getInfluencePhase,
  getLeverState,
  getOverlayState,
  getPlayerMemory,
  getRiskState,
  getStructureState,
  getWinModeState,
  getZoneState,
} from "./ui.model.js";
import { el, fmt, fmtSign } from "./ui.dom.js";

function countMaskTiles(mask) {
  if (!mask || typeof mask.length !== "number") return 0;
  let total = 0;
  for (let i = 0; i < mask.length; i += 1) {
    total += (Number(mask[i] || 0) | 0) === 1 ? 1 : 0;
  }
  return total;
}

function summarizeFog(world) {
  const total = Number(world?.w || 0) * Number(world?.h || 0);
  if (!total) return { visible: 0, explored: 0, hidden: 0 };
  const visible = countMaskTiles(world?.visibility);
  const exploredAll = countMaskTiles(world?.explored);
  const explored = Math.max(0, exploredAll - visible);
  const hidden = Math.max(0, total - visible - explored);
  return { visible, explored, hidden };
}

function countZoneRoleTiles(zoneRole, roleId) {
  if (!zoneRole || typeof zoneRole.length !== "number") return 0;
  let total = 0;
  for (let i = 0; i < zoneRole.length; i += 1) {
    total += (Number(zoneRole[i] || 0) | 0) === (roleId | 0) ? 1 : 0;
  }
  return total;
}

function getZoneMetaCount(zoneMeta) {
  if (!zoneMeta || typeof zoneMeta !== "object") return 0;
  return Object.keys(zoneMeta).length;
}

function getPatternClassCount(patternCatalog) {
  if (!patternCatalog || typeof patternCatalog !== "object") return 0;
  return Object.keys(patternCatalog).filter((key) => {
    const entry = patternCatalog[key];
    if (Array.isArray(entry)) return entry.length > 0;
    if (entry && typeof entry === "object") return Object.keys(entry).length > 0;
    return Number(entry || 0) > 0;
  }).length;
}

function formatPatternBonusSummary(patternBonuses) {
  if (!patternBonuses || typeof patternBonuses !== "object") return "keine";
  const parts = Object.entries(patternBonuses)
    .filter(([, value]) => Number(value || 0) !== 0)
    .map(([key, value]) => `${key} ${fmtSign(Number(value || 0), 2)}`);
  return parts.length ? parts.join(" · ") : "keine";
}

export function renderLagePanel({
  container,
  state,
  sim,
  advisorModel,
  gateFeedback,
  actions,
}) {
  const playerMemory = getPlayerMemory(state);
  const playerStage = Number(sim.playerStage || 1);
  const playerAlive = Number(sim.playerAliveCount || 0);
  const energyNet = Number(sim.playerEnergyNet || 0);
  const doctrine = DOCTRINE_BY_ID[String(playerMemory?.doctrine || "equilibrium")] || PLAYER_DOCTRINES[0];
  const influencePhase = getInfluencePhase(playerStage, advisorModel.status.commandScore, sim.runPhase);
  const goalState = getGoalState(advisorModel);
  const structureState = getStructureState(advisorModel.status.structure);
  const riskState = getRiskState(advisorModel.status.risk);
  const bottleneckState = getBottleneckState(advisorModel.advisor.bottleneckPrimary);
  const nextActionState = getActionState(advisorModel.advisor.nextAction);
  const nextLeverState = getLeverState(advisorModel.advisor.nextLever);
  const zoneState = getZoneState(advisorModel.advisor.recommendedZone);
  const overlayState = getOverlayState(advisorModel.advisor.recommendedOverlay);
  const winModeState = getWinModeState(advisorModel.runIdentity.winMode);

  const mkBar = (pct, cls, label) => {
    const wrap = el("div", "nx-bar-wrap");
    wrap.setAttribute("role", "progressbar");
    wrap.setAttribute("aria-valuenow", Math.round(pct * 100));
    wrap.setAttribute("aria-valuemin", "0");
    wrap.setAttribute("aria-valuemax", "100");
    wrap.setAttribute("aria-label", label);
    const fill = el("div", `nx-bar-fill ${cls}`);
    fill.style.width = `${Math.min(100, Math.max(0, pct * 100)).toFixed(1)}%`;
    wrap.appendChild(fill);
    return wrap;
  };
  const mkMetric = (label, val, cls = "nx-mono") => {
    const row = el("div", "nx-stat-row");
    row.append(el("span", "nx-label", label), el("span", cls, val));
    return row;
  };

  let statusText = "Kolonie beobachtet ihr Umfeld. Autonomes Wachstum hat Vorrang.";
  let statusColor = "var(--cyan)";
  if (String(sim.runPhase || "") === RUN_PHASE.GENESIS_SETUP) {
    statusText = "Genesis-Setup aktiv. Vier zusammenhaengende Founder im Startfenster bilden die Gruendung.";
    statusColor = "var(--gold)";
  } else if (String(sim.runPhase || "") === RUN_PHASE.GENESIS_ZONE) {
    statusText = "Genesis-Zone aktiv. Die Founder sind fixiert, der Energiekern muss jetzt explizit bestaetigt werden.";
    statusColor = "var(--gold)";
  } else if (advisorModel.advisor.bottleneckPrimary === "collapse") {
    statusText = "Kolonie kollabiert. Die aktive Linie hat keine tragfaehige Struktur mehr.";
    statusColor = "var(--red)";
  } else if (advisorModel.advisor.bottleneckPrimary === "energy") {
    statusText = "Energie kippt ins Minus. BUFFER, Reserve oder defensivere Prioritaet zuerst.";
    statusColor = "var(--red)";
  } else if (advisorModel.advisor.bottleneckPrimary === "toxin") {
    statusText = "Toxinlast steigt. Detox, Quarantaene oder robustere Korridore werden relevant.";
    statusColor = "var(--orange)";
  } else if (advisorModel.advisor.bottleneckPrimary === "win_push") {
    statusText = "Keine groessere Krise blockiert den Run. Der Siegpfad darf jetzt Prioritaet bekommen.";
    statusColor = "var(--green)";
  } else if (advisorModel.advisor.nextAction === "wait_and_advance_time") {
    statusText = "Kein dominanter Krisenengpass aktiv. Beobachtung und Vorspulen liefern die beste neue Information.";
    statusColor = "var(--cyan)";
  }

  const alertCard = el("section", "nx-card");
  alertCard.appendChild(el("div", "nx-card-title", "Lagebericht"));
  const alertBox = el("div", "nx-alert-box", statusText);
  alertBox.style.color = statusColor;
  alertBox.style.borderColor = statusColor;
  alertCard.appendChild(alertBox);
  alertCard.appendChild(el("div", "nx-note", `${bottleneckState.title}: ${bottleneckState.detail}`));
  alertCard.appendChild(el("div", "nx-note", `Reason-Codes: ${(advisorModel.advisor.reasonCodes || []).join(", ") || "none"}`));
  container.appendChild(alertCard);

  if (String(sim.runPhase || "") === RUN_PHASE.GENESIS_SETUP) {
    const foundationEligibility = evaluateFoundationEligibility(state);
    const founderCard = el("section", "nx-card");
    founderCard.appendChild(el("div", "nx-card-title", "Genesis: Gruendung"));
    founderCard.appendChild(el("div", "nx-note", "Setze vier zusammenhaengende Founder im linken Startfenster und bestaetige danach die Gruendung."));
    const founderCount = el("div", "nx-active-tool");
    founderCount.append(
      el("div", "nx-active-tool-label", "Founder"),
      el("div", "nx-active-tool-copy", `${foundationEligibility.founderMaskCount}/${foundationEligibility.founderBudget || 4}`),
    );
    founderCard.appendChild(founderCount);
    founderCard.appendChild(
      el(
        "div",
        foundationEligibility.eligible ? "nx-note nx-val-pos" : "nx-note",
        foundationEligibility.eligible
          ? "Foundation bereit: Gruendung kann bestaetigt werden."
          : "Foundation noch nicht bereit: exakt 4 eigene, zusammenhaengende Founder im Startfenster erforderlich.",
      ),
    );
    const founderActions = el("div", "nx-chip-grid");
    const brushBtn = el("button", "nx-btn nx-btn-ghost", "Founder-Brush");
    brushBtn.addEventListener("click", actions.useFounderBrush);
    const confirmBtn = el("button", "nx-btn nx-btn-primary", "Gruendung bestaetigen");
    confirmBtn.disabled = !foundationEligibility.eligible;
    confirmBtn.addEventListener("click", actions.confirmFoundation);
    founderActions.append(brushBtn, confirmBtn);
    founderCard.appendChild(founderActions);
    container.appendChild(founderCard);
  }

  if (String(sim.runPhase || "") === RUN_PHASE.GENESIS_ZONE) {
    const founderTiles = ArrayBuffer.isView(state?.world?.founderMask)
      ? Array.from(state.world.founderMask).reduce((sum, value) => sum + ((Number(value || 0) | 0) === 1 ? 1 : 0), 0)
      : 0;
    const coreCard = el("section", "nx-card");
    coreCard.appendChild(el("div", "nx-card-title", "Genesis-Zone: Energiekern"));
    coreCard.appendChild(el("div", "nx-note", "Die Gruendung ist fixiert. Bestaetige jetzt den Energiekern; erst danach geht der Lauf explizit in RUN_ACTIVE."));
    const coreCandidate = el("div", "nx-active-tool");
    coreCandidate.append(
      el("div", "nx-active-tool-label", "Kernkandidat"),
      el("div", "nx-active-tool-copy", `${founderTiles} Founder-Kacheln fixiert`),
    );
    coreCard.appendChild(coreCandidate);
    coreCard.appendChild(el("div", "nx-note", "Play und Step bleiben gesperrt, bis `CONFIRM_CORE_ZONE` erfolgreich war."));
    const coreActions = el("div", "nx-chip-grid");
    const confirmCoreBtn = el("button", "nx-btn nx-btn-primary", "Energiekern bestaetigen");
    confirmCoreBtn.addEventListener("click", actions.confirmCoreZone);
    coreActions.append(confirmCoreBtn);
    coreCard.appendChild(coreActions);
    container.appendChild(coreCard);
  }

  if (String(sim.runPhase || "") === RUN_PHASE.DNA_ZONE_SETUP) {
    const selectedTiles = ArrayBuffer.isView(state?.world?.dnaZoneMask)
      ? Array.from(state.world.dnaZoneMask).reduce((sum, value) => sum + ((Number(value || 0) | 0) === 1 ? 1 : 0), 0)
      : 0;
    const dnaSetupCard = el("section", "nx-card");
    dnaSetupCard.appendChild(el("div", "nx-card-title", "DNA-Zone setzen"));
    dnaSetupCard.appendChild(el("div", "nx-note", "Der Run ist bewusst pausiert. Waehle jetzt bis zu vier eigene, lebende Kacheln angrenzend an den Energiekern und bestaetige dann Zone 2."));
    const dnaCandidate = el("div", "nx-active-tool");
    dnaCandidate.append(
      el("div", "nx-active-tool-label", "Placement-Zaehler"),
      el("div", "nx-active-tool-copy", `${selectedTiles}/4 DNA-Kacheln gesetzt`),
    );
    dnaSetupCard.appendChild(dnaCandidate);
    dnaSetupCard.append(
      mkMetric("Restbudget", String(Number(sim.zone2PlacementBudget || 0))),
      mkMetric("Status", "DNA-Zone setzen", "nx-mono nx-val-pos"),
    );
    dnaSetupCard.appendChild(el("div", "nx-note", "Play und Step bleiben gesperrt, bis `CONFIRM_DNA_ZONE` erfolgreich war."));
    const dnaActions = el("div", "nx-chip-grid");
    const confirmDnaBtn = el("button", "nx-btn nx-btn-primary", "DNA-Zone bestaetigen");
    confirmDnaBtn.addEventListener("click", actions.confirmDnaZone);
    dnaActions.append(confirmDnaBtn);
    dnaSetupCard.appendChild(dnaActions);
    container.appendChild(dnaSetupCard);
  }

  const missionCard = el("section", "nx-card nx-card-mission");
  missionCard.appendChild(el("div", "nx-card-title", "Aktuelle Mission"));
  missionCard.appendChild(el("div", "nx-mission-title", goalState.title));
  missionCard.appendChild(el("div", "nx-mission-copy", goalState.detail));
  missionCard.append(
    mkMetric("Mission", goalState.short, "nx-mono nx-val-pos"),
    mkMetric("Risiko", riskState.label, riskState.id === "stable" ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
    mkMetric("Struktur", structureState.tier),
    mkMetric("Run-Pfad", winModeState.label),
    mkMetric("Win-Blocker", advisorModel.winProgress.blockerCode),
  );
  container.appendChild(missionCard);

  const commandCard = el("section", "nx-card");
  commandCard.appendChild(el("div", "nx-card-title", "Advisor"));
  const commandHero = el("div", "nx-active-tool");
  commandHero.append(
    el("div", "nx-active-tool-label", influencePhase),
    el("div", "nx-active-tool-copy", `${doctrine.label}: ${advisorModel.runIdentity.doctrineTradeoff}`),
  );
  commandCard.appendChild(commandHero);
  commandCard.append(
    mkMetric("Engpass", bottleneckState.title),
    mkMetric("Naechste Aktion", nextActionState.label),
    mkMetric("Naechster Hebel", nextLeverState.label),
    mkMetric("Command-Score", `${Math.round(advisorModel.status.commandScore * 100)} / 100`, "nx-mono nx-val-pos"),
    mkBar(advisorModel.status.commandScore, "nx-bar-stage", "Command-Score"),
    mkMetric("Doctrine", doctrine.label),
    mkMetric("Trade-off", advisorModel.runIdentity.doctrineTradeoff),
    mkMetric("Split", advisorModel.status.splitReady ? "bereit" : "noch nicht", advisorModel.status.splitReady ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
    mkMetric("Clusterstaerke", `${Math.round(Number(sim.clusterRatio || 0) * 100)}%`),
    mkMetric("Netzwerk", `${Math.round(Number(sim.networkRatio || 0) * 100)}%`),
    mkMetric("Synergien", String((playerMemory?.synergies || []).length || 0)),
  );
  container.appendChild(commandCard);

  const energyCard = el("section", "nx-card");
  energyCard.appendChild(el("div", "nx-card-title", "Energie & Wachstum"));
  energyCard.append(
    mkMetric("Population", String(playerAlive), playerAlive > 0 ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
    mkMetric("Netto", fmtSign(energyNet, 2), energyNet >= 0 ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
    mkMetric("Zufluss", fmt(Number(sim.playerEnergyIn || 0), 2)),
    mkMetric("Abfluss", fmt(Number(sim.playerEnergyOut || 0), 2)),
    mkMetric("Gespeichert", fmt(Number(sim.playerEnergyStored || 0), 2)),
  );
  const mixGrid = el("div", "nx-stat-grid");
  const lightBlock = el("div", "nx-stat-row nx-stat-row-col");
  lightBlock.append(el("span", "nx-label", `Licht ${(Number(sim.lightShare || 0) * 100).toFixed(0)}%`), mkBar(Number(sim.lightShare || 0), "nx-bar-light", "Lichtanteil"));
  const nutrientBlock = el("div", "nx-stat-row nx-stat-row-col");
  nutrientBlock.append(el("span", "nx-label", `Naehrstoffe ${(Number(sim.nutrientShare || 0) * 100).toFixed(0)}%`), mkBar(Number(sim.nutrientShare || 0), "nx-bar-nutrient", "Naehrstoffanteil"));
  mixGrid.append(lightBlock, nutrientBlock);
  energyCard.appendChild(mixGrid);
  container.appendChild(energyCard);

  const progressCard = el("section", "nx-card");
  progressCard.appendChild(el("div", "nx-card-title", "Siegpfad & Ausbau"));
  progressCard.append(
    mkMetric("Stage", `S${playerStage}`, "nx-mono nx-chip-stage"),
    mkMetric("DNA", `🧬 ${fmt(Number(sim.playerDNA || 0), 1)}`),
    mkMetric("Harvest Yield", fmt(Number(sim.harvestYieldTotal || 0), 1)),
    mkMetric("Aktive Biome", String(Number(sim.activeBiomeCount || 0))),
    mkMetric("Aktiver Siegpfad", winModeState.label),
    mkMetric("Win-Fortschritt", `${advisorModel.winProgress.progress} / ${advisorModel.winProgress.target}`),
    mkMetric("Naechste Zone", zoneState.label),
    mkMetric("Naechste Labor-Diagnose", overlayState.label),
  );
  progressCard.append(
    el("div", "nx-note", `${structureState.detail} Phase ${influencePhase}: ${advisorModel.winProgress.blockerDetail}`),
    mkBar(Math.min(1, Number(sim.energySupremacyTicks || 0) / 200), "nx-bar-light", "Suprematie-Fortschritt"),
    mkBar(Math.min(1, Number(sim.stockpileTicks || 0) / 200), "nx-bar-nutrient", "Territorium-Fortschritt"),
    mkBar(Math.min(1, Number(sim.efficiencyTicks || 0) / 100), "nx-bar-stage", "Effizienz-Fortschritt"),
  );
  container.appendChild(progressCard);

  const fog = summarizeFog(state.world);
  const visibilityCard = el("section", "nx-card");
  visibilityCard.appendChild(el("div", "nx-card-title", "Sicht & Kartenwissen"));
  visibilityCard.appendChild(el("div", "nx-note", "Sicht kommt aus Kern, DNA-Zone und committeter Infrastruktur. Erkundete Flaechen bleiben als Erinnerung, Unbekanntes bleibt verdeckt."));
  visibilityCard.append(
    mkMetric("Sichtbar", String(fog.visible), fog.visible > 0 ? "nx-mono nx-val-pos" : "nx-mono"),
    mkMetric("Erkundet", String(fog.explored)),
    mkMetric("Verborgen", String(fog.hidden)),
    mkMetric("CPU Intel", advisorModel?.cpuIntel?.summary || "keine Sicht"),
  );
  container.appendChild(visibilityCard);

  const zoneRole = state?.world?.zoneRole;
  const zoneMeta = state?.world?.zoneMeta;
  const patternCatalog = sim?.patternCatalog || {};
  const patternBonuses = sim?.patternBonuses || {};
  const zoneSummaryCard = el("section", "nx-card");
  zoneSummaryCard.appendChild(el("div", "nx-card-title", "Zonen & Muster"));
  zoneSummaryCard.appendChild(el("div", "nx-note", "Kanonische Zonen lesen aus zoneRole/zoneMeta; Muster lesen aus patternCatalog/patternBonuses."));
  zoneSummaryCard.append(
    mkMetric("Core-Zone", String(countZoneRoleTiles(zoneRole, ZONE_ROLE.CORE)), "nx-mono nx-val-pos"),
    mkMetric("DNA-Zone", String(countZoneRoleTiles(zoneRole, ZONE_ROLE.DNA))),
    mkMetric("Infra-Zone", String(countZoneRoleTiles(zoneRole, ZONE_ROLE.INFRA))),
    mkMetric("Zone-Meta", `${getZoneMetaCount(zoneMeta)} Eintraege`),
    mkMetric("Pattern-Klassen", String(getPatternClassCount(patternCatalog))),
    mkMetric("Pattern-Boni", formatPatternBonusSummary(patternBonuses)),
  );
  container.appendChild(zoneSummaryCard);

  if (Number(sim.unlockedZoneTier || 0) >= 1 && String(sim.nextZoneUnlockKind || "") === "DNA") {
    const unlockProgress = Math.max(0, Math.min(1, Number(sim.zoneUnlockProgress || 0)));
    const unlockCard = el("section", "nx-card");
    unlockCard.appendChild(el("div", "nx-card-title", "Zone 2: DNA"));
    unlockCard.appendChild(el("div", "nx-note", "Der Energiekern ist aktiv. Fortschritt tickt aus gespeicherter Energie und stabilen Kernticks."));
    unlockCard.append(
      mkMetric("Unlock-Fortschritt", `${Math.round(unlockProgress * 100)}%`, unlockProgress >= 1 ? "nx-mono nx-val-pos" : "nx-mono"),
      mkMetric("Zielkosten", fmt(Number(sim.nextZoneUnlockCostEnergy || 0), 2)),
      mkMetric("Stabile Kernticks", String(Number(sim.coreEnergyStableTicks || 0))),
    );
    unlockCard.appendChild(mkBar(unlockProgress, "nx-bar-stage", "DNA-Unlock-Fortschritt"));
    if (unlockProgress >= 1 && !sim.zone2Unlocked) {
      const unlockActions = el("div", "nx-chip-grid");
      const startBtn = el("button", "nx-btn nx-btn-primary", "DNA-Zone starten");
      startBtn.addEventListener("click", actions.startDnaZone);
      unlockActions.appendChild(startBtn);
      unlockCard.appendChild(unlockActions);
    }
    container.appendChild(unlockCard);
  }

  if (sim.dnaZoneCommitted) {
    const dnaCommittedCard = el("section", "nx-card");
    dnaCommittedCard.appendChild(el("div", "nx-card-title", "Zone 2 aktiv"));
    dnaCommittedCard.appendChild(el("div", "nx-note", "Die DNA-Zone ist bestaetigt und erzeugt jetzt deterministisch DNA im laufenden Run."));
    dnaCommittedCard.append(
      mkMetric("Naechster Unlock", "Infrastruktur", "nx-mono nx-val-pos"),
      mkMetric("DNA-Kosten", fmt(Number(sim.nextInfraUnlockCostDNA || 0), 0)),
    );
    container.appendChild(dnaCommittedCard);
  }

  if (sim.dnaZoneCommitted || String(sim.infraBuildMode || "") === "path" || !!sim.infrastructureUnlocked) {
    const infraCard = el("section", "nx-card");
    const stagedCount = countMaskTiles(state.world?.infraCandidateMask);
    const infraReady = String(sim.nextZoneUnlockKind || "") === "INFRA";
    const inBuildMode = String(sim.infraBuildMode || "") === "path";
    const infraTitle = inBuildMode ? "Infrastrukturpfad aktiv" : (sim.infrastructureUnlocked ? "Infrastruktur aktiv" : "Infrastruktur");
    infraCard.appendChild(el("div", "nx-card-title", infraTitle));
    infraCard.appendChild(el("div", "nx-note", inBuildMode
      ? "Canvas-Klicks setzen oder entfernen den Pfad. Bestaetigen commitet, leer bestaetigen bricht ohne Kosten ab."
      : "Infrastruktur erweitert Sicht nur ueber committete Verbindungen. Ausbau bleibt an Link und Sicht gebunden."));
    infraCard.append(
      mkMetric("Status", inBuildMode ? "Pfad-Setup" : (sim.infrastructureUnlocked ? "freigeschaltet" : (infraReady ? "bereit" : "gesperrt")), inBuildMode || sim.infrastructureUnlocked || infraReady ? "nx-mono nx-val-pos" : "nx-mono nx-val-neg"),
      mkMetric("Staged Pfad", String(stagedCount)),
      mkMetric("DNA Startkosten", fmt(Number(sim.nextInfraUnlockCostDNA || 0), 0)),
      mkMetric("Energie Buildkosten", fmt(Number(sim.infraBuildCostEnergy || 0), 0)),
    );
    const infraActions = el("div", "nx-chip-grid");
    if (!inBuildMode && !sim.infrastructureUnlocked) {
      const startInfraBtn = el("button", "nx-btn nx-btn-primary", "Infrastruktur starten");
      startInfraBtn.addEventListener("click", actions.startInfra);
      infraActions.appendChild(startInfraBtn);
    }
    if (inBuildMode) {
      const confirmInfraBtn = el("button", "nx-btn nx-btn-primary", "Infrastruktur bestaetigen");
      confirmInfraBtn.addEventListener("click", actions.confirmInfra);
      infraActions.appendChild(confirmInfraBtn);
    }
    if (infraActions.childNodes.length > 0) {
      infraCard.appendChild(infraActions);
    }
    container.appendChild(infraCard);
  }

  const timeCard = el("section", "nx-card");
  timeCard.appendChild(el("div", "nx-card-title", "Zeitfenster"));
  timeCard.appendChild(el("div", "nx-note", advisorModel.advisor.nextAction === "wait_and_advance_time"
    ? "Beobachtung bleibt die empfohlene Hauptaktion. Direkte Browser-Vorspulfunktionen wurden entfernt, damit der Live-Client keinen Sonderpfad mehr besitzt."
    : "Wirkungen werden nur noch ueber normale Run-Schritte und externe Evidence-Tests gelesen, nicht ueber Live-Vorspulen."));
  container.appendChild(timeCard);

  if (gateFeedback.length) {
    const gateCard = el("section", "nx-card");
    gateCard.appendChild(el("div", "nx-card-title", "Gate-Check"));
    for (const item of gateFeedback) {
      const row = el("div", "nx-stat-row nx-stat-row-col");
      row.appendChild(el("span", item.level === "warn" ? "nx-label nx-val-neg" : "nx-label", item.text));
      row.appendChild(el("span", "nx-note", item.next));
      gateCard.appendChild(row);
    }
    container.appendChild(gateCard);
  }

  const ovCard = el("section", "nx-card");
  ovCard.appendChild(el("div", "nx-card-title", "Diagnose"));
  ovCard.appendChild(el("div", "nx-note", `Diagnose bleibt im Labor. Empfohlen waere derzeit ${overlayState.label} fuer ${bottleneckState.title}, aber der Main-Run bleibt in der kanonischen Weltansicht.`));
  container.appendChild(ovCard);
}
