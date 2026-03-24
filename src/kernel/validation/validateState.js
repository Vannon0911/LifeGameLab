import { isPlainObject } from "../shared/isPlainObject.js";

export function sanitizeBySchema(value, schema) {
  return _sanitize(value, schema, null, "value");
}

export function assertValidBySchema(value, schema, path = "value") {
  _assertValid(value, schema, path);
}

const MAX_SAFE_LENGTH = 50 * 1024 * 1024;

const TYPED_ARRAY_CTORS = {
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array,
  BigInt64Array: typeof BigInt64Array !== "undefined" ? BigInt64Array : undefined,
  BigUint64Array: typeof BigUint64Array !== "undefined" ? BigUint64Array : undefined,
};

function resolveTypedLength(lenSpec, ctx) {
  if (typeof lenSpec === "number" && Number.isFinite(lenSpec)) return Math.max(0, lenSpec | 0);
  if (typeof lenSpec !== "string") return null;
  const N = Math.max(0, Number(ctx?.N || 0) | 0);
  const TRAIT_COUNT = Math.max(1, Number(ctx?.TRAIT_COUNT || 7) | 0);
  if (lenSpec === "N") return N;
  if (lenSpec === "N*TRAIT_COUNT") return N * TRAIT_COUNT;
  if (/^\d+$/.test(lenSpec)) return Number(lenSpec) | 0;
  return null;
}

function coerceTypedArray(v, ctorName, targetLen) {
  const Ctor = TYPED_ARRAY_CTORS[ctorName];
  if (typeof Ctor !== "function") throw new Error(`Unknown TypedArray ctor '${ctorName}'`);

  if (ArrayBuffer.isView(v) && v.constructor === Ctor) {
    if (targetLen == null || v.length === targetLen) return new Ctor(v);
    const out = new Ctor(targetLen);
    out.set(v.subarray(0, Math.min(v.length, targetLen)));
    return out;
  }

  const src = ArrayBuffer.isView(v)
    ? Array.from(v)
    : Array.isArray(v)
      ? v
      : [];

  const safeLen = targetLen == null ? Math.min(src.length, MAX_SAFE_LENGTH) : Math.min(targetLen, MAX_SAFE_LENGTH);
  const out = new Ctor(safeLen);
  if (src.length) out.set(src.slice(0, safeLen));
  return out;
}

function _sanitize(v, s, ctx, path) {
  if (!s) return v;
  switch (s.type) {
    case "string": {
      const out = typeof v === "string" ? v : (s.default ?? "");
      if (typeof s.maxLen === "number") return out.slice(0, s.maxLen);
      return out.slice(0, 1024 * 1024);
    }
    case "number": {
      let out = (typeof v === "number" && Number.isFinite(v)) ? v : (s.default ?? 0);
      if (typeof s.min === "number") out = Math.max(s.min, out);
      if (typeof s.max === "number") out = Math.min(s.max, out);
      if (s.int) out = Math.trunc(out);
      return out;
    }
    case "boolean":
      return typeof v === "boolean" ? v : (s.default ?? false);
    case "enum": {
      const allowed = Array.isArray(s.values) ? s.values : [];
      if (allowed.includes(v)) return v;
      return s.default ?? (allowed[0] ?? null);
    }
    case "array": {
      const isTyped = v && v.buffer instanceof ArrayBuffer && v.byteLength !== undefined;
      const arr = (Array.isArray(v) || isTyped) ? v : (Array.isArray(s.default) ? s.default : []);
      if (arr.length > MAX_SAFE_LENGTH) throw new Error(`Array length exceeds safety limit (${MAX_SAFE_LENGTH})`);
      const maxLen = typeof s.maxLen === "number" ? s.maxLen : Infinity;
      const effectiveLen = Math.min(maxLen, MAX_SAFE_LENGTH);
      return Array.from(arr.slice(0, effectiveLen), (x, index) => _sanitize(x, s.items, ctx, `${path}[${index}]`));
    }
    case "ta": {
      const nextCtx = ctx || {};
      const targetLen = resolveTypedLength(s.len, nextCtx);
      return coerceTypedArray(v, s.ctor, targetLen);
    }
    case "object": {
      const shape = s.shape;
      const src = (v && typeof v === "object" && !Array.isArray(v)) ? v : (s.default ?? {});
      if (s.allowUnknown === true) return cloneUnknownValue(src, path);
      if (!shape) return {};

      const nextCtx = { ...(ctx || {}) };
      const out = {};
      for (const key of Object.keys(shape)) {
        out[key] = _sanitize(src[key], shape[key], nextCtx, `${path}.${key}`);
        if (key === "w") nextCtx.W = Number(out[key]) | 0;
        if (key === "h") nextCtx.H = Number(out[key]) | 0;
        if (key === "w" || key === "h") nextCtx.N = Math.max(0, (Number(nextCtx.W) | 0) * (Number(nextCtx.H) | 0));
      }
      return out;
    }
    default:
      return s.default ?? null;
  }
}

function cloneUnknownValue(value, path, ancestors = new WeakSet()) {
  if (value === null) return null;
  const t = typeof value;
  if (t === "string" || t === "boolean") return value;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error(`non-serializable value at path: ${path}`);
    return value;
  }
  if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
    throw new Error(`non-serializable value at path: ${path}`);
  }
  if (ArrayBuffer.isView(value)) return new value.constructor(value);
  if (Array.isArray(value)) {
    const out = new Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
      out[i] = cloneUnknownValue(value[i], `${path}[${i}]`, ancestors);
    }
    return out;
  }
  if (!isPlainObject(value)) throw new Error(`non-plain object at path: ${path}`);
  if (ancestors.has(value)) throw new Error(`circular reference at path: ${path}`);
  ancestors.add(value);
  try {
    const out = {};
    for (const key of Object.keys(value)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      out[key] = cloneUnknownValue(value[key], `${path}.${key}`, ancestors);
    }
    return out;
  } finally {
    ancestors.delete(value);
  }
}

function _assertValid(v, s, path) {
  if (!s) return;
  if (v === undefined) return;
  switch (s.type) {
    case "string":
      if (typeof v !== "string") throw new Error(`${path} must be string`);
      return;
    case "number":
      if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${path} must be finite number`);
      return;
    case "boolean":
      if (typeof v !== "boolean") throw new Error(`${path} must be boolean`);
      return;
    case "enum": {
      const allowed = Array.isArray(s.values) ? s.values : [];
      if (!allowed.includes(v)) throw new Error(`${path} must be one of ${allowed.join(",")}`);
      return;
    }
    case "array":
      if (!Array.isArray(v) && !(v && v.buffer instanceof ArrayBuffer && v.byteLength !== undefined)) {
        throw new Error(`${path} must be array`);
      }
      return;
    case "ta":
      if (!Array.isArray(v) && !ArrayBuffer.isView(v)) throw new Error(`${path} must be typed-array compatible`);
      return;
    case "object": {
      if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error(`${path} must be object`);
      const shape = s.shape || {};
      if (s.allowUnknown !== true) {
        for (const key of Object.keys(v)) {
          if (!Object.prototype.hasOwnProperty.call(shape, key)) {
            throw new Error(`${path}.${key} is not allowed`);
          }
        }
      }
      for (const key of Object.keys(shape)) {
        if (Object.prototype.hasOwnProperty.call(v, key)) {
          _assertValid(v[key], shape[key], `${path}.${key}`);
        }
      }
      return;
    }
    default:
      return;
  }
}
