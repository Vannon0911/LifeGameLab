const WORLD_LOG_COLUMNS = [
  "t",
  "alive",
  "aliveRatio",
  "n",
  "tox",
  "sat",
  "plant",
  "bio",
  "plantTiles",
  "domHue",
  "births",
  "deaths",
  "muts",
  "raids",
  "inf",
  "kills",
  "remote",
  "remoteKills",
  "defAct",
  "stolen",
  "pruned",
  "nCapTiles",
  "eClearTiles",
  "worldMode",
  "ts",
];

function getCookie(name) {
  const safeName = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|; )${safeName}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

function setCookie(name, value) {
  const exp = "Wed, 01 Jan 2030 00:00:00 GMT";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; samesite=lax`;
}

function emitUpdate(meta) {
  try {
    window.dispatchEvent(new CustomEvent("worldlog:update", { detail: meta }));
  } catch {}
}

export function createWorldStateLog(hashStringFn) {
  return {
    cookieKey: "lifex_world_log_meta_v1",
    storagePrefix: "lifex_world_log_v1_",
    sessionId: "",
    storageKey: "",
    lastTrackedTick: -1,
    count: 0,

    init(seed) {
      let meta = {};
      try { meta = JSON.parse(getCookie(this.cookieKey) || "{}"); } catch { meta = {}; }

      const seedHash = hashStringFn(seed || "default").toString(36);
      const deterministicSessionId = `ws_v4_${seedHash}`;
      this.sessionId = meta.sessionId || deterministicSessionId;
      this.storageKey = `${this.storagePrefix}${this.sessionId}`;
      this.lastTrackedTick = Number(meta.lastTrackedTick || -1);
      try {
        const arr = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        this.count = Array.isArray(arr) ? arr.length : 0;
      } catch {
        this.count = 0;
      }
      this.persistMeta();
      emitUpdate(this.getMeta());
    },

    persistMeta() {
      setCookie(this.cookieKey, JSON.stringify({
        sessionId: this.sessionId,
        lastTrackedTick: this.lastTrackedTick,
        count: this.count,
      }));
    },

    track(state) {
      const tick = Number(state?.sim?.tick || 0);
      if (tick <= 0 || (tick % 100) !== 0 || tick === this.lastTrackedTick) return;
      const sim = state.sim || {};
      const world = state.world || {};
      const entry = {
        t: tick,
        alive: Number(sim.aliveCount || 0),
        aliveRatio: Number(sim.aliveRatio || 0),
        n: Number(sim.meanNutrientField || 0),
        tox: Number(sim.meanToxinField || 0),
        sat: Number(sim.meanSaturationField || 0),
        plant: Number(sim.meanPlantField || 0),
        bio: Number(sim.meanBiochargeField || 0),
        plantTiles: Number(sim.plantTileRatio || 0),
        domHue: Number(sim.dominantHueRatio || 0),
        births: Number(sim.birthsLastStep || 0),
        deaths: Number(sim.deathsLastStep || 0),
        muts: Number(sim.mutationsLastStep || 0),
        raids: Number(sim.raidEventsLastStep || 0),
        inf: Number(sim.infectionsLastStep || 0),
        kills: Number(sim.conflictKillsLastStep || 0),
        remote: Number(sim.remoteAttacksLastStep || 0),
        remoteKills: Number(sim.remoteAttackKillsLastStep || 0),
        defAct: Number(sim.defenseActivationsLastStep || 0),
        stolen: Number(sim.resourceStolenLastStep || 0),
        pruned: Number(sim.plantsPrunedLastStep || 0),
        nCapTiles: Number(sim.nutrientCappedTilesLastStep || 0),
        eClearTiles: Number(sim.energyClearedTilesLastStep || 0),
        worldMode: String(world?.worldAiAudit?.mode || ""),
        ts: tick,
      };

      try {
        const arr = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        const out = Array.isArray(arr) ? arr : [];
        out.push(entry);
        localStorage.setItem(this.storageKey, JSON.stringify(out));
        this.count = out.length;
        this.lastTrackedTick = tick;
        this.persistMeta();
        emitUpdate(this.getMeta());
      } catch (err) {
        console.warn("[world-log] persist failed:", String(err?.message || err));
      }
    },

    getAll() {
      try {
        const arr = JSON.parse(localStorage.getItem(this.storageKey) || "[]");
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    },

    clear() {
      try {
        localStorage.setItem(this.storageKey, "[]");
        this.count = 0;
        this.lastTrackedTick = -1;
        this.persistMeta();
        emitUpdate(this.getMeta());
        return true;
      } catch {
        return false;
      }
    },

    toCsv(rows = null) {
      const arr = Array.isArray(rows) ? rows : this.getAll();
      const esc = (v) => {
        if (v == null) return "";
        const s = String(v);
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
        return s;
      };
      const lines = [WORLD_LOG_COLUMNS.join(",")];
      for (const row of arr) {
        lines.push(WORLD_LOG_COLUMNS.map((k) => esc(row[k])).join(","));
      }
      return `${lines.join("\n")}\n`;
    },

    getMeta() {
      return {
        sessionId: this.sessionId,
        count: this.count,
        lastTrackedTick: this.lastTrackedTick,
        storageKey: this.storageKey,
      };
    },
  };
}
