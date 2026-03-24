// Compatibility facade: keep legacy sim gate signature while using canonical plugin gate.
import { assertPluginDomainPatchesAllowed } from "../plugin/gates.js";

export { assertPluginDomainPatchesAllowed };

export function assertSimPatchesAllowed(manifest, state, actionType, patches) {
  assertPluginDomainPatchesAllowed({ manifest, state, actionType, patches });
}
