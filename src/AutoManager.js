/**
 * JACCS - AutoManager (Steering & Humanization)
 * 
 * Orchestrates purchases and clicks on cookies (Golden / Big)
 * featuring "Human Error" and "Poisson Distribution" behavior
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings = JACCS.settings || {};
JACCS.settings.stealth = {
    humanErrorRate: 0.002, // 0.2% chance to ignore GC
    baseCpsTarget: 12,     // 12 CPS in human Idle
    burstCpsTarget: 50,    // 50 CPS under Frenzy/Dragonflight
    burstAcceleration: 500, // 0.5 sec ramp
    dynamicSafeBank: true  // Enables dynamic hoarding for Lucky! + Frenzy
};

JACCS.AutoManager = (function () {

    // --- Internal Stealth State ---
    let _lastBigClick = 0;
    let _burstModeStart = 0;
    let _isBursting = false;

    /**
     * Contextual Buff Awareness
     * Detects if there are massive requested buffs active.
     */
    function _evaluateBuffClimate() {
        let isGodMode = false;

        for (let i in Game.buffs) {
            let buff = Game.buffs[i];
            // ID or name. "Click frenzy" / "Dragonflight"
            if (buff.type && buff.type.name) {
                let bn = buff.type.name.toLowerCase();
                if (bn.includes("click frenzy") || bn.includes("dragonflight")) {
                    isGodMode = true;
                    break;
                }
            }
        }

        if (isGodMode && !_isBursting) {
            _isBursting = true;
            _burstModeStart = performance.now();
            console.log("JACCS: Burst Mode Activated! (Buff detected)");
        } else if (!isGodMode && _isBursting) {
            _isBursting = false;
            console.log("JACCS: Returning to Human Idle mode.");
        }
    }

    /**
     * Poisson / Variable Latency Clicker
     * Click delay dependent on the buff climate.
     */
    function _clickBigCookie(timestamp) {
        let cpsTarget = JACCS.settings.stealth.baseCpsTarget;

        if (_isBursting) {
            // Humanized Acceleration Ramp (0.5s)
            let timeInBurst = timestamp - _burstModeStart;
            let accelRatio = Math.min(1, timeInBurst / JACCS.settings.stealth.burstAcceleration);

            // Progresses from baseCpsTarget to burstCpsTarget over 0.5s
            cpsTarget = JACCS.settings.stealth.baseCpsTarget +
                ((JACCS.settings.stealth.burstCpsTarget - JACCS.settings.stealth.baseCpsTarget) * accelRatio);
        }

        let idealDelay = 1000 / cpsTarget;

        // Poisson / Jitter (Adding statistical noise to break banal autoclicker rhythms)
        // Example of simple noise (+- 15% of delay)
        let jitter = idealDelay * (Math.random() * 0.3 - 0.15);
        let currentDelay = idealDelay + jitter;

        if (timestamp - _lastBigClick > currentDelay) {
            _lastBigClick = timestamp;
            if (Game.ClickCookie) Game.ClickCookie(null, 0); // Direct API trigger
        }
    }

    /**
     * Golden Cookie God Mode & Human Error
     */
    function _checkGoldenCookies(timestamp) {
        let shimmers = Game.shimmers;
        if (shimmers.length === 0) return;

        for (let i = 0; i < shimmers.length; i++) {
            let s = shimmers[i];

            // If we already provided a 'targetTime', it means we are simulating "visual and motor latency" (Variable Task Latency)
            if (!s.jaccsTargetTime) {
                // Simplified Gaussian curve (Box-Muller) for initial reaction (typically 400ms to 1.2s)
                let u = 1 - Math.random(); // [0,1)
                let v = Math.random();
                let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

                let reactionDelay = Math.max(200, 700 + (z * 200)); // Mean: 700ms, Deviation: 200ms

                // Human Error Sim (0.2%)
                if (Math.random() < JACCS.settings.stealth.humanErrorRate) {
                    s.jaccsErrorIgnored = true;
                    if (JACCS.Logger) JACCS.Logger.events.STEALTH("Ignored Shimmer intentionally (Human Error Emulation).");
                    console.log("JACCS Stealth: Ignored Shimmer intentionally (Human Error Emulation).");
                } else {
                    s.jaccsTargetTime = timestamp + reactionDelay;
                }
            } else if (!s.jaccsErrorIgnored && timestamp >= s.jaccsTargetTime) {
                // Latency fulfilled -> Click
                s.pop();
            }
        }
    }

    /**
     * Calculates the required bank to maximize the Lucky! combo
     * taking into account current multipliers (Frenzy, etc).
     */
    function _getDynamicSafeBank() {
        if (!JACCS.settings.stealth.dynamicSafeBank) return Game.cookiesPs * 6000;

        let multiplier = 1;

        // Inspects ongoing buffs
        for (let i in Game.buffs) {
            let buff = Game.buffs[i];
            // Identifies if there's an active Frenzy or other massive production buff
            // Game.cookiesPs ALREADY has the multiplier applied, so we use the relationship
            if (buff.type && buff.type.name && buff.type.name.toLowerCase().includes("frenzy")) {
                multiplier = 1; // "Lucky!" rewards based on the ALREADY INCLUDED multiplier in Game.cookiesPs
                // Some mods divide raw, here we use the actual cps * 6000 which is the original Lucky formula:
                // Lucky gives: max 15 mins (900 secs) * cookiesPs * buff, capped at 15% of bank.
                // So target bank: cookiesPs * 900 / 0.15 = cookiesPs * 6000.
                break;
            }
        }

        // The real safeBank we must maintain
        return Game.cookiesPs * 6000 * multiplier;
    }

    /**
     * Smart Purchasing (Bank Management + EfficiencyEngine)
     */
    function _handlePurchases() {
        // We need Efficiency
        if (!JACCS.Efficiency) return;

        // 1. Dynamic Bank Management
        let safeBank = _getDynamicSafeBank();
        _currentSafeBankTarget = safeBank; // Exported for UI

        if (Game.cookies < safeBank && Game.cookiesPs > 0) {
            // We evaluate if the current item is super cheap (< 1% of the bank)
            let target = JACCS.Efficiency.getBestInvestment();
            if (target && target.price < (Game.cookies * 0.01)) {
                // Emergency/micro purchase due to stupidly cheap price
                if (target.type === 'building' && target.objRef) target.objRef.buy();
                else if (target.type === 'upgrade' && target.objRef) target.objRef.buy();
                JACCS.Efficiency.invalidate();
            } else {
                if (JACCS.Logger && Math.random() < 0.05) { // Sporadic logging (1 out of 20 ticks -> ~every 20s)
                    let isFrenzy = Object.keys(Game.buffs || {}).some(k => Game.buffs[k].type.name.toLowerCase().includes("frenzy"));
                    let msg = isFrenzy ? "Hoarding cookies for (Frenzy + Lucky!) Max Reward" : "Hoarding cookies for Lucky! Max Reward";
                    JACCS.Logger.events.INFO(msg);
                }
                return; // Suspend auto-purchasing to save up.
            }
        }

        // 2. Buy the Best PP
        let target = JACCS.Efficiency.getBestInvestment();
        if (target) {
            // Strict Bank Management
            let postPurchaseBank = Game.cookies - target.price;
            if (postPurchaseBank >= safeBank || target.price < (Game.cookies * 0.01)) {

                if (target.type === 'building' && target.objRef) {
                    target.objRef.buy();
                    JACCS.Efficiency.invalidate();
                    if (JACCS.Logger) JACCS.Logger.events.PURCHASE(`Built ${target.name} (PP: ${target.pp.toFixed(1)}s)`);
                    console.log(`JACCS AutoBuy: Built ${target.name} (PP: ${target.pp.toFixed(2)}s)`);
                }
                else if (target.type === 'upgrade' && target.objRef) {
                    target.objRef.buy();
                    JACCS.Efficiency.invalidate();
                    if (JACCS.Logger) JACCS.Logger.events.PURCHASE(`Upgraded ${target.name} (PP: ${target.pp.toFixed(1)}s)`);
                    console.log(`JACCS AutoBuy: Upgraded ${target.name} (PP: ${target.pp.toFixed(2)}s)`);
                }
            }
        }
    }

    let _currentSafeBankTarget = 0;


    return {
        tick: function (deltaTime, timestamp) {

            // 1. Buff Climate (GodMode?)
            _evaluateBuffClimate();

            // 2. Click on Shimmers (Golden, Reindeer)
            _checkGoldenCookies(timestamp);

            // 3. Human AutoClicker (Poisson Big Cookie)
            _clickBigCookie(timestamp);

            // 4. AutoPurchasing
            // Limited to evaluate 1 time per second to save cycles
            if (timestamp % 1000 < 20) {
                _handlePurchases();
            }
        },

        getSafeBankTarget: function () {
            return _currentSafeBankTarget;
        }
    };

})();
