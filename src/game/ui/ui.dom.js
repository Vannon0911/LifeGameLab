export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function fmt(v, d = 2) {
  return (typeof v === "number" && Number.isFinite(v)) ? v.toFixed(d) : "--";
}

export function fmtSign(v, d = 2) {
  return (typeof v === "number" && Number.isFinite(v)) ? (v >= 0 ? "+" : "") + v.toFixed(d) : "--";
}

export function isDesktopLayout() {
  return window.matchMedia("(min-width:800px)").matches;
}
