export function installWebStubs() {
  const storage = new Map();
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  const document = {
    createElement() {
      return {
        set href(_value) {},
        set download(_value) {},
        click() {},
      };
    },
    body: {
      appendChild() {},
      removeChild() {},
    },
  };
  const URL = {
    createObjectURL() {
      return "blob:test";
    },
    revokeObjectURL() {},
  };
  const prev = {
    localStorage: globalThis.localStorage,
    document: globalThis.document,
    URL: globalThis.URL,
  };
  Object.assign(globalThis, { localStorage, document, URL });
  return {
    storage,
    map: storage,
    restore() {
      if (prev.localStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev.localStorage;
      if (prev.document === undefined) delete globalThis.document;
      else globalThis.document = prev.document;
      if (prev.URL === undefined) delete globalThis.URL;
      else globalThis.URL = prev.URL;
    },
  };
}
