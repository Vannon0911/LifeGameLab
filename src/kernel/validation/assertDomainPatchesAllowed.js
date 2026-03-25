function normalizeArgs(args) {
  if (args.length === 1 && args[0] && typeof args[0] === "object" && Object.prototype.hasOwnProperty.call(args[0], "manifest")) {
    return args[0];
  }
  return {
    manifest: args[0],
    state: args[1],
    actionType: args[2],
    patches: args[3],
  };
}

export function assertDomainPatchesAllowed(...args) {
  const { manifest, state, actionType, patches } = normalizeArgs(args);
  const gate = Object.prototype.hasOwnProperty.call(manifest || {}, "domainPatchGate")
    ? manifest.domainPatchGate
    : undefined;
  if (gate == null) return;
  if (typeof gate !== "function") {
    throw new Error("Manifest domainPatchGate must be a function when provided");
  }
  gate({ manifest, state, actionType, patches });
}
