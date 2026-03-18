export function replayActions(store, actions = []) {
  if (!store || typeof store.dispatch !== "function") throw new Error("replayActions requires a store with dispatch");
  if (!Array.isArray(actions)) throw new Error("replayActions actions must be array");
  const signatures = [];
  for (const action of actions) {
    store.dispatch(action);
    signatures.push(store.getSignature());
  }
  return signatures;
}
