// Compatibility facade. The contract implementation lives in src/project/contract/*.
export {
  SCHEMA_VERSION,
  APP_VERSION,
  stateSchema,
  actionSchema,
  mutationMatrix,
  simGate,
  dataflow,
  manifest,
} from "./contract/manifest.js";
