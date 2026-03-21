function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : fallback;
}

export function createActionFeedback(payload = {}) {
  const ok = payload?.ok !== false;
  const message = toText(payload?.message, ok ? "Bereit" : "Aktion fehlgeschlagen");
  const hint = toText(payload?.hint, "");
  return Object.freeze({ ok, message, hint });
}

export function announceInLiveRegion(node, message, level = 1, debounceMs = 0) {
  if (!node) return;
  const text = toText(message, "");
  const safeLevel = Math.max(1, Number(level) | 0);
  const apply = () => {
    node.setAttribute("role", safeLevel >= 2 ? "alert" : "status");
    node.setAttribute("aria-live", safeLevel >= 2 ? "assertive" : "polite");
    node.setAttribute("aria-atomic", "true");
    node.textContent = text;
  };
  const wait = Math.max(0, Number(debounceMs) | 0);
  if (wait === 0) {
    apply();
    return;
  }
  globalThis.clearTimeout?.(node.__liveTimer);
  node.__liveTimer = globalThis.setTimeout?.(apply, wait);
}
