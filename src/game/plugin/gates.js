import { isPlainObject } from "../../kernel/shared/isPlainObject.js";

function getCtorName(v) {
  return v && v.constructor && typeof v.constructor.name === "string" ? v.constructor.name : "";
}

function patchValueError(path, msg) {
  return new Error(`SIM_GATE: ${path}: ${msg}`);
}

function getNextDims(state, patches) {
  let w = Number(state?.meta?.gridW || state?.world?.w || 0) | 0;
  let h = Number(state?.meta?.gridH || state?.world?.h || 0) | 0;
  for (const p of patches) {
    if (p?.op !== "set") continue;
    if (p.path === "/meta/gridW" || p.path === "/world/w") w = Number(p.value) | 0;
    if (p.path === "/meta/gridH" || p.path === "/world/h") h = Number(p.value) | 0;
  }
  return { w, h, N: Math.max(0, w * h) };
}

function expectedLen(expr, N, traitCount) {
  if (expr === "N") return N;
  if (expr === "N*TRAIT_COUNT") return N * traitCount;
  return null;
}

export function assertPluginDomainPatchesAllowed({ manifest, state, actionType, patches }) {
  const gate = manifest?.simGate;
  if (!gate || typeof gate !== "object") return;

  const maxPatches = Number(gate.limits?.maxPatches ?? 5000);
  const maxTiles = Number(gate.limits?.maxTiles ?? 250000);
  const traitCount = Number(gate.world?.traitCount ?? 7) | 0;

  if (!Array.isArray(patches)) throw new Error("SIM_GATE: patches must be array");
  if (patches.length > maxPatches) throw new Error(`SIM_GATE: patch count exceeds limit (${patches.length} > ${maxPatches})`);

  const { w, h, N } = getNextDims(state, patches);
  if (w <= 0 || h <= 0) throw new Error(`SIM_GATE: invalid dims w=${w} h=${h} (${actionType})`);
  if (N > maxTiles) throw new Error(`SIM_GATE: tiles exceeds limit (${N} > ${maxTiles})`);

  const worldSpec = gate.world?.keys || {};
  const simKeys = Array.isArray(gate.sim?.keys) ? gate.sim.keys : [];
  const simKeySet = new Set(simKeys);
  const simBooleanKeys = new Set(Array.isArray(gate.sim?.booleanKeys) ? gate.sim.booleanKeys : []);
  const simStringKeys = new Set(Array.isArray(gate.sim?.stringKeys) ? gate.sim.stringKeys : []);
  const simObjectKeys = new Set(Array.isArray(gate.sim?.objectKeys) ? gate.sim.objectKeys : []);

  for (const p of patches) {
    if (!p || typeof p !== "object") throw new Error("SIM_GATE: patch must be object");
    if (p.op !== "set" && p.op !== "inc" && p.op !== "push" && p.op !== "del") {
      throw new Error(`SIM_GATE: unsupported op ${String(p.op)}`);
    }
    const path = p.path;
    if (typeof path !== "string" || !path.startsWith("/")) throw new Error("SIM_GATE: invalid path");

    if (path.startsWith("/world/")) {
      const seg = path.slice("/world/".length);
      if (!seg || seg.includes("/")) throw patchValueError(path, "nested world writes not allowed");
      const spec = worldSpec[seg];
      if (!spec) throw patchValueError(path, `unknown world key '${seg}'`);
      if (p.op !== "set") throw patchValueError(path, "world writes must be op:set");

      const v = p.value;
      if (spec.type === "number") {
        if (!Number.isFinite(Number(v))) throw patchValueError(path, "expected finite number");
      } else if (spec.type === "object") {
        if (!isPlainObject(v)) throw patchValueError(path, "expected plain object");
      } else if (spec.type === "ta") {
        if (!v || !ArrayBuffer.isView(v)) throw patchValueError(path, "expected TypedArray");
        const ctor = getCtorName(v);
        if (ctor !== spec.ctor) throw patchValueError(path, `expected ${spec.ctor}, got ${ctor || "unknown"}`);
        const need = expectedLen(spec.len, N, traitCount);
        if (need != null && v.length !== need) throw patchValueError(path, `expected length ${need}, got ${v.length}`);
      } else {
        throw patchValueError(path, `unsupported spec type '${String(spec.type)}'`);
      }
      continue;
    }

    if (path.startsWith("/sim/")) {
      const seg = path.slice("/sim/".length);
      if (!seg || seg.includes("/")) throw patchValueError(path, "nested sim writes not allowed");
      if (!simKeySet.has(seg)) throw patchValueError(path, `unknown sim key '${seg}'`);
      if (p.op !== "set") throw patchValueError(path, "sim writes must be op:set");
      const v = p.value;
      if (simBooleanKeys.has(seg)) {
        if (typeof v !== "boolean") throw patchValueError(path, "expected boolean");
      } else if (simStringKeys.has(seg)) {
        if (typeof v !== "string") throw patchValueError(path, "expected string");
      } else if (simObjectKeys.has(seg)) {
        if (!isPlainObject(v)) throw patchValueError(path, "expected plain object");
      } else {
        if (!Number.isFinite(Number(v))) throw patchValueError(path, "expected finite number");
      }
      continue;
    }
  }
}

// Canonical runtime gate entrypoint used by runtime manifest + kernel bridge.
export const assertDomainPatchGate = assertPluginDomainPatchesAllowed;
