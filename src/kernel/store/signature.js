import { isPlainObject } from "../shared/isPlainObject.js";

export function hash32(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

export function stableStringify(value) {
  // Deterministic JSON stringify: stable object key order, no whitespace.
  return _stringify(value, "value", new WeakSet());
}

function _stringify(v, path, ancestors) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number") {
    if (!Number.isFinite(v)) throw new Error(`non-serializable value at path: ${path}`);
    return String(v);
  }
  if (t === "boolean") return v ? "true" : "false";
  if (t === "string") return JSON.stringify(v);
  if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
    throw new Error(`non-serializable value at path: ${path}`);
  }
  if (t === "object") {
    if (Array.isArray(v)) return "[" + v.map((entry, index) => _stringify(entry, `${path}[${index}]`, ancestors)).join(",") + "]";
    if (ArrayBuffer.isView(v)) return "[" + Array.from(v, (entry, index) => _stringify(entry, `${path}[${index}]`, ancestors)).join(",") + "]";
    if (!isPlainObject(v)) throw new Error(`non-serializable value at path: ${path}`);
    if (ancestors.has(v)) throw new Error(`circular reference at path: ${path}`);
    ancestors.add(v);
    const keys = Object.keys(v).sort();
    try {
      const parts = [];
      for (const k of keys) {
        parts.push(JSON.stringify(k) + ":" + _stringify(v[k], `${path}.${k}`, ancestors));
      }
      return "{" + parts.join(",") + "}";
    } finally {
      ancestors.delete(v);
    }
  }
  throw new Error(`non-serializable value at path: ${path}`);
}

