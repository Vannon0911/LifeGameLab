export function assertDomainPatchesAllowed(manifest, state, actionType, patches) {
  const gate = manifest?.domainPatchGate ?? manifest?.manifest?.domainPatchGate;
  if (gate == null) return;
  if (typeof gate !== "function") {
    throw new Error("Manifest domainPatchGate must be a function when provided");
  }
  gate({ manifest, state, actionType, patches });
}
