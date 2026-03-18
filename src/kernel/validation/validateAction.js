import { assertValidBySchema, sanitizeBySchema } from "./validateState.js";

export function validateActionAgainstSchema(actionSchema, action) {
  const type = action?.type;
  if (typeof type !== "string") throw new Error("Action.type must be string");
  const schema = actionSchema[type];
  if (!schema) throw new Error(`Unknown action type: ${type}`);
  assertValidBySchema(action.payload ?? {}, schema, `action.payload(${type})`);
  const cleanPayload = sanitizeBySchema(action.payload ?? {}, schema);
  return { type, payload: cleanPayload };
}
