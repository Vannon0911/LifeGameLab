/**
 * Ollama Model Adapter — lokale Modelle (Llama, Mistral, etc.)
 *
 * Env: OLLAMA_BASE_URL (default: http://localhost:11434)
 */

import { BaseModelAdapter } from "./base.mjs";

const DEFAULT_BASE_URL = "http://localhost:11434";

export class OllamaAdapter extends BaseModelAdapter {
  constructor(config = {}) {
    super(config);
    this.modelId = config.modelId || "llama3";
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
  }

  validate() {
    // Ollama braucht keinen API-Key, nur einen laufenden Server
    return { ok: true };
  }

  async chat(messages, options = {}) {
    const temperature = options.temperature ?? this.temperature;

    const body = {
      model: this.modelId,
      messages,
      stream: false,
      options: {
        temperature,
      },
    };
    if (options.maxTokens) body.options.num_predict = options.maxTokens;

    let res;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Ollama not reachable at ${this.baseUrl}: ${err.message}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ollama API ${res.status}: ${text}`);
    }

    const data = await res.json();
    return {
      content: data.message?.content || "",
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
      },
    };
  }
}
