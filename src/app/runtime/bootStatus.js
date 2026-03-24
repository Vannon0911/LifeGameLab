function ensureBootStatus() {
  let el = document.getElementById("boot-status");
  if (el) return el;
  const host = document.getElementById("canvas-wrap") || document.body;
  el = document.createElement("div");
  el.id = "boot-status";
  el.style.position = "absolute";
  el.style.left = "8px";
  el.style.bottom = "8px";
  el.style.zIndex = "20";
  el.style.padding = "6px 8px";
  el.style.background = "rgba(8,12,20,0.78)";
  el.style.border = "1px solid rgba(100,120,160,0.35)";
  el.style.borderRadius = "6px";
  el.style.fontFamily = "JetBrains Mono, monospace";
  el.style.fontSize = "11px";
  el.style.color = "rgba(180,200,240,0.92)";
  host.appendChild(el);
  return el;
}

export function setBootStatus(text, color = "rgba(180,200,240,0.92)") {
  const next = String(text || "");
  if (!next) {
    const existing = document.getElementById("boot-status");
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    return;
  }
  const el = ensureBootStatus();
  el.textContent = next;
  el.style.color = color;
}

export function bindBootStatusErrorHooks() {
  window.addEventListener("error", (ev) => {
    setBootStatus(`Fehler: ${ev?.message || "unbekannt"}`, "rgba(255,150,150,0.95)");
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const msg = String(ev?.reason?.message || ev?.reason || "Promise-Fehler");
    setBootStatus(`Fehler: ${msg}`, "rgba(255,150,150,0.95)");
  });
}
