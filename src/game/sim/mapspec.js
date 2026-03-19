import { hash32, stableStringify } from "../../kernel/store/signature.js";
import { normalizeWorldPresetId } from "./worldPresets.js";

export const MAPSPEC_VERSION = "gdd_v1_1";

export const MAPSPEC_SOURCE = Object.freeze({
  LEGACY_PRESET: "legacy_preset",
  MAPSPEC: "mapspec",
});

export const MAPSPEC_MODE = Object.freeze({
  LEGACY_PRESET: "legacy_preset",
  MANUAL: "manual",
});

const GRID_DEFAULT = 64;
const GRID_MIN = 8;
const GRID_MAX = 256;

function clampGridDimension(value, fallback = GRID_DEFAULT) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const whole = Math.trunc(numeric);
  return Math.max(GRID_MIN, Math.min(GRID_MAX, whole));
}

function pushIssue(issues, condition, code) {
  if (condition) issues.push(code);
}

export function createLegacyPresetMapSpec(options = {}) {
  return {
    version: MAPSPEC_VERSION,
    mode: MAPSPEC_MODE.LEGACY_PRESET,
    presetId: normalizeWorldPresetId(options.presetId),
    gridW: clampGridDimension(options.gridW, GRID_DEFAULT),
    gridH: clampGridDimension(options.gridH, GRID_DEFAULT),
  };
}

export function validateMapSpec(input, options = {}) {
  const fallback = createLegacyPresetMapSpec(options.fallback || {});
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const issues = [];
  const rawPresetId = raw.presetId;
  const rawGridW = raw.gridW;
  const rawGridH = raw.gridH;
  const rawVersion = raw.version;
  const rawMode = raw.mode;

  const spec = {
    ...raw,
    version: typeof rawVersion === "string" && rawVersion.length > 0 ? rawVersion : MAPSPEC_VERSION,
    mode: typeof rawMode === "string" && rawMode.length > 0 ? rawMode : (raw.tilePlan ? MAPSPEC_MODE.MANUAL : fallback.mode),
    presetId: normalizeWorldPresetId(rawPresetId ?? fallback.presetId),
    gridW: clampGridDimension(rawGridW, fallback.gridW),
    gridH: clampGridDimension(rawGridH, fallback.gridH),
  };

  pushIssue(issues, !input || typeof input !== "object" || Array.isArray(input), "spec_not_object");
  pushIssue(issues, rawVersion !== undefined && rawVersion !== MAPSPEC_VERSION, "version_normalized");
  pushIssue(issues, rawPresetId !== undefined && spec.presetId !== String(rawPresetId), "preset_normalized");
  pushIssue(issues, rawGridW !== undefined && spec.gridW !== Number.parseInt(String(rawGridW), 10), "gridW_normalized");
  pushIssue(issues, rawGridH !== undefined && spec.gridH !== Number.parseInt(String(rawGridH), 10), "gridH_normalized");
  pushIssue(issues, rawMode !== undefined && spec.mode !== rawMode, "mode_normalized");

  const status = issues.length ? "normalized" : "valid";
  const summary = issues.length ? issues.join("|") : "ok";

  return {
    spec,
    validation: {
      status,
      issueCount: issues.length,
      summary,
    },
  };
}

export function compileMapSpec(input, options = {}) {
  const { spec, validation } = validateMapSpec(input, options);
  const compiledHash = hash32(stableStringify(spec));
  const snapshot = {
    ...spec,
    compiledHash,
    validationStatus: validation.status,
    validationIssueCount: validation.issueCount,
  };
  return {
    activeSource: MAPSPEC_SOURCE.MAPSPEC,
    spec,
    validation,
    compiledHash,
    snapshot,
    presetId: spec.presetId,
    gridW: spec.gridW,
    gridH: spec.gridH,
  };
}

export function compileStateMapSpec(state, options = {}) {
  const meta = state?.meta || {};
  const map = state?.map || {};
  const fallback = {
    gridW: meta.gridW,
    gridH: meta.gridH,
    presetId: options.presetId ?? meta.worldPresetId,
  };

  if (options.presetId) {
    const legacySpec = createLegacyPresetMapSpec({ ...fallback, presetId: options.presetId });
    const compiled = compileMapSpec(legacySpec, { fallback });
    return { ...compiled, activeSource: MAPSPEC_SOURCE.LEGACY_PRESET };
  }

  if (map.activeSource === MAPSPEC_SOURCE.MAPSPEC) {
    return compileMapSpec(map.spec, { fallback });
  }

  const legacySpec = createLegacyPresetMapSpec(fallback);
  const compiled = compileMapSpec(legacySpec, { fallback });
  return { ...compiled, activeSource: MAPSPEC_SOURCE.LEGACY_PRESET };
}
