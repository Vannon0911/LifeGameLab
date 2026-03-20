/**
 * OpenAI Model Adapter — GPT-4, GPT-4o, etc.
 *
 * Env: OPENAI_API_KEY, OPENAI_BASE_URL (optional)
 */

import { BaseModelAdapter } from "./base.mjs";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export class OpenAIAdapter extends BaseModelAdapter {
  constructor(config = {}) {
    super(config);
    this.modelId = config.modelId || "gpt-4o";
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config.baseUrl || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  }

  validate() {
    if (!this.apiKey) {
      return { ok: false, error: "OPENAI_API_KEY not set" };
    }
    return { ok: true };
  }

  async chat(messages, options = {}) {
    const maxTokens = options.maxTokens || this.maxTokens;
    const temperature = options.temperature ?? this.temperature;
    const body = {
      model: this.modelId,
      messages,
      max_tokens: maxTokens,
      temperature,
    };
    if (options.stop) body.stop = options.stop;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI API ${res.status}: ${text}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error("OpenAI API returned no choices");

    return {
      content: choice.message?.content || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
      },
    };
  }
}
