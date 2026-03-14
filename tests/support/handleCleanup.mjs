function isTimerHandle(h) {
  if (!h) return false;
  const ctor = h.constructor?.name || "";
  return ctor === "Timeout" || ctor === "Immediate";
}

export async function closeDanglingHandles() {
  const handles = typeof process._getActiveHandles === "function" ? process._getActiveHandles() : [];
  for (const h of handles) {
    if (!isTimerHandle(h)) continue;
    try {
      if (typeof h.hasRef === "function" && h.hasRef() && typeof h.unref === "function") h.unref();
    } catch {}
    try {
      if (typeof h.close === "function") h.close();
    } catch {}
  }
  await new Promise((resolve) => setImmediate(resolve));
}

