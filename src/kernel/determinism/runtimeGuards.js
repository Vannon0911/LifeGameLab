export function runWithDeterminismGuard(fn, meta) {
  if (!meta?.enabled) return fn();

  const origRandom = Math.random;
  const OrigDate = globalThis.Date;
  const OrigIntl = globalThis.Intl;
  const OrigPerf = globalThis.performance;
  const OrigCrypto = globalThis.crypto;
  const cryptoRestorers = [];
  const blocked = (name) => () => { throw new Error(`Non-deterministic source blocked: ${name} (${meta.phase}:${meta.actionType})`); };

  Math.random = blocked("Math.random");
  const _dateMsg = (sub) => `Non-deterministic source blocked: Date${sub} (${meta.phase}:${meta.actionType})`;
  const BlockedDate = new Proxy(OrigDate, {
    apply()     { throw new Error(_dateMsg("()")); },
    construct() { throw new Error(_dateMsg(" constructor")); },
    get(target, prop) {
      if (prop === "now")   return () => { throw new Error(_dateMsg(".now()")); };
      if (prop === "parse") return target.parse.bind(target);
      if (prop === "UTC")   return target.UTC.bind(target);
      const v = target[prop];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
  globalThis.Date = BlockedDate;
  globalThis.Intl = { DateTimeFormat: blocked("Intl.DateTimeFormat"), NumberFormat: blocked("Intl.NumberFormat") };

  if (OrigPerf) {
    globalThis.performance = new Proxy(OrigPerf, {
      get(target, prop) {
        if (prop === "now") return blocked("performance.now()");
        if (prop === "getEntries") return blocked("performance.getEntries()");
        const v = target[prop];
        return typeof v === "function" ? v.bind(target) : v;
      }
    });
  }

  if (OrigCrypto && typeof OrigCrypto === "object") {
    const patchCryptoMethod = (name, marker) => {
      if (typeof OrigCrypto[name] !== "function") return;
      const prev = OrigCrypto[name];
      const replacement = blocked(marker);
      try {
        OrigCrypto[name] = replacement;
      } catch {
        try {
          Object.defineProperty(OrigCrypto, name, {
            configurable: true,
            writable: true,
            value: replacement,
          });
        } catch {
          throw new Error(`Cannot enforce determinism guard for ${marker}`);
        }
      }
      cryptoRestorers.push(() => {
        try {
          OrigCrypto[name] = prev;
        } catch {
          Object.defineProperty(OrigCrypto, name, {
            configurable: true,
            writable: true,
            value: prev,
          });
        }
      });
    };
    patchCryptoMethod("randomUUID", "crypto.randomUUID()");
    patchCryptoMethod("getRandomValues", "crypto.getRandomValues()");
  }

  try {
    return fn();
  } finally {
    globalThis.Date = OrigDate;
    Math.random = origRandom;
    globalThis.Intl = OrigIntl;
    globalThis.performance = OrigPerf;
    for (let i = cryptoRestorers.length - 1; i >= 0; i -= 1) {
      cryptoRestorers[i]();
    }
  }
}

export function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    if (ArrayBuffer.isView(obj)) return obj;
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = obj[key];
      if (prop && typeof prop === "object") deepFreeze(prop);
    }
  }
  return obj;
}
