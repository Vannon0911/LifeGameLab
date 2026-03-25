import assert from "node:assert/strict";

export function assertNoopDispatchRevisionBump(before, after, label) {
  const prefix = label ? `${label}: ` : "";
  assert.equal(
    after.revisionCount,
    before.revisionCount + 2,
    `${prefix}no-op dispatches must still increment revisionCount`,
  );
  assert.notEqual(
    after.signature,
    before.signature,
    `${prefix}no-op dispatches must change signature via revisionCount`,
  );
  assert.notEqual(
    after.signatureMaterialHash,
    before.signatureMaterialHash,
    `${prefix}no-op dispatches must change signature material via revisionCount`,
  );
}
