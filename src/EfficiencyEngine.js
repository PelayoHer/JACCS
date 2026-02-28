/**
 * JACCS - Efficiency Engine & State Persistence
 * Calculates Payback Period, Delta CPS, and manages Snapshotting
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

/**
 * --- Snapshotting / Telemetry ---
 * Keeps a record of player evolution.
 */
JACCS.State = (function () {
    let _ringBuffer = [];
    const MAX_SNAPS = 100;

    return {
        getSnapshots: function () {
            return _ringBuffer;
        },

        loadSnapshots: function (arr) {
            if (Array.isArray(arr)) _ringBuffer = arr;
        },

        takeSnapshot: function () {
            if (!Game || !Game.ready) return;

            // If Efficiency Engine is already calculating, we grab the top 3
            let top3 = [];
            if (JACCS.Efficiency && JACCS.Efficiency.lastCache) {
                top3 = JACCS.Efficiency.lastCache.slice(0, 3).map(i => i.name);
            }

            let snap = {
                t: Date.now(),
                rCps: Game.cookiesPsRaw,
                eCps: Game.cookiesPs,
                b: Game.cookies,
                t3: top3 // "Top 3 PP Buildings"
            };

            _ringBuffer.push(snap);

            // Enforce size limit
            if (_ringBuffer.length > MAX_SNAPS) {
                _ringBuffer.shift();
            }

            console.log("JACCS Telemetry: Snapshot taken", snap);
            return snap;
        }
    };
})();

/**
 * --- Pure Math (Cookie Monster Core porting) ---
 */
JACCS.Efficiency = (function () {
    let _lastValidCPS = 0;
    let _cache = [];
    let _needsRecalc = true;

    // Hooks to Game.Earn or Game.buy to invalidate cache
    const originalBuy = Game.ObjectsById[0].buy; // just an example, but we make it async

    /**
     * Delta CPS of a Building 
     * Simulates buying 1 building, calculates CPS diff and reverts state.
     * (Optimized version, not hard-simulate)
     */
    function _simulateBuildingDelta(obj) {
        // In vanilla Cookie Clicker, CPS is non-linear due to Synergies.
        // We simulate a backup of global variables that affect CPS.
        let m = 0;
        let pCPS = Game.cookiesPs;
        let baseObjM = obj.amount;

        // Simulate +1
        obj.amount++;
        Game.CalculateGains(); // Internal C.Clicker function
        let delta = Game.cookiesPs - pCPS;

        // Restore
        obj.amount--;
        Game.CalculateGains();

        return Math.max(delta, 0.0001); // Prevent division by zero
    }

    /**
     * Calculates ROI for Active Upgrades that are NOT Click-based (Clicking not evaluated yet)
     */
    function _simulateUpgradeDelta(upg) {
        if (upg.bought) return 0;

        let pCPS = Game.cookiesPs;
        upg.bought = 1;
        Game.CalculateGains();

        let delta = Game.cookiesPs - pCPS;

        upg.bought = 0; // Restore
        Game.CalculateGains();

        return Math.max(delta, 0);
    }

    function _recalculatePP() {
        let results = [];

        // 1. Array of buildings
        for (let i in Game.Objects) {
            let obj = Game.Objects[i];
            if (obj.locked) continue;

            let price = obj.getPrice();
            let delta = _simulateBuildingDelta(obj);

            // PP = (Max between 0, Cost - Current Cookies) / Current CPS + Cost / Delta CPS 
            let dTime = Math.max(0, (price - Game.cookies)) / Game.cookiesPs;
            let pPeri = price / delta;
            let totalPP = dTime + pPeri;

            results.push({
                type: 'building',
                name: obj.name,
                id: obj.id,
                price: price,
                delta: delta,
                pp: totalPP,
                objRef: obj
            });
        }

        // 2. Upgrades (limited to visible store pool + 5 next ones to avoid frying CPU)
        let upgsInStore = Game.UpgradesInStore;
        for (let u = 0; u < upgsInStore.length; u++) {
            let upg = upgsInStore[u];
            // We ignore weird types (Click cookies, season switch, etc, which don't give measurable base cps)
            if (upg.pool === 'toggle' || upg.type === 'cookie') continue;

            let price = upg.getPrice();
            let delta = _simulateUpgradeDelta(upg);

            // If delta is zero or negative, it's incalculable (e.g. Golden switch)
            if (delta <= 0) continue;

            let dTime = Math.max(0, (price - Game.cookies)) / Game.cookiesPs;
            let pPeri = price / delta;

            results.push({
                type: 'upgrade',
                name: upg.name,
                id: upg.id,
                price: price,
                delta: delta,
                pp: dTime + pPeri,
                objRef: upg
            });
        }

        // Sort by lowest PP (Most efficient)
        results.sort((a, b) => a.pp - b.pp);

        _cache = results;
        _needsRecalc = false;

        return results;
    }

    return {
        update: function () {
            // Passive Recalc: Only if CPS changed dramatically (buff) or we bought something
            if (Math.abs(Game.cookiesPs - _lastValidCPS) > (Game.cookiesPs * 0.05) || _needsRecalc) {
                _lastValidCPS = Game.cookiesPs;
                _recalculatePP();
            }
        },

        getBestInvestment: function () {
            // Force if the list is empty
            if (_cache.length === 0) _recalculatePP();
            return _cache.length > 0 ? _cache[0] : null;
        },

        invalidate: function () {
            _needsRecalc = true;
        },

        get lastCache() {
            return _cache;
        }
    };
})();
