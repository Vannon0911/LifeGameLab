/**
 * Anthropic Model Adapter — Claude 3.5 Sonnet, Claude 3 Opus, etc.
 *
 * Env: ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL (optional)
 */

import { BaseModelAdapter } from "./base.mjs";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const API_VERSION = "2023-06-01";

export class AnthropicAdapter extends BaseModelAdapter {
  constructor(config = {}) {
    super(config);
    this.modelId = config.modelId || "claude-sonnet-4-20250514";
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = config.baseUrl || process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL;
  }

  validate() {
    if (!this.apiKey) {
      return { ok: false, error: "ANTHROPIC_API_KEY not set" };
    }
    return { ok: true };
  }

  async chat(messages, options = {}) {
    const maxTokens = options.maxTokens || this.maxTokens;
    const temperature = options.temperature ?? this.temperature;

    // Anthropic trennt system-message vom messages-Array
    let systemPrompt = "";
    const chatMessages = [];
    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt += (systemPrompt ? "\n\n" : "") + msg.content;
      } else {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // Anthropic verlangt, dass messages mit "user" beginnen
    if (chatMessages.length === 0 || chatMessages[0].role !== "user") {
      chatMessages.unshift({ role: "user", content: "Begin." });
    }

    const body = {
      model: this.modelId,
      max_tokens: maxTokens,
      temperature,
      messages: chatMessages,
    };
    if (systemPrompt) body.system = systemPrompt;
    if (options.stop) body.stop_sequences = options.stop;

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Anthropic API ${res.status}: ${text}`);
    }

    const data = await res.json();
    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock) throw new Error("Anthropic API returned no text content");

    return {
      content: textBlock.text || "",
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
      },
    };
  }
}
