// Compatibility facade: keep legacy sim gate signature while using canonical plugin gate.
import { assertDomainPatchGate, assertPluginDomainPatchesAllowed } from "../plugin/gates.js";

export { assertDomainPatchGate, assertPluginDomainPatchesAllowed };

export function assertSimPatchesAllowed(manifest, state, actionType, patches) {
  assertDomainPatchGate({ manifest, state, actionType, patches });
}
