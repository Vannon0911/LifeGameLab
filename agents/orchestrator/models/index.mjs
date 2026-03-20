/**
 * Model Registry — Factory fuer alle verfuegbaren LLM-Adapter.
 */

import { OpenAIAdapter } from "./openai.mjs";
import { AnthropicAdapter } from "./anthropic.mjs";
import { OllamaAdapter } from "./ollama.mjs";

const PROVIDERS = Object.freeze({
  openai: OpenAIAdapter,
  anthropic: AnthropicAdapter,
  ollama: OllamaAdapter,
});

/**
 * Erstellt einen Model-Adapter anhand von Provider-Name und Config.
 *
 * @param {string} provider - "openai" | "anthropic" | "ollama"
 * @param {object} config - { modelId, apiKey, baseUrl, maxTokens, temperature }
 * @returns {import("./base.mjs").BaseModelAdapter}
 */
export function createModel(provider, config = {}) {
  const key = String(provider || "").toLowerCase();
  const AdapterClass = PROVIDERS[key];
  if (!AdapterClass) {
    const known = Object.keys(PROVIDERS).join(", ");
    throw new Error(`Unknown model provider '${provider}'. Known: ${known}`);
  }
  return new AdapterClass(config);
}

/**
 * Erstellt einen Adapter aus einem kombinierten String "provider:modelId".
 * z.B. "openai:gpt-4o", "anthropic:claude-sonnet-4-20250514", "ollama:llama3"
 */
export function createModelFromSpec(spec, extraConfig = {}) {
  const parts = String(spec || "").split(":");
  const provider = parts[0] || "openai";
  const modelId = parts.slice(1).join(":") || undefined;
  return createModel(provider, { ...extraConfig, modelId });
}

/**
 * Listet alle verfuegbaren Provider auf.
 */
export function listProviders() {
  return Object.keys(PROVIDERS);
}

/**
 * Validiert alle konfigurierten Modelle und gibt Status zurueck.
 */
export function validateModels(modelMap) {
  const results = {};
  for (const [role, model] of Object.entries(modelMap)) {
    results[role] = { model: model.toString(), ...model.validate() };
  }
  return results;
}

export { OpenAIAdapter, AnthropicAdapter, OllamaAdapter };
