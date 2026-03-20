/**
 * Base Model Adapter — gemeinsames Interface fuer alle LLM-Backends.
 *
 * Jeder Adapter muss `chat(messages, options)` implementieren.
 * Messages-Format: [{ role: "system"|"user"|"assistant", content: "..." }]
 */

export class BaseModelAdapter {
  constructor(config = {}) {
    this.modelId = config.modelId || "unknown";
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature ?? 0.2;
  }

  get name() {
    return this.constructor.name;
  }

  /**
   * @param {Array<{role: string, content: string}>} messages
   * @param {object} options - { maxTokens, temperature, stop }
   * @returns {Promise<{content: string, usage: {promptTokens: number, completionTokens: number}}>}
   */
  async chat(_messages, _options) {
    throw new Error(`${this.name}.chat() not implemented`);
  }

  /**
   * Prueft ob der Adapter korrekt konfiguriert ist (API-Key vorhanden, etc.)
   * @returns {{ ok: boolean, error?: string }}
   */
  validate() {
    return { ok: true };
  }

  toString() {
    return `${this.name}(${this.modelId})`;
  }
}
