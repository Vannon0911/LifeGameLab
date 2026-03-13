export function stableStringify(value) {
  // Deterministic JSON stringify: stable object key order, no whitespace.
  return _stringify(value);
}

function _stringify(v) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number") return Number.isFinite(v) ? String(v) : "null";
  if (t === "boolean") return v ? "true" : "false";
  if (t === "string") return JSON.stringify(v);
  if (t === "object") {
    if (Array.isArray(v)) return "[" + v.map(_stringify).join(",") + "]";
    const keys = Object.keys(v).sort();
    const parts = [];
    for (const k of keys) {
      parts.push(JSON.stringify(k) + ":" + _stringify(v[k]));
    }
    return "{" + parts.join(",") + "}";
  }
  // undefined / function / symbol
  return "null";
}
