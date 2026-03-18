// Neutral UI feedback bridge (string-free domain guidance removed).

export function createActionFeedback(payload, now = Date.now()) {
  return {
    ok: !!payload?.ok,
    message: String(payload?.message || ""),
    hint: String(payload?.hint || ""),
    at: now,
  };
}

export function buildGateFeedback(_playerMemory, _playerStage, _commandScore) {
  return [];
}

export function announceInLiveRegion(announcer, message, ariaLevel, level = 1) {
  if (!announcer || typeof message !== "string" || message.length === 0) return;
  if (Number(ariaLevel || 1) < level) return;
  announcer.textContent = "";
  queueMicrotask(() => {
    announcer.textContent = message;
  });
}
