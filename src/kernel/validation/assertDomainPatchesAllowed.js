export function assertDomainPatchesAllowed(manifest, state, actionType, patches) {
  const gate = Object.prototype.hasOwnProperty.call(manifest || {}, "domainPatchGate")
    ? manifest.domainPatchGate
    : undefined;
  if (gate == null) return;
  if (typeof gate !== "function") {
    throw new Error("Manifest domainPatchGate must be a function when provided");
  }
  gate({ manifest, state, actionType, patches });
}
