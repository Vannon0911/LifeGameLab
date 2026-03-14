import crypto from "node:crypto";

function sortKeys(obj) {
  return Object.keys(obj).sort();
}

function formatValue(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
  if (Array.isArray(value)) return `[array len=${value.length}]`;
  if (value && typeof value === "object") return `{object keys=${Object.keys(value).length}}`;
  return String(value);
}

function diffValues(a, b, path = "$") {
  if (Object.is(a, b)) return null;

  const typeA = Array.isArray(a) ? "array" : a === null ? "null" : typeof a;
  const typeB = Array.isArray(b) ? "array" : b === null ? "null" : typeof b;
  if (typeA !== typeB) {
    return { path, reason: `type mismatch ${typeA} vs ${typeB}`, a, b };
  }

  if (typeA === "array") {
    if (a.length !== b.length) {
      return { path, reason: `array length mismatch ${a.length} vs ${b.length}`, a: a.length, b: b.length };
    }
    for (let i = 0; i < a.length; i++) {
      const diff = diffValues(a[i], b[i], `${path}[${i}]`);
      if (diff) return diff;
    }
    return { path, reason: "array content mismatch", a, b };
  }

  if (typeA === "object") {
    const keysA = sortKeys(a);
    const keysB = sortKeys(b);
    const keySigA = keysA.join("|");
    const keySigB = keysB.join("|");
    if (keySigA !== keySigB) {
      const missingInA = keysB.filter((k) => !Object.prototype.hasOwnProperty.call(a, k));
      const missingInB = keysA.filter((k) => !Object.prototype.hasOwnProperty.call(b, k));
      return {
        path,
        reason: `object keys mismatch missingInA=${missingInA.join(",") || "-"} missingInB=${missingInB.join(",") || "-"}`,
        a: keysA,
        b: keysB,
      };
    }
    for (const key of keysA) {
      const childDiff = diffValues(a[key], b[key], `${path}.${key}`);
      if (childDiff) return childDiff;
    }
    return { path, reason: "object content mismatch", a, b };
  }

  return { path, reason: "value mismatch", a, b };
}

export function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

export function createSignatureSnapshot(sig) {
  return {
    sig,
    sha256: sha256Hex(sig),
    parsed: JSON.parse(sig),
  };
}

export function explainHashMismatch({ suite, seed, pointLabel, action, left, right }) {
  const diff = diffValues(left.parsed, right.parsed);
  const header = `[${suite}] ${seed}: HASH_MISMATCH at ${pointLabel}${action ? ` action=${action}` : ""}`;
  const hashLines = [
    `left.sha256=${left.sha256}`,
    `right.sha256=${right.sha256}`,
  ];

  if (!diff) {
    return [header, ...hashLines, "reason: material differs but structural diff could not be isolated"];
  }

  return [
    header,
    ...hashLines,
    `reason: ${diff.reason}`,
    `path: ${diff.path}`,
    `left.value=${formatValue(diff.a)}`,
    `right.value=${formatValue(diff.b)}`,
  ];
}
