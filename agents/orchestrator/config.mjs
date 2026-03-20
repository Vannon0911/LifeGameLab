/**
 * Configuration Loader — Laedt und merged Config aus Default + Custom + Env.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createModel } from "./models/index.mjs";

const CONFIG_DIR = new URL(".", import.meta.url).pathname;
const DEFAULT_CONFIG_PATH = join(CONFIG_DIR, "config.default.json");

/**
 * Laedt eine JSON-Config-Datei.
 */
async function loadJsonConfig(filePath) {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Laedt die vollstaendige Konfiguration (Default + Custom + CLI-Overrides).
 *
 * @param {object} overrides - CLI-Overrides: { configPath, model, provider, verbose, dryRun }
 * @returns {Promise<{ modelMap: object, defaultModel: object, verbose: boolean, dryRun: boolean }>}
 */
export async function loadConfig(overrides = {}) {
  // 1. Default-Config laden
  const defaultConfig = await loadJsonConfig(DEFAULT_CONFIG_PATH) || {};

  // 2. Custom-Config laden (falls angegeben)
  let customConfig = {};
  if (overrides.configPath) {
    customConfig = await loadJsonConfig(overrides.configPath) || {};
    if (!customConfig || Object.keys(customConfig).length === 0) {
      console.warn(`Warning: Could not load config from ${overrides.configPath}`);
    }
  }

  // 3. Configs mergen (Custom > Default)
  const merged = {
    defaultProvider: customConfig.defaultProvider || defaultConfig.defaultProvider || "openai",
    defaultModel: customConfig.defaultModel || defaultConfig.defaultModel || "gpt-4o",
    roleModels: { ...defaultConfig.roleModels, ...customConfig.roleModels },
    options: { ...defaultConfig.options, ...customConfig.options },
  };

  // 4. CLI-Overrides anwenden
  if (overrides.model) {
    // Globales Modell-Override: "provider:model" oder nur "model"
    const parts = overrides.model.split(":");
    if (parts.length >= 2) {
      merged.defaultProvider = parts[0];
      merged.defaultModel = parts.slice(1).join(":");
    } else {
      merged.defaultModel = overrides.model;
    }
  }
  if (overrides.provider) {
    merged.defaultProvider = overrides.provider;
  }

  // 5. Model-Adapter erstellen
  const defaultModelAdapter = createModel(merged.defaultProvider, {
    modelId: merged.defaultModel,
    maxTokens: merged.options.maxTokens,
    temperature: merged.options.temperature,
  });

  const modelMap = {};
  for (const [roleKey, roleConfig] of Object.entries(merged.roleModels || {})) {
    modelMap[roleKey] = createModel(roleConfig.provider || merged.defaultProvider, {
      modelId: roleConfig.modelId || merged.defaultModel,
      maxTokens: merged.options.maxTokens,
      temperature: merged.options.temperature,
    });
  }

  return {
    modelMap,
    defaultModel: defaultModelAdapter,
    verbose: overrides.verbose ?? merged.options.verbose ?? false,
    dryRun: overrides.dryRun ?? false,
  };
}

/**
 * Validiert die Konfiguration und gibt Warnungen aus.
 */
export function validateConfig(config) {
  const issues = [];

  // Default-Model pruefen
  const defaultCheck = config.defaultModel.validate();
  if (!defaultCheck.ok) {
    issues.push(`Default model: ${defaultCheck.error}`);
  }

  // Alle Role-Models pruefen
  for (const [role, model] of Object.entries(config.modelMap)) {
    const check = model.validate();
    if (!check.ok) {
      issues.push(`${role} (${model}): ${check.error}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
