/**
 * JACCS - Efficiency Engine
 * Pure math core ported from Cookie Monster to calculate Return on Investment (ROI) 
 * for buildings and upgrades.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.Efficiency = (function () {
    let _lastValidCPS = 0;
    let _cache = [];
    let _needsRecalc = true;

    /**
     * Simulates buying 1 building and calculates the Delta CPS
     */
    function _simulateBuildingDelta(obj) {
        let pCPS = Game.cookiesPs;

        obj.amount++;
        Game.CalculateGains();
        let delta = Game.cookiesPs - pCPS;

        obj.amount--;
        Game.CalculateGains();

        return Math.max(delta, 0.0001);
    }

    /**
     * Simulates buying an upgrade and calculates the Delta CPS
     */
    function _simulateUpgradeDelta(upg) {
        if (upg.bought) return 0;

        let pCPS = Game.cookiesPs;
        upg.bought = 1;
        Game.CalculateGains();

        let delta = Game.cookiesPs - pCPS;

        upg.bought = 0;
        Game.CalculateGains();

        return Math.max(delta, 0);
    }

    /**
     * Main Return on Investment Calculation Engine
     */
    function _recalculatePP() {
        let results = [];

        // 1. Buildings Array
        for (let i in Game.Objects) {
            let obj = Game.Objects[i];
            if (obj.locked) continue;

            let price = obj.getPrice();
            let delta = _simulateBuildingDelta(obj);

            // ROI Formula: Time to afford + Time to pay itself off
            let dTime = Math.max(0, (price - Game.cookies)) / Game.cookiesPs;
            let retTime = price / delta;
            let totalPP = dTime + retTime;

            results.push({
                type: 'building',
                name: obj.name,
                id: obj.id,
                price: price,
                delta: delta,
                ROI: totalPP,
                objRef: obj
            });
        }

        // 2. Upgrades Array (Store visible only)
        let upgsInStore = Game.UpgradesInStore;
        for (let u = 0; u < upgsInStore.length; u++) {
            let upg = upgsInStore[u];
            // Ignore click toggles, season switches, and raw cookies (hard to measure base CPS diff)
            if (upg.pool === 'toggle' || upg.type === 'cookie' || upg.name.includes('Golden switch')) continue;

            let price = upg.getPrice();
            let delta = _simulateUpgradeDelta(upg);

            if (delta <= 0) continue;

            let dTime = Math.max(0, (price - Game.cookies)) / Game.cookiesPs;
            let retTime = price / delta;

            results.push({
                type: 'upgrade',
                name: upg.name,
                id: upg.id,
                price: price,
                delta: delta,
                ROI: dTime + retTime,
                objRef: upg
            });
        }

        // Sort by Lowest ROI (Most efficient first)
        results.sort((a, b) => a.ROI - b.ROI);

        _cache = results;
        _needsRecalc = false;

        return results;
    }

    return {
        update: function () {
            // Passive Recalc: Only when CPS shifts massively or a purchase was made
            if (Math.abs(Game.cookiesPs - _lastValidCPS) > (Game.cookiesPs * 0.05) || _needsRecalc) {
                _lastValidCPS = Game.cookiesPs;
                _recalculatePP();
                // console.log("JACCS Efficiency: Recalculated ROI Rankings."); // Muted to prevent UI flood
            }
        },

        getBestInvestment: function () {
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
