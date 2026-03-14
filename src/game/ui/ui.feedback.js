export function createActionFeedback(payload, now = Date.now()) {
  return {
    ok: !!payload?.ok,
    message: String(payload?.message || ""),
    hint: String(payload?.hint || ""),
    at: now,
  };
}

export function buildGateFeedback(playerMemory, playerStage, commandScore) {
  const splitTech = Array.isArray(playerMemory?.techs) && playerMemory.techs.includes("cluster_split");
  const splitUnlocked = !!playerMemory?.splitUnlock && splitTech;
  const out = [];
  if (!splitUnlocked) {
    out.push({
      key: "split",
      level: "warn",
      text: "Split-Seed gesperrt: Tech 'Split-Kern' fehlt.",
      next: "Nächster Schritt: Stage 2 erreichen und den Cluster-Split im Evolution-Panel kaufen.",
    });
  } else if (commandScore < 0.22) {
    out.push({
      key: "split-command",
      level: "warn",
      text: "Split-Seed ist freigeschaltet, aber Clusterstärke ist noch niedrig.",
      next: `Nächster Schritt: Command auf mindestens 22 bringen (aktuell ${Math.round(commandScore * 100)}).`,
    });
  }
  if (playerStage < 2 && commandScore < 0.10) {
    out.push({
      key: "zones",
      level: "info",
      text: "Territoriums-Zonen sind noch nicht effektiv.",
      next: "Nächster Schritt: Erst stabilen Kern aufbauen, danach Zone-Paint für Harvest/Buffer nutzen.",
    });
  }
  return out;
}

export function announceInLiveRegion(announcer, message, ariaLevel, level = 1) {
  if (!announcer || !message || typeof message !== "string") return;
  if (Number(ariaLevel || 1) < level) return;
  announcer.textContent = "";
  queueMicrotask(() => {
    announcer.textContent = message;
  });
}
