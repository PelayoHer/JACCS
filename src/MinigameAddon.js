/**
 * JACCS - Minigame Addon 
 * Manages Stock Market (SMA), Grimoire (Double Casting) and Wrinklers.
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
    let _stockHistory = {};

    function _handleStocks() {
        if (!Game.Objects['Bank'].minigameLoaded) return;
        let M = Game.Objects['Bank'].minigame;

        for (let i = 0; i < M.goodsById.length; i++) {
            let good = M.goodsById[i];

            // History tracking
            if (!_stockHistory[good.id]) _stockHistory[good.id] = [];
            _stockHistory[good.id].push(good.val);

            if (_stockHistory[good.id].length > JACCS.settings.minigames.smaPeriod) {
                _stockHistory[good.id].shift();
            }

            let currSMA = _stockHistory[good.id].reduce((a, b) => a + b, 0) / _stockHistory[good.id].length;
            let restingVal = M.getRestingVal(good.id);

            // Stock Modes: 1 (Slow Rise), 2 (Slow Fall), 3 (Fast Rise), 4 (Fast Fall)
            let isFalling = (good.mode === 2 || good.mode === 4);
            let isRising = (good.mode === 1 || good.mode === 3);

            // Buy if (Price < RV * 0.45) AND (Rebounding from SMA) AND NOT actively falling fast
            if (good.val < (restingVal * 0.45) && good.val > currSMA && !isFalling) {
                if (M.buyGood(good.id, 10000)) {
                    console.log(`JACCS Stocks: Bought MAX ${good.name} (Val: $${good.val.toFixed(2)} | SMA: $${currSMA.toFixed(2)})`);
                }
            }
            // Sell if (Price > RV * 1.6) AND (Dropping below SMA) AND NOT actively rising fast
            else if (good.val > (restingVal * 1.6) && good.val < currSMA && !isRising) {
                if (M.sellGood(good.id, 10000)) {
                    console.log(`JACCS Stocks: Sold MAX ${good.name} (Val: $${good.val.toFixed(2)} | SMA: $${currSMA.toFixed(2)})`);
                }
            }
        }
    }

    // --- Grimoire (Double Casting Strategy) ---
    // Automates spell casting when high CpS multipliers are present (e.g. Frenzy + Building Special).
    // Features an advanced exploit: Rapidly sells Wizard Towers automatically to drop the maximum mana pool ceiling,
    // allowing an instantaneous second cast of 'Force the Hand of Fate', before automatically rebuying the towers safely.
    function _handleGrimoire() {
        if (!JACCS.settings.minigames.autoGrimoire || !Game.Objects['Wizard tower'].minigameLoaded) return;
        let M = Game.Objects['Wizard tower'].minigame;

        // God Combo: E.g. Frenzy + Building Special active
        let isComboReady = false;
        let activeMultiplier = 1;

        for (let i in Game.buffs) {
            if (Game.buffs[i].multCpS > 1) activeMultiplier *= Game.buffs[i].multCpS;
        }
        if (activeMultiplier >= 50) isComboReady = true;

        if (isComboReady) {
            let spell = M.spells['hand of fate'];
            let cost = M.getSpellCost(spell);

            // CAST 1
            if (M.magic >= cost) {
                M.castSpell(spell);
                console.log("JACCS Grimoire: 1st FTHoF Casted!");

                // DOUBLE CAST LOGIC 
                let residualMagic = M.magic;
                let towers = Game.Objects['Wizard tower'];
                let soldTowersAmount = 0;

                while (towers.amount > 21) {
                    towers.amount -= 10;
                    soldTowersAmount += 10;
                    M.computeMagicM();
                    let newCost = M.getSpellCost(spell);

                    if (residualMagic >= newCost) {
                        M.castSpell(spell);
                        console.log(`JACCS Grimoire: 2nd FTHoF Double-Casted! (Sold ${soldTowersAmount} towers for instant mana manip)`);
                        break;
                    }
                }

                // Re-buy instantly
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

        let normalCount = 0;
        let shinySafe = true;

        for (let i in Game.wrinklers) {
            let w = Game.wrinklers[i];
            if (w.phase > 0 && w.type === 1) shinySafe = true; // Never touch type 1
            if (w.phase > 0 && w.type === 0) normalCount++;
        }

        let numWrinklersNeeded = Game.Has('Elder spice') ? 12 : 10;

        // Auto-pop when full
        if (normalCount >= (numWrinklersNeeded - 1)) {
            for (let i in Game.wrinklers) {
                let w = Game.wrinklers[i];
                if (w.phase > 0 && w.type === 0) {
                    w.hp = 0; // Trigger pop
                }
            }
            console.log("JACCS Wrinklers: Automated Pop executed. Shinies ignored.");
        }
    }

    // --- Garden (Auto-Harvest) ---
    // Periodically checks the plot and harvests mature crops without disrupting growth cycles natively.
    // Also features an 'Intelligent Weedkiller' that actively detects infectious weeds like Meddleweed
    // and instantly destroys them to protect the user's cross-breeding grid logic, assuming the seed is known.
    function _handleGarden() {
        if (!Game.Objects['Farm'].minigameLoaded) return;
        let M = Game.Objects['Farm'].minigame;

        // Loop through plot 6x6 (36 tiles max depending on farm level)
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
                if (!M.plot[y] || !M.plot[y][x]) continue;
                let tile = M.plot[y][x];

                // If seed is planted (ID > 0)
                if (tile[0] > 0) {
                    let plantId = tile[0] - 1;
                    let plant = M.plantsById[plantId];
                    let age = tile[1];
                    let matureAge = Math.ceil(plant.mature);

                    if (plant.weed && plant.unlocked) {
                        // Weedkiller: If it's an invasive weed and we already have its seed, kill it before it spreads
                        M.harvest(x, y);
                        console.log(`JACCS Garden: [Weedkiller] Eradicated invasive ${plant.name} to protect crossbreeds.`);
                        continue;
                    }

                    if (age >= matureAge) {
                        // Mature. Do not harvest immortals like Drowsyfern automatically.
                        if (!plant.immortal) {
                            M.harvest(x, y);
                            console.log(`JACCS Garden: Auto-Harvested mature ${plant.name}.`);
                        }
                    }
                }
            }
        }
    }

    // --- Pantheon (Godzamok Macro) ---
    // Sells cheap bulk buildings to trigger massive clicking frenzy buffs, then replenishes them.
    let _snapshotGodzamok = {};
    let _godzamokActive = false;
    const SACRIFICE_TARGETS = ['Farm', 'Mine', 'Factory', 'Bank', 'Shipment', 'Alchemy lab'];

    function _handlePantheon() {
        if (!Game.Objects['Temple'].minigameLoaded) return;
        let M = Game.Objects['Temple'].minigame;

        // Godzamok ID is 2 (Ruin). Check if he is worshipped in Diamond(0), Ruby(1) or Jade(2).
        let godzamokSlotted = false;
        for (let i = 0; i < 3; i++) {
            if (M.slot[i] === 2) godzamokSlotted = true;
        }
        if (!godzamokSlotted) return;

        // Is there an active click frenzy?
        let clickFrenzyActive = false;
        for (let i in Game.buffs) {
            let bn = Game.buffs[i].type.name.toLowerCase();
            if (bn.includes("click frenzy") || bn.includes("dragonflight")) {
                clickFrenzyActive = true;
            }
        }

        if (clickFrenzyActive && !_godzamokActive) {
            _godzamokActive = true;
            let totalSacrificed = 0;

            // Sacrifice cheap buildings
            for (let i = 0; i < SACRIFICE_TARGETS.length; i++) {
                let objName = SACRIFICE_TARGETS[i];
                let b = Game.Objects[objName];
                if (b && b.amount > 0) {
                    _snapshotGodzamok[objName] = b.amount;
                    totalSacrificed += b.amount;
                    b.sell(b.amount); // Trigger sell bypasses UI safeguards
                }
            }

            if (totalSacrificed > 0) {
                console.log(`JACCS Godzamok: Sacrificed ${totalSacrificed} buildings across 6 low-tier categories for DEVASTATION +${totalSacrificed}% click power!`);
            }

        } else if (!clickFrenzyActive && _godzamokActive) {
            _godzamokActive = false;

            // Replenish sacrifices safely and efficiently (using native buyBulk to prevent lag spikes)
            let originalBulk = Game.buyBulk;

            for (let i = 0; i < SACRIFICE_TARGETS.length; i++) {
                let objName = SACRIFICE_TARGETS[i];
                if (_snapshotGodzamok[objName] > 0) {
                    let tgt = _snapshotGodzamok[objName];
                    let b = Game.Objects[objName];

                    while (b.amount < tgt && b.getPrice() <= Game.cookies) {
                        let diff = tgt - b.amount;
                        if (diff >= 100) Game.buyBulk = 100;
                        else if (diff >= 10) Game.buyBulk = 10;
                        else Game.buyBulk = 1;

                        b.buy();
                    }
                }
            }

            Game.buyBulk = originalBulk;
            console.log("JACCS Godzamok: Replenished sacrificed buildings.");
        }
    }

    return {
        tick: function (deltaTime) {
            // Evaluates stocks rarely
            if (Math.random() < 0.01) {
                _handleStocks();
                _handleWrinklers();
            }
            // Grimoire is occasionally checked to look for a Combo window
            if (Math.random() < 0.05) {
                _handleGrimoire();
                _handleGarden();
                _handlePantheon();
            }
        }
    };

})();
