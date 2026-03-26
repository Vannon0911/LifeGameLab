import { createNullDriver } from "../../kernel/store/persistence.js";

export const createWebDriver = (key = "llm_kernel_state") => ({
  load: () => {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw);
  },
  save: (doc) => {
    localStorage.setItem(key, JSON.stringify(doc));
  },
  export: (doc) => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "state_export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});

export const createMetaOnlyWebDriver = (key = "llm_kernel_meta_v1") => ({
  load: () => {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    const doc = JSON.parse(raw);
    if (doc && doc.state) {
      if (!doc.state.map || typeof doc.state.map !== "object" || Array.isArray(doc.state.map)) {
        doc.state.map = {};
      }
      doc.state.world = {};
      doc.state.sim = {};
    }
    return doc;
  },
  save: (doc) => {
    const slim = {
      schemaVersion: doc.schemaVersion,
      updatedAt: doc.updatedAt,
      revisionCount: doc.revisionCount,
      state: {
        meta: doc.state.meta,
        map: doc.state.map || {},
        world: {},
        sim: {},
      },
    };
    localStorage.setItem(key, JSON.stringify(slim));
  },
  export: createWebDriver().export,
});

export function getDefaultWebDriver() {
  if (typeof localStorage !== "undefined" && typeof document !== "undefined") {
    return createMetaOnlyWebDriver();
  }
  return createNullDriver();
}
