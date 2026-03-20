// ============================================================
// Builder Undo/Redo History
// Stores { forward, inverse, label } triples.
// forward = snapshot to apply on redo
// inverse = snapshot to apply on undo
// label = human-readable action description for UI display
//         (e.g. "Surface Paint", "Erase", "Resource Place")
// ============================================================

/**
 * Create a builder history tracker with forward/inverse/label triples.
 * @param {number} maxSize - maximum undo depth (default 200)
 */
export function createBuilderHistory(maxSize) {
  const limit = Math.max(1, (maxSize | 0) || 200);
  const stack = [];
  let cursor = -1;

  return {
    /**
     * Push a new action onto the history.
     * Discards any redo entries beyond current cursor.
     * @param {object} entry
     * @param {object} entry.forward - state snapshot to apply on redo
     * @param {object} entry.inverse - state snapshot to apply on undo
     * @param {string} entry.label  - human-readable label
     */
    push(entry) {
      if (!entry || typeof entry !== "object") return;
      const record = {
        forward: entry.forward ? JSON.parse(JSON.stringify(entry.forward)) : {},
        inverse: entry.inverse ? JSON.parse(JSON.stringify(entry.inverse)) : {},
        label: String(entry.label || ""),
      };
      cursor++;
      stack.length = cursor;
      stack.push(record);
      if (stack.length > limit) {
        stack.shift();
        cursor = stack.length - 1;
      }
    },

    /**
     * Undo: move cursor back and return the inverse snapshot.
     * Returns null if nothing to undo.
     * @returns {{ inverse: object, label: string } | null}
     */
    undo() {
      if (cursor <= 0) return null;
      const entry = stack[cursor];
      cursor--;
      return {
        inverse: JSON.parse(JSON.stringify(entry.inverse)),
        label: entry.label,
      };
    },

    /**
     * Redo: move cursor forward and return the forward snapshot.
     * Returns null if nothing to redo.
     * @returns {{ forward: object, label: string } | null}
     */
    redo() {
      if (cursor >= stack.length - 1) return null;
      cursor++;
      const entry = stack[cursor];
      return {
        forward: JSON.parse(JSON.stringify(entry.forward)),
        label: entry.label,
      };
    },

    canUndo() {
      return cursor > 0;
    },

    canRedo() {
      return cursor < stack.length - 1;
    },

    clear() {
      stack.length = 0;
      cursor = -1;
    },

    /** Current entry label (for UI display). */
    currentLabel() {
      if (cursor < 0 || cursor >= stack.length) return "";
      return stack[cursor].label;
    },

    /** Next undo label (what would be undone). */
    undoLabel() {
      if (cursor <= 0) return "";
      return stack[cursor].label;
    },

    /** Next redo label (what would be redone). */
    redoLabel() {
      if (cursor >= stack.length - 1) return "";
      return stack[cursor + 1].label;
    },

    get depth() {
      return stack.length;
    },

    get position() {
      return cursor;
    },
  };
}
