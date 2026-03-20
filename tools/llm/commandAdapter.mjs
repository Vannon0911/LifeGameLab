const ACTION_ENVELOPE = "LLM_COMMAND";

function toPlainAction(input) {
  if (!input || typeof input !== "object") return input;
  if (input.type !== ACTION_ENVELOPE) return input;

  const candidate = input.payload?.action;
  if (!candidate || typeof candidate !== "object") {
    throw new Error("LLM_COMMAND requires payload.action");
  }
  if (typeof candidate.type !== "string" || candidate.type.length === 0) {
    throw new Error("LLM_COMMAND payload.action.type must be a string");
  }

  return {
    type: candidate.type,
    payload: candidate.payload,
  };
}

export function createLlmCommandAdapter() {
  return function llmCommandAdapter(action) {
    return toPlainAction(action);
  };
}

export { ACTION_ENVELOPE };
