/**
 * JACCS - AutoManager (Steering & Humanization)
 * 
 * Focuses strictly on clicking the Big Cookie and Golden Cookies
 * using organic, human-like stealth patterns.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings = JACCS.settings || {};
JACCS.settings.stealth = {
    humanErrorRate: 0.002,      // 0.2% chance to ignore Golden Cookies or Fortune News
    baseCpsTarget: 12,          // Normal CPS (10-14ish)
    burstCpsTarget: 50,         // Burst CPS (50+)
    burstAccelerationMs: 500,   // 0.5s ramp from Human to Burst
    dynamicSafeBank: true,      // Hoarding limit config
    autoPurchase: true          // Main switch for the bot to buy things
};

JACCS.AutoManager = (function () {
    // --- Internal Stealth State ---
    let _lastBigClick = 0;
    let _burstModeStart = 0;
    let _isBursting = false;

    /**
     * Contextual Buff Awareness:
     * Evaluates if we should enter Burst Mode based on Click Frenzy or Dragonflight.
     */
    function _evaluateBuffClimate() {
        let isGodMode = false;

        for (let i in Game.buffs) {
            let buff = Game.buffs[i];
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
            console.log("JACCS Stealth: Burst Mode Activated! (Buff detected)");
        } else if (!isGodMode && _isBursting) {
            _isBursting = false;
            console.log("JACCS Stealth: Returning to Human Idle mode.");
        }
    }

    /**
     * Big Cookie Clicker 
     * Uses Poisson-like distribution for irregular pauses.
     * Transitions via humanized acceleration ramp when bursting.
     */
    function _clickBigCookie(timestamp) {
        let cpsTarget = JACCS.settings.stealth.baseCpsTarget;

        if (_isBursting) {
            // Humanized Acceleration Ramp (0.5s = 500ms)
            let timeInBurst = timestamp - _burstModeStart;
            let accelRatio = Math.min(1, timeInBurst / JACCS.settings.stealth.burstAccelerationMs);

            cpsTarget = JACCS.settings.stealth.baseCpsTarget +
                ((JACCS.settings.stealth.burstCpsTarget - JACCS.settings.stealth.baseCpsTarget) * accelRatio);
        }

        let idealDelay = 1000 / cpsTarget;

        // Poisson / Jitter (stat noise up to +-20% of the delay)
        let jitter = idealDelay * (Math.random() * 0.4 - 0.2);
        let currentDelay = idealDelay + jitter;

        if (timestamp - _lastBigClick > currentDelay) {
            _lastBigClick = timestamp;
            if (Game.ClickCookie) Game.ClickCookie(null, 0);
        }
    }

    /**
     * Golden Cookies and Fortunes
     * Uses Variable Task Latency (Gaussian curve) and Human Error Mode.
     */
    function _checkGoldenCookies(timestamp) {
        let shimmers = Game.shimmers;

        // Let's also check for Fortunes in the ticker
        let fortune = Game.TickerEffect;
        if (fortune && fortune.type === 'fortune' && Game.drawT) {
            if (!Game.jaccsFortuneTargetTime) {
                _assignReactionTime(Game, timestamp, "Fortune News");
            } else if (!Game.jaccsErrorIgnored && timestamp >= Game.jaccsFortuneTargetTime) {
                if (Game.tickerL && typeof Game.tickerL.click === 'function') {
                    Game.tickerL.click();
                }
                Game.jaccsFortuneTargetTime = null; // reset
            }
        }

        if (shimmers.length === 0) return;

        for (let i = 0; i < shimmers.length; i++) {
            let s = shimmers[i];

            if (!s.jaccsTargetTime) {
                _assignReactionTime(s, timestamp, "Golden Cookie");
            } else if (!s.jaccsErrorIgnored && timestamp >= s.jaccsTargetTime) {
                s.pop();
            }
        }
    }

    /**
     * Assigns Gaussian target time or triggers Human Error Mode
     */
    function _assignReactionTime(targetObj, timestamp, typeName) {
        // Human Error Mode
        if (Math.random() < JACCS.settings.stealth.humanErrorRate) {
            targetObj.jaccsErrorIgnored = true;
            console.log(`JACCS Stealth: Ignored ${typeName} intentionally (Human Error Emulation).`);
            return;
        }

        // Gaussian curve (Box-Muller) for reaction delay
        let u = 1 - Math.random();
        let v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

        // Mean: ~700ms, StdDev: ~200ms
        let reactionDelay = Math.max(300, 700 + (z * 200));

        if (typeName === "Fortune News") {
            targetObj.jaccsFortuneTargetTime = timestamp + reactionDelay;
        } else {
            targetObj.jaccsTargetTime = timestamp + reactionDelay;
        }
    }

    /**
     * Calculates the required bank to maximize the Lucky! combo.
     * Implements Dynamic Game Stage AI.
     */
    function _getDynamicSafeBank() {
        if (!JACCS.settings.stealth.dynamicSafeBank) return 0;

        // 1. Calculate pure Base CPS without temporary Golden Cookie buffs like Frenzy
        let baseCps = Game.cookiesPs;
        let hasFrenzy = false;

        for (let i in Game.buffs) {
            let buff = Game.buffs[i];
            if (buff.type && buff.type.name && buff.type.name.toLowerCase().includes("frenzy")) {
                hasFrenzy = true;
                // Reverse the Frenzy x7 multiplier to find the true base CPS
                if (buff.multCpS) {
                    baseCps = Game.cookiesPs / buff.multCpS;
                }
                break;
            }
        }

        // 2. Early Game (Arranque): Spend everything to grow exponentially
        if (Game.cookiesEarned < 1000000000000) { // Extended to 1 Trillion to speed up progression immensely
            return 0;
        }

        // 3. Late Game (Post-Get Lucky): Hoard for Frenzy + Lucky (105 minutes of CPS)
        let hasGetLucky = Game.Has('Get lucky');
        if (hasGetLucky) {
            // To cap a Lucky during a Frenzy (x7), we need 7 * 6000 * BaseCPS = 42000 * BaseCPS
            return baseCps * 42000;
        }

        // 4. Mid Game (Pre-Get Lucky): Hoard for normal Lucky (15 minutes of CPS)
        // To cap a normal Lucky, we need 15 mins * 60s * 10% math ceiling -> roughly 6000 * BaseCPS
        return baseCps * 6000;
    }

    /**
     * Smart Purchasing (EfficiencyEngine + Dynamic Safe Bank)
     */
    function _handlePurchases() {
        if (!JACCS.settings.stealth.autoPurchase || !JACCS.Efficiency) return;

        let safeBank = _getDynamicSafeBank();
        let target = JACCS.Efficiency.getBestInvestment();

        if (!target) return;

        let hasGetLucky = Game.Has('Get lucky');
        // Mathematical Proof: If an item pays for itself faster than the Safe Bank coefficient (e.g. 6000s or 42000s),
        // it is ALWAYS better to buy it than to hoard. We use absolute limits to prioritize raw CPS scaling.
        let roiThreshold = hasGetLucky ? 42000 : 6000; // 11.6 hours / 1.6 hours of ROI

        let isEarlyGame = Game.cookiesEarned < 1000000000000;
        let isTriviallyCheap = target.price < (Game.cookies * 0.01);
        let respectsBank = (Game.cookies - target.price) >= safeBank;

        // Highly efficient override: we actually have the cookies AND the Return on Investment is incredibly low.
        let isHighlyEfficient = target.ROI < roiThreshold && Game.cookies >= target.price;

        if ((isEarlyGame || isTriviallyCheap || respectsBank || isHighlyEfficient) && Game.cookies >= target.price) {
            if (target.type === 'building' && target.objRef) {
                target.objRef.buy();
                JACCS.Efficiency.invalidate();
                if (isHighlyEfficient && !respectsBank && !isEarlyGame && !isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: [High-Efficiency Override] Built ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                } else if (!isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: Built ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                }
            }
            else if (target.type === 'upgrade' && target.objRef) {
                target.objRef.buy();
                JACCS.Efficiency.invalidate();
                if (isHighlyEfficient && !respectsBank && !isEarlyGame && !isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: [High-Efficiency Override] Upgraded ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                } else if (!isTriviallyCheap) {
                    console.log(`JACCS AutoBuy: Upgraded ${target.name} (ROI: ${target.ROI.toFixed(2)}s)`);
                }
            }
        }
    }

    return {
        tick: function (deltaTime, timestamp) {
            // Contextual Intelligence
            _evaluateBuffClimate();

            // Reaction to visual spawns
            _checkGoldenCookies(timestamp);

            // Active clicking
            _clickBigCookie(timestamp);

            // AutoPurchasing routines (limited execution rate to save cycles)
            if (timestamp % 1000 < 20) {
                _handlePurchases();
            }
        }
    };

})();
