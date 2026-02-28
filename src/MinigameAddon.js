/**
 * JACCS - Minigame Addon (Pro-Player Intelligence)
 * Manages Stock Market (SMA), Grimoire (Double Casting) and Garden.
 */

if (typeof JACCS === 'undefined') {
    var JACCS = {};
}

JACCS.settings.minigames = {
    smaPeriod: 10,        // Simple Moving Average period for Stocks
    autoWrinklers: true,  // Auto-pop wrinklers
    autoGrimoire: true    // Auto-cast (If there's a combo)
};

JACCS.Minigames = (function () {

    // --- Stock Market (SMA Analysis) ---
    let _stockHistory = {}; // Stores history: { 'id': [val1, val2...]}

    function _handleStocks() {
        if (!Game.Objects['Bank'].minigameLoaded) return;
        let M = Game.Objects['Bank'].minigame;

        for (let i = 0; i < M.goodsById.length; i++) {
            let good = M.goodsById[i];

            // History tracking
            if (!_stockHistory[good.id]) _stockHistory[good.id] = [];
            _stockHistory[good.id].push(good.val);

            if (_stockHistory[good.id].length > JACCS.settings.minigames.smaPeriod) {
                _stockHistory[good.id].shift(); // Maintains SMA size
            }

            // SMA Calculation (Simple Moving Average of the last X ticks)
            let currSMA = _stockHistory[good.id].reduce((a, b) => a + b, 0) / _stockHistory[good.id].length;

            // Resting Value (RV): What the game considers the "base" stable value of the good.
            let restingVal = M.getRestingVal(good.id);

            // Combined Strategy: Buy if (Current Price < RV * 0.5) AND (Current Price > SMA -> Rebound/recovery signal)
            if (good.val < (restingVal * 0.45) && good.val > currSMA) {
                // Aggressive purchase (Max)
                if (M.buyGood(good.id, 10000)) {
                    if (JACCS.Logger) JACCS.Logger.events.STOCK(`Bought MAX ${good.name} (Val: $${good.val.toFixed(1)} | SMA: $${currSMA.toFixed(1)})`);
                    console.log(`JACCS Stocks: Bought MAX ${good.name} (Val: $${good.val.toFixed(2)} | SMA: $${currSMA.toFixed(2)})`);
                }
            }
            // Sell if (Current Price > RV * 1.5) AND (Current Price < SMA -> Drop signal)
            else if (good.val > (restingVal * 1.6) && good.val < currSMA) {
                if (M.sellGood(good.id, 10000)) {
                    if (JACCS.Logger) JACCS.Logger.events.STOCK(`Sold MAX ${good.name} (Val: $${good.val.toFixed(1)} | SMA: $${currSMA.toFixed(1)})`);
                    console.log(`JACCS Stocks: Sold MAX ${good.name} (Val: $${good.val.toFixed(2)} | SMA: $${currSMA.toFixed(2)})`);
                }
            }
        }
    }

    // --- Grimoire (Double Casting Strategy) ---
    function _handleGrimoire() {
        if (!JACCS.settings.minigames.autoGrimoire || !Game.Objects['Wizard tower'].minigameLoaded) return;
        let M = Game.Objects['Wizard tower'].minigame;

        // Evaluates if it's the right time for the "God Combo"
        // (E.g. Frenzy + Building Special active) -> Ideal for "Force the Hand of Fate"
        let isComboReady = false;
        let activeMultiplier = 1;

        for (let i in Game.buffs) {
            if (Game.buffs[i].multCpS > 1) activeMultiplier *= Game.buffs[i].multCpS;
        }
        if (activeMultiplier >= 50) isComboReady = true; // Frenzy(7) x BuildingSpecial(~15) > 50.

        if (isComboReady) {
            let spell = M.spells['hand of fate'];
            let cost = M.getSpellCost(spell);

            // CAST 1
            if (M.magic >= cost) {
                M.castSpell(spell);
                console.log("JACCS Grimoire: 1st FTHoF Casted!");
                if (JACCS.Logger) JACCS.Logger.events.MAGIC("1st Force the Hand of Fate Casted!");

                // --- DOUBLE CAST LOGIC START ---
                // To do double cast, we need to reduce the max mana (by selling towers)
                // so the spell's cost drops and fits the residual magic we have left.

                let residualMagic = M.magic;
                let towers = Game.Objects['Wizard tower'];

                // FTHoF cost formula: 60% of max magic + 10.
                // If we sell towers, 'max magic' drops drastically.
                // Mentally simulating how many towers to sell (typically from n to ~30 or ~21 max magic towers = ~40-50, cost = ~35)

                let soldTowersAmount = 0;
                let snapTowers = towers.amount;

                while (towers.amount > 21) {
                    towers.amount -= 10;
                    soldTowersAmount += 10;
                    M.computeMagicM(); // Recalculates internal Max Magic
                    let newCost = M.getSpellCost(spell);

                    if (residualMagic >= newCost) {
                        M.castSpell(spell);
                        console.log(`JACCS Grimoire: 2nd FTHoF Double-Casted! (Sold ${soldTowersAmount} towers for instant mana manip)`);
                        if (JACCS.Logger) JACCS.Logger.events.MAGIC(`2nd Double-Cast! (Manipulated ${soldTowersAmount} Wizard Towers)`);
                        break;
                    }
                }

                // We re-buy the towers instantly in the same thread queue, so visually the user (and the game) doesn't notice it as a long-term debuff.
                if (soldTowersAmount > 0) {
                    towers.amount += soldTowersAmount;
                    Game.CalculateGains();
                    M.computeMagicM();
                }
            }
        }
    }

    // --- Wrinklers (Shiny Safe) ---
    function _handleWrinklers() {
        if (!JACCS.settings.minigames.autoWrinklers) return;

        // JACCS' harvest condition is that there are at least 10 full wrinklers (or 12)
        // AND that we NEVER touch a shiny (type === 1).

        let normalCount = 0;
        let shinySafe = true; // Safe by default.

        for (let i in Game.wrinklers) {
            let w = Game.wrinklers[i];
            if (w.phase > 0 && w.type === 1) shinySafe = true; // Everything is fine with the shiny. Never touch type 1.
            if (w.phase > 0 && w.type === 0) normalCount++;
        }

        // End of cycle pop or when we need bank (e.g. for the AutoManager safeBank)
        let numWrinklersNeeded = Game.Has('Elder spice') ? 12 : 10;

        if (normalCount >= (numWrinklersNeeded - 1)) {
            // We burst only the normal ones (Type 0).
            for (let i in Game.wrinklers) {
                let w = Game.wrinklers[i];
                if (w.phase > 0 && w.type === 0) {
                    w.hp = 0; // Trigger pop
                }
            }
            console.log("JACCS Wrinklers: Automated Pop executed. Shinies ignored.");
        }
    }

    return {
        tick: function (deltaTime) {
            // Evaluates stocks every real ingame tick (Usually takes min 1 min in CC, we won't saturate it here, we cap it)
            if (Math.random() < 0.01) {
                _handleStocks();
                _handleWrinklers();
            }
            // Grimoire is occasionally checked to look for a Combo window
            if (Math.random() < 0.05) {
                _handleGrimoire();
            }

            // Garden would go here (Sacrifice / Auto-Plant), but we'll leave it out of boilerplate
        }
    };

})();
