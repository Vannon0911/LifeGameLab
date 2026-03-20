export function issueWorkerMove(dispatch, from, target) {
  const entityId = `worker:${Number(from.x) | 0}:${Number(from.y) | 0}`;
  return dispatch({ type: "ISSUE_MOVE", payload: { entityId, targetX: target.x, targetY: target.y } });
}
