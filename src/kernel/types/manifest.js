/**
 * Kernel manifest contract descriptor.
 * Runtime contract stays provided by domain/plugin manifest objects.
 */
export const KernelManifestContract = Object.freeze({
  requiredKeys: ["SCHEMA_VERSION", "stateSchema", "actionSchema", "mutationMatrix"],
});
